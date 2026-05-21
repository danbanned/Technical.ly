import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import { useMapStore } from '../../store/useMapStore';

/**
 * Narrated 90-second fly-through. Walks the viewer through six camera
 * destinations while flipping layers on so the story builds visually:
 * country → research towers → deal flow → mobility → mismatch → time.
 */

const STEPS = [
  {
    title: 'Where does innovation really happen?',
    body: 'A continent of ideas, capital, and opportunity — flattened into a single map.',
    destination: { lon: -98.5, lat: 32.0, height: 5_500_000 },
    pitch: -90,
    duration: 3.5,
    setup: (s) => {
      s.universityLayerVisible || s.toggleLayer('universityLayerVisible');
      if (s.dealFlowLayerVisible) s.toggleLayer('dealFlowLayerVisible');
      if (s.arcsLayerVisible) s.toggleLayer('arcsLayerVisible');
      if (s.mobilityLayerVisible) s.toggleLayer('mobilityLayerVisible');
    },
  },
  {
    title: 'University research — the birthplace of ideas.',
    body: 'These towers are R&D spending. Taller means more money is flowing into research.',
    destination: { lon: -71.10, lat: 42.37, height: 90_000 },
    pitch: -40,
    duration: 4,
    setup: (s) => {
      if (!s.universityLayerVisible) s.toggleLayer('universityLayerVisible');
    },
  },
  {
    title: 'Venture capital — moving between regions in real time.',
    body: 'Glowing points are deals. Arcs sweep where money is being placed on ideas.',
    destination: { lon: -76.61, lat: 39.29, height: 120_000 },
    pitch: -40,
    duration: 4,
    setup: (s) => {
      if (!s.dealFlowLayerVisible) s.toggleLayer('dealFlowLayerVisible');
      if (!s.arcsLayerVisible) s.toggleLayer('arcsLayerVisible');
    },
  },
  {
    title: 'Economic mobility — does this lift communities?',
    body: 'States fill with color: cool = stagnant, warm = dynamic. Where people can move up.',
    destination: { lon: -90.0, lat: 38.5, height: 3_500_000 },
    pitch: -55,
    duration: 4,
    setup: (s) => {
      if (!s.mobilityLayerVisible) s.toggleLayer('mobilityLayerVisible');
    },
  },
  {
    title: "Here's a mismatch — who's being left out?",
    body: 'Massive research, but capital isn’t flowing. Magenta outlines mark the gap.',
    destination: { lon: -76.61, lat: 39.29, height: 60_000 },
    pitch: -45,
    duration: 4,
    setup: (s) => {
      if (!s.mismatchModeEnabled) s.toggleMismatchMode();
    },
  },
  {
    title: 'Watch the gaps widen or close over time.',
    body: 'Drag the year slider. Everything updates. No spreadsheets — just insight.',
    destination: { lon: -98.5, lat: 38.0, height: 4_500_000 },
    pitch: -70,
    duration: 4,
    setup: (s) => {
      s.setYear(2014);
      // Sweep through years while this step is on screen.
      let y = 2014;
      const id = window.setInterval(() => {
        y = y >= 2024 ? 2014 : y + 1;
        useMapStore.getState().setYear(y);
      }, 350);
      window.__tourYearTicker = id;
    },
  },
];

export default function GuidedTour() {
  const show = useMapStore((s) => s.showGuidedTour);
  const step = useMapStore((s) => s.guidedTourStep);
  const viewer = useMapStore((s) => s.viewer);
  const setGuidedTour = useMapStore((s) => s.setGuidedTour);
  const tickerRef = useRef(null);

  useEffect(() => {
    if (!show || !viewer || viewer.isDestroyed?.()) return;
    const current = STEPS[Math.min(step, STEPS.length - 1)];

    if (window.__tourYearTicker) {
      clearInterval(window.__tourYearTicker);
      window.__tourYearTicker = null;
    }

    try { current.setup(useMapStore.getState()); } catch {}

    const { lon, lat, height } = current.destination;
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(lon, lat, height),
      orientation: {
        heading: 0,
        pitch: Cesium.Math.toRadians(current.pitch),
        roll: 0,
      },
      duration: current.duration,
    });
  }, [show, step, viewer]);

  useEffect(() => {
    if (!show) return;
    tickerRef.current = window.setTimeout(() => {
      const s = useMapStore.getState();
      if (!s.showGuidedTour) return;
      if (s.guidedTourStep < STEPS.length - 1) {
        s.setGuidedTour(true, s.guidedTourStep + 1);
      }
    }, 7000);
    return () => clearTimeout(tickerRef.current);
  }, [show, step]);

  useEffect(() => () => {
    if (window.__tourYearTicker) {
      clearInterval(window.__tourYearTicker);
      window.__tourYearTicker = null;
    }
  }, []);

  if (!show) return null;
  const current = STEPS[Math.min(step, STEPS.length - 1)];
  const isLast = step >= STEPS.length - 1;

  const close = () => {
    if (window.__tourYearTicker) {
      clearInterval(window.__tourYearTicker);
      window.__tourYearTicker = null;
    }
    setGuidedTour(false, 0);
  };

  return (
    <div className="guided-tour-overlay" role="dialog" aria-label="Guided tour">
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 10 }}>
        {STEPS.map((_, i) => (
          <span
            key={i}
            style={{
              width: i === step ? 24 : 8,
              height: 4,
              borderRadius: 2,
              background:
                i <= step ? 'var(--primary-innovation)' : 'var(--surface-3)',
              transition: 'width .2s',
            }}
          />
        ))}
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
        {current.title}
      </div>
      <div style={{ color: 'var(--muted-text)', fontSize: 13, marginBottom: 14 }}>
        {current.body}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <button
          className="simplify-btn"
          onClick={close}
          aria-label="Exit guided tour"
        >
          Skip
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="simplify-btn"
            onClick={() => setGuidedTour(true, Math.max(0, step - 1))}
            disabled={step === 0}
            style={{ opacity: step === 0 ? 0.4 : 1 }}
          >
            Back
          </button>
          <button
            className="simplify-btn"
            style={{
              borderColor: 'var(--primary-innovation)',
              color: 'var(--primary-innovation)',
            }}
            onClick={() => (isLast ? close() : setGuidedTour(true, step + 1))}
          >
            {isLast ? 'Done' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  );
}
