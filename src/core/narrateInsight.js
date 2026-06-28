/**
 * narrateInsight.js — Phase 3 AI narration pipeline
 *
 * Flow: tract → structured facts → prompt → API → assertDocAligned → text
 *
 * Fallback chain (first that succeeds):
 *   1. POST /api/narrate  (Vercel serverless — key lives server-side)
 *   2. window.claude.complete  (Claude artifact environment)
 *   3. throws NarrationUnavailableError  (caller falls back to static insight text)
 *
 * assertDocAligned() runs on EVERY API response before the text is returned.
 * If it throws the narration is suppressed — the docked card shows the static
 * insightEngine text instead, and the error is logged for investigation.
 */

import { buildTractInsightFromStore, assertDocAligned } from './insightEngine.js';

// ── system prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a community benefit analyst writing for technical.me, a civic data tool for Philadelphia.

Your job: write a 2–3 sentence plain-language description of how nearby innovation activity does or does not reach a specific neighborhood's residents.

MANDATORY RULES — output that breaks any rule will be rejected:
1. Present tense only. No predictions, forecasts, or "will"/"could"/"may rise" statements.
2. Zero investment language. Never mention buying, investing, returns, profit, or value appreciation.
3. Frame around residents and community benefit — not institutions, not investors.
4. End every response with exactly this sentence: "Note: all figures are sample data for demonstration purposes."
5. Write no more than 3 sentences before that note.
6. Report what the numbers show — do not extrapolate or editorialize.`;

// ── user prompt builder ───────────────────────────────────────────────────────

function buildUserPrompt(tract, insight) {
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
    dataNote: 'all values are synthetic sample data — not real Census or Atlas figures',
  };

  return (
    `Write a 2–3 sentence community benefit narrative for this census tract.\n\n` +
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
 * narrateTract(tract, { signal })
 *
 * Builds structured facts → calls API → asserts doc-alignment → returns text.
 * Throws NarrationUnavailableError if no backend, or Error from assertDocAligned
 * if the model output contains banned language (caller should surface gracefully).
 */
export async function narrateTract(tract, { signal } = {}) {
  const insight = buildTractInsightFromStore(tract);
  const userPrompt = buildUserPrompt(tract, insight);

  const raw = await callNarrationAPI(SYSTEM_PROMPT, userPrompt, signal);

  // Guard: reject off-doc output before it reaches the UI
  assertDocAligned(raw);

  return { text: raw, tractId: tract.id };
}

// ── dev-only adversarial guard tests ─────────────────────────────────────────
// Runs at module init in dev. Logs how many adversarial cases the guard blocks.
// A miss (0/N blocked) means BANNED_PATTERNS in insightEngine.js needs updating.

function runDocAlignmentTests() {
  const ADVERSARIAL = [
    // Explicit prediction
    'Home values will rise as the innovation economy grows.',
    // Investment advice
    'This is a good investment — buy here before prices go up.',
    // Returns language
    'Investors have seen strong returns in this corridor.',
    // "Get in early"
    'Get in early before the neighborhood changes.',
    // Flip language
    'Several investors have begun to flip properties here.',
    // Guaranteed language
    'Residents are guaranteed to see gains from this development.',
    // you will profit
    "You'll profit from being in this neighborhood early.",
    // "prices will"
    'Prices will appreciate as Penn expands its footprint.',
  ];

  const CLEAN = [
    'Resident outcomes here are below the city median.',
    'This neighborhood is close to major research activity, but local incomes lag.',
    'Note: all figures are sample data for demonstration purposes.',
    'The Community Benefit Score is 3.2 out of 10.',
    'Nearby R&D spending is $420M, yet the unemployment rate is 14.2%.',
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
    console.error('[assertDocAligned] MISSED adversarial cases — update BANNED_PATTERNS:');
    misses.forEach((s) => console.error('  →', s));
  }
  if (falsePositives.length) {
    console.error('[assertDocAligned] FALSE POSITIVES — clean phrases blocked:');
    falsePositives.forEach(({ s, err }) => console.error('  →', s, '|', err));
  }

  const total = ADVERSARIAL.length;
  const icon = blocked === total && !falsePositives.length ? '✓' : '✗';
  console.log(
    `[assertDocAligned] ${icon} ${blocked}/${total} adversarial cases blocked,` +
    ` ${falsePositives.length} false positives`
  );
}

if (import.meta.env?.DEV) runDocAlignmentTests();
