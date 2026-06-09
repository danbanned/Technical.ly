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
