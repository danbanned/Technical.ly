/**
 * solutionConnector.js — generates 4 "Solution" recommendations per tract.
 *
 * Priority order:
 *   1. LLM (Claude API via VITE_ANTHROPIC_API_KEY) — cached per tract id
 *   2. Rule-based fallback keyed on CBS / mismatch type
 *
 * All responses are flagged { aiGenerated: true/false } so the UI can
 * display the appropriate disclosure.
 */

import { PHILADELPHIA_BUILDINGS } from '../data/philadelphiaBuildings';

// ── Asset pools ──────────────────────────────────────────────────────────────
const byCategory = (cat) => PHILADELPHIA_BUILDINGS.filter((b) => b.category === cat);

const UNIVERSITIES  = byCategory('universityResearch');
const HOSPITALS     = byCategory('healthcareAnchor');
const INCUBATORS    = byCategory('startupIncubator');
const VC_HUBS       = byCategory('ventureCapital');
const TRANSIT       = byCategory('transitHub');

function nearest(assets, [lon, lat]) {
  if (!assets.length) return null;
  return assets.reduce((best, b) => {
    const d = Math.hypot(b.lon - lon, b.lat - lat);
    return d < Math.hypot(best.lon - lon, best.lat - lat) ? b : best;
  });
}

function assetRef(b) {
  return b ? { asset_name: b.name, asset_lat: b.lat, asset_lon: b.lon } : {};
}

// ── Rule-based templates ─────────────────────────────────────────────────────
function ruleBasedRecs(tract) {
  const { centroid, innovationIndex = 0, outcomeIndex = 0, cbs = 5, mismatchAlert } = tract;

  const uni     = nearest(UNIVERSITIES, centroid);
  const hosp    = nearest(HOSPITALS,    centroid);
  const incub   = nearest(INCUBATORS,   centroid);
  const vc      = nearest(VC_HUBS,      centroid);
  const transit = TRANSIT[0]; // only one

  // Mismatch: high innovation nearby but low resident outcomes
  if (mismatchAlert || (innovationIndex > 0.5 && outcomeIndex < 0.45)) {
    return [
      {
        title: 'Workforce Pipeline Program',
        description: `Partner ${uni?.name ?? 'nearby university'} with local workforce development to place residents into research and tech jobs.`,
        why_it_connects: 'Directly links the innovation anchor driving the CBS score to residents who are not yet benefiting.',
        ...assetRef(uni),
      },
      {
        title: 'Transit Access Expansion',
        description: 'Improve last-mile connectivity between this neighborhood and the innovation corridor via expanded bus or bike routes.',
        why_it_connects: 'Physical access to jobs is the #1 barrier cited in tracts near major employment hubs with low mobility scores.',
        ...assetRef(transit),
      },
      {
        title: 'Small Business Incubator Access',
        description: `Provide subsidized cohort slots at ${incub?.name ?? 'local incubator'} reserved for founders from this census tract.`,
        why_it_connects: 'VC deal flow is concentrated nearby but community entrepreneurs lack on-ramps to existing capital networks.',
        ...assetRef(incub ?? vc),
      },
      {
        title: 'Affordable Housing Near Innovation Zone',
        description: 'Create a community land trust or inclusionary zoning covenant on parcels within 0.5 miles of the research anchor.',
        why_it_connects: 'Rising innovation density drives displacement; locking in affordable units preserves resident economic benefit.',
        ...assetRef(hosp),
      },
    ];
  }

  // Underserved: low innovation AND low outcomes
  if (cbs < 4) {
    return [
      {
        title: 'Tech Literacy & Digital Skills Hub',
        description: `Establish a community digital-skills center in partnership with ${uni?.name ?? 'area universities'}.`,
        why_it_connects: 'Building local human capital is the first step toward drawing innovation investment to underserved areas.',
        ...assetRef(uni),
      },
      {
        title: 'Community Health Outreach',
        description: `Expand ${hosp?.name ?? 'local hospital'} satellite health services into the neighborhood to address preventable conditions that limit workforce participation.`,
        why_it_connects: 'Health outcomes strongly predict economic mobility — connecting residents to care builds the preconditions for economic growth.',
        ...assetRef(hosp),
      },
      {
        title: 'Neighborhood Micro-Enterprise Fund',
        description: `Create a $2M revolving micro-loan fund administered through ${vc?.name ?? 'area VC networks'} for resident-owned businesses.`,
        why_it_connects: 'Micro-enterprise activity raises local income and creates demand for innovation services, seeding a virtuous cycle.',
        ...assetRef(vc),
      },
      {
        title: 'Innovation Corridor Anchor Strategy',
        description: `Work with ${incub?.name ?? 'UC Science Center'} to open a satellite co-working space in this tract.`,
        why_it_connects: 'Physical presence of innovation activity is the highest-leverage action for raising the CBS in an unserved tract.',
        ...assetRef(incub),
      },
    ];
  }

  // Aligned / strong: CBS >= 6
  return [
    {
      title: 'Expand Local Hiring Commitments',
      description: `Negotiate community benefit agreements with ${uni?.name ?? 'anchor institutions'} requiring 30 % local hire targets for all new construction and service contracts.`,
      why_it_connects: 'Formalizing hiring pipelines sustains CBS gains and insulates residents from future displacement.',
      ...assetRef(uni),
    },
    {
      title: 'Community Equity Fund',
      description: `Launch a neighborhood investment fund backed by ${vc?.name ?? 'local venture capital'} with resident advisory governance.`,
      why_it_connects: 'Shared ownership of innovation returns converts economic activity into durable community wealth.',
      ...assetRef(vc),
    },
    {
      title: 'Affordable Commercial Space Preservation',
      description: `Designate ground-floor commercial space at ${incub?.name ?? 'Pennovation Works'} for below-market lease to resident-owned businesses.`,
      why_it_connects: 'Protecting affordable commercial space prevents the "innovation premium" from pricing out local entrepreneurs.',
      ...assetRef(incub),
    },
    {
      title: 'Community Health Partnership Expansion',
      description: `Scale ${hosp?.name ?? 'anchor hospital'} community health worker program to reach every block in the tract.`,
      why_it_connects: 'Health access is the most underinvested lever in already-aligned tracts — closing it prevents future CBS regression.',
      ...assetRef(hosp),
    },
  ];
}

// ── LLM integration (Claude API) ─────────────────────────────────────────────
const LLM_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;

async function fetchLLMRecs(tract) {
  const { neighborhood, cbs, innovationIndex, outcomeIndex, medianIncome, unemploymentRate, mobilityScore } = tract;

  const payload = {
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: 'You are an economic development advisor for Philadelphia. Based on tract data, suggest 4 concrete local actions. Respond ONLY with a JSON array of exactly 4 objects, each with keys: title (string), description (string), why_it_connects (string), asset_name (string — must be one of the real Philadelphia anchors: Penn Research Tower, Drexel Innovation Hub, Temple Research Center, Jefferson Research Center, Penn Medicine Pavilion, CHOP, Temple University Hospital, Jefferson Health, Center City VC District, UC Science Center, Pennovation Works, Drexel Baiada Institute, 30th Street Station), asset_lat (number), asset_lon (number). No markdown, no prose outside the JSON array.',
    messages: [
      {
        role: 'user',
        content: `Tract: ${neighborhood}. CBS: ${cbs}/10. Innovation Index: ${(innovationIndex ?? 0).toFixed(2)}. Outcome Index: ${(outcomeIndex ?? 0).toFixed(2)}. Median income: $${medianIncome?.toLocaleString()}. Unemployment: ${((unemploymentRate ?? 0) * 100).toFixed(1)}%. Mobility score: ${mobilityScore}/100. Suggest 4 concrete local actions.`,
      },
    ],
  };

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': LLM_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error(`Anthropic API ${res.status}`);
  const data = await res.json();
  const text = data.content?.[0]?.text ?? '';
  const recs = JSON.parse(text);

  // Validate and fill in real coords from our asset list for any name that matches
  return recs.map((r) => {
    const building = PHILADELPHIA_BUILDINGS.find(
      (b) => b.name.toLowerCase() === (r.asset_name ?? '').toLowerCase()
    );
    return {
      ...r,
      asset_lat: building?.lat ?? r.asset_lat,
      asset_lon: building?.lon ?? r.asset_lon,
    };
  });
}

// ── Per-tract cache ───────────────────────────────────────────────────────────
const cache = new Map(); // tractId → { recs, aiGenerated }

export async function getSolutions(tract) {
  if (cache.has(tract.id)) return cache.get(tract.id);

  let recs;
  let aiGenerated = false;

  if (LLM_KEY) {
    try {
      recs = await fetchLLMRecs(tract);
      aiGenerated = true;
    } catch (err) {
      console.warn('[solutionConnector] LLM failed, using rule-based fallback:', err.message);
      recs = ruleBasedRecs(tract);
    }
  } else {
    recs = ruleBasedRecs(tract);
  }

  const result = { recs, aiGenerated };
  cache.set(tract.id, result);
  return result;
}

export function clearSolutionCache() {
  cache.clear();
}
