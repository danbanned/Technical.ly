import { useMapStore } from '../../store/useMapStore';
import GlobeViewer from '../Globe/GlobeViewer';
import StatsPanel from '../UI/StatsPanel';
import LayerToggles from '../Globe/Controls/LayerToggles';
import MismatchButton from '../Globe/Controls/MismatchButton';
import TimeSlider from '../Globe/Controls/TimeSlider';

/**
 * Mobile layout: full-screen globe, bottom time slider, pull-up legend sheet.
 */
export default function MobileLayout() {
  const sheetOpen = useMapStore((s) => s.mobileSheetOpen);
  const setSheetOpen = useMapStore((s) => s.setMobileSheetOpen);

  return (
    <>
      <header className="brand-bar">
        <a href="/" className="brand-mark">
          <span className="dot" />
          I&amp;O Mapper
        </a>
        <span className="brand-spacer" />
        <span className="brand-tag">Beta</span>
      </header>

      <GlobeViewer />
      <StatsPanel />

      <button
        className="mobile-fab"
        onClick={() => setSheetOpen(!sheetOpen)}
        aria-expanded={sheetOpen}
        aria-controls="mobile-sheet"
      >
        🏛️ Layers &amp; Legend ▲
      </button>

      <div
        id="mobile-sheet"
        className={`mobile-sheet ${sheetOpen ? 'open' : ''}`}
        role="dialog"
        aria-label="Layers and legend"
      >
        <div className="handle" onClick={() => setSheetOpen(false)} />
        <LayerToggles />
        <div style={{ marginTop: 12 }}>
          <MismatchButton />
        </div>
      </div>

      <footer className="bottom-bar">
        <TimeSlider />
      </footer>
    </>
  );
}
