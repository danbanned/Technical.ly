import { useMapStore } from '../store/useMapStore';
import { PALETTES } from '../data/config';
import SolutionConnector from './SolutionConnector';

const ECONOMIC_LEGEND = [
  { color: '#D500F9', label: 'Mismatch Alert' },
  { color: '#00E676', label: 'High Mobility' },
  { color: '#FFD600', label: 'Medium Mobility' },
  { color: '#FF3D00', label: 'Low Mobility' },
  { color: '#2979FF', label: 'University R&D' },
  { color: '#00E5FF', label: 'Healthcare' },
  { color: '#546E7A', label: 'Other' },
];

export default function Legend() {
  const cbSafe        = useMapStore((s) => s.philaCBSafeMode);
  const selectedTract = useMapStore((s) => s.philaSelectedTract);
  const economicColor = useMapStore((s) => s.philaEconomicColor);
  const enrichedOn    = useMapStore((s) => s.philaEnrichedBuildings);
  const palette       = cbSafe ? PALETTES.mobilityCB : PALETTES.mobilityDefault;
  const gradient      = `linear-gradient(to right, ${palette.low}, ${palette.mid}, ${palette.high})`;

  return (
    <div className="phila-legend-stack">

      {/* Solutions footer — only when a tract is selected */}
      {selectedTract && (
        <SolutionConnector tract={selectedTract} forceCompact />
      )}

      {/* Legend row */}
      <div
        className="phila-panel phila-legend-panel"
        role="complementary"
        aria-label="Map legend"
      >
        {economicColor && enrichedOn ? (
          <div className="phila-legend-economic">
            {ECONOMIC_LEGEND.map(({ color, label }) => (
              <div key={label} className="phila-legend-dot">
                <div className="phila-legend-dot-circle" style={{ background: color }} />
                {label}
              </div>
            ))}
          </div>
        ) : (
          <>
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
          </>
        )}
      </div>

    </div>
  );
}
