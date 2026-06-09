import { useEffect, useRef } from 'react';
import { useMapStore } from './store/useMapStore';
import PhilaCesiumMap from './PhilaCesiumMap';
import PhiladelphiaLayers from './components/Globe/Layers/PhiladelphiaLayers';
import LayerToggles from './ui/LayerToggles';
import RegionSnapshot from './ui/RegionSnapshot';
import InspectPanel from './ui/InspectPanel';
import InsightsCard from './ui/InsightsCard';
import CompareMode from './ui/CompareMode';
import TractList from './ui/TractList';
import Legend from './ui/Legend';
import './ui/phila.css';

/**
 * Self-contained Philadelphia pilot — replaces the multi-city editorial layout.
 * The Cesium 3D map is the primary view; all UI panels float on top.
 * On load, auto-opens the Mantua tract (high innovation + low outcomes)
 * to show the mismatch story within 5 seconds.
 */
export default function PhiladelphiaApp() {
  const viewer = useMapStore((s) => s.viewer);
  const tractsWithCBS = useMapStore((s) => s.philaTractsWithCBS);
  const hasAutoSelected = useRef(false);

  // Pre-open Mantua (Tract 172) after CBS computes — shows mismatch story
  useEffect(() => {
    if (tractsWithCBS.length > 0 && !hasAutoSelected.current) {
      hasAutoSelected.current = true;
      useMapStore.getState().selectPhilaTract('42101017200');
    }
  }, [tractsWithCBS]);

  return (
    <div className="phila-app">
      {/* 3D Map — full viewport background */}
      <PhilaCesiumMap />

      {/* Philadelphia layer entities (buildings + tracts) */}
      {viewer && <PhiladelphiaLayers viewer={viewer} />}

      {/* Top header bar */}
      <header className="phila-app-header" role="banner">
        <span className="phila-app-wordmark">technical.me</span>
        <span className="phila-app-divider">|</span>
        <span className="phila-app-title">Philadelphia Pilot</span>
        <span className="phila-sample-badge phila-sample-badge--header">Sample Data</span>
      </header>

      {/* Left rail: layer controls + tract keyboard selector */}
      <aside className="phila-left-rail" aria-label="Map controls">
        <LayerToggles />
        <TractList />
      </aside>

      {/* Right rail: city overview + inspect / insights */}
      <aside className="phila-right-rail" aria-label="Data panels">
        <RegionSnapshot />
        <InspectPanel />
        <InsightsCard />
      </aside>

      {/* Compare mode — overlaid modal-style */}
      <CompareMode />

      {/* Bottom legend */}
      <Legend />
    </div>
  );
}
