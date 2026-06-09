import { CBS_CONFIG } from '../data/config.js';

function haversineKm(a, b) {
  const R = 6371;
  const dLon = (b[0] - a[0]) * Math.PI / 180;
  const dLat = (b[1] - a[1]) * Math.PI / 180;
  const lat1 = a[1] * Math.PI / 180;
  const lat2 = b[1] * Math.PI / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const aVal = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  return R * 2 * Math.atan2(Math.sqrt(aVal), Math.sqrt(1 - aVal));
}

function normalize(values) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return values.map(() => 0.5);
  return values.map((v) => (v - min) / (max - min));
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

export function aggregateNearbyInnovation(tract, buildings, radiusKm) {
  let rdSpendNearby = 0;
  let vcDealsNearby = 0;

  for (const b of buildings) {
    const dist = haversineKm(tract.centroid, [b.lon, b.lat]);
    if (dist > radiusKm) continue;

    if (b.category === 'universityResearch' || b.category === 'healthcareAnchor') {
      rdSpendNearby += b.rdSpend || 0;
    }
    if (b.category === 'ventureCapital' || b.category === 'startupIncubator') {
      vcDealsNearby += b.dealCount || 0;
    }
  }

  return { rdSpendNearby, vcDealsNearby };
}

export function computeAllCBS(tracts, buildings, config = CBS_CONFIG) {
  const innovationData = tracts.map((t) =>
    aggregateNearbyInnovation(t, buildings, config.RADIUS_KM)
  );

  const rdSpendAll = normalize(innovationData.map((d) => d.rdSpendNearby));
  const vcDensityAll = normalize(innovationData.map((d) => d.vcDealsNearby));

  const innovationIndices = tracts.map((_, i) => {
    const w = config.INNOVATION_WEIGHTS;
    return w.rdSpend * rdSpendAll[i] + w.vcDensity * vcDensityAll[i];
  });

  const mobilityAll = normalize(tracts.map((t) => t.mobilityScore || 0));
  const incomeAll = normalize(tracts.map((t) => t.medianIncome || 0));
  const unemploymentAll = normalize(tracts.map((t) => 1 - (t.unemploymentRate || 0)));

  const outcomeIndices = tracts.map((_, i) => {
    const w = config.OUTCOME_WEIGHTS;
    return w.mobility * mobilityAll[i] + w.income * incomeAll[i] + w.unemployment * unemploymentAll[i];
  });

  return tracts.map((tract, i) => {
    const innovationIndex = round1(innovationIndices[i]);
    const outcomeIndex = round1(outcomeIndices[i]);
    const ratio = Math.min(outcomeIndex / Math.max(innovationIndex, 0.05), 1);
    const cbs = round1(10 * (0.5 * outcomeIndex + 0.5 * ratio));

    const mismatchAlert =
      innovationIndex > config.MISMATCH_THRESHOLDS.innovationHigh &&
      outcomeIndex < config.MISMATCH_THRESHOLDS.outcomeLow;

    return { ...tract, innovationIndex, outcomeIndex, cbs, mismatchAlert };
  });
}

export function findTopGaps(tractsWithCBS, n = 3) {
  return [...tractsWithCBS]
    .sort((a, b) => {
      const gapA = a.innovationIndex - a.outcomeIndex;
      const gapB = b.innovationIndex - b.outcomeIndex;
      return gapB - gapA;
    })
    .slice(0, n);
}

export function generateSummary(tract) {
  const cbsLabel =
    tract.cbs >= 7 ? 'strong' : tract.cbs >= 4 ? 'moderate' : 'weak';

  if (tract.mismatchAlert) {
    return `This neighborhood has significant innovation activity nearby (universities, hospitals, or venture capital), but resident outcomes — including income, employment, and upward mobility — remain low. The gap between innovation investment and community benefit is pronounced here.`;
  }

  return `This neighborhood shows a ${cbsLabel} connection between nearby innovation activity and resident outcomes. Economic mobility, income, and employment levels are ${cbsLabel === 'strong' ? 'in line with' : cbsLabel === 'moderate' ? 'partially reflecting' : 'not yet reflecting'} the innovation assets in the surrounding area.`;
}
