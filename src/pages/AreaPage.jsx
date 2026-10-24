import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMapStore } from '../store/useMapStore';
import StatusBadge from '../ui/StatusBadge';
import { BUILDINGS, TRACTS } from '../data/places';
import { METRICS } from '../data/registry';

const HAS_ION_TOKEN = !!import.meta.env.VITE_CESIUM_ION_TOKEN;
const HAS_GOOGLE_KEY = !!import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// Map layer toggles that already exist in the 3D map (LayerToggles.jsx). These
// write the same store values, so the map follows them.
function useLayerFilters() {
  const vis = useMapStore((s) => s.philaLayerVisibility);
  const setVis = useMapStore((s) => s.setPhilaLayerVisibility);
  const s = useMapStore();
  return [
    ...['innovation', 'investment', 'mobility', 'labels'].map((key) => ({
      key,
      label: { innovation: 'Innovation', investment: 'Investment', mobility: 'Mobility', labels: 'Labels' }[key],
      on: vis[key],
      set: (v) => setVis(key, v),
    })),
    { key: 'osm', label: 'OSM Buildings', on: s.philaOSMBuildings, set: s.setPhilaOSMBuildings, disabled: !HAS_ION_TOKEN },
    { key: 'google', label: 'Google 3D Tiles', on: s.philaGoogleTiles, set: s.setPhilaGoogleTiles, disabled: !HAS_GOOGLE_KEY },
    { key: 'enriched', label: 'Enriched Buildings', on: s.philaEnrichedBuildings, set: s.setPhilaEnrichedBuildings, disabled: !HAS_ION_TOKEN },
    { key: 'economic', label: 'Economic Color', on: s.philaEconomicColor, set: s.setPhilaEconomicColor },
  ];
}

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export default function AreaPage() {
  const [query, setQuery] = useState('');
  const now = useNow();
  const filters = useLayerFilters();
  const q = query.trim().toLowerCase();

  const results = q
    ? [
        ...TRACTS.filter((t) => `${t.name} ${t.neighborhood} ${t.id}`.toLowerCase().includes(q))
          .map((t) => ({ key: t.id, title: t.neighborhood, sub: `${t.name} · tract`, to: `/location/${t.id}` })),
        ...BUILDINGS.filter((b) => `${b.name} ${b.label ?? ''}`.toLowerCase().includes(q))
          .map((b) => ({ key: b.id, title: b.name, sub: 'Place', to: `/location/${b.sourceTractId}` })),
      ]
    : [];

  return (
    <div className="bv-page">
      <h1 className="bv-page-title">Area Context</h1>

      <section className="bv-card" aria-labelledby="search-heading">
        <h2 id="search-heading" className="bv-eyebrow">Search bar</h2>
        <div className="bv-field">
          <label htmlFor="area-search">Search places and tracts in the app&apos;s data</label>
          <input id="area-search" className="bv-input" type="search" placeholder="e.g. Mantua, Tract 87, Drexel"
            value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <dl className="bv-rows" style={{ marginTop: 10 }}>
          <div><dt>Current time</dt><dd>{now.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</dd></div>
          <div><dt>Until DB refresh · Next scheduled sync</dt><dd>No database or scheduled sync: data is bundled with the app</dd></div>
        </dl>
      </section>

      <section aria-labelledby="results-heading" aria-live="polite">
        <h2 id="results-heading">Results</h2>
        {!q && <p className="bv-hint">Type to search {TRACTS.length} tracts and {BUILDINGS.length} places.</p>}
        {q && results.length === 0 && <p className="bv-empty">Nothing found for “{query}”.</p>}
        <div className="bv-grid">
          {results.map((r) => (
            <Link key={r.key} to={r.to} className="bv-card" style={{ textDecoration: 'none', color: 'inherit' }}>
              <strong>{r.title}</strong>
              <p className="bv-hint">{r.sub}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="bv-card" aria-labelledby="filters-heading">
        <h2 id="filters-heading">Dataset filters</h2>
        <p className="bv-hint">These switch the 3D map&apos;s existing layers. Changes apply the next time you open the 3D map.</p>
        <div className="bv-row" role="group" aria-label="3D map layers" style={{ margin: '10px 0 16px' }}>
          {filters.map((f) => (
            <button key={f.key} type="button" className="bv-toggle" aria-pressed={!!f.on} disabled={f.disabled}
              title={f.disabled ? 'Key not configured' : undefined} onClick={() => f.set(!f.on)}>
              {f.label}
            </button>
          ))}
        </div>
        <h3>Registry datasets</h3>
        <p className="bv-hint">No matching map layer yet, so these are disabled. Statuses are from the source registry.</p>
        <div className="bv-row" role="group" aria-label="Registry datasets">
          {METRICS.map((m) => (
            <span key={m.id} className="bv-row" style={{ gap: 6 }}>
              <button type="button" className="bv-toggle" aria-pressed="false" disabled>{m.label}</button>
              <StatusBadge status={m.status} />
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
