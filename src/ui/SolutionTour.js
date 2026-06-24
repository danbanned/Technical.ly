/**
 * SolutionTour.js — imperative Cesium tour for Solution Connector.
 *
 * Usage:
 *   const tourRef = startSolutionTour(viewer, tract, recommendations);
 *   tourRef.stop(); // cancel at any time
 *
 * Sequence per recommendation:
 *   1. Fly to tract centroid (zoomed out, 2 km alt)
 *   2. Fly to asset location (800 m alt)
 *   3. Draw a dashed polyline between them
 *   4. Fire "solutionTour:step" event for the overlay UI
 *   5. Hold 2.5 s
 *   6. Remove polyline, move to next rec
 */

import * as Cesium from 'cesium';

const DASHED_MATERIAL = new Cesium.PolylineDashMaterialProperty({
  color: Cesium.Color.fromCssColorString('#00d1ff').withAlpha(0.85),
  dashLength: 18,
  dashPattern: 255,
});

function fly(viewer, lon, lat, alt, pitch, duration) {
  return new Promise((resolve) => {
    try { viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY); } catch {}
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(lon, lat, alt),
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(pitch),
        roll: 0,
      },
      duration,
      easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
      complete: resolve,
      cancel: resolve,
    });
  });
}

function sleep(ms, signal) {
  return new Promise((resolve) => {
    const tid = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => { clearTimeout(tid); resolve(); }, { once: true });
  });
}

export function startSolutionTour(viewer, tract, recommendations) {
  const controller = new AbortController();
  const { signal } = controller;

  const addedEntities = [];

  const cleanup = () => {
    addedEntities.forEach((e) => { try { viewer.entities.remove(e); } catch {} });
    addedEntities.length = 0;
    try { viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY); } catch {}
    try { viewer.scene.screenSpaceCameraController.enableInputs = true; } catch {}
    window.dispatchEvent(new CustomEvent('solutionTour:end'));
  };

  const run = async () => {
    try {
      viewer.scene.screenSpaceCameraController.enableInputs = false;
      const [tractLon, tractLat] = tract.centroid;

      for (let i = 0; i < recommendations.length; i++) {
        if (signal.aborted) break;
        const rec = recommendations[i];
        const { asset_lat, asset_lon, title, description, why_it_connects } = rec;

        if (!asset_lat || !asset_lon) continue;

        // Step 1: pull back to show the tract
        await fly(viewer, tractLon, tractLat, 2200, -40, 1.4);
        if (signal.aborted) break;

        // Step 2: fly to asset
        await fly(viewer, asset_lon, asset_lat, 900, -28, 1.8);
        if (signal.aborted) break;

        // Step 3: draw dashed line
        const lineEntity = viewer.entities.add({
          polyline: {
            positions: Cesium.Cartesian3.fromDegreesArray([
              tractLon, tractLat,
              asset_lon, asset_lat,
            ]),
            width: 2.5,
            material: DASHED_MATERIAL,
            clampToGround: false,
          },
        });
        addedEntities.push(lineEntity);

        // Step 4: notify UI
        window.dispatchEvent(new CustomEvent('solutionTour:step', {
          detail: { index: i, total: recommendations.length, title, description, why_it_connects },
        }));

        // Step 5: hold
        await sleep(2800, signal);

        // Step 6: remove line
        try { viewer.entities.remove(lineEntity); } catch {}
        const idx = addedEntities.indexOf(lineEntity);
        if (idx !== -1) addedEntities.splice(idx, 1);
      }
    } finally {
      cleanup();
    }
  };

  run();

  return {
    stop: () => { controller.abort(); cleanup(); },
  };
}

export function startSingleSolution(viewer, tract, rec) {
  return startSolutionTour(viewer, tract, [rec]);
}
