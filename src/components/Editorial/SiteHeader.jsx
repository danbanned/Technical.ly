/**
 * SiteHeader — Technical.ly-style masthead.
 *
 * In Immersive mode the header collapses to a slim bar exposing only
 * brand + back button. CSS handles that via the `immersion-immersive`
 * body class.
 */
import { useMapStore } from '../../store/useMapStore';

export default function SiteHeader({ onExitImmersive }) {
  const immersionMode = useMapStore((s) => s.immersionMode);
  const isImmersive = immersionMode === 'immersive';

  return (
    <header className="site-header" role="banner">
      <a href="/" className="site-brand" aria-label="Technical.ly home">
        <span className="brand-dot" aria-hidden="true" />
        <span className="brand-word">Technical.ly</span>
      </a>

      <nav className="site-nav" aria-label="Sections">
        <a href="#startups">Startups</a>
        <a href="#civic-tech">Civic Tech</a>
        <a href="#workforce">Workforce</a>
        <a href="#policy">Policy</a>
        <a href="#events">Events</a>
        <a href="#jobs">Jobs</a>
      </nav>

      <div className="site-actions">
        {isImmersive ? (
          <button className="back-btn" onClick={onExitImmersive} aria-label="Exit immersive view">
            ← Back to feed
          </button>
        ) : (
          <>
            <button className="subscribe-btn" type="button">Subscribe</button>
            <button className="search-btn" type="button" aria-label="Search">
              <span aria-hidden="true">⌕</span>
            </button>
          </>
        )}
      </div>
    </header>
  );
}
