import * as Cesium from 'cesium';

export function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * snapCamera — INSTANT camera move (no animation).
 *
 * Uses camera.lookAt() so the target city is always framed in the
 * center of the viewport regardless of pitch. The lookAtTransform
 * call immediately after frees the camera for user interaction.
 *
 * `options.destination.height` is treated as altitude above ground;
 * converted to range (distance from target) via sin(|pitch|).
 */
export function snapCamera(viewer, options) {
  return new Promise((resolve) => {
    if (!viewer || viewer.isDestroyed?.()) {
      resolve();
      return;
    }
    const { lon, lat, height } = options.destination;
    const pitchRad = Cesium.Math.toRadians(options.pitch ?? -60);
    const sinPitch = Math.abs(Math.sin(pitchRad));
    const range = sinPitch < 0.01 ? height : height / sinPitch;

    viewer.camera.lookAt(
      Cesium.Cartesian3.fromDegrees(lon, lat, 0),
      new Cesium.HeadingPitchRange(
        Cesium.Math.toRadians(options.heading ?? 0),
        pitchRad,
        range
      )
    );
    // Unlock from the lookAt orbit constraint so the user can pan freely.
    viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
    queueMicrotask(resolve);
  });
}

/**
 * flyCamera — CINEMATIC camera move (smooth flyTo).
 *
 * Offsets the camera position so its forward direction passes through
 * the target city at ground level. Without this, a non-nadir pitch
 * places the city behind the camera (invisible).
 *
 * For pitch = -90 (straight down) no horizontal offset is needed.
 * Honors prefers-reduced-motion by collapsing duration to 0.
 */
export function flyCamera(viewer, options) {
  return new Promise((resolve) => {
    if (!viewer || viewer.isDestroyed?.()) {
      resolve();
      return;
    }
    const duration = prefersReducedMotion() ? 0 : options.duration ?? 2.0;
    const { lon, lat, height } = options.destination;
    const heading = options.heading ?? 0;
    const pitch = options.pitch ?? -45;

    const { lon: camLon, lat: camLat } = cameraOffsetForLookAt(lon, lat, height, heading, pitch);

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(camLon, camLat, height),
      orientation: {
        heading: Cesium.Math.toRadians(heading),
        pitch: Cesium.Math.toRadians(pitch),
        roll: 0,
      },
      duration,
      complete: resolve,
      cancel: resolve,
    });
  });
}

/**
 * Computes camera (lon, lat) so that, at the given altitude and pitch,
 * the camera's forward ray passes through (targetLon, targetLat, 0).
 *
 * At heading=0, pitch=-45: camera is placed directly south of the
 * target, so looking north-and-down centers the city.
 */
function cameraOffsetForLookAt(targetLon, targetLat, altitude, headingDeg, pitchDeg) {
  if (pitchDeg <= -89) return { lon: targetLon, lat: targetLat };
  const pitchRad = Cesium.Math.toRadians(pitchDeg);
  const groundDist = Math.abs(altitude / Math.tan(pitchRad));
  const groundDistDeg = groundDist / 111_000;
  const headingRad = Cesium.Math.toRadians(headingDeg);
  return {
    lon: targetLon - groundDistDeg * Math.sin(headingRad),
    lat: targetLat - groundDistDeg * Math.cos(headingRad),
  };
}

/**
 * animateShellOpacity
 *
 * Tweens the --shell-*-opacity custom properties on :root so the
 * header, sidebar, and article feed crossfade between immersion
 * modes. Resolves when the tween completes.
 */
export function animateShellOpacity(targets, duration = 800) {
  return new Promise((resolve) => {
    if (prefersReducedMotion()) {
      applyShellOpacity(targets);
      resolve();
      return;
    }

    const shell = document.documentElement;
    const start = {
      header: readCssNumber(shell, '--shell-header-opacity', 0.8),
      sidebar: readCssNumber(shell, '--shell-sidebar-opacity', 0.8),
      articleFeed: readCssNumber(shell, '--shell-feed-opacity', 1.0),
    };
    const startTime = performance.now();

    function step(now) {
      const progress = Math.min((now - startTime) / duration, 1.0);
      const eased =
        progress < 0.5
          ? 2 * progress * progress
          : -1 + (4 - 2 * progress) * progress;

      shell.style.setProperty(
        '--shell-header-opacity',
        (start.header + (targets.header - start.header) * eased).toFixed(3)
      );
      shell.style.setProperty(
        '--shell-sidebar-opacity',
        (start.sidebar + (targets.sidebar - start.sidebar) * eased).toFixed(3)
      );
      shell.style.setProperty(
        '--shell-feed-opacity',
        (start.articleFeed + (targets.articleFeed - start.articleFeed) * eased).toFixed(3)
      );

      if (progress < 1.0) {
        requestAnimationFrame(step);
      } else {
        applyShellOpacity(targets);
        resolve();
      }
    }

    requestAnimationFrame(step);
  });
}

function applyShellOpacity(targets) {
  const shell = document.documentElement;
  shell.style.setProperty('--shell-header-opacity', String(targets.header));
  shell.style.setProperty('--shell-sidebar-opacity', String(targets.sidebar));
  shell.style.setProperty('--shell-feed-opacity', String(targets.articleFeed));
}

function readCssNumber(el, prop, fallback) {
  const n = parseFloat(getComputedStyle(el).getPropertyValue(prop).trim());
  return Number.isFinite(n) ? n : fallback;
}
