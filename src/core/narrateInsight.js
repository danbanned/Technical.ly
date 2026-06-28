/**
 * narrateInsight.js — Phase 3 + 4 AI narration pipeline
 *
 * Phase 3: activeInsight → structured facts → API → assertDocAligned → text
 * Phase 4: DATA_SOURCES timestamps → staleness context → threaded into prompt
 *          Guardrail: AI reports staleness as an observer, never claims to have
 *          updated or corrected the data.
 *
 * Fallback chain (first that succeeds):
 *   1. POST /api/narrate  (Vercel serverless — key lives server-side)
 *   2. window.claude.complete  (Claude artifact environment)
 *   3. throws NarrationUnavailableError  (caller shows static insight text)
 *
 * assertDocAligned() runs on EVERY API response before the text is returned.
 * If it throws, narration is suppressed and the error is logged.
 */

import { buildTractInsightFromStore, assertDocAligned } from './insightEngine.js';
import { DATA_SOURCES, STALENESS_THRESHOLD_MONTHS } from '../data/config.js';

// ── staleness helpers (Phase 4) ───────────────────────────────────────────────

/**
 * computeStaleness(isoDate, now)
 * Returns how old a data source is and whether it exceeds the stale threshold.
 * `now` is injectable for testing; defaults to the current time at call site.
 */
export function computeStaleness(isoDate, now = new Date()) {
  const then = new Date(isoDate);
  const ageMonths = (now - then) / (1000 * 60 * 60 * 24 * 30.44);
  const rounded = Math.round(ageMonths);
  const years   = Math.floor(rounded / 12);
  const months  = rounded % 12;

  let ageLabel;
  if (years === 0) {
    ageLabel = `${rounded} month${rounded !== 1 ? 's' : ''} old`;
  } else if (months === 0) {
    ageLabel = `${years} year${years !== 1 ? 's' : ''} old`;
  } else {
    ageLabel = `${years} year${years !== 1 ? 's' : ''} and ${months} month${months !== 1 ? 's' : ''} old`;
  }

  return {
    ageMonths: Math.round(ageMonths),
    ageLabel,
    isStale: ageMonths > STALENESS_THRESHOLD_MONTHS,
  };
}

/**
 * buildFreshnessContext(now)
 * Summarises all DATA_SOURCES: age, staleness flag, synthetic status.
 * This is passed directly into the AI prompt as structured facts.
 */
function buildFreshnessContext(now = new Date()) {
  const sources = Object.values(DATA_SOURCES).map((src) => {
    if (src.synthetic) {
      return { id: src.id, label: src.label, synthetic: true, note: src.note };
    }
    const staleness = computeStaleness(src.lastUpdated, now);
    return {
      id: src.id,
      label: src.label,
      vintage: src.vintage,
      lastUpdated: src.lastUpdated,
      ageLabel: staleness.ageLabel,
      isStale: staleness.isStale,
    };
  });

  const hasSyntheticOnly = sources.every((s) => s.synthetic);
  const staleSources     = sources.filter((s) => !s.synthetic && s.isStale);

  return {
    sources,
    hasSyntheticOnly,
    staleSourceCount: staleSources.length,
    summary: hasSyntheticOnly
      ? 'All figures are synthetic sample data — no real collection dates exist.'
      : staleSources.length > 0
        ? `${staleSources.length} source(s) not refreshed in over ${STALENESS_THRESHOLD_MONTHS} months: ` +
          staleSources.map((s) => `${s.label} (${s.ageLabel})`).join('; ')
        : 'All sources are current.',
  };
}

// ── system prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a community benefit analyst writing for technical.me, a civic data tool for Philadelphia.

Your job: write a 2–3 sentence plain-language description of how nearby innovation activity does or does not reach a specific neighborhood's residents. When the data freshness context shows stale or synthetic data, surface that as part of the narrative.

MANDATORY RULES — output that breaks any rule will be rejected:
1. Present tense only. No predictions, forecasts, or "will"/"could"/"may rise" statements.
2. Zero investment language. Never mention buying, investing, returns, profit, or value appreciation.
3. Frame around residents and community benefit — not institutions, not investors.
4. End every response with exactly this sentence: "Note: all figures are sample data for demonstration purposes."
5. Write no more than 3 sentences before that note.
6. Report what the numbers show — do not extrapolate or editorialize.

STALENESS RULES (Phase 4):
7. You are an OBSERVER reporting the age of data — you are NOT an editor of it.
8. If dataFreshness.hasSyntheticOnly is true, the "sample data" note in rule 4 covers it — do not repeat it mid-sentence.
9. If any source has isStale: true, you SHOULD note it once in plain language, e.g. "This mobility data is from [vintage] and may not reflect current conditions."
10. NEVER say you updated, refreshed, corrected, revised, or fixed any data or figures.
11. NEVER imply the data "has been updated" as if you caused it — only describe when it was originally collected.`;

// ── user prompt builder ───────────────────────────────────────────────────────

function buildUserPrompt(tract, insight, now = new Date()) {
  const freshness = buildFreshnessContext(now);

  const facts = {
    neighborhood: tract.neighborhood,
    communityBenefitScore: `${tract.cbs} / 10`,
    insightCategory: insight.category,
    innovationIndex: tract.innovationIndex != null ? tract.innovationIndex.toFixed(2) : 'N/A',
    outcomeIndex: tract.outcomeIndex != null ? tract.outcomeIndex.toFixed(2) : 'N/A',
    medianIncome: tract.medianIncome != null ? `$${tract.medianIncome.toLocaleString()}` : 'N/A',
    unemploymentRate: tract.unemploymentRate != null
      ? `${(tract.unemploymentRate * 100).toFixed(1)}%`
      : 'N/A',
    mobilityScore: `${tract.mobilityScore} / 100`,
    nearbyRdSpend: tract.rdSpendNearby != null
      ? (tract.rdSpendNearby >= 1e9
          ? `$${(tract.rdSpendNearby / 1e9).toFixed(1)}B`
          : `$${(tract.rdSpendNearby / 1e6).toFixed(0)}M`)
      : 'N/A',
    nearbyVCDeals: tract.vcDealsNearby ?? 'N/A',
    mismatchAlert: tract.mismatchAlert ? 'yes' : 'no',
    dataFreshness: freshness,
  };

  return (
    `Write a 2–3 sentence community benefit narrative for this census tract.\n` +
    `If any data source is stale, mention it once in plain language.\n\n` +
    `Facts:\n${JSON.stringify(facts, null, 2)}`
  );
}

// ── API call (with fallback chain) ────────────────────────────────────────────

export class NarrationUnavailableError extends Error {
  constructor(msg) {
    super(msg);
    this.name = 'NarrationUnavailableError';
  }
}

async function callNarrationAPI(systemPrompt, userPrompt, signal) {
  // 1. Vercel serverless (key stays server-side; works in production + local dev)
  try {
    const res = await fetch('/api/narrate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ systemPrompt, userPrompt }),
      signal,
    });
    if (res.ok) {
      const data = await res.json();
      if (data.text) return data.text;
      if (data.error) console.warn('[narrateInsight] /api/narrate:', data.error);
    }
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    // Network error or endpoint not deployed — try next fallback
  }

  // 2. window.claude (Claude artifact sandbox environment)
  if (typeof window !== 'undefined' && typeof window.claude?.complete === 'function') {
    const text = await window.claude.complete(userPrompt, { system: systemPrompt });
    if (typeof text === 'string' && text.length > 10) return text;
  }

  throw new NarrationUnavailableError('No narration backend reachable');
}

// ── main export ───────────────────────────────────────────────────────────────

/**
 * narrateTract(tract, { signal, now })
 *
 * Builds structured facts (including staleness context) → calls API →
 * asserts doc-alignment (investment + false-update patterns) → returns text.
 *
 * `now` is injectable for tests so staleness ages are deterministic.
 */
export async function narrateTract(tract, { signal, now = new Date() } = {}) {
  const insight    = buildTractInsightFromStore(tract);
  const userPrompt = buildUserPrompt(tract, insight, now);

  const raw = await callNarrationAPI(SYSTEM_PROMPT, userPrompt, signal);

  // Guard: reject off-doc output before it reaches the UI
  assertDocAligned(raw);

  return { text: raw, tractId: tract.id };
}

// ── dev-only adversarial guard tests ─────────────────────────────────────────
// Runs at module init in dev. Open the browser console to see the result.
// A miss means BANNED_PATTERNS in insightEngine.js needs updating.

function runDocAlignmentTests() {
  const ADVERSARIAL = [
    // ── investment / prediction (Phase 3) ─────────────────────────────────
    'Home values will rise as the innovation economy grows.',
    'This is a good investment — buy here before prices go up.',
    'Investors have seen strong returns in this corridor.',
    'Get in early before the neighborhood changes.',
    'Several investors have begun to flip properties here.',
    'Residents are guaranteed to see gains from this development.',
    "You'll profit from being in this neighborhood early.",
    'Prices will appreciate as Penn expands its footprint.',

    // ── staleness false-update (Phase 4) ──────────────────────────────────
    // AI claiming to have acted on the data (observer rule — any of these must be blocked)
    "I've updated the data to reflect current conditions.",
    'I have refreshed the mobility figures as of today.',
    'I corrected the income numbers for this tract.',           // adjective between "the" and noun
    'I just updated the data to show the latest Census release.',
    'The data has been updated to reflect 2024 figures.',
    'The figures have been refreshed to reflect current conditions.',
  ];

  const CLEAN = [
    // ── safe present-tense observations ───────────────────────────────────
    'Resident outcomes here are below the city median.',
    'This neighborhood is close to major research activity, but local incomes lag.',
    'Note: all figures are sample data for demonstration purposes.',
    'The Community Benefit Score is 3.2 out of 10.',
    'Nearby R&D spending is $420M, yet the unemployment rate is 14.2%.',

    // ── legitimate staleness reporting (observer, not editor) ─────────────
    'This mobility data is from 2018 and may not reflect current conditions.',
    'The Census ACS figures were last collected in 2022.',
    "These figures have not been updated since 2018.",
    'This neighborhood’s data reflects conditions from the 2022 ACS survey.',
    'Note: the Opportunity Atlas data dates to 2018.',
  ];

  let blocked = 0;
  const misses = [];

  for (const s of ADVERSARIAL) {
    try {
      assertDocAligned(s);
      misses.push(s);
    } catch {
      blocked++;
    }
  }

  const falsePositives = [];
  for (const s of CLEAN) {
    try {
      assertDocAligned(s);
    } catch (err) {
      falsePositives.push({ s, err: err.message });
    }
  }

  if (misses.length) {
    console.error('[assertDocAligned] MISSED adversarial cases — update BANNED_PATTERNS in insightEngine.js:');
    misses.forEach((s) => console.error('  MISS →', s));
  }
  if (falsePositives.length) {
    console.error('[assertDocAligned] FALSE POSITIVES — legitimate phrases were blocked:');
    falsePositives.forEach(({ s, err }) => console.error('  FP →', s, '\n      ', err));
  }

  const total = ADVERSARIAL.length;
  const icon  = blocked === total && !falsePositives.length ? '✓' : '✗';
  console.log(
    `[assertDocAligned] ${icon} ${blocked}/${total} adversarial cases blocked,` +
    ` ${falsePositives.length} false positive(s) — Phase 3+4 guard`
  );
}

if (import.meta.env?.DEV) runDocAlignmentTests();
