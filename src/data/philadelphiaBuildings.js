/**
 * philadelphiaBuildings.js — technical.me · Philadelphia Pilot (integrated v3)
 * ----------------------------------------------------------------------------
 * Single source of truth for the Philadelphia innovation layer.
 * Each building carries both render metadata (3D tower shape, height, color,
 * vitality bars, stats) AND the four CBS innovation-side inputs
 * (rdSpending, vcDealCount, patents, startupEmployment).
 *
 * Also exports the CBS engine, tract generator, color helpers, and lookup
 * utilities so downstream modules can import from one place.
 *
 *   INNOVATION SIDE (inputs)            COMMUNITY SIDE (outcomes)
 *   • University R&D spending nearby    • Median household income (tract)
 *   • Venture capital deal density      • Unemployment rate
 *   • Patent activity                   • Housing cost burden
 *   • Startup employment concentration  • Upward mobility score
 *
 * ⚠ DATA STATUS: building coordinates/magnitudes are approximate-real and
 *   flagged `synthetic: true`. All tract outcome numbers are SYNTHETIC
 *   PLACEHOLDERS generated deterministically. Swap `generatePhiladelphiaTracts`
 *   output for real ACS + Opportunity Atlas + HERD/Venture Monitor data when
 *   the pipeline lands; the schema does not change.
 * ----------------------------------------------------------------------------
 */

/* ═══════════════════════════════════════════════════════════════════════════
 * 1 · CONFIG
 * ═══════════════════════════════════════════════════════════════════════════ */

export const CBS_CONFIG = {
  innovationWeights: { rdSpending: 0.40, vcDealDensity: 0.30, patentActivity: 0.15, startupEmployment: 0.15 },
  outcomeWeights:    { income: 0.35, unemployment: 0.25, housingCostBurden: 0.20, upwardMobility: 0.20 },

  outcomeShare: 0.55,
  mismatchShare: 0.45,

  mismatchAlert: { innovationAbove: 0.50, outcomeBelow: 0.40 },

  ranges: {
    income:            [22000, 130000],
    unemployment:      [1.5, 22],
    housingCostBurden: [18, 60],
    upwardMobility:    [0, 100],
    rdProximity:       [0, 1.7e9],
    vcProximity:       [0, 240],
    patentProximity:   [0, 320],
    startupEmployment: [0, 9000],
  },

  proximitySigmaDeg: 0.012,
};

export const HOTSPOT_COLORS = {
  university: '#4FC3F7',
  vcHub:      '#FF8A00',
  hospital:   '#E91E63',
  techCenter: '#FF6D00',
  transit:    '#607D8B',
  gap:        '#9E9E9E',
};

export const HEATMAP_RAMPS = {
  default: ['#e0453a', '#f1c40f', '#2ecc71'],
  cbSafe:  ['#e66101', '#b8c4cf', '#2166ac'],
};

export function rampColor(t, ramp = HEATMAP_RAMPS.default) {
  t = Math.max(0, Math.min(1, t));
  const hex = c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
  const [lo, mid, hi] = ramp.map(hex);
  const [a, b, f] = t < 0.5 ? [lo, mid, t * 2] : [mid, hi, (t - 0.5) * 2];
  const ch = i => Math.round(a[i] + (b[i] - a[i]) * f).toString(16).padStart(2, '0');
  return `#${ch(0)}${ch(1)}${ch(2)}`;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 2 · BUILDINGS
 *     role:  'anchor'  → counts toward innovation proximity
 *            'transit' → landmark only, no innovation contribution
 *            'gap'     → explicit anti-anchor annotation
 * ═══════════════════════════════════════════════════════════════════════════ */

export const PHILADELPHIA_BUILDINGS = [
  {
    id: 'penn_research_tower', name: 'Penn Research Tower', label: 'UPenn',
    lat: 39.9522, lon: -75.1932, color: '#00D1FF', height: 42, shape: 'spired_futurist',
    category: 'universityResearch', type: 'university', role: 'anchor', towerMetric: 'rdSpending',
    rdSpending: 1.40e9, vcDealCount: 60, patents: 280, startupEmployment: 4200,
    // backward-compat aliases used by cbs.js + RegionSnapshot
    rdSpend: 1.40e9,
    vitality: { mobility: 25, capital: 60, dynamism: 55, innovation: 95 },
    stats: { institution: 'University of Pennsylvania', rdSpending: '$1.4B', patents: 280, gradStudents: '10,000' },
    synthetic: true, sourceTractId: '42101008700',
  },
  {
    id: 'drexel_innovation_hub', name: 'Drexel Innovation Hub', label: 'Drexel',
    lat: 39.9566, lon: -75.1899, color: '#00B8D4', height: 28, shape: 'segmented_tower',
    category: 'universityResearch', type: 'university', role: 'anchor', towerMetric: 'rdSpending',
    rdSpending: 3.5e8, vcDealCount: 25, patents: 55, startupEmployment: 1100,
    rdSpend: 3.5e8,
    vitality: { mobility: 30, capital: 45, dynamism: 62, innovation: 78 },
    stats: { institution: 'Drexel University', rdSpending: '$350M', patents: 55, gradStudents: '5,200' },
    synthetic: true, sourceTractId: '42101008700',
  },
  {
    id: 'temple_research_center', name: 'Temple Research Center', label: 'Temple',
    lat: 39.9812, lon: -75.1553, color: '#0091EA', height: 22, shape: 'segmented_tower',
    category: 'universityResearch', type: 'university', role: 'anchor', towerMetric: 'rdSpending',
    rdSpending: 2.8e8, vcDealCount: 12, patents: 42, startupEmployment: 800,
    rdSpend: 2.8e8,
    vitality: { mobility: 42, capital: 30, dynamism: 48, innovation: 65 },
    stats: { institution: 'Temple University', rdSpending: '$280M', patents: 42, gradStudents: '6,500' },
    synthetic: true, sourceTractId: '42101016800',
  },
  {
    id: 'jefferson_research_center', name: 'Jefferson Research Center', label: 'Jefferson U.',
    lat: 39.9487, lon: -75.1570, color: '#00D1FF', height: 18, shape: 'segmented_tower',
    category: 'universityResearch', type: 'university', role: 'anchor', towerMetric: 'rdSpending',
    rdSpending: 1.8e8, vcDealCount: 8, patents: 38, startupEmployment: 350,
    rdSpend: 1.8e8,
    vitality: { mobility: 35, capital: 40, dynamism: 50, innovation: 72 },
    stats: { institution: 'Thomas Jefferson University', rdSpending: '$180M', patents: 38, gradStudents: '3,800' },
    synthetic: true, sourceTractId: '42101000200',
  },
  {
    id: 'penn_medicine_pavilion', name: 'Penn Medicine Pavilion', label: 'Penn Medicine',
    lat: 39.9496, lon: -75.1918, color: '#E91E63', height: 35, shape: 'terraced_midrise',
    category: 'healthcareAnchor', type: 'hospital', role: 'anchor', towerMetric: 'rdSpending',
    rdSpending: 1.2e9, vcDealCount: 8, patents: 90, startupEmployment: 600,
    rdSpend: 1.2e9,
    vitality: { mobility: 52, capital: 70, dynamism: 60, innovation: 88 },
    stats: { institution: 'Penn Medicine', annualResearch: '$1.2B', totalEmployees: '49,000', localHiringRate: '62%' },
    synthetic: true, sourceTractId: '42101008700',
  },
  {
    id: 'childrens_hospital_of_philadelphia', name: "Children's Hospital of Philadelphia", label: 'CHOP',
    lat: 39.9480, lon: -75.1930, color: '#F06292', height: 30, shape: 'terraced_midrise',
    category: 'healthcareAnchor', type: 'hospital', role: 'anchor', towerMetric: 'rdSpending',
    rdSpending: 4.5e8, vcDealCount: 10, patents: 70, startupEmployment: 500,
    rdSpend: 4.5e8,
    vitality: { mobility: 48, capital: 55, dynamism: 58, innovation: 82 },
    stats: { institution: "Children's Hospital of Philadelphia", annualResearch: '$450M', totalEmployees: '14,000' },
    synthetic: true, sourceTractId: '42101008700',
  },
  {
    id: 'temple_university_hospital', name: 'Temple University Hospital', label: 'Temple Hosp.',
    lat: 40.0050, lon: -75.1500, color: '#E91E63', height: 28, shape: 'terraced_midrise',
    category: 'healthcareAnchor', type: 'hospital', role: 'anchor', towerMetric: 'rdSpending',
    rdSpending: 1.8e8, vcDealCount: 4, patents: 20, startupEmployment: 300,
    rdSpend: 1.8e8,
    vitality: { mobility: 65, capital: 42, dynamism: 52, innovation: 58 },
    stats: { institution: 'Temple University Hospital', annualResearch: '$180M', totalEmployees: '8,500', localHiringRate: '71%' },
    synthetic: true, sourceTractId: '42101016800',
  },
  {
    id: 'jefferson_health', name: 'Jefferson Health', label: 'Jefferson Health',
    lat: 39.9485, lon: -75.1575, color: '#E91E63', height: 26, shape: 'terraced_midrise',
    category: 'healthcareAnchor', type: 'hospital', role: 'anchor', towerMetric: 'rdSpending',
    rdSpending: 2.2e8, vcDealCount: 8, patents: 30, startupEmployment: 350,
    rdSpend: 2.2e8,
    vitality: { mobility: 55, capital: 50, dynamism: 55, innovation: 68 },
    stats: { institution: 'Jefferson Health', annualResearch: '$220M', totalEmployees: '30,000' },
    synthetic: true, sourceTractId: '42101000200',
  },
  {
    id: 'center_city_vc_district', name: 'Center City VC District', label: 'VC Deal Hub',
    lat: 39.9520, lon: -75.1650, color: '#FF8A00', height: 34, shape: 'tiered_blade',
    category: 'ventureCapital', type: 'vcHub', role: 'anchor', towerMetric: 'vcDealCount',
    rdSpending: 3.0e7, vcDealCount: 55, patents: 10, startupEmployment: 1800,
    rdSpend: 3.0e7, dealCount: 55,
    vitality: { mobility: 30, capital: 95, dynamism: 82, innovation: 70 },
    stats: { institution: 'Center City Venture Capital', totalDealFlow: '$900M', numberOfDeals: 55 },
    synthetic: true, sourceTractId: '42101000200',
  },
  {
    id: 'uc_science_center', name: 'UC Science Center', label: 'Univ. City Science Center',
    lat: 39.9550, lon: -75.1950, color: '#FF6D00', height: 24, shape: 'blade_bullet',
    category: 'startupIncubator', type: 'techCenter', role: 'anchor', towerMetric: 'vcDealCount',
    rdSpending: 9.0e7, vcDealCount: 60, patents: 78, startupEmployment: 2400,
    rdSpend: 9.0e7, dealCount: 60,
    vitality: { mobility: 22, capital: 85, dynamism: 78, innovation: 72 },
    stats: { institution: 'University City Science Center', portfolioCompanies: '60+', totalCapitalRaised: '$2.1B' },
    synthetic: true, sourceTractId: '42101008700',
  },
  {
    id: 'pennovation_works', name: 'Pennovation Works', label: 'Pennovation',
    lat: 39.9370, lon: -75.2050, color: '#FF8A00', height: 18, shape: 'modular_lowrise',
    category: 'startupIncubator', type: 'techCenter', role: 'anchor', towerMetric: 'vcDealCount',
    rdSpending: 4.0e7, vcDealCount: 45, patents: 20, startupEmployment: 320,
    rdSpend: 4.0e7, dealCount: 45,
    vitality: { mobility: 35, capital: 72, dynamism: 80, innovation: 68 },
    stats: { institution: 'Pennovation Works', activeStartups: 45, jobsCreated: 320 },
    synthetic: true, sourceTractId: '42101008700',
  },
  {
    id: 'drexel_baiada_institute', name: 'Drexel Baiada Institute', label: 'Baiada Institute',
    lat: 39.9555, lon: -75.1900, color: '#FFAB40', height: 10, shape: 'lowrise_compound',
    category: 'startupIncubator', type: 'techCenter', role: 'anchor', towerMetric: 'vcDealCount',
    rdSpending: 1.0e7, vcDealCount: 28, patents: 5, startupEmployment: 200,
    rdSpend: 1.0e7, dealCount: 28,
    vitality: { mobility: 38, capital: 35, dynamism: 70, innovation: 55 },
    stats: { institution: 'Baiada Institute for Entrepreneurship', startupsLaunched: 28, studentFounders: 95 },
    synthetic: true, sourceTractId: '42101008700',
  },
  {
    id: '30th_street_station', name: '30th Street Station', label: '30th St Station',
    lat: 39.9558, lon: -75.1820, color: '#607D8B', height: 16, shape: 'monolithic_slab',
    category: 'transitHub', type: 'transit', role: 'transit', towerMetric: null,
    rdSpending: 0, vcDealCount: 0, patents: 0, startupEmployment: 0,
    rdSpend: 0,
    vitality: { mobility: 85, capital: 55, dynamism: 72, innovation: 30 },
    stats: { institution: '30th Street Station', dailyRiders: '12,000+', connections: 'Amtrak, SEPTA, NJ Transit' },
    synthetic: true, sourceTractId: '42101008700',
  },
  {
    id: 'gap_north_philadelphia', name: 'GAP — No major research anchor in North Philadelphia', label: 'Anchor Gap',
    lat: 39.9900, lon: -75.1450, color: '#9E9E9E', height: 3, shape: 'slab_skyscraper',
    category: 'healthcareGap', type: 'gap', role: 'gap', towerMetric: null,
    rdSpending: 0, vcDealCount: 0, patents: 0, startupEmployment: 0,
    rdSpend: 0, isGap: true,
    vitality: { mobility: 10, capital: 5, dynamism: 8, innovation: 2 },
    stats: { gapType: 'No major university or hospital anchor', nearestResearchAnchor: 'Temple University Hospital (1.8 miles)', neighborhoodIncome: '$28,000' },
    synthetic: true, sourceTractId: '42101016900',
  },
  {
    id: 'gap_west_kensington', name: 'GAP — No major research anchor in West Kensington', label: 'Anchor Gap',
    lat: 39.9880, lon: -75.1250, color: '#9E9E9E', height: 3, shape: 'slab_skyscraper',
    category: 'healthcareGap', type: 'gap', role: 'gap', towerMetric: null,
    rdSpending: 0, vcDealCount: 0, patents: 0, startupEmployment: 0,
    rdSpend: 0, isGap: true,
    vitality: { mobility: 6, capital: 3, dynamism: 5, innovation: 1 },
    stats: { gapType: 'No major university or hospital anchor', nearestResearchAnchor: 'Temple University Hospital (2.3 miles)', neighborhoodIncome: '$26,000' },
    synthetic: true, sourceTractId: '42101017000',
  },
];

export default PHILADELPHIA_BUILDINGS;

// Buildings that contribute to innovation proximity (anchors only — excludes transit + gaps).
export const INNOVATION_ANCHORS = PHILADELPHIA_BUILDINGS.filter(b => b.role === 'anchor');

export const PHILADELPHIA_NEIGHBORHOOD_LABELS = [
  { name: 'University City',    lat: 39.9540, lon: -75.1930 },
  { name: 'Center City',        lat: 39.9505, lon: -75.1652 },
  { name: 'West Philadelphia',  lat: 39.9610, lon: -75.2200 },
  { name: 'North Philadelphia', lat: 39.9930, lon: -75.1520 },
  { name: 'South Philadelphia', lat: 39.9180, lon: -75.1660 },
  { name: 'Kensington',         lat: 39.9870, lon: -75.1230 },
];

/* ═══════════════════════════════════════════════════════════════════════════
 * 3 · CBS ENGINE
 * ═══════════════════════════════════════════════════════════════════════════ */

const clamp01 = x => Math.max(0, Math.min(1, x));
const norm    = (v, [lo, hi]) => clamp01((v - lo) / (hi - lo));
const normInv = (v, [lo, hi]) => clamp01(1 - (v - lo) / (hi - lo));

export function outcomeIndex(outcomes, cfg = CBS_CONFIG) {
  const w = cfg.outcomeWeights, r = cfg.ranges;
  return clamp01(
    w.income            * norm(outcomes.medianHouseholdIncome, r.income) +
    w.unemployment      * normInv(outcomes.unemploymentRate,   r.unemployment) +
    w.housingCostBurden * normInv(outcomes.housingCostBurden,  r.housingCostBurden) +
    w.upwardMobility    * norm(outcomes.upwardMobilityScore,   r.upwardMobility)
  );
}

export function innovationIndex(inputs, cfg = CBS_CONFIG) {
  const w = cfg.innovationWeights, r = cfg.ranges;
  return clamp01(
    w.rdSpending        * norm(inputs.nearbyRdSpending,  r.rdProximity) +
    w.vcDealDensity     * norm(inputs.vcDealDensity,     r.vcProximity) +
    w.patentActivity    * norm(inputs.patentActivity,    r.patentProximity) +
    w.startupEmployment * norm(inputs.startupEmployment, r.startupEmployment)
  );
}

export function computeCommunityBenefitScore(tract, cfg = CBS_CONFIG) {
  const oi = outcomeIndex(tract.residentOutcomes, cfg);
  const ii = innovationIndex(tract.innovationInputs, cfg);
  const mismatchGap = Math.max(0, ii - oi);
  const raw = cfg.outcomeShare * oi + cfg.mismatchShare * (1 - mismatchGap);
  return {
    communityBenefitScore: Math.round(10 * clamp01(raw) * 10) / 10,
    innovationIndex: Math.round(ii * 100) / 100,
    outcomeIndex: Math.round(oi * 100) / 100,
    mismatchAlert: ii > cfg.mismatchAlert.innovationAbove && oi < cfg.mismatchAlert.outcomeBelow,
  };
}

export function plainLanguageSummary(ii, oi) {
  const innHi = ii > 0.45, mobHi = oi > 0.55;
  if (innHi && mobHi)  return 'This neighborhood sits near major research and investment activity, and resident outcomes are tracking with it.';
  if (innHi && !mobHi) return 'This neighborhood is surrounded by significant R&D and venture activity, but incomes and mobility here remain well below the city median. That gap is the signal this platform exists to surface.';
  if (!innHi && mobHi) return 'Resident outcomes here are relatively strong, though there is little innovation activity nearby — growth is driven by other factors.';
  return 'There is limited innovation activity near this neighborhood, and resident outcomes are below the city median — a candidate area for new investment and programs.';
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 4 · TRACT GENERATOR
 *     Generates a grid of synthetic census tracts across Philadelphia with
 *     deterministic outcomes and gaussian innovation proximity from anchors.
 *     Call generatePhiladelphiaTracts() to produce the full dataset.
 * ═══════════════════════════════════════════════════════════════════════════ */

const rng = s => { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

const gaussKm = (lon, lat, clon, clat, sig) => {
  const dx = (lon - clon) * Math.cos(lat * Math.PI / 180), dy = lat - clat;
  return Math.exp(-(dx * dx + dy * dy) / (2 * sig * sig));
};

const MOB_HIGH = [[-75.1640, 39.9500, .030, .95], [-75.2480, 40.0340, .034, .90], [-75.0820, 40.0380, .040, .70],
                  [-75.1450, 39.9270, .026, .60], [-75.2050, 40.0480, .026, .65]];
const MOB_LOW  = [[-75.1520, 39.9930, .034, 1.05], [-75.2330, 39.9580, .030, .95],
                  [-75.2120, 39.9220, .028, .85],  [-75.1190, 39.9890, .024, .80]];

function mobilityFieldAt(lon, lat, seed) {
  let s = 0.46;
  MOB_HIGH.forEach(h => { s += h[3] * 0.42 * gaussKm(lon, lat, h[0], h[1], h[2]); });
  MOB_LOW .forEach(h => { s -= h[3] * 0.46 * gaussKm(lon, lat, h[0], h[1], h[2]); });
  s += (rng(seed) - 0.5) * 0.14;
  return Math.max(0.03, Math.min(0.97, s));
}

function innovationProximityAt(lon, lat, cfg = CBS_CONFIG) {
  let rd = 0, vc = 0, pat = 0, emp = 0;
  for (const b of INNOVATION_ANCHORS) {
    const g = gaussKm(lon, lat, b.lon, b.lat, cfg.proximitySigmaDeg);
    rd  += b.rdSpending * g;
    vc  += b.vcDealCount * g;
    pat += b.patents * g;
    emp += b.startupEmployment * g;
  }
  return { nearbyRdSpending: rd, vcDealDensity: vc, patentActivity: pat, startupEmployment: emp };
}

function distDeg(aLat, aLon, bLat, bLon) {
  const dx = (aLon - bLon) * Math.cos(((aLat + bLat) / 2) * Math.PI / 180), dy = aLat - bLat;
  return Math.hypot(dx, dy);
}

export function generatePhiladelphiaTracts(buildings = PHILADELPHIA_BUILDINGS) {
  const LON0 = -75.282, LON1 = -75.062, LAT0 = 39.888, LAT1 = 40.050, NX = 12, NY = 11;
  const dLon = (LON1 - LON0) / NX, dLat = (LAT1 - LAT0) / NY;
  const cornerCache = {};
  const corner = (i, j) => {
    const k = `${i}_${j}`;
    if (!cornerCache[k]) {
      const jx = (i > 0 && i < NX) ? (rng(i * 7 + j * 13) - 0.5) * dLon * 0.42 : 0;
      const jy = (j > 0 && j < NY) ? (rng(i * 17 + j * 3) - 0.5) * dLat * 0.42 : 0;
      cornerCache[k] = [LON0 + i * dLon + jx, LAT0 + j * dLat + jy];
    }
    return cornerCache[k];
  };

  const tracts = [];
  let n = 0;
  for (let i = 0; i < NX; i++) for (let j = 0; j < NY; j++) {
    const cx = LON0 + (i + 0.5) * dLon, cy = LAT0 + (j + 0.5) * dLat;
    if ((i < 2 && j < 2) || (i > NX - 3 && j < 2 && cx > -75.10) || (i < 2 && j > NY - 3)) continue;
    n++;
    const seed = n;
    const mob = mobilityFieldAt(cx, cy, seed);

    const residentOutcomes = {
      medianHouseholdIncome: Math.round((27 + mob * 74 + (rng(seed + 5) - 0.5) * 8)) * 1000,
      unemploymentRate:      +Math.max(1.4, 13.5 - mob * 10.6 + (rng(seed + 9) - 0.5) * 1.6).toFixed(1),
      housingCostBurden:     +Math.max(16, 46 - mob * 21 + (rng(seed + 13) - 0.5) * 5).toFixed(0),
      upwardMobilityScore:   Math.round(mob * 100),
    };
    const innovationInputs = innovationProximityAt(cx, cy);

    const tract = {
      geoid: '42101' + String(1200 + seed * 7).padStart(6, '0'),
      name: `Census Tract ${String(1200 + seed * 7).padStart(6, '0').replace(/^0+/, '')}`,
      centroid: { lat: cy, lon: cx },
      polygon: [corner(i, j), corner(i + 1, j), corner(i + 1, j + 1), corner(i, j + 1)],
      residentOutcomes,
      innovationInputs,
      buildingIds: [],
    };
    const scored = computeCommunityBenefitScore(tract);
    Object.assign(tract, scored);
    tract.plainLanguageSummary = plainLanguageSummary(tract.innovationIndex, tract.outcomeIndex);
    tracts.push(tract);
  }

  // Link each building to its nearest generated tract.
  for (const b of buildings) {
    let best = null, bestD = Infinity;
    for (const t of tracts) {
      const d = distDeg(b.lat, b.lon, t.centroid.lat, t.centroid.lon);
      if (d < bestD) { bestD = d; best = t; }
    }
    if (best) {
      b.tractId = best.geoid;
      best.buildingIds.push(b.id);
      if (b.role === 'anchor') best.hasAnchor = true;
      if (b.role === 'gap')    best.gapFlag = true;
    }
  }

  return tracts;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 5 · ASSEMBLED DATASET
 * ═══════════════════════════════════════════════════════════════════════════ */

const _tracts = generatePhiladelphiaTracts(PHILADELPHIA_BUILDINGS);

export const PHILADELPHIA = {
  meta: {
    name: 'Philadelphia', state: 'PA',
    center: { lat: 39.9526, lon: -75.1652 },
    cityRadius: 550,
    mvpMetric: 'Community Benefit Score',
    coreQuestion: 'How much of the nearby innovation activity is translating into resident outcomes?',
    dataStatus: 'Building coordinates/magnitudes approximate-real (synthetic:true); tract outcomes synthetic placeholders.',
  },
  buildings: PHILADELPHIA_BUILDINGS,
  innovationHotspots: INNOVATION_ANCHORS,
  gaps: PHILADELPHIA_BUILDINGS.filter(b => b.role === 'gap'),
  neighborhoodLabels: PHILADELPHIA_NEIGHBORHOOD_LABELS,
  tracts: _tracts,
  layers: [
    { id: 'hotspots', label: 'Innovation Hotspots (R&D / VC activity)', kind: 'towers' },
    { id: 'heatmap',  label: 'Mobility Heatmap (Green = High, Red = Low)', kind: 'choropleth' },
    { id: 'selected', label: 'Selected Neighborhood', kind: 'selection' },
  ],
  accessibility: { plainLanguageSummaries: true, colorBlindSafePalette: true, keyboardAccessible: true },
};

/* ═══════════════════════════════════════════════════════════════════════════
 * 6 · PHASE 2 STUB — multi-city (deferred)
 * ═══════════════════════════════════════════════════════════════════════════ */

export const PHASE2_CITIES = {
  boston: { name: 'Boston', state: 'MA', center: { lat: 42.3601, lon: -71.0589 }, cityOutcomes: { medianIncome: 72000, mobilityScore: 78 },
    innovationHotspots: [
      { name: 'MIT', type: 'university', lat: 42.3601, lon: -71.0942, rdSpending: 1.8e9, patents: 420, vcDealCount: 90 },
      { name: 'Harvard University', type: 'university', lat: 42.3770, lon: -71.1167, rdSpending: 1.5e9, patents: 310, vcDealCount: 60 },
      { name: 'Kendall Square', type: 'techCenter', lat: 42.3625, lon: -71.0864, rdSpending: 4.2e9, patents: 890, vcDealCount: 300 },
      { name: 'Seaport District', type: 'vcHub', lat: 42.3498, lon: -71.0459, rdSpending: 0, patents: 210, vcDealCount: 200 },
      { name: 'Mass General Hospital', type: 'hospital', lat: 42.3625, lon: -71.0694, rdSpending: 1.2e9, patents: 0, vcDealCount: 0 },
    ] },
  'new york': { name: 'New York', state: 'NY', center: { lat: 40.7128, lon: -74.0060 }, cityOutcomes: { medianIncome: 72000, mobilityScore: 75 },
    innovationHotspots: [
      { name: 'Columbia University', type: 'university', lat: 40.8075, lon: -73.9626, rdSpending: 1.5e9, patents: 380, vcDealCount: 0 },
      { name: 'NYU', type: 'university', lat: 40.7295, lon: -73.9965, rdSpending: 1.2e9, patents: 250, vcDealCount: 0 },
      { name: 'Cornell Tech (Roosevelt Island)', type: 'techCenter', lat: 40.7581, lon: -73.9505, rdSpending: 4.5e8, patents: 122, vcDealCount: 70 },
      { name: 'Silicon Alley (Flatiron)', type: 'techCenter', lat: 40.7411, lon: -73.9915, rdSpending: 3.2e9, patents: 510, vcDealCount: 450 },
      { name: 'NYU Langone Medical Center', type: 'hospital', lat: 40.7425, lon: -73.9731, rdSpending: 2.5e9, patents: 0, vcDealCount: 0 },
    ] },
  'san francisco': { name: 'San Francisco', state: 'CA', center: { lat: 37.7749, lon: -122.4194 }, cityOutcomes: { medianIncome: 96000, mobilityScore: 85 },
    innovationHotspots: [
      { name: 'Stanford University', type: 'university', lat: 37.4275, lon: -122.1697, rdSpending: 1.6e9, patents: 520, vcDealCount: 0 },
      { name: 'UC Berkeley', type: 'university', lat: 37.8719, lon: -122.2585, rdSpending: 1.2e9, patents: 380, vcDealCount: 0 },
      { name: 'SOMA Tech Corridor', type: 'techCenter', lat: 37.7825, lon: -122.4104, rdSpending: 8.5e9, patents: 2200, vcDealCount: 1200 },
      { name: 'Sand Hill Road (Menlo Park)', type: 'vcHub', lat: 37.4500, lon: -122.2000, rdSpending: 0, patents: 0, vcDealCount: 300 },
      { name: 'UCSF Medical Center', type: 'hospital', lat: 37.7626, lon: -122.4580, rdSpending: 2.5e9, patents: 210, vcDealCount: 0 },
    ] },
  chicago: { name: 'Chicago', state: 'IL', center: { lat: 41.8781, lon: -87.6298 }, cityOutcomes: { medianIncome: 58000, mobilityScore: 68 },
    innovationHotspots: [
      { name: 'University of Chicago', type: 'university', lat: 41.7886, lon: -87.5987, rdSpending: 8e8, patents: 120, vcDealCount: 0 },
      { name: 'Northwestern University', type: 'university', lat: 42.0559, lon: -87.6753, rdSpending: 9e8, patents: 160, vcDealCount: 0 },
      { name: '1871 (Merchandise Mart)', type: 'techCenter', lat: 41.8881, lon: -87.6352, rdSpending: 1.8e8, patents: 32, vcDealCount: 450 },
      { name: 'Northwestern Memorial Hospital', type: 'hospital', lat: 41.8955, lon: -87.6219, rdSpending: 1.2e9, patents: 0, vcDealCount: 0 },
    ] },
  washington: { name: 'Washington DC', state: 'DC', center: { lat: 38.9072, lon: -77.0369 }, cityOutcomes: { medianIncome: 82000, mobilityScore: 72 },
    innovationHotspots: [
      { name: 'Georgetown University', type: 'university', lat: 38.9076, lon: -77.0723, rdSpending: 3.5e8, patents: 25, vcDealCount: 0 },
      { name: 'Howard University', type: 'university', lat: 38.9227, lon: -77.0194, rdSpending: 1.2e8, patents: 12, vcDealCount: 0 },
      { name: 'NoMa Innovation District', type: 'techCenter', lat: 38.9050, lon: -77.0010, rdSpending: 1.5e9, patents: 95, vcDealCount: 110 },
      { name: 'MedStar Washington Hospital Center', type: 'hospital', lat: 38.9283, lon: -77.0312, rdSpending: 2.1e8, patents: 0, vcDealCount: 0 },
    ] },
  baltimore: { name: 'Baltimore', state: 'MD', center: { lat: 39.2904, lon: -76.6122 }, cityOutcomes: { medianIncome: 52000, mobilityScore: 62 },
    innovationHotspots: [
      { name: 'Johns Hopkins University', type: 'university', lat: 39.3299, lon: -76.6205, rdSpending: 3.18e9, patents: 342, vcDealCount: 0 },
      { name: 'University of Maryland Baltimore', type: 'university', lat: 39.2904, lon: -76.6253, rdSpending: 6.8e8, patents: 87, vcDealCount: 0 },
      { name: 'Port Covington Innovation District', type: 'techCenter', lat: 39.2541, lon: -75.5992, rdSpending: 1.2e8, patents: 18, vcDealCount: 45 },
      { name: 'Johns Hopkins Hospital', type: 'hospital', lat: 39.2975, lon: -76.5932, rdSpending: 2.5e9, patents: 0, vcDealCount: 0 },
    ] },
  pittsburgh: { name: 'Pittsburgh', state: 'PA', center: { lat: 40.4406, lon: -79.9959 }, cityOutcomes: { medianIncome: 48000, mobilityScore: 58 },
    innovationHotspots: [
      { name: 'Carnegie Mellon University', type: 'university', lat: 40.4428, lon: -79.9430, rdSpending: 1.2e9, patents: 220, vcDealCount: 0 },
      { name: 'University of Pittsburgh', type: 'university', lat: 40.4444, lon: -79.9533, rdSpending: 8e8, patents: 95, vcDealCount: 0 },
      { name: 'Robotics Row (Lawrenceville)', type: 'techCenter', lat: 40.4675, lon: -79.9695, rdSpending: 6.5e8, patents: 112, vcDealCount: 55 },
      { name: 'UPMC Presbyterian', type: 'hospital', lat: 40.4404, lon: -79.9600, rdSpending: 1.5e9, patents: 0, vcDealCount: 0 },
    ] },
  wilmington: { name: 'Wilmington', state: 'DE', center: { lat: 39.7391, lon: -75.5398 }, cityOutcomes: { medianIncome: 44000, mobilityScore: 58 },
    innovationHotspots: [
      { name: 'University of Delaware', type: 'university', lat: 39.6778, lon: -75.7508, rdSpending: 3.4e8, patents: 58, vcDealCount: 0 },
      { name: 'Wilmington Fintech District', type: 'techCenter', lat: 39.7345, lon: -75.5432, rdSpending: 1.1e8, patents: 25, vcDealCount: 70 },
      { name: 'Christiana Hospital', type: 'hospital', lat: 39.7060, lon: -75.5970, rdSpending: 1.5e8, patents: 0, vcDealCount: 0 },
    ] },
  austin: { name: 'Austin', state: 'TX', center: { lat: 30.2672, lon: -97.7431 }, cityOutcomes: { medianIncome: 68000, mobilityScore: 84 },
    innovationHotspots: [
      { name: 'University of Texas at Austin', type: 'university', lat: 30.2849, lon: -97.7341, rdSpending: 8e8, patents: 180, vcDealCount: 0 },
      { name: 'Silicon Hills (Domain)', type: 'techCenter', lat: 30.3983, lon: -97.7201, rdSpending: 2.7e9, patents: 340, vcDealCount: 210 },
      { name: 'Capital Factory', type: 'vcHub', lat: 30.2630, lon: -97.7405, rdSpending: 0, patents: 0, vcDealCount: 150 },
      { name: 'Dell Seton Medical Center', type: 'hospital', lat: 30.2657, lon: -97.7365, rdSpending: 2.5e8, patents: 0, vcDealCount: 0 },
    ] },
  detroit: { name: 'Detroit', state: 'MI', center: { lat: 42.3314, lon: -83.0458 }, cityOutcomes: { medianIncome: 32000, mobilityScore: 42 },
    innovationHotspots: [
      { name: 'Wayne State University', type: 'university', lat: 42.3585, lon: -83.0673, rdSpending: 2.5e8, patents: 35, vcDealCount: 0 },
      { name: 'Michigan Central Innovation District', type: 'techCenter', lat: 42.3305, lon: -83.0570, rdSpending: 3.1e8, patents: 65, vcDealCount: 30 },
      { name: 'TechTown Detroit', type: 'techCenter', lat: 42.3512, lon: -83.0645, rdSpending: 5.5e7, patents: 12, vcDealCount: 80 },
      { name: 'Detroit Medical Center', type: 'hospital', lat: 42.3405, lon: -83.0607, rdSpending: 3.5e8, patents: 0, vcDealCount: 0 },
    ] },
};

/* ═══════════════════════════════════════════════════════════════════════════
 * 7 · LOOKUP HELPERS
 * ═══════════════════════════════════════════════════════════════════════════ */

export const DEFAULT_CITY = PHILADELPHIA;

export function getCityData(cityName) {
  if (!cityName) return PHILADELPHIA;
  const key = cityName.toLowerCase().trim();
  if (key === 'philadelphia' || key.startsWith('phil')) return PHILADELPHIA;
  if (PHASE2_CITIES[key]) return PHASE2_CITIES[key];
  const match = Object.keys(PHASE2_CITIES).find(k => k.startsWith(key) || key.startsWith(k));
  return match ? PHASE2_CITIES[match] : PHILADELPHIA;
}
export const getSeedCity = getCityData;

export function getTractByGeoid(geoid) {
  return PHILADELPHIA.tracts.find(t => t.geoid === geoid) || null;
}

export function getBuildingsByTract(geoid) {
  const t = getTractByGeoid(geoid);
  if (!t) return [];
  return t.buildingIds.map(id => PHILADELPHIA_BUILDINGS.find(b => b.id === id)).filter(Boolean);
}

export function getTractPanel(geoid) {
  const t = getTractByGeoid(geoid);
  if (!t) return null;
  return {
    geoid: t.geoid, name: t.name,
    communityBenefitScore: t.communityBenefitScore,
    mismatchAlert: t.mismatchAlert,
    summary: t.plainLanguageSummary,
    nearbyInnovation: {
      rdSpend: t.innovationInputs.nearbyRdSpending,
      vcDeals: Math.round(t.innovationInputs.vcDealDensity),
    },
    residentOutcomes: t.residentOutcomes,
    buildings: getBuildingsByTract(geoid).map(b => ({ id: b.id, name: b.name, type: b.type })),
  };
}

export function getInsights(topN = 5) {
  const tracts = PHILADELPHIA.tracts;
  const mismatches = tracts
    .filter(t => t.mismatchAlert)
    .sort((a, b) => (b.innovationIndex - b.outcomeIndex) - (a.innovationIndex - a.outcomeIndex))
    .slice(0, topN);
  const sorted = [...tracts].sort((a, b) => a.communityBenefitScore - b.communityBenefitScore);
  return {
    cityMeanCBS: +(tracts.reduce((s, t) => s + t.communityBenefitScore, 0) / tracts.length).toFixed(2),
    mismatchAlerts: mismatches,
    lowestScoring: sorted.slice(0, topN),
    highestScoring: sorted.slice(-topN).reverse(),
  };
}

export function getBuildingColor(b) { return b?.color || HOTSPOT_COLORS[b?.type] || HOTSPOT_COLORS.techCenter; }
export function getHotspotColor(type) { return HOTSPOT_COLORS[type] ?? HOTSPOT_COLORS.techCenter; }
export function getMobilityColor(scoreOutOf100, cbSafe = false) {
  return rampColor(scoreOutOf100 / 100, cbSafe ? HEATMAP_RAMPS.cbSafe : HEATMAP_RAMPS.default);
}
