/**
 * particleConfigs — runtime-generated particle textures.
 *
 * The plan ships dust/bees/planes/cars assets, but we don't want a
 * hard PNG dependency in the demo. Each preset returns a canvas that
 * Cesium's ParticleSystem accepts directly as `image`.
 */

let dustCanvas = null;

export function getDustTexture() {
  if (dustCanvas) return dustCanvas;
  if (typeof document === 'undefined') return null;

  const size = 64;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  if (!ctx) return null;

  const grad = ctx.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2
  );
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  grad.addColorStop(0.4, 'rgba(255, 255, 255, 0.55)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  dustCanvas = c;
  return c;
}
