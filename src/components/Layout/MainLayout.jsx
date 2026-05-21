import GlobeViewer from '../Globe/GlobeViewer';
import Legend from '../UI/Legend';
import StatsPanel from '../UI/StatsPanel';
import GuidedTour from '../UI/GuidedTour';
import TimeSlider from '../Globe/Controls/TimeSlider';
import { useMapStore } from '../../store/useMapStore';

/**
 * Desktop layout: editorial masthead, left legend rail, center globe,
 * right stats panel, bottom time slider, on-demand guided tour overlay.
 */
export default function MainLayout() {
  const setGuidedTour = useMapStore((s) => s.setGuidedTour);
  const tourActive = useMapStore((s) => s.showGuidedTour);

  return (
    <>
      <header className="brand-bar" role="banner">
        <a href="/" className="brand-mark" aria-label="Technical.ly home">
          <span className="dot" />
          <span className="brand-wordmark">Technical.ly</span>
          <span className="brand-sub">Innovation &amp; Opportunity Mapper</span>
        </a>
        <nav className="brand-nav" aria-label="Primary">
          <a href="#map">Map</a>
          <a href="#methodology">Methodology</a>
          <a href="#stories">Stories</a>
          <a href="#about">About</a>
        </nav>
        <span className="brand-spacer" />
        <button
          className="tour-btn"
          onClick={() => setGuidedTour(!tourActive, 0)}
          aria-pressed={tourActive}
        >
          {tourActive ? 'Stop tour' : 'Take the tour'}
        </button>
        <span className="brand-tag">Beta · v0.1</span>
      </header>

      <GlobeViewer />
      <Legend />
      <StatsPanel />
      <GuidedTour />

      <footer className="bottom-bar" aria-label="Timeline controls">
        <TimeSlider />
      </footer>
    </>
  );
}
