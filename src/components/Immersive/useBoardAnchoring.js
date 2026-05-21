import { useEffect, useRef, useState } from 'react';
import * as Cesium from 'cesium';

/**
 * useBoardAnchoring
 *
 * Converts the city's lat/lon (plus four compass offsets) into screen
 * pixel coordinates, refreshed every frame via the viewer's postRender
 * event. Also exposes `isCameraIdle`, which becomes true once the
 * camera has been still for 300ms so consumers can apply a sharper
 * "snapped" render path.
 *
 * The viewer is read from the Zustand store so callers don't have to
 * thread a ref through the tree.
 */
const GEO_OFFSETS = {
  center: { lat: 0,     lon: 0     },
  north:  { lat: 0.05,  lon: 0     },
  south:  { lat: -0.05, lon: 0     },
  east:   { lat: 0,     lon: 0.08  },
  west:   { lat: 0,     lon: -0.08 },
};

const IDLE_THRESHOLD_MS = 300;
const OFFSCREEN = { x: -9999, y: -9999 };

export function useBoardAnchoring(viewer, cityLat, cityLon) {
  const [positions, setPositions] = useState({
    center: OFFSCREEN,
    north: OFFSCREEN,
    south: OFFSCREEN,
    east: OFFSCREEN,
    west: OFFSCREEN,
  });
  const [isCameraIdle, setIsCameraIdle] = useState(false);

  const lastCameraState = useRef({ position: null, time: 0 });

  useEffect(() => {
    if (!viewer || viewer.isDestroyed?.()) return;
    if (cityLat == null || cityLon == null) return;

    // Cesium renamed wgs84ToWindowCoordinates → worldToWindowCoordinates.
    // Resolve whichever the installed version exposes so the hook works
    // across Cesium releases.
    const toWindow =
      Cesium.SceneTransforms.worldToWindowCoordinates ||
      Cesium.SceneTransforms.wgs84ToWindowCoordinates;

    const updatePositions = () => {
      const next = {};
      for (const [key, offset] of Object.entries(GEO_OFFSETS)) {
        const cartesian = Cesium.Cartesian3.fromDegrees(
          cityLon + offset.lon,
          cityLat + offset.lat,
          0
        );
        const screen = toWindow(viewer.scene, cartesian);
        next[key] = screen
          ? { x: screen.x, y: screen.y }
          : OFFSCREEN;
      }
      setPositions(next);

      // Camera-idle detection — once still for > 300ms, snap.
      const now = Date.now();
      const prev = lastCameraState.current.position;
      const same =
        prev &&
        viewer.camera.position.equalsEpsilon(prev, 0.01);
      if (same) {
        if (now - lastCameraState.current.time > IDLE_THRESHOLD_MS) {
          setIsCameraIdle(true);
        }
      } else {
        setIsCameraIdle(false);
        lastCameraState.current = {
          position: viewer.camera.position.clone(),
          time: now,
        };
      }
    };

    viewer.scene.postRender.addEventListener(updatePositions);
    updatePositions();

    return () => {
      if (!viewer.isDestroyed?.()) {
        viewer.scene.postRender.removeEventListener(updatePositions);
      }
    };
  }, [viewer, cityLat, cityLon]);

  return { positions, isCameraIdle };
}
