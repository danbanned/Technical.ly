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
  const osmOn          = useMapStore((s) => s.philaOSMBuildings);
  const osmHeightScale = useMapStore((s) => s.philaOSMHeightScale);
  const googleOn       = useMapStore((s) => s.philaGoogleTiles);
  const heightScale    = useMapStore((s) => s.philaBuildingHeightScale);
  const setLayerVisibility = useMapStore((s) => s.setPhilaLayerVisibility);
  const setCBSafe      = useMapStore((s) => s.setPhilaCBSafeMode);
  const setOSMBuildings   = useMapStore((s) => s.setPhilaOSMBuildings);
  const setOSMHeightScale = useMapStore((s) => s.setPhilaOSMHeightScale);
  const setGoogleTiles    = useMapStore((s) => s.setPhilaGoogleTiles);
  const setHeightScale    = useMapStore((s) => s.setPhilaBuildingHeightScale);

  return (
    <div className="phila-panel phila-layer-panel" role="group" aria-label="Map layer controls">
      <h3>Layers</h3>

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
    </div>
  );
}
