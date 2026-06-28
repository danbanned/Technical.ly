/**
 * StoryFeed — center-column article feed overlay.
 *
 * Browsing state  (activeInsight === null):
 *   Semi-opaque scrim dims the map canvas. Feed cards sit center stage.
 *
 * Selected state  (activeInsight !== null):
 *   Scrim lifts. Camera nudged once to the tract (non-locking).
 *   The existing DockedInsight in InspectPanel handles the docked context strip.
 *   StoryFeed renders nothing further — no parallel state system.
 *
 * State is driven entirely through selectPhilaTract / clearActiveInsight so
 * the billboard, highlight, narration, and InspectPanel all fire automatically.
 */

import * as Cesium from 'cesium';
import { useEffect, useMemo } from 'react';
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
  const tracts          = useMapStore((s) => s.philaTractsWithCBS) ?? [];
  const viewer          = useMapStore((s) => s.viewer);
  const activeInsight   = useMapStore((s) => s.activeInsight);
  const selectPhilaTract   = useMapStore((s) => s.selectPhilaTract);
  const clearActiveInsight = useMapStore((s) => s.clearActiveInsight);

  const articles = useMemo(() => seedArticlesFromTracts(tracts), [tracts]);

  // Esc closes the selected state → returns to browsing feed.
  // InspectPanel's Esc only fires when the panel is in expanded (full-screen) mode,
  // so there's no conflict.
  useEffect(() => {
    if (!activeInsight) return;
    const handler = (e) => { if (e.key === 'Escape') clearActiveInsight(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeInsight, clearActiveInsight]);

  // Nothing to show until tracts are computed
  if (!articles.length) return null;

  const browsing = !activeInsight;

  const handleSelect = (article) => {
    // Wire into the existing tract system — billboard, highlight, narration all fire
    selectPhilaTract(article.tractId);

    // One-time camera nudge — non-locking, user can immediately pan/zoom away
    if (!viewer) return;
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        article.centroid[0],
        article.centroid[1],
        1200,
      ),
      orientation: {
        heading: 0,
        pitch: Cesium.Math.toRadians(-35),
        roll: 0,
      },
      duration: 1.8,
    });
  };

  return (
    <>
      {/* Scrim — over canvas, under rails/panels. Dims while browsing, lifts on select. */}
      <div
        className={`phila-map-scrim${browsing ? '' : ' phila-map-scrim--hidden'}`}
        aria-hidden="true"
      />

      {/* Browsing feed — only shown before an article is selected */}
      {browsing && (
        <section
          className="phila-story-feed"
          aria-label="Neighborhood stories"
        >
          <header className="phila-story-feed-header phila-panel">
            <h2 className="phila-story-feed-title">Philadelphia Neighborhoods</h2>
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
  );
}
