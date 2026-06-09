import * as Cesium from 'cesium';
import { useMapStore } from '../store/useMapStore';
import { findTopGaps } from '../core/cbs';

export default function InsightsCard() {
  const tracts = useMapStore((s) => s.philaTractsWithCBS);
  const viewer = useMapStore((s) => s.viewer);
  const selectPhilaTract = useMapStore((s) => s.selectPhilaTract);
  const philaSelectedTract = useMapStore((s) => s.philaSelectedTract);

  // Hide when a tract is already selected — InspectPanel takes the right rail
  if (philaSelectedTract || !tracts.length) return null;

  const gaps = findTopGaps(tracts, 3);

  const handleClick = (tract) => {
    selectPhilaTract(tract.id);
    if (!viewer) return;
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        tract.centroid[0],
        tract.centroid[1],
        1200
      ),
      orientation: {
        heading: 0,
        pitch: Cesium.Math.toRadians(-30),
        roll: 0,
      },
      duration: 1.5,
    });
  };

  return (
    <div
      className="phila-panel phila-insights-panel"
      role="region"
      aria-label="Top opportunity gaps"
    >
      <h3>🔍 Top opportunity gaps</h3>
      {gaps.map((tract, i) => (
        <div
          key={tract.id}
          className="phila-gap-item"
          role="button"
          tabIndex={0}
          onClick={() => handleClick(tract)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleClick(tract);
            }
          }}
          aria-label={`${tract.neighborhood} — CBS ${tract.cbs}. Click to inspect.`}
        >
          <span className="phila-gap-rank">{i + 1}.</span>
          <span className="phila-gap-name">{tract.neighborhood}</span>
          <span className="phila-gap-cbs">CBS {tract.cbs}</span>
        </div>
      ))}
    </div>
  );
}
