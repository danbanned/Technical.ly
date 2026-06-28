import * as Cesium from 'cesium';
import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useMapStore } from '../store/useMapStore';
import { findTopGaps } from '../core/cbs';
import DataStamp from './DataStamp';

export default function InsightsCard() {
  const tracts = useMapStore((s) => s.philaTractsWithCBS);
  const viewer = useMapStore((s) => s.viewer);
  const selectPhilaTract = useMapStore((s) => s.selectPhilaTract);
  const philaSelectedTract = useMapStore((s) => s.philaSelectedTract);
  const [expanded, setExpanded] = useState(false);

  const toggleExpanded = useCallback(() => {
    setExpanded((v) => {
      const next = !v;
      if (viewer) viewer.scene.screenSpaceCameraController.enableInputs = !next;
      return next;
    });
  }, [viewer]);

  const collapse = useCallback(() => {
    setExpanded(false);
    if (viewer) viewer.scene.screenSpaceCameraController.enableInputs = true;
  }, [viewer]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape' && expanded) collapse(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [expanded, collapse]);

  // Hide when a tract is already selected — InspectPanel takes the right rail
  if (philaSelectedTract || !tracts.length) return null;

  const gaps = findTopGaps(tracts, 3);

  const handleClick = (tract) => {
    selectPhilaTract(tract.id);
    collapse();
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

  const panelContent = (
    <div
      className={`phila-panel phila-insights-panel${expanded ? ' is-expanded' : ''}`}
      role="region"
      aria-label="Top opportunity gaps"
      aria-expanded={expanded}
    >
      <div className="phila-panel-topbar">
        <h3 style={{ margin: 0 }}>🔍 Top opportunity gaps</h3>
        <button
          className="phila-icon-btn"
          onClick={toggleExpanded}
          aria-label={expanded ? 'Minimize panel' : 'Expand to full screen'}
          title={expanded ? 'Minimize' : 'Expand'}
        >
          {expanded ? '⊡' : '⊞'}
        </button>
      </div>
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
      <DataStamp sourceId="syntheticSeed" style={{ marginTop: 8 }} />
    </div>
  );

  if (expanded) {
    return createPortal(
      <>
        <div className="phila-expand-backdrop" onClick={collapse} />
        {panelContent}
      </>,
      document.body
    );
  }

  return panelContent;
}
