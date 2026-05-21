import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useMapStore } from '../store/useMapStore';
import { snapCamera, flyCamera, animateShellOpacity } from '../utils/transitionHelpers';

/**
 * Immersion Controller v2
 *
 * State machine: Ambient → Reactive → Immersive.
 *
 * - Scroll-driven moves (→ Reactive) are INSTANT (snapCamera). The
 *   user is just scrolling; a cinematic flight would feel sluggish.
 * - Immersive entry and Ambient return are CINEMATIC (flyCamera) —
 *   the user explicitly asked to dive in or come back out.
 * - Once snapped to a city, Reactive stays put. Only Escape, the Back
 *   button, or a fast scroll returns to Ambient.
 *
 * The controller is state-driven: the article observer sets store
 * state, and the effect below reacts. A per-target signature dedupes
 * repeat transitions to the same place.
 */

const CONTINENTAL = { lon: -98.5, lat: 39.8, height: 5_000_000 };

const SHELL = {
  ambient: { header: 0.8, sidebar: 0.8, articleFeed: 1.0 },
  reactive: { header: 0.65, sidebar: 0.65, articleFeed: 1.0 },
  immersive: { header: 0.4, sidebar: 0.0, articleFeed: 0.0 },
};

// Economically connected cities — drives the ecosystem framing and
// the plane (capital-flow) arcs. Kept geographically tight so the
// immersive view stays legible.
const ECOSYSTEM_MAP = {
  Baltimore: [
    { name: 'Washington', lat: 38.9072, lon: -77.0369 },
    { name: 'Philadelphia', lat: 39.9526, lon: -75.1652 },
  ],
  Philadelphia: [
    { name: 'Baltimore', lat: 39.2904, lon: -76.6122 },
    { name: 'Wilmington', lat: 39.7391, lon: -75.5398 },
    { name: 'Washington', lat: 38.9072, lon: -77.0369 },
  ],
  Pittsburgh: [{ name: 'Philadelphia', lat: 39.9526, lon: -75.1652 }],
  Washington: [
    { name: 'Baltimore', lat: 39.2904, lon: -76.6122 },
    { name: 'Wilmington', lat: 39.7391, lon: -75.5398 },
  ],
  Wilmington: [
    { name: 'Philadelphia', lat: 39.9526, lon: -75.1652 },
    { name: 'Baltimore', lat: 39.2904, lon: -76.6122 },
  ],
};

function clamp(v, lo, hi) {
  return Math.min(Math.max(v, lo), hi);
}

function getEcosystemCities(city) {
  return ECOSYSTEM_MAP[city?.name] || [];
}

function ecosystemBounds(primary, eco) {
  const all = [primary, ...eco];
  const lons = all.map((c) => c.lon);
  const lats = all.map((c) => c.lat);
  return {
    west: Math.min(...lons),
    east: Math.max(...lons),
    south: Math.min(...lats),
    north: Math.max(...lats),
  };
}

function maxRangeDeg(b) {
  return Math.max(b.east - b.west, b.north - b.south);
}

// Reactive frames the whole ecosystem; clamped so it stays readable.
function reactiveHeight(b) {
  return clamp(maxRangeDeg(b) * 111_000 * 2.2, 90_000, 380_000);
}

// Immersive: tight framing on the primary city so buildings, stat cards,
// and the symbolic skyline read clearly. Capped low so the fake city
// blocks (200-900m tall) fill the viewport.
function immersiveHeight(b) {
  return clamp(maxRangeDeg(b) * 111_000 * 0.03, 2_500, 5_000);
}

export function useImmersionController() {
  const viewer = useMapStore((s) => s.viewer);
  const immersionMode = useMapStore((s) => s.immersionMode);
  const focusedCity = useMapStore((s) => s.focusedCity);

  const inProgress = useRef(false);
  const lastSig = useRef('');

  // Mirror the current mode onto <body> so plain CSS can react.
  useEffect(() => {
    const body = document.body;
    body.className = body.className
      .replace(/\bimmersion-\w+\b/g, '')
      .trim()
      .concat(` immersion-${immersionMode}`)
      .trim();
  }, [immersionMode]);

  const runTransition = useCallback(
    async (targetMode, city) => {
      const sig = `${targetMode}:${city?.name || 'none'}`;

      if (inProgress.current) {
        useMapStore.getState().enqueueTransition(targetMode, city);
        return;
      }
      if (sig === lastSig.current) return;
      lastSig.current = sig;

      inProgress.current = true;
      useMapStore.getState().setIsTransitioning(true);

      try {
        if (targetMode === 'ambient') {
          await flyCamera(viewer, {
            destination: CONTINENTAL,
            pitch: -90,
            duration: 2.0,
          });
          await animateShellOpacity(SHELL.ambient, 600);
          window.dispatchEvent(new CustomEvent('immersion:boardExit'));
        } else if (targetMode === 'reactive' && city) {
          const eco = getEcosystemCities(city);
          const bounds = ecosystemBounds(city, eco);
          await snapCamera(viewer, {
            destination: {
              lon: city.lon,
              lat: city.lat,
              height: reactiveHeight(bounds),
            },
            pitch: -60,
          });
          await animateShellOpacity(SHELL.reactive, 400);
          window.dispatchEvent(
            new CustomEvent('immersion:ecosystemShow', {
              detail: { city, ecosystem: eco },
            })
          );
        } else if (targetMode === 'immersive' && city) {
          useMapStore.setState({
            previousImmersionMode:
              useMapStore.getState().immersionMode === 'immersive'
                ? useMapStore.getState().previousImmersionMode
                : useMapStore.getState().immersionMode,
          });

          const eco = getEcosystemCities(city);
          const bounds = ecosystemBounds(city, eco);
          await flyCamera(viewer, {
            destination: {
              lon: city.lon,
              lat: city.lat,
              height: immersiveHeight(bounds),
            },
            pitch: -45,
            duration: 1.2,
          });
          await animateShellOpacity(SHELL.immersive, 400);

          await useMapStore.getState().fetchCityStats(city.name);

          window.dispatchEvent(
            new CustomEvent('immersion:ecosystemShow', {
              detail: { city, ecosystem: eco },
            })
          );
          window.dispatchEvent(
            new CustomEvent('immersion:fakeCityGenerate', {
              detail: { city, articleId: city.articleId },
            })
          );
          window.dispatchEvent(
            new CustomEvent('immersion:boardLayout', {
              detail: { city, ecosystem: eco },
            })
          );
        }

        useMapStore.getState().setImmersionMode(targetMode);

        if (import.meta.env.DEV) {
          const h = viewer?.camera?.positionCartographic?.height;
          console.debug(
            `[ImmersionCtrl] → ${targetMode}${city ? ` (${city.name})` : ''}`,
            `camera alt=${h != null ? Math.round(h) + 'm' : 'unknown'}`
          );
        }
      } finally {
        useMapStore.getState().setIsTransitioning(false);
        inProgress.current = false;

        const next = useMapStore.getState().dequeueTransition();
        if (next) runTransition(next.mode, next.city);
      }
    },
    [viewer]
  );

  // React to store-driven mode/city changes. Immersive entry is never
  // triggered here — it always comes through transitionTo().
  useEffect(() => {
    if (!viewer) return;
    if (immersionMode === 'immersive') return;
    if (immersionMode === 'reactive' && focusedCity) {
      runTransition('reactive', focusedCity);
    } else if (immersionMode === 'ambient') {
      runTransition('ambient', null);
    }
  }, [immersionMode, focusedCity, viewer, runTransition]);

  const transitionTo = useCallback(
    (mode, city) => runTransition(mode, city),
    [runTransition]
  );

  // Per the v2 state machine, every exit lands in Ambient.
  const exitImmersive = useCallback(() => {
    runTransition('ambient', null);
  }, [runTransition]);

  // Escape exits Immersive.
  useEffect(() => {
    const onKey = (e) => {
      if (
        e.key === 'Escape' &&
        useMapStore.getState().immersionMode === 'immersive'
      ) {
        exitImmersive();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [exitImmersive]);

  return useMemo(
    () => ({ transitionTo, exitImmersive }),
    [transitionTo, exitImmersive]
  );
}
