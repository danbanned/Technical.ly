import { useEffect } from 'react';
import * as Cesium from 'cesium';

/**
 * DayNightCycle
 *
 * Syncs the viewer's clock, sun, moon, and atmosphere to real-world
 * time so the sky reflects time of day. Honors prefers-reduced-motion
 * by freezing the clock at "now" instead of animating it.
 *
 * Globe surface lighting is intentionally left OFF: this is a data
 * tool, and `globe.enableLighting` blacks out the night-side surface,
 * hiding the city the reader is trying to see. The sun/moon/atmosphere
 * still provide the time-of-day ambiance without darkening the data.
 */
export default function DayNightCycle({ viewer }) {
  useEffect(() => {
    if (!viewer || viewer.isDestroyed?.()) return;

    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    viewer.clock.currentTime = Cesium.JulianDate.fromDate(new Date());
    viewer.clock.multiplier = reduced ? 0 : 1;
    viewer.clock.shouldAnimate = !reduced;

    viewer.scene.globe.enableLighting = false;
    viewer.scene.sun.show = true;
    viewer.scene.moon.show = true;
    viewer.scene.skyAtmosphere.show = true;
    viewer.scene.skyAtmosphere.brightnessShift = 0.1;
    viewer.scene.skyAtmosphere.hueShift = 0.0;

    return () => {
      if (viewer.isDestroyed?.()) return;
      viewer.clock.shouldAnimate = false;
    };
  }, [viewer]);

  return null;
}
