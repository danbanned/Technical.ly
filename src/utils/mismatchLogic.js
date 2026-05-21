/**
 * Detect "mismatch" entities — places where the three pillars
 * (research, capital, mobility) are out of balance.
 *
 * In-browser only. Inputs are arrays of plain objects (already loaded
 * GeoJSON features) and the threshold percentiles from the store.
 */

function percentile(sortedValues, p) {
  if (!sortedValues.length) return 0;
  const idx = Math.floor((sortedValues.length - 1) * p);
  return sortedValues[idx];
}

function byState(features, key) {
  const out = new Map();
  for (const f of features) {
    const state = f.properties?.state;
    if (!state) continue;
    out.set(state, (out.get(state) || 0) + (f.properties?.[key] || 0));
  }
  return out;
}

export function detectMismatches({
  universities = [],
  deals = [],
  states = [],
  thresholds = { highResearchLowDeals: 0.7, highInvestmentLowMobility: 0.7 },
}) {
  // Aggregate research and deal flow by state.
  const researchByState = byState(universities, 'rd_spending');
  const dealsByState = byState(deals, 'deal_amount');

  const researchValues = [...researchByState.values()].sort((a, b) => a - b);
  const dealValues = [...dealsByState.values()].sort((a, b) => a - b);

  const researchHighCut = percentile(researchValues, thresholds.highResearchLowDeals);
  const dealsLowCut = percentile(dealValues, 1 - thresholds.highResearchLowDeals);

  const highResearchLowDeals = [];
  for (const u of universities) {
    const state = u.properties?.state;
    const stateResearch = researchByState.get(state) || 0;
    const stateDeals = dealsByState.get(state) || 0;
    if (stateResearch >= researchHighCut && stateDeals <= dealsLowCut) {
      highResearchLowDeals.push(u.properties?.name || state);
    }
  }

  // States with high deal flow but low dynamism.
  const dynamismByState = new Map(
    states.map((s) => [s.properties?.name || s.properties?.state, s.properties?.dynamism_score || 0])
  );
  const dynValues = [...dynamismByState.values()].sort((a, b) => a - b);
  const dealsHighCut = percentile(dealValues, thresholds.highInvestmentLowMobility);
  const dynLowCut = percentile(dynValues, 1 - thresholds.highInvestmentLowMobility);

  const highInvestmentLowMobility = [];
  for (const [state, deals] of dealsByState.entries()) {
    const dyn = dynamismByState.get(state) || 0;
    if (deals >= dealsHighCut && dyn <= dynLowCut) {
      highInvestmentLowMobility.push(state);
    }
  }

  return { highResearchLowDeals, highInvestmentLowMobility };
}
