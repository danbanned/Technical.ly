import * as Cesium from 'cesium';
import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useMapStore } from '../store/useMapStore';
import { buildTractInsightFromStore } from '../core/insightEngine';

function fmt$(n) {
  if (!n && n !== 0) return '—';
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  if (n >= 1e3) return `$${n.toLocaleString()}`;
  return `$${n}`;
}

function fmtPct(r) {
  return typeof r === 'number' ? `${(r * 100).toFixed(1)}%` : '—';
}

const BADGE_STYLE = {
  alert:    { background: '#FF8A00', color: '#000' },
  positive: { background: '#2E7D32', color: '#fff' },
  neutral:  { background: '#546E7A', color: '#fff' },
};

function InsightBlock({ insight }) {
  const badgeStyle = BADGE_STYLE[insight.badge.tone] ?? BADGE_STYLE.neutral;
  return (
    <div className="phila-insight-block">
      <span
        className="phila-insight-badge"
        style={{
          ...badgeStyle,
          display: 'inline-block',
          fontSize: 11,
          fontWeight: 700,
          padding: '2px 8px',
          borderRadius: 10,
          letterSpacing: '0.03em',
          marginBottom: 6,
        }}
      >
        {insight.badge.label}
      </span>
      <p style={{ margin: '0 0 6px', fontWeight: 600, fontSize: 13, lineHeight: 1.4 }}>
        {insight.headline}
      </p>
      <p style={{ margin: '0 0 6px', fontSize: 12, lineHeight: 1.5, opacity: 0.9 }}>
        {insight.resident}
      </p>
      <p style={{ margin: '0 0 4px', fontSize: 11, lineHeight: 1.4, opacity: 0.65, fontStyle: 'italic' }}>
        {insight.builder}
      </p>
    </div>
  );
}

function VBar({ icon, label, value }) {
  return (
    <div className="phila-vitality-row">
      <span className="phila-vitality-icon">{icon}</span>
      <span className="phila-vitality-name">{label}</span>
      <div className="phila-vitality-track">
        <div
          className="phila-vitality-fill"
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
          role="progressbar"
          aria-valuenow={Math.round(value)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${label}: ${Math.round(value)} of 100`}
        />
      </div>
      <span className="phila-vitality-num">{Math.round(value)}</span>
    </div>
  );
}

function CBSGauge({ cbs }) {
  const pct = Math.min(Math.max(cbs / 10, 0), 1) * 100;
  const color = cbs >= 7 ? '#4caf50' : cbs >= 4 ? '#ffa726' : '#ef5350';
  return (
    <div className="phila-cbs-block">
      <div className="phila-cbs-label">Community Benefit Score</div>
      <div className="phila-cbs-number" style={{ color }}>
        {cbs}<span className="phila-cbs-denom"> / 10</span>
      </div>
      <div className="phila-cbs-gauge" aria-label={`CBS ${cbs} out of 10`}>
        <div
          className="phila-cbs-gauge-thumb"
          style={{ left: `${pct}%` }}
        />
      </div>
      <div className="phila-cbs-gauge-ticks">
        <span>0</span><span>5</span><span>10</span>
      </div>
    </div>
  );
}

function TractInspect({ tract }) {
  const viewer       = useMapStore((s) => s.viewer);
  const addToCompare = useMapStore((s) => s.addPhilaToCompare);

  const vitality = {
    mobility: tract.mobilityScore,
    capital: Math.round(Math.max(0, Math.min(100, (1 - tract.unemploymentRate) * 100))),
    dynamism: Math.round((tract.mobilityScore + (1 - tract.unemploymentRate) * 100) / 2),
    innovation: Math.round(Math.min((tract.innovationIndex ?? 0) * 100, 100)),
  };

  const flyToTract = () => {
    if (!viewer) return;
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        tract.centroid[0], tract.centroid[1], 1200
      ),
      orientation: { heading: 0, pitch: Cesium.Math.toRadians(-30), roll: 0 },
      duration: 1.2,
    });
  };

  return (
    <>
      <div className="phila-inspect-header">
        <h2>{tract.neighborhood}</h2>
        <div className="phila-subhead">{tract.name} · Census Tract</div>
      </div>

      <CBSGauge cbs={tract.cbs} />

      <InsightBlock insight={buildTractInsightFromStore(tract)} />

      <div className="phila-stat-section">
        <div className="phila-stat-section-title">
          Nearby Innovation
          <span className="phila-sample-tag">sample data</span>
        </div>
        <div className="phila-stat-row">
          <span className="phila-stat-label">R&amp;D spend (1.5 km)</span>
          <span className="phila-stat-value">{fmt$(tract.rdSpendNearby)}</span>
        </div>
        <div className="phila-stat-row">
          <span className="phila-stat-label">VC deals (1.5 km)</span>
          <span className="phila-stat-value">{tract.vcDealsNearby ?? '—'}</span>
        </div>
      </div>

      <div className="phila-stat-section">
        <div className="phila-stat-section-title">
          Resident Outcomes
          <span className="phila-sample-tag">sample data</span>
        </div>
        <div className="phila-stat-row">
          <span className="phila-stat-label">Median income</span>
          <span className="phila-stat-value">{fmt$(tract.medianIncome)}</span>
        </div>
        <div className="phila-stat-row">
          <span className="phila-stat-label">Unemployment</span>
          <span className="phila-stat-value">{fmtPct(tract.unemploymentRate)}</span>
        </div>
        <div className="phila-stat-row">
          <span className="phila-stat-label">Mobility score</span>
          <span className="phila-stat-value">{tract.mobilityScore} / 100</span>
        </div>
      </div>

      <div className="phila-vitality-section">
        <div className="phila-stat-section-title">Vitality</div>
        <VBar icon="📈" label="Economic Mobility" value={vitality.mobility} />
        <VBar icon="💰" label="Capital Growth" value={vitality.capital} />
        <VBar icon="🔄" label="Dynamism" value={vitality.dynamism} />
        <VBar icon="💡" label="Innovation" value={vitality.innovation} />
      </div>

      <div className="phila-actions">
        <button
          className="phila-btn phila-btn-primary"
          onClick={() => addToCompare(tract)}
          aria-label={`Add ${tract.neighborhood} to comparison`}
        >
          Compare
        </button>
        <button
          className="phila-btn phila-btn-secondary"
          onClick={flyToTract}
          aria-label={`Fly camera to ${tract.neighborhood}`}
        >
          Fly here
        </button>
      </div>

      <div className="phila-sample-notice">⚑ All values are synthetic sample data</div>
    </>
  );
}

function BuildingInspect({ building }) {
  return (
    <>
      <div className="phila-inspect-header">
        <h2>{building.name}</h2>
        <div className="phila-subhead">
          {building.category.replace(/([A-Z])/g, ' $1').trim()}
        </div>
      </div>

      <div className="phila-stat-section">
        <div className="phila-stat-section-title">
          Details
          <span className="phila-sample-tag">sample data</span>
        </div>
        {Object.entries(building.stats).map(([k, v]) => (
          <div key={k} className="phila-stat-row">
            <span className="phila-stat-label">
              {k.replace(/([A-Z])/g, ' $1').trim()}
            </span>
            <span className="phila-stat-value">{String(v)}</span>
          </div>
        ))}
      </div>

      {building.vitality && (
        <div className="phila-vitality-section">
          <div className="phila-stat-section-title">Vitality</div>
          <VBar icon="📈" label="Economic Mobility" value={building.vitality.mobility} />
          <VBar icon="💰" label="Capital Growth" value={building.vitality.capital} />
          <VBar icon="🔄" label="Dynamism" value={building.vitality.dynamism} />
          <VBar icon="💡" label="Innovation" value={building.vitality.innovation} />
        </div>
      )}

      <div className="phila-sample-notice">⚑ All values are synthetic sample data</div>
    </>
  );
}

function DockedInsight({ tract, onUnpin, onExpand }) {
  const insight = buildTractInsightFromStore(tract);
  const cbsColor = tract.cbs >= 7 ? '#4caf50' : tract.cbs >= 4 ? '#ffa726' : '#ef5350';
  const badgeStyle = BADGE_STYLE[insight.badge.tone] ?? BADGE_STYLE.neutral;
  return (
    <div className="phila-panel phila-inspect-panel phila-inspect-panel--docked" role="complementary" aria-label="Pinned insight">
      <button className="phila-docked-body" onClick={onExpand} aria-label={`Re-open ${tract.neighborhood}`}>
        <span className="phila-docked-cbs" style={{ color: cbsColor }}>
          {tract.cbs}<span style={{ fontSize: '0.6em', opacity: 0.6 }}>/10</span>
        </span>
        <span className="phila-docked-info">
          <span className="phila-docked-name">{tract.neighborhood}</span>
          <span className="phila-insight-badge" style={{ ...badgeStyle, fontSize: 10, padding: '1px 6px', borderRadius: 8, fontWeight: 700 }}>
            {insight.badge.label}
          </span>
        </span>
      </button>
      <button
        className="phila-btn phila-btn-secondary"
        style={{ flex: 'none', padding: '3px 8px', fontSize: 11 }}
        onClick={onUnpin}
        title="Unpin"
        aria-label="Unpin"
      >✕</button>
    </div>
  );
}

export default function InspectPanel() {
  const tract          = useMapStore((s) => s.philaSelectedTract);
  const building       = useMapStore((s) => s.philaSelectedBuilding);
  const activeInsight  = useMapStore((s) => s.activeInsight);
  const viewer         = useMapStore((s) => s.viewer);
  const clearActiveInsight = useMapStore((s) => s.clearActiveInsight);
  const clearTract     = () => useMapStore.getState().selectPhilaTract(null);
  const clearBuilding  = () => useMapStore.getState().selectPhilaBuilding(null);
  const [expanded, setExpanded] = useState(false);

  const toggleExpanded = useCallback(() => {
    setExpanded((v) => {
      const next = !v;
      if (viewer) viewer.scene.screenSpaceCameraController.enableInputs = !next;
      return next;
    });
  }, [viewer]);

  const collapse = useCallback(() => {
    setExpanded(false);
    if (viewer) viewer.scene.screenSpaceCameraController.enableInputs = true;
  }, [viewer]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape' && expanded) collapse(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [expanded, collapse]);

  // Re-enable inputs if panel closes while expanded (docked mode doesn't count as expanded)
  useEffect(() => {
    if (!tract && !building && !activeInsight && expanded) {
      setExpanded(false);
      if (viewer) viewer.scene.screenSpaceCameraController.enableInputs = true;
    }
  }, [tract, building, activeInsight, expanded, viewer]);

  if (!tract && !building) {
    if (!activeInsight) return null;
    return (
      <DockedInsight
        tract={activeInsight}
        onUnpin={clearActiveInsight}
        onExpand={() => useMapStore.getState().selectPhilaTract(activeInsight.id)}
      />
    );
  }

  const panelContent = (
    <div
      className={`phila-panel phila-inspect-panel${expanded ? ' is-expanded' : ''}`}
      role="complementary"
      aria-label="Selection details"
      aria-expanded={expanded}
    >
      <div className="phila-panel-topbar">
        <button
          className="phila-icon-btn"
          onClick={toggleExpanded}
          aria-label={expanded ? 'Minimize panel' : 'Expand panel to full screen'}
          title={expanded ? 'Minimize' : 'Expand'}
        >
          {expanded ? '⊡' : '⊞'}
        </button>
        <button
          className="phila-btn phila-btn-secondary"
          style={{ flex: 'none', padding: '3px 8px', fontSize: 11 }}
          onClick={tract ? clearTract : clearBuilding}
          aria-label="Close panel"
        >
          ✕
        </button>
      </div>
      {tract && <TractInspect tract={tract} />}
      {!tract && building && <BuildingInspect building={building} />}
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
