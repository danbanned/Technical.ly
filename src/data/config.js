/**
 * Data-source manifest — one entry per dataset used in the app.
 * `lastUpdated` is an ISO date string; a real pipeline would stamp this on each run.
 * `synthetic: true` flags values that were hand-crafted for demonstration and must
 * never be presented as production data.
 */
export const DATA_SOURCES = {
  syntheticSeed: {
    id: 'syntheticSeed',
    label: 'Sample data',
    lastUpdated: '2024-01-15',
    vintage: '2024 Q1',
    synthetic: true,
    note: 'Synthetic values for demonstration only. Not for production use.',
  },
  censusACS2022: {
    id: 'censusACS2022',
    label: 'Census ACS',
    lastUpdated: '2023-12-07',   // ACS 2022 5-year public release date
    vintage: 'ACS 2022 5-year',
    synthetic: false,
    note: 'American Community Survey 5-year estimates, 2018–2022.',
  },
  opportunityAtlas: {
    id: 'opportunityAtlas',
    label: 'Opportunity Atlas',
    lastUpdated: '2018-10-01',
    vintage: '2018',
    synthetic: false,
    note: 'Harvard / Census Bureau upward-mobility estimates.',
  },
};

// Data older than this threshold (in months) is considered stale and should be
// flagged in narration. 18 months = one full ACS release cycle.
export const STALENESS_THRESHOLD_MONTHS = 18;

export const CBS_CONFIG = {
  RADIUS_KM: 1.5,
  INNOVATION_WEIGHTS: {
    rdSpend: 0.6,
    vcDensity: 0.4,
  },
  OUTCOME_WEIGHTS: {
    mobility: 0.4,
    income: 0.35,
    unemployment: 0.25,
  },
  MISMATCH_THRESHOLDS: {
    innovationHigh: 0.6,
    outcomeLow: 0.35,
  },
};

export const PALETTES = {
  mobilityDefault: {
    high: '#2E7D32',
    mid: '#F9A825',
    low: '#C62828',
  },
  mobilityCB: {
    high: '#1565C0',
    mid: '#F5F5F5',
    low: '#E65100',
  },
};

export const SCENE = {
  CAMERA: {
    lon: -75.1950,
    lat: 39.9520,
    height: 8000,
    pitch: -45,
  },
};
