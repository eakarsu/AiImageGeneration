// Agentic creative assistant auto-generating prompts and iterating from
// feedback.
// Audit: batch_04.md / AiImageGeneration / Custom Feature Suggestions #1
const express = require('express');
const fetch = require('node-fetch');
const auth = require('../middleware/auth');
const pool = require('../db');

const router = express.Router();
router.use(auth);

async function callAI(systemPrompt, userPrompt) {
  if (!process.env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY not configured');
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'X-Title': 'AI Image Gen - Agentic Creative'
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7, max_tokens: 2000
    })
  });
  const d = await r.json();
  if (d.error) throw new Error(d.error.message || 'AI failed');
  return d.choices[0].message.content;
}

function parseJSON(t) { try { const m = t.match(/\{[\s\S]*\}/); if (m) return JSON.parse(m[0]); } catch (_) {} return { notes: t }; }

// POST /api/agentic-creative/iterate
// Body: { brief, current_prompt?, last_image_critique?, target_count? }
router.post('/iterate', async (req, res) => {
  try {
    const { brief, current_prompt, last_image_critique, target_count = 4 } = req.body || {};
    if (!brief) return res.status(400).json({ error: 'brief required' });

    const systemPrompt = `You are an agentic creative assistant for diffusion-model image generation. Generate
${target_count} diverse, high-quality prompts that satisfy the user's brief. If a critique of last output is
provided, incorporate corrections. Return STRICT JSON only.`;

    const userPrompt = `Brief: ${brief}
Current/last prompt: ${current_prompt || 'none'}
Critique of last image: ${last_image_critique || 'none'}
Target count: ${target_count}

Return JSON:
{
  "summary": "...",
  "prompts": [
    { "id": "string", "positive_prompt": "string", "negative_prompt": "string", "style_tags": ["..."], "expected_strength": "tight|moderate|loose", "rationale": "string" }
  ],
  "parameter_recommendations": { "sampler": "string", "steps": 0, "cfg": 0, "size": "string" },
  "iteration_strategy": "string",
  "stop_condition": "string",
  "disclaimer": "Prompt suggestions; outputs vary per model + seed."
}`;

    const raw = await callAI(systemPrompt, userPrompt);
    const parsed = parseJSON(raw);

    try {
      await pool.query(`CREATE TABLE IF NOT EXISTS agentic_creative_runs (
        id SERIAL PRIMARY KEY, user_id INTEGER, brief TEXT, payload JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`);
      await pool.query(
        `INSERT INTO agentic_creative_runs (user_id, brief, payload) VALUES ($1,$2,$3)`,
        [req.user.id, brief, JSON.stringify(parsed)]
      );
    } catch (_) {}

    res.json({ brief, target_count, suggestions: parsed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/history', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, brief, payload, created_at FROM agentic_creative_runs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 30`,
      [req.user.id]
    ).catch(() => ({ rows: [] }));
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
