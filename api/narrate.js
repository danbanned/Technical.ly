/**
 * api/narrate.js — Vercel serverless function
 *
 * Proxies narration requests to the Anthropic API.
 * The API key never leaves the server; the browser only sends structured facts.
 *
 * POST /api/narrate
 *   body: { systemPrompt: string, userPrompt: string }
 *   response: { text: string } | { error: string }
 *
 * Required env var (set in Vercel dashboard or .env.local):
 *   ANTHROPIC_API_KEY
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // Not a hard error — the client falls back to window.claude or static text
    return res.status(503).json({ error: 'ANTHROPIC_API_KEY not configured on this deployment' });
  }

  const { systemPrompt, userPrompt } = req.body ?? {};
  if (!systemPrompt || !userPrompt) {
    return res.status(400).json({ error: 'Missing systemPrompt or userPrompt' });
  }

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
        max_tokens: 256,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!anthropicRes.ok) {
      const errBody = await anthropicRes.text();
      console.error('[api/narrate] Anthropic error:', anthropicRes.status, errBody);
      return res.status(502).json({ error: `Anthropic returned ${anthropicRes.status}` });
    }

    const data = await anthropicRes.json();
    const text = data?.content?.[0]?.text ?? '';

    if (!text) {
      return res.status(502).json({ error: 'Empty response from Anthropic' });
    }

    return res.status(200).json({ text });
  } catch (err) {
    console.error('[api/narrate]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
