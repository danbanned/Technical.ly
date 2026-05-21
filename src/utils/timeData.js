/**
 * Sample datasets do not cover every year in the UI range. To keep the map
 * readable during timeline playback, fall back to the latest available record
 * at or before the selected year, or the earliest record if the selection is
 * earlier than the dataset.
 */

export function filterFeaturesForYear(features = [], currentYear, keyFn) {
  const groups = new Map();

  for (const feature of features) {
    const key = keyFn(feature);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(feature);
  }

  return [...groups.values()]
    .map((group) => pickBestYearMatch(group, currentYear))
    .filter(Boolean);
}

function pickBestYearMatch(group, currentYear) {
  const sorted = [...group].sort(
    (a, b) => (a.properties?.year || 0) - (b.properties?.year || 0)
  );

  let best = sorted[0] || null;
  for (const feature of sorted) {
    const year = feature.properties?.year;
    if (!year) return feature;
    if (year <= currentYear) best = feature;
    if (year > currentYear) break;
  }

  return best;
}
