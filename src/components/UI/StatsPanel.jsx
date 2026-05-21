import { useState } from 'react';
import { useMapStore } from '../../store/useMapStore';

/**
 * Right-side panel describing the selected entity (university, deal, state).
 * Adapts to comparison mode when two entities are selected.
 */
export default function StatsPanel() {
  const show = useMapStore((s) => s.showStatsPanel);
  const selected = useMapStore((s) => s.selectedEntity);
  const selectedEntities = useMapStore((s) => s.selectedEntities);
  const comparison = useMapStore((s) => s.showComparisonPanel);
  const reset = useMapStore((s) => s.resetSelection);
  const mismatchOn = useMapStore((s) => s.mismatchModeEnabled);
  const mismatches = useMapStore((s) => s.mismatches);
  const [simplified, setSimplified] = useState(false);

  if (!show || !selected) {
    return <aside className="stats-panel hidden" aria-hidden="true" />;
  }

  if (comparison && selectedEntities.length === 2) {
    return (
      <aside className="stats-panel" aria-label="Comparison panel">
        <button className="close" onClick={reset} aria-label="Close panel">✕</button>
        <h2>Compare</h2>
        <div className="subhead">Two-region delta</div>
        <ComparisonView a={selectedEntities[0]} b={selectedEntities[1]} />
      </aside>
    );
  }

  const props = selected.properties || {};
  const isMismatch =
    mismatchOn &&
    (mismatches.highResearchLowDeals?.includes(props.name) ||
      mismatches.highInvestmentLowMobility?.includes(props.name));

  return (
    <aside className="stats-panel" aria-label="Region details panel">
      <button className="close" onClick={reset} aria-label="Close panel">✕</button>
      <h2>{selected.name || 'Unknown'}</h2>
      <div className="subhead">
        {(props.kind || '').toUpperCase()} · {props.city || props.state || '—'}
      </div>

      {isMismatch && (
        <div className="mismatch-banner" role="alert">
          ⚠️ {mismatches.highResearchLowDeals?.includes(props.name)
            ? 'High research output, low venture capitalization.'
            : 'Investment inflow with stagnant economic mobility.'}
        </div>
      )}

      {props.kind === 'university' && (
        <>
          <MetricCard
            tone="innovation"
            label="R&D Spending"
            value={`$${formatMoney(props.rd_spending)}`}
            note={simplified ? 'How much this university spent on research last year.' : null}
          />
          <MetricCard
            label="Research Field"
            value={props.research_field || 'Mixed'}
            note={simplified ? 'The kind of research this place is known for.' : null}
          />
          <MetricCard
            tone="community"
            label="Community Impact Score"
            value={`${estimateImpact(props)} / 100`}
            note={simplified ? 'How much this research seems to help the surrounding community.' : null}
          />
        </>
      )}

      {props.kind === 'deal' && (
        <>
          <MetricCard
            tone="capital"
            label="Deal Amount"
            value={`$${formatMoney(props.deal_amount)}`}
          />
          <MetricCard label="Sector" value={props.sector || '—'} />
          <MetricCard label="Date" value={props.deal_date || props.year} />
        </>
      )}

      {props.kind === 'state' && (
        <>
          <MetricCard
            tone="community"
            label="Dynamism Score"
            value={`${props.dynamism_score} / 100`}
            note={
              simplified
                ? `This state's economy is ${dynamismPlain(props.dynamism_score)}.`
                : null
            }
          />
        </>
      )}

      <button
        className="simplify-btn"
        style={{ marginTop: 16 }}
        onClick={() => setSimplified((s) => !s)}
        aria-pressed={simplified}
      >
        {simplified ? 'Show metrics' : 'Simplify'}
      </button>
    </aside>
  );
}

function MetricCard({ tone, label, value, note }) {
  return (
    <div className={`metric-card ${tone || ''}`}>
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {note && (
        <div style={{ fontSize: 12, color: 'var(--muted-text)', marginTop: 6, lineHeight: 1.4 }}>
          {note}
        </div>
      )}
    </div>
  );
}

function ComparisonView({ a, b }) {
  const ap = a.properties || {};
  const bp = b.properties || {};
  const metric = ap.kind === 'university' ? 'rd_spending' : 'deal_amount';
  const av = ap[metric] || 0;
  const bv = bp[metric] || 0;
  const ratio = av && bv ? (Math.max(av, bv) / Math.max(1, Math.min(av, bv))).toFixed(1) : '—';

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <MetricCard label={a.name} value={`$${formatMoney(av)}`} />
        <MetricCard label={b.name} value={`$${formatMoney(bv)}`} />
      </div>
      <div className="metric-card" style={{ marginTop: 12 }}>
        <div className="label">Delta</div>
        <div className="value" style={{ color: 'var(--mismatch-alert)' }}>
          {ratio}× gap
        </div>
      </div>
    </div>
  );
}

function formatMoney(n) {
  if (!n) return '0';
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return n.toLocaleString();
}

function estimateImpact(props) {
  // Coarse heuristic: log scale of spending, capped 1-100.
  const spend = props.rd_spending || 0;
  return Math.min(100, Math.max(15, Math.round(20 + Math.log10(spend + 1) * 7)));
}

function dynamismPlain(score) {
  if (score >= 70) return 'flexible — people change jobs and start businesses readily';
  if (score >= 40) return 'moderately flexible — there is movement, but room to improve';
  return 'stagnant — jobs and businesses turn over slowly';
}
