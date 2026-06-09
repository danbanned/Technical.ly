import { PALETTES } from '../../data/config.js';

function lerpHex(a, b, t) {
  const parse = (h) => [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ];
  const [ar, ag, ab] = parse(a);
  const [br, bg, bb] = parse(b);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bv = Math.round(ab + (bb - ab) * t);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bv.toString(16).padStart(2, '0')}`;
}

function mobilityToColor(score, palette) {
  const s = Math.max(0, Math.min(100, score));
  if (s <= 50) return lerpHex(palette.low, palette.mid, s / 50);
  return lerpHex(palette.mid, palette.high, (s - 50) / 50);
}

// Seeded pseudo-random — stable across reloads, no Math.random()
function seededRandom(seed) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// Area-weighted centroid via shoelace formula
function polygonCentroid(polygon) {
  let area = 0, cx = 0, cy = 0;
  const n = polygon.length;
  for (let i = 0; i < n; i++) {
    const [x0, y0] = polygon[i];
    const [x1, y1] = polygon[(i + 1) % n];
    const cross = x0 * y1 - x1 * y0;
    area += cross;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
  }
  area /= 2;
  if (Math.abs(area) < 1e-12) {
    // Degenerate polygon — fall back to mean
    return [
      polygon.reduce((s, [x]) => s + x, 0) / n,
      polygon.reduce((s, [, y]) => s + y, 0) / n,
    ];
  }
  return [cx / (6 * area), cy / (6 * area)];
}

// Equal-area circle radius in metres for a lon/lat polygon
function polygonRadiusM(polygon, centroidLat) {
  let area = 0;
  const n = polygon.length;
  for (let i = 0; i < n; i++) {
    const [x0, y0] = polygon[i];
    const [x1, y1] = polygon[(i + 1) % n];
    area += x0 * y1 - x1 * y0;
  }
  const areaDeg2 = Math.abs(area) / 2;
  const mLat = 111320;
  const mLon = 111320 * Math.cos(centroidLat * (Math.PI / 180));
  return Math.sqrt((areaDeg2 * mLat * mLon) / Math.PI);
}

/**
 * Returns circle (ellipse + optional beacon point) specs for census tract mobility layer.
 * Each spec carries an `anim` block; the renderer uses CallbackProperty to pulse each circle.
 *
 * @param {Array}   tracts     - Tract objects with `polygon`, `mobilityScore`, `id`
 * @param {boolean} cbSafeMode - Use color-blind safe palette
 * @param {object}  opts
 * @param {boolean} opts.coreBeacon   - Render a small bright center point (default true)
 * @param {number}  opts.minRadiusM   - Minimum circle radius in metres (default 120)
 * @param {number}  opts.maxRadiusM   - Maximum circle radius in metres (default 520)
 * @param {number}  opts.fillFactor   - Fraction of equal-area radius to use (default 0.78)
 */
export function buildMobilityCircleSpecs(tracts, cbSafeMode = false, opts = {}) {
  const {
    coreBeacon = true,
    minRadiusM = 120,
    maxRadiusM = 520,
    fillFactor = 0.78,
  } = opts;

  const palette = cbSafeMode ? PALETTES.mobilityCB : PALETTES.mobilityDefault;

  return tracts.flatMap((tract, idx) => {
    const colorHex = mobilityToColor(tract.mobilityScore, palette);
    const score = Math.max(0, Math.min(100, tract.mobilityScore ?? 50));

    // Geometry
    let lon, lat, baseRadius;
    if (tract.polygon && tract.polygon.length >= 3) {
      [lon, lat] = polygonCentroid(tract.polygon);
      const rawR = polygonRadiusM(tract.polygon, lat) * fillFactor;
      baseRadius = Math.max(minRadiusM, Math.min(maxRadiusM, rawR));
    } else {
      lon = tract.centroid?.[0] ?? 0;
      lat = tract.centroid?.[1] ?? 0;
      baseRadius = (minRadiusM + maxRadiusM) / 2;
    }

    // Deterministic animation params (seeded from idx, no Math.random())
    const phase = seededRandom(idx) * Math.PI * 2;
    const speed = 0.6 + (score / 100) * 0.6; // higher mobility → faster pulse

    const circleSpec = {
      type: 'ellipse',
      id: `phila-tract-${tract.id}`,
      philaType: 'tract',
      philaRef: tract.id,
      group: 'mobility',
      clickable: true,
      lon,
      lat,
      colorHex,
      alpha: 0.55,
      outline: true,
      outlineHex: '#FFFFFF',
      outlineWidth: 1,
      anim: {
        baseRadius,
        pulseRadiusAmp: 0.10,   // ±10% radius breathing
        baseAlpha: 0.55,
        pulseAlphaAmp: 0.22,    // ±0.22 alpha throb
        speed,
        phase,
      },
    };

    if (!coreBeacon) return [circleSpec];

    const beaconSpec = {
      type: 'point',
      id: `phila-tract-beacon-${tract.id}`,
      philaType: 'tract',
      philaRef: tract.id,
      group: 'mobility',
      clickable: true,
      lon,
      lat,
      colorHex,
      pixelSize: 5,
    };

    return [circleSpec, beaconSpec];
  });
}

/**
 * Legacy polygon heatmap specs — kept for reference / rollback.
 */
export function buildMobilitySpecs(tracts, cbSafeMode = false) {
  const palette = cbSafeMode ? PALETTES.mobilityCB : PALETTES.mobilityDefault;
  return tracts.map((tract) => ({
    type: 'polygon',
    id: `phila-tract-${tract.id}`,
    philaType: 'tract',
    philaRef: tract.id,
    group: 'mobility',
    positions: tract.polygon,
    height: 0,
    extrudedHeight: 25,
    colorHex: mobilityToColor(tract.mobilityScore, palette),
    alpha: 0.65,
    outline: true,
    outlineHex: '#FFFFFF',
    outlineWidth: 2,
  }));
}

export { mobilityToColor, lerpHex };
