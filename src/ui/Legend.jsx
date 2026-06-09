import { useMapStore } from '../store/useMapStore';
import { PALETTES } from '../data/config';

export default function Legend() {
  const cbSafe = useMapStore((s) => s.philaCBSafeMode);
  const palette = cbSafe ? PALETTES.mobilityCB : PALETTES.mobilityDefault;
  const gradient = `linear-gradient(to right, ${palette.low}, ${palette.mid}, ${palette.high})`;

  return (
    <div
      className="phila-panel phila-legend-panel"
      role="complementary"
      aria-label="Map legend"
    >
      <div className="phila-legend-dots">
        <div className="phila-legend-dot">
          <div className="phila-legend-dot-circle" style={{ background: '#00D1FF' }} />
          University R&amp;D
        </div>
        <div className="phila-legend-dot">
          <div className="phila-legend-dot-circle" style={{ background: '#E91E63' }} />
          Healthcare
        </div>
        <div className="phila-legend-dot">
          <div className="phila-legend-dot-circle" style={{ background: '#FF8A00' }} />
          VC / Startups
        </div>
        <div className="phila-legend-dot">
          <div className="phila-legend-dot-circle" style={{ background: '#9E9E9E' }} />
          Gap marker
        </div>
      </div>

      <div className="phila-legend-sep" />

      <div className="phila-legend-mobility">
        <div className="phila-legend-mobility-bar">
          <span>Mobility</span>
          <div className="phila-legend-gradient" style={{ background: gradient }} />
          <span>High</span>
        </div>
        <div className="phila-legend-ticks" style={{ marginLeft: 48 }}>
          <span>Low</span>
        </div>
      </div>
    </div>
  );
}
