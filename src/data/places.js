// Read-only views of the app's existing place and tract data for the shell pages.
// Nothing here adds data: values come from philadelphiaBuildings.js and
// philadelphiaTracts.js (both flagged synthetic), and the computed fields come from
// the same computeAllCBS call the 3D map makes (PhiladelphiaLayers.jsx:150).
import { PHILADELPHIA_BUILDINGS } from './philadelphiaBuildings';
import { PHILADELPHIA_TRACTS, TRACTS_LAST_UPDATED, TRACTS_DATA_SOURCE } from './philadelphiaTracts';
import { CBS_CONFIG } from './config';
import { computeAllCBS } from '../core/cbs';

export const BUILDINGS = PHILADELPHIA_BUILDINGS;
export const TRACTS = computeAllCBS(PHILADELPHIA_TRACTS, PHILADELPHIA_BUILDINGS, CBS_CONFIG);
export { TRACTS_LAST_UPDATED, TRACTS_DATA_SOURCE };

export const getTract = (id) => TRACTS.find((t) => t.id === id) ?? null;
export const buildingsInTract = (id) => BUILDINGS.filter((b) => b.sourceTractId === id);

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const missing = (v) => v === null || v === undefined || Number.isNaN(v);

// "No data yet" for anything the data doesn't have — never a filled-in value.
export const fmt = {
  usd: (v) => (missing(v) ? 'No data yet' : usd.format(v)),
  pctFromFraction: (v) => (missing(v) ? 'No data yet' : `${(v * 100).toFixed(1)}%`),
  num: (v, digits = 1) => (missing(v) ? 'No data yet' : Number(v).toFixed(digits)),
  bool: (v) => (missing(v) ? 'No data yet' : v ? 'Yes' : 'No'),
};
