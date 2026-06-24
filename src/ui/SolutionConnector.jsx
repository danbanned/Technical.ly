import { useState, useEffect, useRef } from 'react';
import { useMapStore } from '../store/useMapStore';
import { getSolutions } from '../core/solutionConnector';
import { startSolutionTour, startSingleSolution } from './SolutionTour';

// ── Tour overlay ──────────────────────────────────────────────────────────────
function TourOverlay() {
  const [step, setStep] = useState(null);

  useEffect(() => {
    const onStep = (e) => setStep(e.detail);
    const onEnd  = () => setStep(null);
    window.addEventListener('solutionTour:step', onStep);
    window.addEventListener('solutionTour:end',  onEnd);
    return () => {
      window.removeEventListener('solutionTour:step', onStep);
      window.removeEventListener('solutionTour:end',  onEnd);
    };
  }, []);

  if (!step) return null;

  return (
    <div className="phila-tour-overlay" role="status" aria-live="polite">
      <div className="phila-tour-step-badge">{step.index + 1} / {step.total}</div>
      <div className="phila-tour-title">{step.title}</div>
      <div className="phila-tour-why">{step.why_it_connects}</div>
    </div>
  );
}

// ── Compact footer tile (connect mode) ───────────────────────────────────────
function CompactTile({ rec, index, isActive, tract, onTourStart }) {
  const viewer = useMapStore((s) => s.viewer);

  const handleClick = () => {
    if (!viewer || !rec.asset_lat) return;
    const tourRef = startSingleSolution(viewer, tract, rec);
    onTourStart(tourRef, index);
  };

  return (
    <button
      className={`phila-solution-tile${isActive ? ' is-active' : ''}`}
      onClick={handleClick}
      title={rec.title}
      aria-label={`Solution ${index + 1}: ${rec.title}`}
    >
      <span className="phila-solution-tile-num">{index + 1}</span>
      <span className="phila-solution-tile-label">{rec.title}</span>
    </button>
  );
}

// ── Full solution card (normal mode) ─────────────────────────────────────────
function SolutionCard({ rec, index, tract, onTourStart }) {
  const viewer = useMapStore((s) => s.viewer);

  const handleShowOnMap = () => {
    if (!viewer || !rec.asset_lat) return;
    const tourRef = startSingleSolution(viewer, tract, rec);
    onTourStart(tourRef);
  };

  return (
    <div className="phila-solution-card">
      <div className="phila-solution-card-header">
        <span className="phila-solution-rank">{index + 1}</span>
        <span className="phila-solution-title">{rec.title}</span>
      </div>
      <p className="phila-solution-desc">{rec.description}</p>
      <div className="phila-solution-connect">
        <span className="phila-solution-connect-icon">🔗</span>
        <span className="phila-solution-connect-text">{rec.why_it_connects}</span>
      </div>
      {rec.asset_name && (
        <div className="phila-solution-asset">
          <span className="phila-solution-asset-label">Asset</span>
          <span className="phila-solution-asset-name">{rec.asset_name}</span>
        </div>
      )}
      <button
        className="phila-btn phila-btn-primary phila-solution-map-btn"
        onClick={handleShowOnMap}
        disabled={!rec.asset_lat}
        aria-label={`Show ${rec.title} on map`}
      >
        ▶ Show on map
      </button>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function SolutionConnector({ tract, forceCompact = false }) {
  const viewer      = useMapStore((s) => s.viewer);
  const connectMode = useMapStore((s) => s.philaConnectMode);

  const [solutions, setSolutions] = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [aiFlag,    setAiFlag]    = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [activeTile, setActiveTile] = useState(null);
  const tourRef = useRef(null);

  useEffect(() => {
    if (!tract) return;
    let cancelled = false;
    setLoading(true);
    setSolutions(null);
    setActiveTile(null);

    getSolutions(tract).then(({ recs, aiGenerated }) => {
      if (cancelled) return;
      setSolutions(recs);
      setAiFlag(aiGenerated);
      setLoading(false);
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [tract?.id]);

  useEffect(() => {
    const onEnd = () => setActiveTile(null);
    window.addEventListener('solutionTour:end', onEnd);
    return () => window.removeEventListener('solutionTour:end', onEnd);
  }, []);

  useEffect(() => {
    return () => { tourRef.current?.stop(); };
  }, [tract?.id]);

  // Connect mode auto-tour: fires when mode turns on or tract changes (and solutions loaded)
  useEffect(() => {
    if (!connectMode || !viewer || !solutions) return;
    tourRef.current?.stop();
    tourRef.current = startSolutionTour(viewer, tract, solutions);
    return () => { tourRef.current?.stop(); };
  }, [connectMode, tract?.id, solutions, viewer]);

  const handleTourAll = () => {
    if (!viewer || !solutions) return;
    tourRef.current?.stop();
    tourRef.current = startSolutionTour(viewer, tract, solutions);
  };

  const handleTourStart = (ref, tileIndex) => {
    tourRef.current?.stop();
    tourRef.current = ref;
    if (tileIndex !== undefined) setActiveTile(tileIndex);
  };

  // ── Compact 2×2 footer (connect mode OR placed in Legend) ────────────────
  if (connectMode || forceCompact) {
    return (
      <>
        <TourOverlay />
        <div className="phila-solution-footer">
          <div className="phila-solution-footer-bar">
            <span className="phila-solution-footer-label">
              Solutions
              {aiFlag && <span className="phila-ai-badge">✦ AI</span>}
            </span>
            <button
              className="phila-solution-footer-tour"
              onClick={handleTourAll}
              disabled={!solutions}
              aria-label="Tour all solutions"
              title="Tour all solutions"
            >
              ▶ All
            </button>
          </div>

          {loading && (
            <div className="phila-solution-footer-loading">…</div>
          )}

          {!loading && solutions && (
            <div className="phila-solution-tile-grid">
              {solutions.map((rec, i) => (
                <CompactTile
                  key={i}
                  rec={rec}
                  index={i}
                  isActive={activeTile === i}
                  tract={tract}
                  onTourStart={handleTourStart}
                />
              ))}
            </div>
          )}
        </div>
      </>
    );
  }

  // ── Normal mode: full card list ───────────────────────────────────────────
  return (
    <>
      <TourOverlay />
      <div className="phila-solution-section">
        <div className="phila-solution-header" onClick={() => setCollapsed((c) => !c)}>
          <span className="phila-stat-section-title" style={{ margin: 0 }}>
            Solutions
            {aiFlag && <span className="phila-ai-badge" title="AI-generated suggestions">✦ AI</span>}
          </span>
          <span className="phila-solution-chevron">{collapsed ? '▸' : '▾'}</span>
        </div>

        {!collapsed && (
          <>
            {loading && <div className="phila-solution-loading">Generating recommendations…</div>}

            {!loading && solutions && (
              <>
                <div className="phila-solution-cards">
                  {solutions.map((rec, i) => (
                    <SolutionCard
                      key={i}
                      rec={rec}
                      index={i}
                      tract={tract}
                      onTourStart={handleTourStart}
                    />
                  ))}
                </div>

                <button
                  className="phila-btn phila-btn-secondary phila-solution-tour-btn"
                  onClick={handleTourAll}
                  aria-label="Tour all solutions on map"
                >
                  ▶ Tour all solutions
                </button>

                {aiFlag && (
                  <p className="phila-ai-disclosure">
                    ✦ AI-generated suggestions — verify before acting. Sample data.
                  </p>
                )}
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}
