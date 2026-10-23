// The providers the app uses today, described as they are — including the sample
// and synthetic ones. Separate from source_of_truth.json, which is the data
// registry and is not edited here. Key status is read from whether the env var is
// set; the value itself is never shown.
const isSet = (v) => !!v;

export const APP_SOURCES = [
  {
    id: 'osm',
    name: 'OpenStreetMap',
    tag: 'PUBLIC MAP TILES',
    summary: 'Street map tiles on the 2D map, and the footprints behind the 3D OSM Buildings.',
    description:
      'The 2D map uses OpenStreetMap tiles (tile.openstreetmap.org). The 3D map draws Cesium OSM Buildings (Cesium ion asset 96188), built from OpenStreetMap data. Credit: © OpenStreetMap contributors (ODbL).',
    datasetUrl: 'https://www.openstreetmap.org/',
    docsUrl: 'https://operations.osmfoundation.org/policies/tiles/',
    keyEnv: null,
  },
  {
    id: 'census_acs',
    name: 'Census ACS',
    tag: 'NOT CONNECTED · OFFLINE SCRIPT ONLY',
    summary: 'American Community Survey 5-year estimates. Not connected to the app yet.',
    description:
      'The app does not call the Census API. scripts/fetch_phila_tracts.py can pull ACS 2022 5-year values offline, but nothing it writes is loaded. The tract values shown in the app are sample data from src/data/philadelphiaTracts.js.',
    datasetUrl: 'https://data.census.gov/',
    docsUrl: 'https://www.census.gov/data/developers/data-sets/acs-5year.html',
    keyEnv: null,
    keyNote: 'App: none. Offline script: --census-key flag',
  },
  {
    id: 'open_meteo',
    name: 'Open-Meteo',
    tag: 'WEATHER',
    summary: 'Current temperature, conditions and wind on the Dashboard.',
    description:
      'The Dashboard requests current weather for Philadelphia from api.open-meteo.com in the browser. If the request fails it shows "Weather unavailable". Open-Meteo is not in the source registry.',
    datasetUrl: 'https://open-meteo.com/',
    docsUrl: 'https://open-meteo.com/en/docs',
    keyEnv: null,
  },
  {
    id: 'tract_boundaries',
    name: 'Philadelphia tract boundaries',
    tag: 'BUNDLED GEOGRAPHY · APPROXIMATE',
    summary: 'Tract outlines bundled with the app: 11 tracts drawn as simple rectangles.',
    description:
      'src/data/philadelphiaTracts.js holds 11 tracts with real GEOIDs and hand-drawn four-corner rectangles, flagged synthetic. They are not the official TIGER/Line shapes.',
    datasetUrl: 'https://www2.census.gov/geo/tiger/TIGER2022/TRACT/',
    docsUrl: 'https://www.census.gov/geographies/mapping-files/time-series/geo/tiger-line-file.html',
    keyEnv: null,
  },
  {
    id: 'google_3d',
    name: 'Google Maps 3D Tiles',
    summary: 'Photorealistic 3D city mesh on the 3D map.',
    description:
      'Google Photorealistic 3D Tiles on the 3D map, requested from tile.googleapis.com with the browser key in VITE_GOOGLE_MAPS_API_KEY.',
    datasetUrl: 'https://developers.google.com/maps/documentation/tile/3d-tiles',
    docsUrl: 'https://developers.google.com/maps/documentation/tile/3d-tiles-overview',
    keyEnv: 'VITE_GOOGLE_MAPS_API_KEY',
    keySet: isSet(import.meta.env.VITE_GOOGLE_MAPS_API_KEY),
  },
  {
    id: 'cesium_ion',
    name: 'Cesium ion',
    summary: 'Hosts the OSM Buildings and the enriched building tileset used on the 3D map.',
    description:
      'Cesium ion serves OSM Buildings (asset 96188) and the enriched Philadelphia buildings (asset 4980304), using the token in VITE_CESIUM_ION_TOKEN.',
    datasetUrl: 'https://ion.cesium.com/',
    docsUrl: 'https://cesium.com/learn/ion/',
    keyEnv: 'VITE_CESIUM_ION_TOKEN',
    keySet: isSet(import.meta.env.VITE_CESIUM_ION_TOKEN),
  },
  {
    id: 'sample_model',
    name: '3D sample model',
    tag: 'SYNTHETIC INDICATORS',
    summary: 'The towers, circles, scores and colors on the 3D map, built from sample values.',
    description:
      'Towers, pulsing circles, tract colors, labels and the inspect panel read hand-entered values in src/data/philadelphiaBuildings.js and philadelphiaTracts.js (flagged synthetic). Scores are computed in the browser (src/core/cbs.js). The enriched building colors are styled from properties the code expects in Cesium ion asset 4980304 (mobilityScore, innovationIndex); what that asset contains cannot be confirmed from the repo.',
    datasetUrl: null,
    docsUrl: null,
    keyEnv: 'VITE_CESIUM_ION_TOKEN',
    keySet: isSet(import.meta.env.VITE_CESIUM_ION_TOKEN),
  },
];

// Providers with a key get their tag from whether the key is set.
export function sourceTag(s) {
  if (s.tag) return s.tag;
  return s.keySet ? 'KEY CONFIGURED' : 'KEY NOT CONFIGURED';
}

export function keyStatus(s) {
  if (!s.keyEnv) return s.keyNote ?? 'NO API KEY NEEDED';
  return s.keySet ? 'KEY CONFIGURED' : 'KEY NOT CONFIGURED';
}
