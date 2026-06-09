import { useEffect, useRef } from 'react';
import { useMapStore } from '../store/useMapStore';

function fmt$(n) {
  if (!n && n !== 0) return '—';
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  return `$${n.toLocaleString()}`;
}

function fmtPct(r) {
  return typeof r === 'number' ? `${(r * 100).toFixed(1)}%` : '—';
}

function cbsColor(cbs) {
  return cbs >= 7 ? '#4caf50' : cbs >= 4 ? '#ffa726' : '#ef5350';
}

function TractCol({ tract }) {
  return (
    <div className="phila-compare-col">
      <h4>{tract.neighborhood}</h4>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
          Community Benefit Score
        </div>
        <div style={{ fontSize: 28, fontWeight: 900, color: cbsColor(tract.cbs), lineHeight: 1 }}>
          {tract.cbs}
          <span style={{ fontSize: 13, fontWeight: 400, color: '#475569' }}> / 10</span>
        </div>
        {tract.mismatchAlert && (
          <div style={{ fontSize: 11, color: '#ffa726', marginTop: 4 }}>⚠ Mismatch alert</div>
        )}
      </div>

      {[
        ['Median income', fmt$(tract.medianIncome)],
        ['Unemployment', fmtPct(tract.unemploymentRate)],
        ['Mobility score', `${tract.mobilityScore} / 100`],
        ['R&D nearby', fmt$(tract.rdSpendNearby)],
        ['VC deals nearby', tract.vcDealsNearby ?? '—'],
        ['Innovation index', (tract.innovationIndex ?? 0).toFixed(2)],
        ['Outcome index', (tract.outcomeIndex ?? 0).toFixed(2)],
      ].map(([label, value]) => (
        <div key={label} className="phila-stat-row" style={{ fontSize: 12 }}>
          <span className="phila-stat-label" dangerouslySetInnerHTML={{ __html: label }} />
          <span className="phila-stat-value">{value}</span>
        </div>
      ))}
    </div>
  );
}

export default function CompareMode() {
  const [a, b] = useMapStore((s) => s.philaCompareTracts);
  const clearCompare = useMapStore((s) => s.clearPhilaCompare);
  const closeRef = useRef(null);

  useEffect(() => {
    if (a && b) closeRef.current?.focus();
  }, [a, b]);

  if (!a || !b) return null;

  return (
    <div
      className="phila-compare-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Tract comparison"
    >
      <div className="phila-compare-panel">
        <div className="phila-compare-header">
          <h3>Side-by-Side Comparison</h3>
          <button
            ref={closeRef}
            className="phila-btn phila-btn-secondary"
            style={{ flex: 'none', padding: '4px 12px' }}
            onClick={clearCompare}
            aria-label="Close comparison"
          >
            ✕ Close
          </button>
        </div>
        <div style={{ fontSize: 10, color: '#475569', marginBottom: 12 }}>
          ⚑ All values are synthetic sample data
        </div>
        <div className="phila-compare-cols">
          <TractCol tract={a} />
          <div className="phila-compare-divider" />
          <TractCol tract={b} />
        </div>
      </div>
    </div>
  );
}
