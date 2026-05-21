/**
 * RegionRail — right-side region snapshot that mirrors the active
 * article's city. In Ambient mode it shows a default "Mid-Atlantic"
 * snapshot; in Reactive mode it swaps to the scrolled article's city.
 * In Immersive mode it slides to the edge (CSS).
 */
import { useMapStore } from '../../store/useMapStore';

export default function RegionRail() {
  const focusedCity = useMapStore((s) => s.focusedCity);
  const articles = useMapStore((s) => s.articles);
  const activeArticleId = useMapStore((s) => s.activeArticleId);

  const active = articles.find((a) => a.id === activeArticleId);
  const cityName = focusedCity?.name || 'Mid-Atlantic';
  const stats = active?.stats || {
    research: '8.4B',
    deals: '1.1B',
    mobility: 58,
    mismatch: 'Mixed',
  };

  return (
    <aside className="region-rail" aria-label={`Region snapshot: ${cityName}`}>
      <header className="rail-section">
        <h3>Region Snapshot</h3>
        <div className="rail-city">{cityName}</div>
        <p className="rail-tag">Live from the Innovation &amp; Opportunity Map</p>
      </header>

      <div className="rail-section">
        <h3>Key Metrics</h3>
        <div className="rail-metric">
          <span className="rail-metric-label">Research spending</span>
          <span className="rail-metric-value innovation">${stats.research}</span>
        </div>
        <div className="rail-metric">
          <span className="rail-metric-label">Venture deals</span>
          <span className="rail-metric-value capital">${stats.deals}</span>
        </div>
        <div className="rail-metric">
          <span className="rail-metric-label">Mobility index</span>
          <span className="rail-metric-value community">{stats.mobility}</span>
        </div>
        <div className="rail-metric">
          <span className="rail-metric-label">Mismatch signal</span>
          <span className={`rail-metric-value mismatch-${(stats.mismatch || '').toLowerCase()}`}>
            {stats.mismatch}
          </span>
        </div>
      </div>

      <div className="rail-section">
        <h3>Newsletter</h3>
        <p className="rail-blurb">
          The week in mid-Atlantic tech, delivered Tuesdays.
        </p>
        <form className="rail-newsletter" onSubmit={(e) => e.preventDefault()}>
          <input type="email" placeholder="you@startup.co" aria-label="Email address" />
          <button type="submit">Subscribe</button>
        </form>
      </div>
    </aside>
  );
}
