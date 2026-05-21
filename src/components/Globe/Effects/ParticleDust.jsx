import { useEffect } from 'react';
import * as Cesium from 'cesium';
import { useMapStore } from '../../../store/useMapStore';
import { getDustTexture } from '../../../utils/particleConfigs';

/**
 * ParticleDust
 *
 * Emits orange dust around the focused city — visible only while the
 * page is Reactive or Immersive. Emission rate scales with the city's
 * deal count so a hot market looks busier than a quiet one. The
 * system is torn down and rebuilt when the focused city changes,
 * which keeps the particles anchored to the right coordinates.
 *
 * prefers-reduced-motion suppresses the system entirely.
 */
export default function ParticleDust({ viewer }) {
  const focusedCity = useMapStore((s) => s.focusedCity);
  const immersionMode = useMapStore((s) => s.immersionMode);
  const dealCount = useMapStore((s) => s.focusedCityStats?.dealCount ?? 0);

  useEffect(() => {
    if (!viewer || viewer.isDestroyed?.()) return;
    if (!focusedCity) return;
    if (immersionMode === 'ambient') return;

    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    const image = getDustTexture();
    if (!image) return;

    const emissionRate = Math.max(2, Math.min(60, dealCount * 0.5));
    const altitude = immersionMode === 'immersive' ? 120 : 600;

    const system = new Cesium.ParticleSystem({
      image,
      startScale: 1.0,
      endScale: 4.0,
      particleLife: 3.0,
      speed: 2.0,
      imageSize: new Cesium.Cartesian2(8, 8),
      emissionRate,
      emitter: new Cesium.CircleEmitter(5000),
      modelMatrix: Cesium.Transforms.eastNorthUpToFixedFrame(
        Cesium.Cartesian3.fromDegrees(focusedCity.lon, focusedCity.lat, altitude)
      ),
      startColor: Cesium.Color.fromCssColorString('#FF8A00').withAlpha(0.55),
      endColor: Cesium.Color.fromCssColorString('#FF8A00').withAlpha(0.0),
    });

    viewer.scene.primitives.add(system);

    return () => {
      if (!viewer.isDestroyed?.() && system && !system.isDestroyed?.()) {
        viewer.scene.primitives.remove(system);
      }
    };
  }, [viewer, focusedCity, immersionMode, dealCount]);

  return null;
}
