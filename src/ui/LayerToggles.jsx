import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useMapStore } from '../store/useMapStore';

const LAYERS = [
  { key: 'innovation', label: 'Innovation', color: '#00d1ff' },
  { key: 'investment', label: 'Investment', color: '#FF8A00' },
  { key: 'mobility', label: 'Mobility', color: '#2E7D32' },
  { key: 'labels', label: 'Labels', color: '#90a4ae' },
];

const HAS_ION_TOKEN  = !!import.meta.env.VITE_CESIUM_ION_TOKEN;
const HAS_GOOGLE_KEY = !!import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

export default function LayerToggles() {
  const visibility = useMapStore((s) => s.philaLayerVisibility);
  const cbSafe = useMapStore((s) => s.philaCBSafeMode);
  const osmOn              = useMapStore((s) => s.philaOSMBuildings);
  const osmHeightScale     = useMapStore((s) => s.philaOSMHeightScale);
  const googleOn           = useMapStore((s) => s.philaGoogleTiles);
  const enrichedOn         = useMapStore((s) => s.philaEnrichedBuildings);
  const economicColor      = useMapStore((s) => s.philaEconomicColor);
  const heightDebug        = useMapStore((s) => s.philaHeightDebug);
  const heightScale    = useMapStore((s) => s.philaBuildingHeightScale);
  const connectMode    = useMapStore((s) => s.philaConnectMode);
  const viewer         = useMapStore((s) => s.viewer);
  const setLayerVisibility = useMapStore((s) => s.setPhilaLayerVisibility);
  const setCBSafe      = useMapStore((s) => s.setPhilaCBSafeMode);
  const setConnectMode = useMapStore((s) => s.setPhilaConnectMode);
  const setOSMBuildings   = useMapStore((s) => s.setPhilaOSMBuildings);
  const setOSMHeightScale = useMapStore((s) => s.setPhilaOSMHeightScale);
  const setGoogleTiles        = useMapStore((s) => s.setPhilaGoogleTiles);
  const setEnrichedBuildings  = useMapStore((s) => s.setPhilaEnrichedBuildings);
  const setEconomicColor      = useMapStore((s) => s.setPhilaEconomicColor);
  const setHeightDebug        = useMapStore((s) => s.setPhilaHeightDebug);
  const setHeightScale        = useMapStore((s) => s.setPhilaBuildingHeightScale);
  const [expanded, setExpanded] = useState(false);

  const collapse = useCallback(() => {
    setExpanded(false);
    if (viewer) viewer.scene.screenSpaceCameraController.enableInputs = true;
  }, [viewer]);

  const toggleExpanded = useCallback(() => {
    setExpanded((v) => {
      const next = !v;
      if (viewer) viewer.scene.screenSpaceCameraController.enableInputs = !next;
      return next;
    });
  }, [viewer]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape' && expanded) collapse(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [expanded, collapse]);

  const panelContent = (
    <div className={`phila-panel phila-layer-panel${expanded ? ' is-expanded' : ''}`} role="group" aria-label="Map layer controls">
      <div className="phila-panel-topbar">
        <h3 style={{ margin: 0 }}>Layers</h3>
        <button
          className="phila-icon-btn"
          onClick={toggleExpanded}
          aria-label={expanded ? 'Minimize panel' : 'Expand to full screen'}
          title={expanded ? 'Minimize' : 'Expand'}
        >
          {expanded ? '⊡' : '⊞'}
        </button>
      </div>

      {LAYERS.map(({ key, label, color }) => (
        <label key={key} className="phila-toggle-row">
          <input
            type="checkbox"
            checked={visibility[key] ?? true}
            onChange={(e) => setLayerVisibility(key, e.target.checked)}
            aria-label={`Toggle ${label} layer`}
          />
          <span style={{ color: visibility[key] ? color : '#546e7a' }}>{label}</span>
        </label>
      ))}

      <hr className="phila-toggle-divider" />

      <label
        className={`phila-toggle-row${!HAS_ION_TOKEN ? ' is-disabled' : ''}`}
        title={HAS_ION_TOKEN ? 'Toggle OSM 3D buildings' : 'Add VITE_CESIUM_ION_TOKEN to .env to enable'}
      >
        <input
          type="checkbox"
          checked={osmOn}
          disabled={!HAS_ION_TOKEN}
          onChange={(e) => setOSMBuildings(e.target.checked)}
          aria-label="Toggle OSM 3D buildings"
        />
        <span style={{ color: osmOn && HAS_ION_TOKEN ? '#8bc34a' : '#546e7a' }}>
          OSM Buildings{!HAS_ION_TOKEN && <span className="phila-toggle-hint"> (needs Ion)</span>}
        </span>
      </label>

      {osmOn && HAS_ION_TOKEN && (
        <div className="phila-height-control phila-osm-height-control">
          <div className="phila-height-label">
            <span style={{ color: '#8bc34a' }}>↕ OSM height</span>
            <span className="phila-height-val" style={{ color: '#8bc34a' }}>{osmHeightScale.toFixed(1)}×</span>
          </div>
          <input
            type="range"
            className="phila-height-slider phila-height-slider--osm"
            min={1}
            max={10}
            step={0.5}
            value={osmHeightScale}
            onChange={(e) => setOSMHeightScale(parseFloat(e.target.value))}
            aria-label={`OSM building height exaggeration: ${osmHeightScale.toFixed(1)}x`}
          />
          <div className="phila-height-ticks">
            <span>1×</span><span>5×</span><span>10×</span>
          </div>
        </div>
      )}

      <label
        className={`phila-toggle-row${!HAS_GOOGLE_KEY ? ' is-disabled' : ''}`}
        title={HAS_GOOGLE_KEY
          ? 'Toggle Google Photorealistic 3D Tiles'
          : 'Add VITE_GOOGLE_MAPS_API_KEY to .env to enable'}
      >
        <input
          type="checkbox"
          checked={googleOn}
          disabled={!HAS_GOOGLE_KEY}
          onChange={(e) => setGoogleTiles(e.target.checked)}
          aria-label="Toggle Google Photorealistic 3D Tiles"
        />
        <span style={{ color: googleOn && HAS_GOOGLE_KEY ? '#4db6ac' : '#546e7a' }}>
          Google 3D Tiles{!HAS_GOOGLE_KEY && <span className="phila-toggle-hint"> (needs key)</span>}
        </span>
      </label>

      <label
        className={`phila-toggle-row${!HAS_ION_TOKEN ? ' is-disabled' : ''}`}
        title={HAS_ION_TOKEN
          ? 'Toggle enriched Philadelphia buildings (574k, colored by mobility score)'
          : 'Add VITE_CESIUM_ION_TOKEN to .env to enable'}
      >
        <input
          type="checkbox"
          checked={enrichedOn}
          disabled={!HAS_ION_TOKEN}
          onChange={(e) => setEnrichedBuildings(e.target.checked)}
          aria-label="Toggle enriched Philadelphia buildings"
        />
        <span style={{ color: enrichedOn && HAS_ION_TOKEN ? '#00d1ff' : '#546e7a' }}>
          Enriched Buildings{!HAS_ION_TOKEN && <span className="phila-toggle-hint"> (needs Ion)</span>}
        </span>
      </label>

      <label
        className={`phila-toggle-row phila-toggle-sub${!enrichedOn || !HAS_ION_TOKEN ? ' is-disabled' : ''}`}
        title="Color buildings by economic outcome (mobility score, innovation index, building type)"
        style={{ paddingLeft: 20 }}
      >
        <input
          type="checkbox"
          checked={economicColor}
          disabled={!enrichedOn || !HAS_ION_TOKEN}
          onChange={(e) => { setEconomicColor(e.target.checked); if (e.target.checked) setHeightDebug(false); }}
          aria-label="Toggle economic color mode"
        />
        <span style={{ color: economicColor && enrichedOn ? '#FF8A00' : '#546e7a', fontSize: '0.82em' }}>
          Economic Color
          {economicColor && enrichedOn && (
            <span className="phila-toggle-hint" style={{ color: '#FF8A00', marginLeft: 4 }}>● live</span>
          )}
        </span>
      </label>

      <label
        className={`phila-toggle-row phila-toggle-sub${!enrichedOn || !HAS_ION_TOKEN ? ' is-disabled' : ''}`}
        title="Color buildings by height_m only — no tract data needed. Use to verify the style system works. Check browser console for property names."
        style={{ paddingLeft: 20 }}
      >
        <input
          type="checkbox"
          checked={heightDebug}
          disabled={!enrichedOn || !HAS_ION_TOKEN}
          onChange={(e) => { setHeightDebug(e.target.checked); if (e.target.checked) setEconomicColor(false); }}
          aria-label="Toggle height test style"
        />
        <span style={{ color: heightDebug && enrichedOn ? '#69f0ae' : '#546e7a', fontSize: '0.82em' }}>
          Height test
          {heightDebug && enrichedOn && (
            <span className="phila-toggle-hint" style={{ color: '#69f0ae', marginLeft: 4 }}>● check console</span>
          )}
        </span>
      </label>

      <hr className="phila-toggle-divider" />

      <div className="phila-height-control">
        <div className="phila-height-label">
          <span>Building height</span>
          <span className="phila-height-val">{heightScale.toFixed(1)}×</span>
        </div>
        <input
          type="range"
          className="phila-height-slider"
          min={0.5}
          max={8}
          step={0.5}
          value={heightScale}
          onChange={(e) => setHeightScale(parseFloat(e.target.value))}
          aria-label={`Building height scale: ${heightScale.toFixed(1)}x`}
        />
        <div className="phila-height-ticks">
          <span>½×</span><span>4×</span><span>8×</span>
        </div>
      </div>

      <hr className="phila-toggle-divider" />

      <label className="phila-toggle-row">
        <input
          type="checkbox"
          checked={cbSafe}
          onChange={(e) => setCBSafe(e.target.checked)}
          aria-label="Toggle color-blind safe palette"
        />
        <span>Color-blind safe</span>
      </label>

      <hr className="phila-toggle-divider" />

      <label
        className="phila-toggle-row"
        title="Auto-start Solution Connector tour when a tract is selected"
      >
        <input
          type="checkbox"
          checked={connectMode}
          onChange={(e) => setConnectMode(e.target.checked)}
          aria-label="Toggle Connect mode"
          style={{ accentColor: '#ffd700' }}
        />
        <span style={{ color: connectMode ? '#ffd700' : undefined }}>
          Connect mode
          {connectMode && <span className="phila-toggle-hint"> active</span>}
        </span>
      </label>
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
