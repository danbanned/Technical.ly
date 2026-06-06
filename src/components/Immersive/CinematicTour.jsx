import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import { useMapStore } from '../../store/useMapStore';
import { getCityData } from '../../data/seedCityData';
import { prefersReducedMotion } from '../../utils/transitionHelpers';

const IMPORTANT_TYPES = [
  'universityTower',
  'financialTower',
  'hospitalComplex',
  'transitHub',
  'comcastTower',
];

const REF_LOOKUPS = [
  ['universityRef', 'universities'],
  ['techCenterRef', 'techCenters'],
  ['hospitalRef', 'hospitals'],
  ['financialRef', 'financialDistricts'],
  ['transitRef', 'transitHubs'],
];

// ── Scale constants — MUST match FakeCityGenerator ────────────────────────
// Landmark towers render at lm.height * BLOCK_SCALE * HEIGHT_BOOST.
// The tour must use the same factor so camera framing matches the real towers.
const BLOCK_SCALE  = 3;
const HEIGHT_BOOST = 5;
const TOWER_SCALE  = BLOCK_SCALE * HEIGHT_BOOST; // = 15 (was effectively 3 before the boost)

function gridToWorld(cityData, gridX, gridZ) {
  const metersPerDegLat = 111320;
  const metersPerDegLon = metersPerDegLat * Math.cos(cityData.lat * Math.PI / 180);
  return {
    lon: cityData.lon + gridX / metersPerDegLon,
    lat: cityData.lat + gridZ / metersPerDegLat,
  };
}

function resolveLandmarkCoordinates(cityData, landmark) {
  if (!landmark) return null;

  if (landmark.lat !== undefined && landmark.lon !== undefined) {
    return {
      lat: landmark.lat,
      lon: landmark.lon,
      height: (landmark.height || 30) * TOWER_SCALE,
      name: landmark.name,
    };
  }

  for (const [refKey, bucketKey] of REF_LOOKUPS) {
    const refName = landmark[refKey];
    if (!refName) continue;

    const target = cityData[bucketKey]?.find((item) => item.name === refName);
    if (target) {
      return {
        lat: target.lat,
        lon: target.lon,
        height: (landmark.height || 30) * TOWER_SCALE,
        name: landmark.name,
      };
    }
  }

  if (landmark.gridX !== undefined && landmark.gridZ !== undefined) {
    return {
      ...gridToWorld(cityData, landmark.gridX, landmark.gridZ),
      height: (landmark.height || 30) * TOWER_SCALE,
      name: landmark.name,
    };
  }

  console.warn(`Cannot resolve cinematic coordinates for landmark "${landmark.name}"`);
  return null;
}

export default function CinematicTour({ viewerRef }) {
  const storeViewer = useMapStore((s) => s.viewer);
  const activeRef = useRef(false);
  const rafRef = useRef(null);
  const tourInProgress = useRef(false);

  useEffect(() => {
    const getViewer = () => viewerRef?.current || storeViewer;

    const stop = () => {
      activeRef.current = false;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      const viewer = getViewer();
      if (!viewer || viewer.isDestroyed?.()) return;
      try { viewer.camera.cancelFlight(); } catch {}
      try { viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY); } catch {}
      try { viewer.scene.screenSpaceCameraController.enableInputs = true; } catch {}
      tourInProgress.current = false;
    };

    const orbit = (center, radius, pitch, speed, duration) => {
      const viewer = getViewer();
      if (!viewer || viewer.isDestroyed?.()) return Promise.resolve();

      return new Promise((resolve) => {
        const startTime = performance.now();
        const initialHeading = viewer.camera.heading ?? 0;

        const tick = (now) => {
          const liveViewer = getViewer();
          if (!activeRef.current || !liveViewer || liveViewer.isDestroyed?.()) {
            resolve();
            return;
          }

          const elapsed = now - startTime;
          const progress = Math.min(elapsed / duration, 1.0);
          const heading = initialHeading + progress * speed * Math.PI * 2;

          try {
            liveViewer.camera.lookAt(
              center,
              new Cesium.HeadingPitchRange(
                heading,
                Cesium.Math.toRadians(pitch),
                radius
              )
            );
          } catch {
            resolve();
            return;
          }

          if (progress < 1.0) {
            rafRef.current = requestAnimationFrame(tick);
          } else {
            resolve();
          }
        };

        rafRef.current = requestAnimationFrame(tick);
      });
    };

    const fly = (lon, lat, alt, heading, pitch, duration) => {
      const viewer = getViewer();
      if (!viewer || viewer.isDestroyed?.() || !activeRef.current) {
        return Promise.resolve();
      }

      return new Promise((resolve) => {
        try { viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY); } catch {}
        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(lon, lat, alt),
          orientation: {
            heading: Cesium.Math.toRadians(heading),
            pitch: Cesium.Math.toRadians(pitch),
            roll: 0,
          },
          duration: prefersReducedMotion() ? 0 : duration,
          easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
          complete: resolve,
          cancel: resolve,
        });
      });
    };

    const handleTour = async (e) => {
      const { city: cityEvent, focusLandmark } = e.detail || {};
      if (!cityEvent || tourInProgress.current) return;

      const viewer = getViewer();
      if (!viewer || viewer.isDestroyed?.()) return;

      const cityData = getCityData(cityEvent.name);
      const landmarks = cityData?.landmarks || [];
      if (!landmarks.length) return;

      tourInProgress.current = true;
      activeRef.current = true;

      try {
        try { viewer.scene.screenSpaceCameraController.enableInputs = false; } catch {}

        // Opening wide orbit — pulled back for the larger city footprint.
        const cityCenter = Cesium.Cartesian3.fromDegrees(
          cityData.lon,
          cityData.lat,
          cityData.cityRadius * 4
        );
        const wideRange = Math.max(cityData.cityRadius * 5.5, 5000);

        await orbit(cityCenter, wideRange, -38, 0.55, 7500);
        if (!activeRef.current) return;

        const focusLandmarkName = focusLandmark || cityData.focusLandmark || '';
        let tourList = [];
        let focus = null;

        if (focusLandmarkName) {
          focus = landmarks.find(
            (lm) => lm.template === focusLandmarkName || lm.name === focusLandmarkName
          );
          if (focus) tourList.push(focus);
        }

        tourList = [
          ...tourList,
          ...landmarks.filter(
            (lm) => IMPORTANT_TYPES.includes(lm.template) && lm !== focus
          ),
        ];

        for (const lm of tourList) {
          const resolved = resolveLandmarkCoordinates(cityData, lm);
          if (!resolved) continue;

          // Approach altitude scales with the tower so the camera arrives
          // looking up at its full height instead of clipping through it.
          const approachAlt = Math.max(resolved.height * 1.1, 600);
          // Back the approach off further for taller towers.
          const approachOffset = 0.003 + resolved.height / 4_000_000;
          await fly(resolved.lon, resolved.lat - approachOffset, approachAlt, 10, -18, 2.4);
          if (!activeRef.current) return;

          // Close orbit: frame the whole tower. Center near its vertical
          // midpoint; radius scales with height so the tower fits in frame.
          const landmarkCenter = Cesium.Cartesian3.fromDegrees(
            resolved.lon,
            resolved.lat,
            resolved.height * 0.55
          );
          const orbitRadius = Math.max(resolved.height * 1.4, 300);
          const orbitPitch = -14;
          await orbit(landmarkCenter, orbitRadius, orbitPitch, 1.0, 10000);
          if (!activeRef.current) return;
        }

        // Pull back out over the full city.
        await fly(cityData.lon, cityData.lat, cityData.cityRadius * 3.5, 0, -30, 2.5);
        if (!activeRef.current) return;

        const finalCenter = Cesium.Cartesian3.fromDegrees(
          cityData.lon,
          cityData.lat,
          cityData.cityRadius * 2.5
        );
        await orbit(finalCenter, cityData.cityRadius * 2, -42, 0.3, 9000);
      } finally {
        const liveViewer = getViewer();
        if (liveViewer && !liveViewer.isDestroyed?.()) {
          try { liveViewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY); } catch {}
          try { liveViewer.scene.screenSpaceCameraController.enableInputs = true; } catch {}
        }
        activeRef.current = false;
        tourInProgress.current = false;
      }
    };

    window.addEventListener('immersion:cinematicTour', handleTour);
    window.addEventListener('immersion:boardExit', stop);

    return () => {
      window.removeEventListener('immersion:cinematicTour', handleTour);
      window.removeEventListener('immersion:boardExit', stop);
      stop();
    };
  }, [storeViewer, viewerRef]);

  return null;
}