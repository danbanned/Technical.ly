/**
 * StoryFeed — center-column article feed overlay.
 *
 * Browsing state  (activeInsight === null && feedOpen):
 *   Semi-opaque scrim dims the map canvas. Feed cards sit center stage.
 *
 * Selected state  (activeInsight !== null):
 *   Scrim lifts. Camera nudged once to the tract (non-locking).
 *   The existing DockedInsight in InspectPanel handles the docked context strip.
 *   StoryFeed renders nothing further — no parallel state system.
 *
 * Closed state  (!feedOpen):
 *   Floating "☰ Stories" button reopens the feed (also clears any selection).
 */

import * as Cesium from 'cesium';
import { useEffect, useMemo, useState } from 'react';
import { useMapStore } from '../store/useMapStore';
import { seedArticlesFromTracts } from '../data/feedArticles';
import DataStamp from './DataStamp';

const BADGE_STYLE = {
  alert:    { background: '#FF8A00', color: '#000' },
  positive: { background: '#2E7D32', color: '#fff' },
  neutral:  { background: '#546E7A', color: '#fff' },
};

const CBS_COLOR = (cbs) =>
  cbs >= 7 ? '#4caf50' : cbs >= 4 ? '#ffa726' : '#ef5350';

// ── Article card ─────────────────────────────────────────────────────────────

function StoryCard({ article, onSelect }) {
  const badge = BADGE_STYLE[article.badge.tone] ?? BADGE_STYLE.neutral;
  return (
    <article
      className="phila-story-card phila-panel"
      role="button"
      tabIndex={0}
      onClick={() => onSelect(article)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(article); }
      }}
      aria-label={`${article.neighborhood}: ${article.headline}. Community Benefit Score ${article.cbs}.`}
    >
      <div className="phila-story-card-meta">
        <span
          className="phila-story-badge"
          style={{ background: badge.background, color: badge.color }}
        >
          {article.badge.label}
        </span>
        <span className="phila-story-cbs" style={{ color: CBS_COLOR(article.cbs) }}>
          CBS {article.cbs}
        </span>
      </div>

      <div className="phila-story-neighborhood">{article.neighborhood}</div>
      <h3 className="phila-story-headline">{article.headline}</h3>
      <p className="phila-story-body">{article.body}</p>

      <div className="phila-story-card-foot">
        <DataStamp sourceId="syntheticSeed" />
        <span className="phila-story-cta" aria-hidden="true">Explore →</span>
      </div>
    </article>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function StoryFeed() {
  const tracts             = useMapStore((s) => s.philaTractsWithCBS) ?? [];
  const viewer             = useMapStore((s) => s.viewer);
  const activeInsight      = useMapStore((s) => s.activeInsight);
  const selectPhilaTract   = useMapStore((s) => s.selectPhilaTract);
  const clearActiveInsight = useMapStore((s) => s.clearActiveInsight);

  const [feedOpen, setFeedOpen] = useState(true);

  const articles = useMemo(() => seedArticlesFromTracts(tracts), [tracts]);

  // Esc while a tract is selected returns to the browsing feed.
  useEffect(() => {
    if (!activeInsight) return;
    const handler = (e) => { if (e.key === 'Escape') clearActiveInsight(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeInsight, clearActiveInsight]);

  if (!articles.length) return null;

  const browsing = !activeInsight;

  const handleOpen = () => {
    clearActiveInsight();
    setFeedOpen(true);
  };

  const handleSelect = (article) => {
    selectPhilaTract(article.tractId);
    if (!viewer) return;
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        article.centroid[0],
        article.centroid[1],
        1200,
      ),
      orientation: { heading: 0, pitch: Cesium.Math.toRadians(-35), roll: 0 },
      duration: 1.8,
    });
  };

  return (
    <>
      {/* Floating reopen button — visible whenever the feed isn't on screen */}
      {(!feedOpen || !browsing) && (
        <button
          className="phila-feed-reopen-btn"
          onClick={handleOpen}
          aria-label="Show neighborhood stories"
        >
          ☰ Stories
        </button>
      )}

      {feedOpen && (
        <>
          {/* Scrim — dims map while browsing, lifts on select */}
          <div
            className={`phila-map-scrim${browsing ? '' : ' phila-map-scrim--hidden'}`}
            aria-hidden="true"
          />

          {browsing && (
            <section className="phila-story-feed" aria-label="Neighborhood stories">
              <header className="phila-story-feed-header phila-panel">
                <div className="phila-story-feed-header-row">
                  <h2 className="phila-story-feed-title">Philadelphia Neighborhoods</h2>
                  <button
                    className="phila-feed-close-btn"
                    onClick={() => setFeedOpen(false)}
                    aria-label="Hide neighborhood stories"
                  >
                    ✕
                  </button>
                </div>
                <p className="phila-story-feed-sub">
                  Each story is drawn from real census tract data.
                  Select one to explore it on the map.
                </p>
              </header>

              <div className="phila-story-list" role="list">
                {articles.map((article) => (
                  <StoryCard
                    key={article.tractId}
                    article={article}
                    onSelect={handleSelect}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </>
  );
}
