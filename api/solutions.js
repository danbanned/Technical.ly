/**
 * api/solutions.js — Vercel serverless function
 *
 * Generates 4 Solution Connector recommendations for a tract via the Anthropic API.
 * The API key and the system prompt stay server-side; the browser only sends
 * the tract's numeric facts.
 *
 * POST /api/solutions
 *   body: { neighborhood, cbs, innovationIndex, outcomeIndex,
 *           medianIncome, unemploymentRate, mobilityScore }
 *   response: { recs: Array<{title, description, why_it_connects, asset_name}> } | { error: string }
 *
 * Required env var (set in Vercel dashboard or .env.local):
 *   ANTHROPIC_API_KEY
 */

const ASSET_NAMES = [
  'Penn Research Tower', 'Drexel Innovation Hub', 'Temple Research Center',
  'Jefferson Research Center', 'Penn Medicine Pavilion', "Children's Hospital of Philadelphia",
  'Temple University Hospital', 'Jefferson Health', 'Center City VC District',
  'UC Science Center', 'Pennovation Works', 'Drexel Baiada Institute', '30th Street Station',
];

const SYSTEM_PROMPT =
  'You are an economic development advisor for Philadelphia. Based on tract data, suggest 4 concrete local actions. ' +
  'Respond ONLY with a JSON array of exactly 4 objects, each with keys: title (string), description (string), ' +
  `why_it_connects (string), asset_name (string — must be one of: ${ASSET_NAMES.join(', ')}). ` +
  'No markdown, no prose outside the JSON array.';

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // Not a hard error — the client falls back to rule-based recommendations
    return res.status(503).json({ error: 'ANTHROPIC_API_KEY not configured on this deployment' });
  }

  const body = req.body ?? {};
  const neighborhood = typeof body.neighborhood === 'string' ? body.neighborhood.slice(0, 80) : null;
  const cbs = num(body.cbs);
  const innovationIndex = num(body.innovationIndex);
  const outcomeIndex = num(body.outcomeIndex);
  const medianIncome = num(body.medianIncome);
  const unemploymentRate = num(body.unemploymentRate);
  const mobilityScore = num(body.mobilityScore);
  if (!neighborhood || cbs === null) {
    return res.status(400).json({ error: 'Missing neighborhood or cbs' });
  }

  const userPrompt =
    `Tract: ${neighborhood}. CBS: ${cbs}/10. ` +
    `Innovation Index: ${(innovationIndex ?? 0).toFixed(2)}. Outcome Index: ${(outcomeIndex ?? 0).toFixed(2)}. ` +
    `Median income: $${medianIncome?.toLocaleString() ?? 'N/A'}. ` +
    `Unemployment: ${((unemploymentRate ?? 0) * 100).toFixed(1)}%. ` +
    `Mobility score: ${mobilityScore ?? 'N/A'}/100. Suggest 4 concrete local actions.`;

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!anthropicRes.ok) {
      const errBody = await anthropicRes.text();
      console.error('[api/solutions] Anthropic error:', anthropicRes.status, errBody);
      return res.status(502).json({ error: `Anthropic returned ${anthropicRes.status}` });
    }

    const data = await anthropicRes.json();
    const text = data?.content?.[0]?.text ?? '';
    let recs;
    try {
      recs = JSON.parse(text);
    } catch {
      return res.status(502).json({ error: 'Model did not return valid JSON' });
    }
    if (!Array.isArray(recs) || recs.length === 0) {
      return res.status(502).json({ error: 'Model returned no recommendations' });
    }

    return res.status(200).json({ recs: recs.slice(0, 4) });
  } catch (err) {
    console.error('[api/solutions]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
