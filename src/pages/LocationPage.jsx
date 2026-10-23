import { Link, useNavigate, useParams } from 'react-router-dom';
import CollapsibleCard from '../ui/CollapsibleCard';
import CountyCard from '../ui/CountyCard';
import EmptyState from '../ui/EmptyState';
import { TRACTS, TRACTS_DATA_SOURCE, TRACTS_LAST_UPDATED, buildingsInTract, fmt, getTract } from '../data/places';

// Place detail for one tract in the app's data. /location shows the first tract.
export default function LocationPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const tract = id ? getTract(id) : TRACTS[0];
  const tractLabel = tract?.name.replace(/^Tract\s*/, '') ?? id;

  if (!tract) {
    return (
      <div className="bv-page">
        <h1 className="bv-page-title">Location</h1>
        <EmptyState>No place with ID “{id}” in the app&apos;s data.</EmptyState>
        <p><Link className="bv-link" to="/location">Show the first place <span aria-hidden="true">›</span></Link></p>
      </div>
    );
  }

  const places = buildingsInTract(tract.id);

  return (
    <div className="bv-page">
      <div className="bv-row-between">
        <h1 className="bv-page-title">Location</h1>
        <div className="bv-field" style={{ minWidth: 260 }}>
          <label htmlFor="location-select">Choose a place</label>
          <select id="location-select" className="bv-select" value={tract.id} onChange={(e) => navigate(`/location/${e.target.value}`)}>
            {TRACTS.map((t) => <option key={t.id} value={t.id}>{t.neighborhood} ({t.name})</option>)}
          </select>
        </div>
      </div>

      <div className="bv-split-even">
        <section className="bv-card" aria-labelledby="loc-heading">
          <span className="bv-eyebrow">Location details</span>
          <h2 id="loc-heading" style={{ fontSize: '1.5rem' }}>{tract.neighborhood}</h2>
          <p className="bv-hint">{tract.name} · GEOID {tract.id}</p>
          <div className="bv-tags" style={{ margin: '10px 0' }}>
            <span className="bv-tag">Location details</span>
            <span className="bv-tag">Area context</span>
            <span className="bv-tag">Selected tract</span>
          </div>
          <p className="bv-placeholder">[description — team to supply]</p>
          <div className="bv-row" style={{ margin: '12px 0' }}>
            <button type="button" className="bv-btn" onClick={() => navigate('/map')}>Show on 2D map</button>
            <button type="button" className="bv-btn bv-btn-primary" onClick={() => navigate('/3d')}>Open 3D explorer</button>
            <Link className="bv-btn" to="/area">Area context</Link>
          </div>
          <CollapsibleCard title="Location and model details">
            <dl className="bv-rows">
              <div><dt>Centroid (lon, lat)</dt><dd>{tract.centroid?.join(', ') ?? 'No data yet'}</dd></div>
              <div><dt>Outline</dt><dd>{tract.polygon ? `${tract.polygon.length}-corner approximate outline (sample)` : 'No data yet'}</dd></div>
              <div><dt>Places in this tract</dt><dd>{places.length ? places.map((b) => b.name).join(', ') : 'No data yet'}</dd></div>
              <div><dt>Flagged synthetic</dt><dd>{fmt.bool(tract.synthetic)}</dd></div>
            </dl>
          </CollapsibleCard>
        </section>

        <section className="bv-card" aria-labelledby="area-heading">
          <span className="bv-eyebrow">Area context</span>
          <h2 id="area-heading">Selected tract</h2>
          <dl className="bv-rows">
            <div><dt>Place</dt><dd>{tract.neighborhood} · {tract.name}</dd></div>
            <div>
              <dt>Local conditions</dt>
              <dd>
                Income {fmt.usd(tract.medianIncome)} · Unemployment {fmt.pctFromFraction(tract.unemploymentRate)} · Mobility {fmt.num(tract.mobilityScore, 0)} (sample)
              </dd>
            </div>
            <div>
              <dt>Opportunity signals</dt>
              <dd>
                Innovation index {fmt.num(tract.innovationIndex)} · Outcome index {fmt.num(tract.outcomeIndex)} · CBS {fmt.num(tract.cbs)} / 10 · Mismatch alert {fmt.bool(tract.mismatchAlert)} (computed from sample)
              </dd>
            </div>
            <div><dt>Data history</dt><dd>One bundled snapshot ({TRACTS_DATA_SOURCE}, {TRACTS_LAST_UPDATED}); no update history</dd></div>
          </dl>
          <p className="bv-hint" style={{ marginTop: 10 }}>
            Area context for Tract {tractLabel} will appear here when linked data is available.
          </p>
        </section>
      </div>

      <section className="bv-card" aria-labelledby="estimates-heading">
        <div className="bv-card-head">
          <h2 id="estimates-heading">Selected tract estimates</h2>
          <span className="bv-tag bv-tag-sample">Sample data · not ACS</span>
        </div>
        <dl className="bv-rows">
          <div><dt>Median household income</dt><dd>{fmt.usd(tract.medianIncome)}</dd></div>
          <div><dt>Unemployment rate</dt><dd>{fmt.pctFromFraction(tract.unemploymentRate)}</dd></div>
          <div><dt>Mobility (0–100)</dt><dd>{fmt.num(tract.mobilityScore, 0)}</dd></div>
          <div><dt>Margin of error</dt><dd>No data yet</dd></div>
        </dl>
        <CollapsibleCard title="Source and methodology">
          <p>
            Hand-entered sample values from <code>src/data/philadelphiaTracts.js</code>, dated {TRACTS_LAST_UPDATED}. The
            indexes and CBS are computed in the browser by <code>src/core/cbs.js</code>, the same calculation the 3D map uses.
            None of these are Census ACS estimates.
          </p>
        </CollapsibleCard>
      </section>

      <CountyCard />
    </div>
  );
}
