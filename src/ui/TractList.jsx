import * as Cesium from 'cesium';
import { useRef, useState } from 'react';
import { useMapStore } from '../store/useMapStore';

export default function TractList() {
  const tracts = useMapStore((s) => s.philaTractsWithCBS);
  const selected = useMapStore((s) => s.philaSelectedTract);
  const viewer = useMapStore((s) => s.viewer);
  const selectPhilaTract = useMapStore((s) => s.selectPhilaTract);
  const [open, setOpen] = useState(false);
  const listRef = useRef(null);

  if (!tracts.length) return null;

  const sorted = [...tracts].sort((a, b) => a.neighborhood.localeCompare(b.neighborhood));

  const pickTract = (tract) => {
    selectPhilaTract(tract.id);
    setOpen(false);
    if (!viewer) return;
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(tract.centroid[0], tract.centroid[1], 1200),
      orientation: { heading: 0, pitch: Cesium.Math.toRadians(-30), roll: 0 },
      duration: 1.2,
    });
  };

  const handleItemKey = (e, tract, idx) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      pickTract(tract);
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const items = listRef.current?.querySelectorAll('[role=option]');
      items?.[idx + 1]?.focus();
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const items = listRef.current?.querySelectorAll('[role=option]');
      items?.[idx - 1]?.focus();
    }
    if (e.key === 'Escape') setOpen(false);
  };

  return (
    <div className="phila-panel phila-tract-panel">
      <button
        className="phila-tract-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="phila-tract-list"
        aria-label={open ? 'Collapse tract list' : 'Expand tract list'}
      >
        <span>Tracts ({tracts.length})</span>
        <span aria-hidden="true">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div
          id="phila-tract-list"
          ref={listRef}
          role="listbox"
          aria-label="Select a census tract"
          aria-multiselectable="false"
        >
          {sorted.map((tract, idx) => (
            <div
              key={tract.id}
              role="option"
              tabIndex={0}
              aria-selected={selected?.id === tract.id}
              className={`phila-tract-item${selected?.id === tract.id ? ' is-selected' : ''}`}
              onClick={() => pickTract(tract)}
              onKeyDown={(e) => handleItemKey(e, tract, idx)}
              aria-label={`${tract.neighborhood}, CBS ${tract.cbs}`}
            >
              <span>{tract.neighborhood}</span>
              <span className="phila-tract-cbs">{tract.cbs}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
