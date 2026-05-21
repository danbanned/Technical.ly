import { useEffect } from 'react';
import { useMapStore } from '../../../store/useMapStore';
import { detectMismatches } from '../../../utils/mismatchLogic';

/**
 * Toggles "mismatch mode" — highlights places where research, capital,
 * and mobility are out of balance.
 */
export default function MismatchButton() {
  const enabled = useMapStore((s) => s.mismatchModeEnabled);
  const toggle = useMapStore((s) => s.toggleMismatchMode);
  const setMismatches = useMapStore((s) => s.setMismatches);
  const thresholds = useMapStore((s) => s.mismatchThresholds);

  useEffect(() => {
    if (!enabled) {
      setMismatches({ highResearchLowDeals: [], highInvestmentLowMobility: [] });
      return;
    }
    Promise.all([
      fetch('/data/baltimore_universities.geojson').then((r) => r.json()).catch(() => ({ features: [] })),
      fetch('/data/baltimore_deals.geojson').then((r) => r.json()).catch(() => ({ features: [] })),
      fetch('/data/states_dynamism.geojson').then((r) => r.json()).catch(() => ({ features: [] })),
    ]).then(([u, d, s]) => {
      const result = detectMismatches({
        universities: u.features || [],
        deals: d.features || [],
        states: s.features || [],
        thresholds,
      });
      setMismatches(result);
    });
  }, [enabled, thresholds, setMismatches]);

  return (
    <button
      className="mismatch-btn"
      aria-pressed={enabled}
      onClick={toggle}
    >
      <span style={{ fontSize: 16 }}>🔍</span>
      Highlight Mismatches
    </button>
  );
}
