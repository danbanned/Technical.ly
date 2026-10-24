import { useCallback, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import LeafletView from '../map/LeafletView';
import CollapsibleCard from '../ui/CollapsibleCard';
import CountyCard from '../ui/CountyCard';
import EmptyState from '../ui/EmptyState';
import { BUILDINGS, buildingsInTract, fmt, getTract, TRACTS_LAST_UPDATED } from '../data/places';

const TABS = [
  { id: 'building', label: 'Building Location' },
  { id: 'census', label: 'Census Data' },
];

function Tabs({ active, onChange }) {
  const onKeyDown = (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const i = TABS.findIndex((t) => t.id === active);
    const next = TABS[(i + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length];
    onChange(next.id);
    document.getElementById(`tab-${next.id}`)?.focus();
  };
  return (
    <div className="bv-tabs" role="tablist" aria-label="Map panel" onKeyDown={onKeyDown}>
      {TABS.map((t) => (
        <button
          key={t.id}
          id={`tab-${t.id}`}
          type="button"
          role="tab"
          className="bv-tab"
          aria-selected={active === t.id}
          aria-controls={`panel-${t.id}`}
          tabIndex={active === t.id ? 0 : -1}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function TractRows({ tract }) {
  if (!tract) return <EmptyState>Select a building to see its tract.</EmptyState>;
  return (
    <dl className="bv-rows">
      <div><dt>Tract</dt><dd>{tract.name} · GEOID {tract.id}</dd></div>
      <div><dt>Neighborhood</dt><dd>{tract.neighborhood}</dd></div>
      <div><dt>Median household income (sample)</dt><dd>{fmt.usd(tract.medianIncome)}</dd></div>
      <div><dt>Unemployment rate (sample)</dt><dd>{fmt.pctFromFraction(tract.unemploymentRate)}</dd></div>
      <div><dt>Mobility, 0–100 (sample)</dt><dd>{fmt.num(tract.mobilityScore, 0)}</dd></div>
    </dl>
  );
}

export default function MapPage() {
  const mapRef = useRef(null);
  const navigate = useNavigate();
  const [tab, setTab] = useState('building');
  const [selectedId, setSelectedId] = useState('');
  const selected = BUILDINGS.find((b) => b.id === selectedId) ?? null;
  const tract = selected ? getTract(selected.sourceTractId) : null;
  const onSelect = useCallback((id) => setSelectedId(id), []);

  return (
    <div className="bv-page">
      <div className="bv-row-between">
        <h1 className="bv-page-title">Location &amp; Data</h1>
        <div className="bv-row">
          <Link className="bv-btn" to="/area">Area context</Link>
          <Link className="bv-btn bv-btn-primary" to="/3d">Open 3D Map <span aria-hidden="true">›</span></Link>
        </div>
      </div>

      <div className="bv-split">
        <section className="bv-card" aria-labelledby="context-heading">
          <h2 id="context-heading">Map context</h2>
          <CollapsibleCard title="Place" tag="Sample" description="Current neighborhood context and on-map reference points">
            <p>{BUILDINGS.length} reference points from the app&apos;s place data are on the map.</p>
            {selected
              ? <p>Selected: <strong>{selected.name}</strong> ({tract?.neighborhood ?? 'No data yet'}).</p>
              : <p className="bv-hint">Select a building to see its place.</p>}
          </CollapsibleCard>
          <CollapsibleCard title="Area context" tag="Context" description="Tract-level comparisons, surrounding activity, and nearby indicators">
            {tract ? (
              <>
                <p>Other places in {tract.name}:</p>
                <ul>
                  {buildingsInTract(tract.id).filter((b) => b.id !== selected.id).map((b) => <li key={b.id}>{b.name}</li>)}
                </ul>
                {buildingsInTract(tract.id).length <= 1 && <p className="bv-hint">No other places in this tract.</p>}
                <Link className="bv-link" to={`/location/${tract.id}`}>Open location details <span aria-hidden="true">›</span></Link>
              </>
            ) : <EmptyState>Select a building to see its area.</EmptyState>}
          </CollapsibleCard>
          <CollapsibleCard title="Selected tract" tag="Selected" description="Highlights the dataset being inspected and its key geographies">
            <TractRows tract={tract} />
          </CollapsibleCard>
          <CollapsibleCard title="Source lineage" tag="Source" description="Tracks whether the view is using live, bundled, or model-derived data">
            <dl className="bv-rows">
              <div><dt>Basemap</dt><dd>Live: OpenStreetMap tiles</dd></div>
              <div><dt>Place markers</dt><dd>Bundled sample: philadelphiaBuildings.js</dd></div>
              <div><dt>Tract values</dt><dd>Bundled sample: philadelphiaTracts.js ({TRACTS_LAST_UPDATED})</dd></div>
              <div><dt>Census ACS</dt><dd>Not connected</dd></div>
            </dl>
          </CollapsibleCard>
        </section>

        <section className="bv-card" aria-label="Map">
          <Tabs active={tab} onChange={setTab} />

          <div id="panel-building" role="tabpanel" aria-labelledby="tab-building" hidden={tab !== 'building'}>
            <div className="bv-field">
              <label htmlFor="building-select">Select a building</label>
              <select id="building-select" className="bv-select" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
                <option value="">Choose a place</option>
                {BUILDINGS.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="bv-row" style={{ marginTop: 10 }}>
              <button type="button" className="bv-btn" disabled={!selected} onClick={() => selected && mapRef.current?.centerOn(selected.lat, selected.lon)}>
                Center selection
              </button>
              <button type="button" className="bv-btn" onClick={() => { setSelectedId(''); mapRef.current?.resetView(); }}>
                Reset view
              </button>
            </div>
          </div>

          <div id="panel-census" role="tabpanel" aria-labelledby="tab-census" hidden={tab !== 'census'}>
            <p className="bv-hint">Sample values for the selected building&apos;s tract. The app makes no Census request.</p>
            <TractRows tract={tract} />
          </div>

          <LeafletView ref={mapRef} places={BUILDINGS} selectedId={selectedId} onSelect={onSelect} />
          <p className="bv-hint">
            Census estimates use the selected GEOID only. Official geography is separate from synthetic 3D model metrics.
          </p>
          <div className="bv-row">
            <button type="button" className="bv-btn" onClick={() => navigate('/3d')}>Open 3D Map <span aria-hidden="true">›</span></button>
          </div>
        </section>
      </div>

      <CountyCard />
    </div>
  );
}
