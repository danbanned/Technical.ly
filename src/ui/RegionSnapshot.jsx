import { useMapStore } from '../store/useMapStore';
import { PHILADELPHIA_BUILDINGS } from '../data/philadelphiaBuildings';
import { PHILADELPHIA_TRACTS } from '../data/philadelphiaTracts';

const TOTAL_RD = PHILADELPHIA_BUILDINGS.reduce((s, b) => s + (b.rdSpend || 0), 0);
const TOTAL_DEALS = PHILADELPHIA_BUILDINGS.reduce((s, b) => s + (b.dealCount || 0), 0);
const UNIVERSITY_COUNT = PHILADELPHIA_BUILDINGS.filter((b) => b.category === 'universityResearch').length;
const AVG_MOBILITY = Math.round(
  PHILADELPHIA_TRACTS.reduce((s, t) => s + t.mobilityScore, 0) / PHILADELPHIA_TRACTS.length
);

function fmt$(n) {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  return `$${n.toLocaleString()}`;
}

function MobilityRating({ score }) {
  const label = score >= 60 ? 'High' : score >= 40 ? 'Moderate' : 'Low';
  const color = score >= 60 ? '#4caf50' : score >= 40 ? '#ffa726' : '#ef5350';
  return <span style={{ color, fontWeight: 700 }}>{score} — {label}</span>;
}

export default function RegionSnapshot() {
  const tractsWithCBS = useMapStore((s) => s.philaTractsWithCBS);
  const mismatchCount = tractsWithCBS.filter((t) => t.mismatchAlert).length;
  const hasCBS = tractsWithCBS.length > 0;

  return (
    <div className="phila-panel phila-region-panel" role="region" aria-label="Philadelphia city overview">
      <div className="phila-region-header">
        <span className="phila-region-city">Philadelphia, PA</span>
        <span className="phila-sample-badge">sample data</span>
      </div>

      <div className="phila-region-grid">
        <div className="phila-region-stat">
          <span className="phila-region-val">{fmt$(TOTAL_RD)}</span>
          <span className="phila-region-lbl">R&amp;D spending</span>
        </div>
        <div className="phila-region-stat">
          <span className="phila-region-val">{TOTAL_DEALS}</span>
          <span className="phila-region-lbl">Active deals</span>
        </div>
        <div className="phila-region-stat">
          <span className="phila-region-val">{UNIVERSITY_COUNT}</span>
          <span className="phila-region-lbl">Universities</span>
        </div>
        <div className="phila-region-stat">
          <span className="phila-region-val">
            <MobilityRating score={AVG_MOBILITY} />
          </span>
          <span className="phila-region-lbl">Avg mobility</span>
        </div>
      </div>

      <div className={`phila-region-signal ${mismatchCount > 0 ? 'is-alert' : 'is-ok'}`}>
        {!hasCBS && '…computing'}
        {hasCBS && mismatchCount > 0
          ? `⚠ ${mismatchCount} mismatch${mismatchCount > 1 ? 'es' : ''} detected`
          : hasCBS ? '✓ Balanced' : ''}
      </div>
    </div>
  );
}
