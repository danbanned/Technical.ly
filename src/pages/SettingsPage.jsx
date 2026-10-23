import { Link } from 'react-router-dom';
import ThemeToggle from '../ui/ThemeToggle';
import { useMapStore } from '../store/useMapStore';

export default function SettingsPage() {
  // The same value the 3D map's Labels toggle uses (PhiladelphiaLayers.jsx).
  const labelsOn = useMapStore((s) => s.philaLayerVisibility.labels);
  const setVis = useMapStore((s) => s.setPhilaLayerVisibility);

  return (
    <div className="bv-page">
      <div>
        <span className="bv-eyebrow">Workspace / Preferences</span>
        <h1 className="bv-page-title">Settings</h1>
      </div>

      <section className="bv-card" aria-labelledby="appearance-heading">
        <h2 id="appearance-heading">Appearance</h2>
        <p>Your theme preference is saved on this browser. The 3D scene keeps its map-specific appearance.</p>
        <ThemeToggle verbose />
      </section>

      <section className="bv-card" aria-labelledby="labels-heading">
        <h2 id="labels-heading">3D place labels</h2>
        <p>Show or hide building labels in the 3D explorer.</p>
        <div className="bv-row-between">
          <label className="bv-switch">
            <input type="checkbox" checked={!!labelsOn} onChange={(e) => setVis('labels', e.target.checked)} />
            <span>Show 3D labels</span>
          </label>
          <Link className="bv-link" to="/3d">Open 3D explorer <span aria-hidden="true">›</span></Link>
        </div>
      </section>

      <p className="bv-footer">BlockView Philly · Place and data explorer</p>
    </div>
  );
}
