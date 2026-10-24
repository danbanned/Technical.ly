import { lazy, Suspense } from 'react';
import { loadCesium } from '../map/loadCesium';
import ErrorBoundary from '../ui/ErrorBoundary';
import { useShellStore } from '../store/useShellStore';

// The 3D map app from main, mounted full-bleed in the content area. Cesium.js
// (several MB) and the map's code load only when this page opens.
const PhiladelphiaApp = lazy(() => loadCesium().then(() => import('../PhiladelphiaApp')));

// Show/hide handles for the map's overlay groups. They only hide the map's own
// containers with CSS (see shell.css); the panels stay mounted and unchanged.
const HANDLES = [
  { key: 'left', label: 'Layers' },
  { key: 'right', label: 'Details' },
  { key: 'legend', label: 'Legend' },
];

export default function Map3DPage() {
  const panels = useShellStore((s) => s.mapPanels);
  const togglePanel = useShellStore((s) => s.toggleMapPanel);
  const hidden = HANDLES.filter((h) => !panels[h.key]).map((h) => ` bv-hide-${h.key}`).join('');

  return (
    <div className={`bv-map-host${hidden}`}>
      <h1 className="bv-sr-only">3D Map</h1>
      <div className="bv-map-handles" role="group" aria-label="Map panels">
        {HANDLES.map((h) => (
          <button
            key={h.key}
            type="button"
            className="bv-map-handle"
            aria-expanded={panels[h.key]}
            onClick={() => togglePanel(h.key)}
          >
            <span aria-hidden="true">{panels[h.key] ? '▾' : '▸'}</span>
            {h.label}
            <span className="bv-sr-only">{panels[h.key] ? ' panel shown' : ' panel hidden'}</span>
          </button>
        ))}
      </div>
      <ErrorBoundary fallback="The 3D map could not be loaded. Check your connection and reload the page.">
        <Suspense fallback={<p className="bv-map-loading">Loading the 3D map…</p>}>
          <PhiladelphiaApp />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
