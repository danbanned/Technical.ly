import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import { useMapStore } from '../../store/useMapStore';
import { getCityData } from '../../data/seedCityData';
import { prefersReducedMotion } from '../../utils/transitionHelpers';

/**
 * CinematicTour — guided camera sequence for the Immersive mode.
 *
 * Fires on immersion:fakeCityGenerate (after buildings have been placed).
 * Plays a 5-phase sequence:
 *   1. Sweeping wide orbit  — establishes the city from altitude
 *   2. Dive to landmark     — close, nearly-horizontal approach
 *   3. Tight landmark orbit — billboard panels, building facades visible
 *   4. Crane pull-back      — reveal cityscape below
 *   5. Gentle final orbit   — settle into the working view (stat cards readable)
 *
 * Input controls are disabled during the tour; re-enabled on exit.
 * Cancelled immediately on immersion:boardExit or when a new city fires.
 * Silently skips for users who prefer reduced motion.
 */

const DEG = Cesium.Math.toRadians;

function gridToWorld(cityLon, cityLat, gx, gz) {
  const mpLon = 111320 * Math.cos(cityLat * Math.PI / 180);
  return { lon: cityLon + gx / mpLon, lat: cityLat + gz / 111320 };
}

export default function CinematicTour() {
  const viewer   = useMapStore((s) => s.viewer);
  const rafRef   = useRef(null);
  const activeRef = useRef(false);

  useEffect(() => {
    if (!viewer) return;

    // ── Cancel helper ───────────────────────────────────────────────────
    const stop = () => {
      activeRef.current = false;
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      try { viewer.scene.screenSpaceCameraController.enableInputs = true; } catch {}
      try { viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY); } catch {}
    };

    // ── Orbit: circles `target` at `range` metres for `duration` ms ────
    // rpm controls rotation speed (negative = clockwise viewed from above)
    function orbit(target, range, pitchDeg, rpm, duration) {
      return new Promise((resolve) => {
        let startTs = null;
        let heading = viewer.camera.heading ?? 0;
        const radPerMs = (rpm * 2 * Math.PI) / 60_000;

        const tick = (ts) => {
          if (!activeRef.current) { resolve(); return; }
          if (!startTs) startTs = ts;
          const elapsed = ts - startTs;
          heading += radPerMs;

          try {
            viewer.camera.lookAt(
              target,
              new Cesium.HeadingPitchRange(heading, DEG(pitchDeg), range)
            );
          } catch { resolve(); return; }

          if (elapsed < duration) {
            rafRef.current = requestAnimationFrame(tick);
          } else {
            resolve();
          }
        };
        rafRef.current = requestAnimationFrame(tick);
      });
    }

    // ── Fly: Cesium flyTo between orbit phases (releases lookAt first) ──
    function fly(lon, lat, alt, headingDeg, pitchDeg, duration) {
      return new Promise((resolve) => {
        if (!activeRef.current) { resolve(); return; }
        try { viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY); } catch {}
        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(lon, lat, alt),
          orientation: {
            heading: DEG(headingDeg),
            pitch:   DEG(pitchDeg),
            roll:    0,
          },
          duration: prefersReducedMotion() ? 0 : duration,
          easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
          complete: resolve,
          cancel:   resolve,
        });
      });
    }

    // ── Main tour sequence ──────────────────────────────────────────────
    const onGenerate = async (ev) => {
      const { city } = ev.detail || {};
      if (!city || !viewer || viewer.isDestroyed?.()) return;

      stop(); // cancel any prior tour
      activeRef.current = true;

      if (prefersReducedMotion()) return;

      viewer.scene.screenSpaceCameraController.enableInputs = false;

      const cityData   = getCityData(city.name);
      const cityCenter = Cesium.Cartesian3.fromDegrees(city.lon, city.lat, 0);
      const cityRadius = cityData?.cityRadius ?? 600;

      // Hero landmark for close-up — prefer a tower, fall back to first
      const heroLm = cityData?.landmarks?.find(
        (l) => l.template === (cityData.focusLandmark ?? 'comcastTower')
      ) ?? cityData?.landmarks?.find(
        (l) => l.template === 'comcastTower' || l.template === 'financialTower'
      ) ?? cityData?.landmarks?.[0];

      const heroCoord = heroLm
        ? gridToWorld(city.lon, city.lat, heroLm.gridX, heroLm.gridZ)
        : { lon: city.lon, lat: city.lat };
      const heroTopM = (heroLm?.height ?? 30) * 3; // BLOCK_SCALE = 3
      const heroCenter = Cesium.Cartesian3.fromDegrees(
        heroCoord.lon, heroCoord.lat, heroTopM * 0.5
      );

      // Let building polygons enter the render pipeline
      await new Promise((r) => setTimeout(r, 500));
      if (!activeRef.current) return;

      // ── Shot 1 ─ Wide sweeping orbit ────────────────────────────────
      // Establishes scale: user sees the whole city from altitude.
      const wideRange = Math.max(cityRadius * 5.5, 3000);
      await orbit(cityCenter, wideRange, -38, 0.55, 7_500);
      if (!activeRef.current) return;

      // ── Shot 2 ─ Dive toward the hero landmark ──────────────────────
      // Camera moves south of landmark, tilts up to nearly horizontal
      // so the billboard faces fill the frame.
      const diveAlt = Math.max(heroTopM * 2.2, 180);
      const offsetLat = heroCoord.lat - (cityRadius * 0.006 / 111320);
      await fly(heroCoord.lon, offsetLat, diveAlt, 10, -16, 2.4);
      if (!activeRef.current) return;

      // ── Shot 3 ─ Tight orbit around the landmark ────────────────────
      // Billboard panels and building facades read clearly at this range.
      const closeRange = Math.max(heroTopM * 3.5, 260);
      await orbit(heroCenter, closeRange, -9, 1.3, 6_200);
      if (!activeRef.current) return;

      // ── Shot 4 ─ Crane up — reveal the full skyline ─────────────────
      await fly(city.lon, city.lat, wideRange * 0.9, 0, -45, 2.8);
      if (!activeRef.current) return;

      // ── Shot 5 ─ Gentle final orbit — settle into working view ───────
      // Slow enough that stat cards are readable; ends parked.
      await orbit(cityCenter, wideRange * 0.82, -43, 0.22, 9_000);

      // Park and release
      if (activeRef.current) {
        try { viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY); } catch {}
        activeRef.current = false;
      }
      try { viewer.scene.screenSpaceCameraController.enableInputs = true; } catch {}
    };

    window.addEventListener('immersion:fakeCityGenerate', onGenerate);
    window.addEventListener('immersion:boardExit', stop);
    return () => {
      window.removeEventListener('immersion:fakeCityGenerate', onGenerate);
      window.removeEventListener('immersion:boardExit', stop);
      stop();
    };
  }, [viewer]);

  return null;
}
