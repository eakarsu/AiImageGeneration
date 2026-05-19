// Batch generation + scheduling for weekly social-media content.
// Audit: batch_04.md / AiImageGeneration / Custom Feature Suggestions #2
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
      'X-Title': 'AI Image Gen - Batch Scheduler'
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.6, max_tokens: 2500
    })
  });
  const d = await r.json();
  if (d.error) throw new Error(d.error.message || 'AI failed');
  return d.choices[0].message.content;
}

function parseJSON(t) { try { const m = t.match(/\{[\s\S]*\}/); if (m) return JSON.parse(m[0]); } catch (_) {} return { notes: t }; }

pool.query(`CREATE TABLE IF NOT EXISTS scheduled_batches (
  id SERIAL PRIMARY KEY, user_id INTEGER, theme TEXT, platforms TEXT,
  schedule JSONB, status TEXT DEFAULT 'planned', created_at TIMESTAMPTZ DEFAULT NOW()
)`).catch(() => {});

// POST /api/batch-scheduled-gen/plan
// Body: { theme, platforms?: [..], days?: 7, posts_per_day?: 1 }
router.post('/plan', async (req, res) => {
  try {
    const { theme, platforms = ['instagram'], days = 7, posts_per_day = 1, brand_voice } = req.body || {};
    if (!theme) return res.status(400).json({ error: 'theme required' });

    const prompt = `You are a social-media content scheduler. For ${days} days x ${posts_per_day} posts/day,
produce a calendar of image prompts + caption + hashtags, optimized per platform. Return STRICT JSON only.

Theme: ${theme}
Platforms: ${platforms.join(', ')}
Brand voice: ${brand_voice || 'professional and approachable'}

Return JSON:
{
  "summary": "...",
  "schedule": [
    {
      "day": 1,
      "posts": [
        {
          "platform": "string",
          "scheduled_at_local": "string",
          "image_prompt": "string",
          "negative_prompt": "string",
          "aspect_ratio": "1:1|9:16|16:9",
          "caption": "string",
          "hashtags": ["..."]
        }
      ]
    }
  ],
  "content_pillars": ["..."],
  "disclaimer": "Generated content; review and approve before scheduling."
}`;

    const raw = await callAI('You are a social-media content scheduler.', prompt);
    const parsed = parseJSON(raw);

    const r = await pool.query(
      `INSERT INTO scheduled_batches (user_id, theme, platforms, schedule) VALUES ($1,$2,$3,$4) RETURNING id`,
      [req.user.id, theme, platforms.join(','), JSON.stringify(parsed)]
    );

    res.json({ id: r.rows[0].id, theme, platforms, days, plan: parsed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/batch-scheduled-gen
router.get('/', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, theme, platforms, status, created_at FROM scheduled_batches WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [req.user.id]
    );
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/batch-scheduled-gen/:id { status }
router.patch('/:id', async (req, res) => {
  try {
    await pool.query(
      `UPDATE scheduled_batches SET status = $1 WHERE id = $2 AND user_id = $3`,
      [req.body.status || 'planned', req.params.id, req.user.id]
    );
    res.json({ id: req.params.id, status: req.body.status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
