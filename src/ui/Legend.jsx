import { useRef, useCallback, useState } from 'react';
import * as Cesium from 'cesium';
import { useMapStore } from '../store/useMapStore';
import { PALETTES } from '../data/config';
import SolutionConnector from './SolutionConnector';

const ECONOMIC_LEGEND = [
  {
    key: 'mismatch',
    color: '#D500F9',
    label: 'Mismatch Alert',
    info: 'High innovation activity nearby, but residents see little economic benefit. Mobility score below 35 — the gap between anchor institutions and community outcomes is widest here.',
    flyTo: { lon: -75.1932, lat: 39.9490, alt: 500 },
  },
  {
    key: 'highMobility',
    color: '#00E676',
    label: 'High Mobility',
    info: 'Strong upward mobility. Residents in this tract move up the income ladder at significantly higher rates than the national average.',
    flyTo: { lon: -75.2127, lat: 40.0653, alt: 500 },
  },
  {
    key: 'mediumMobility',
    color: '#FFD600',
    label: 'Medium Mobility',
    info: 'Moderate mobility outcomes. Economic opportunity exists here but structural barriers — access to transit, quality schools, stable employment — still limit upward movement.',
    flyTo: { lon: -75.1437, lat: 40.0271, alt: 500 },
  },
  {
    key: 'lowMobility',
    color: '#FF3D00',
    label: 'Low Mobility',
    info: 'Low upward mobility. Residents face significant economic barriers to advancement. Children growing up here are statistically less likely to out-earn their parents.',
    flyTo: { lon: -75.1699, lat: 39.9900, alt: 500 },
  },
  {
    key: 'university',
    color: '#2979FF',
    label: 'University R&D',
    info: 'University or college building. High patent activity and research spending nearby — a major innovation anchor for the surrounding neighborhood.',
    flyTo: { lon: -75.1932, lat: 39.9522, alt: 400 },
  },
  {
    key: 'healthcare',
    color: '#00E5FF',
    label: 'Healthcare',
    info: 'Hospital or clinic. A healthcare anchor institution — large employer and community health resource, often one of the biggest economic drivers in its neighborhood.',
    flyTo: { lon: -75.1575, lat: 39.9464, alt: 400 },
  },
  {
    key: 'other',
    color: '#546E7A',
    label: 'Other',
    info: 'Buildings outside the matched tract areas or without a specific economic classification. No mobility or innovation data is available for this location.',
    flyTo: { lon: -75.1652, lat: 39.9526, alt: 700 },
  },
];

export default function Legend() {
  const cbSafe         = useMapStore((s) => s.philaCBSafeMode);
  const selectedTract  = useMapStore((s) => s.philaSelectedTract);
  const economicColor  = useMapStore((s) => s.philaEconomicColor);
  const enrichedOn     = useMapStore((s) => s.philaEnrichedBuildings);
  const filterColor    = useMapStore((s) => s.philaFilterColor);
  const legendExpanded = useMapStore((s) => s.philaLegendExpanded);
  const viewer         = useMapStore((s) => s.viewer);
  const setFilterColor    = useMapStore((s) => s.setPhilaFilterColor);
  const setLegendExpanded = useMapStore((s) => s.setPhilaLegendExpanded);

  const palette  = cbSafe ? PALETTES.mobilityCB : PALETTES.mobilityDefault;
  const gradient = `linear-gradient(to right, ${palette.low}, ${palette.mid}, ${palette.high})`;

  const [hoveredItem, setHoveredItem] = useState(null);
  const flyTimerRef = useRef(null);

  const handleMouseEnter = useCallback((item) => {
    setHoveredItem(item);
    if (!viewer || viewer.isDestroyed()) return;
    clearTimeout(flyTimerRef.current);
    flyTimerRef.current = setTimeout(() => {
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(item.flyTo.lon, item.flyTo.lat, item.flyTo.alt),
        orientation: { heading: 0, pitch: Cesium.Math.toRadians(-35), roll: 0 },
        duration: 1.5,
      });
    }, 350);
  }, [viewer]);

  const handleMouseLeave = useCallback(() => {
    clearTimeout(flyTimerRef.current);
    setHoveredItem(null);
  }, []);

  const handleFilterClick = useCallback((key) => {
    setFilterColor(filterColor === key ? null : key);
  }, [filterColor, setFilterColor]);

  if (economicColor && enrichedOn) {
    return (
      <div className="phila-legend-stack">
        {selectedTract && <SolutionConnector tract={selectedTract} forceCompact />}

        {/* Billboard — appears above the legend when hovering a color */}
        {hoveredItem && (
          <div className="phila-legend-billboard" style={{ borderColor: hoveredItem.color }}>
            <div className="phila-legend-billboard-dot" style={{ background: hoveredItem.color }} />
            <div>
              <div className="phila-legend-billboard-title" style={{ color: hoveredItem.color }}>
                {hoveredItem.label}
              </div>
              <div className="phila-legend-billboard-body">{hoveredItem.info}</div>
            </div>
          </div>
        )}

        <div className={`phila-panel phila-legend-panel phila-legend-panel--economic${legendExpanded ? ' is-legend-wide' : ''}`}>
          <div className="phila-legend-ec-header">
            <span className="phila-legend-ec-title">Building Color</span>
            <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
              {filterColor && (
                <button
                  className="phila-legend-reset-btn"
                  onClick={() => setFilterColor(null)}
                  title="Show all colors"
                >
                  Reset
                </button>
              )}
              <button
                className="phila-icon-btn"
                onClick={() => setLegendExpanded(!legendExpanded)}
                title={legendExpanded ? 'Collapse legend' : 'Expand legend'}
                style={{ fontSize: '0.9em' }}
              >
                {legendExpanded ? '⊡' : '⊞'}
              </button>
            </div>
          </div>

          <div className="phila-legend-economic">
            {ECONOMIC_LEGEND.map((item) => {
              const isActive = filterColor === item.key;
              const isDimmed = filterColor !== null && !isActive;
              return (
                <div
                  key={item.key}
                  className={`phila-legend-dot phila-legend-dot--btn${isActive ? ' is-active' : ''}${isDimmed ? ' is-dimmed' : ''}`}
                  onClick={() => handleFilterClick(item.key)}
                  onMouseEnter={() => handleMouseEnter(item)}
                  onMouseLeave={handleMouseLeave}
                  title="Click to filter · Hover for details"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && handleFilterClick(item.key)}
                >
                  <div
                    className="phila-legend-dot-circle"
                    style={{
                      background: item.color,
                      boxShadow: isActive ? `0 0 7px 2px ${item.color}88` : undefined,
                      transform: isActive ? 'scale(1.35)' : undefined,
                    }}
                  />
                  <span>{item.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="phila-legend-stack">
      {selectedTract && <SolutionConnector tract={selectedTract} forceCompact />}
      <div className="phila-panel phila-legend-panel">
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
    </div>
  );
}
