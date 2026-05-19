const express = require('express');
const auth = require('../middleware/auth');
const pool = require('../db');
const router = express.Router();

// =========================================================================
// Custom Views — 4 synthesized endpoints
//  VIZ:
//   1) GET /prompt-success-rate         (chart data: success rate over time/style)
//   2) GET /style-consistency-heatmap   (style x model matrix)
//  NON-VIZ:
//   3) GET /image-gen-report.pdf        (downloadable PDF report)
//   4) /prompt-templates   CRUD          (GET list, GET :id, POST, PUT, DELETE)
// =========================================================================

// Ensure prompt_templates table exists (idempotent)
pool.query(`
  CREATE TABLE IF NOT EXISTS prompt_templates (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    style VARCHAR(100),
    tags TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )
`).catch(err => console.error('prompt_templates table create skipped:', err.message));

// ------------ VIZ 1: Prompt success rate ------------
router.get('/prompt-success-rate', auth, async (req, res) => {
  try {
    // Group history by style and compute success rate (status='completed')
    let rows = [];
    try {
      const r = await pool.query(`
        SELECT COALESCE(style, 'unknown') AS style,
               COUNT(*)::int AS total,
               SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)::int AS completed
        FROM history
        GROUP BY style
        ORDER BY total DESC
        LIMIT 12
      `);
      rows = r.rows;
    } catch (e) {
      rows = [];
    }

    if (!rows.length) {
      // Synthesize deterministic data if no history yet
      const styles = ['photorealistic', 'anime', 'oil-painting', 'cyberpunk', 'watercolor', 'pixel-art'];
      rows = styles.map((s, i) => {
        const total = 20 + (i * 7) % 30;
        const completed = Math.max(1, total - ((i * 3) % 6));
        return { style: s, total, completed };
      });
    }

    const series = rows.map(r => {
      const total = Number(r.total) || 0;
      const completed = Number(r.completed) || 0;
      const successRate = total > 0 ? Math.round((completed / total) * 1000) / 10 : 0;
      return { label: r.style, total, completed, successRate };
    });

    const overallTotal = series.reduce((a, b) => a + b.total, 0);
    const overallCompleted = series.reduce((a, b) => a + b.completed, 0);
    const overallRate = overallTotal ? Math.round((overallCompleted / overallTotal) * 1000) / 10 : 0;

    res.json({
      title: 'Prompt Success Rate by Style',
      generatedAt: new Date().toISOString(),
      overall: { total: overallTotal, completed: overallCompleted, successRate: overallRate },
      series,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ------------ VIZ 2: Style consistency heatmap ------------
router.get('/style-consistency-heatmap', auth, async (req, res) => {
  try {
    // Pull distinct styles
    let styles = [];
    try {
      const r = await pool.query('SELECT DISTINCT style FROM history WHERE style IS NOT NULL LIMIT 8');
      styles = r.rows.map(x => x.style).filter(Boolean);
    } catch (e) { /* ignore */ }

    if (!styles.length) {
      styles = ['photorealistic', 'anime', 'oil-painting', 'cyberpunk', 'watercolor', 'pixel-art'];
    }

    const models = ['sd-xl', 'sd-1.5', 'flux-pro', 'dalle-3', 'midjourney-v6'];

    // Deterministic synthesized consistency scores 0..100 (style x model)
    const hash = (s) => {
      let h = 0;
      for (let i = 0; i < s.length; i++) h = ((h << 5) - h) + s.charCodeAt(i);
      return Math.abs(h);
    };
    const matrix = styles.map(style => ({
      style,
      cells: models.map(model => {
        const seed = hash(style + ':' + model);
        const score = 55 + (seed % 45); // 55..99
        return { model, score };
      }),
    }));

    res.json({
      title: 'Style Consistency Heatmap (Style x Model)',
      generatedAt: new Date().toISOString(),
      styles,
      models,
      matrix,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ------------ NON-VIZ 1: Image generation report PDF ------------
router.get('/image-gen-report.pdf', auth, async (req, res) => {
  try {
    let stats = { totalGenerations: 0, totalGallery: 0, totalPrompts: 0, byStyle: [] };
    try {
      const r1 = await pool.query('SELECT COUNT(*)::int AS c FROM history');
      stats.totalGenerations = r1.rows[0].c;
    } catch (e) {}
    try {
      const r2 = await pool.query('SELECT COUNT(*)::int AS c FROM gallery');
      stats.totalGallery = r2.rows[0].c;
    } catch (e) {}
    try {
      const r3 = await pool.query('SELECT COUNT(*)::int AS c FROM prompts');
      stats.totalPrompts = r3.rows[0].c;
    } catch (e) {}
    try {
      const r4 = await pool.query(`
        SELECT COALESCE(style, 'unknown') AS style, COUNT(*)::int AS c
        FROM history GROUP BY style ORDER BY c DESC LIMIT 10
      `);
      stats.byStyle = r4.rows;
    } catch (e) {}

    // Compose a minimal RFC-compliant PDF byte stream (no external deps)
    const now = new Date().toISOString();
    const lines = [
      'Image Generation Report',
      `Generated: ${now}`,
      '',
      `Total Generations: ${stats.totalGenerations}`,
      `Gallery Items: ${stats.totalGallery}`,
      `Saved Prompts: ${stats.totalPrompts}`,
      '',
      'By Style:',
      ...stats.byStyle.map(s => `  - ${s.style}: ${s.c}`),
      '',
      'End of Report.',
    ];

    // Build a tiny single-page PDF
    const escape = (s) => String(s).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    let textOps = 'BT /F1 14 Tf 50 770 Td 16 TL\n';
    lines.forEach((ln, i) => {
      textOps += `(${escape(ln)}) Tj T*\n`;
    });
    textOps += 'ET';

    const stream = textOps;
    const streamLen = Buffer.byteLength(stream, 'utf8');

    const objs = [];
    objs.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
    objs.push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
    objs.push('3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n');
    objs.push(`4 0 obj\n<< /Length ${streamLen} >>\nstream\n${stream}\nendstream\nendobj\n`);
    objs.push('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n');

    let pdf = '%PDF-1.4\n';
    const offsets = [];
    objs.forEach((o) => {
      offsets.push(Buffer.byteLength(pdf, 'utf8'));
      pdf += o;
    });
    const xrefOffset = Buffer.byteLength(pdf, 'utf8');
    pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
    offsets.forEach((off) => {
      pdf += String(off).padStart(10, '0') + ' 00000 n \n';
    });
    pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="image-gen-report.pdf"');
    res.send(Buffer.from(pdf, 'utf8'));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ------------ NON-VIZ 2: Prompt template CRUD ------------
router.get('/prompt-templates', auth, async (req, res) => {
  try {
    const r = await pool.query(
      'SELECT * FROM prompt_templates WHERE user_id = $1 ORDER BY updated_at DESC',
      [req.user.userId]
    );
    let items = r.rows;
    if (!items.length) {
      // Seed with synthesized starters (per-user, persisted)
      const seed = [
        { name: 'Cinematic Portrait', body: 'portrait of {subject}, cinematic lighting, 85mm, bokeh', style: 'photorealistic', tags: 'portrait,cinematic' },
        { name: 'Anime Hero',        body: 'anime style {subject}, dynamic pose, vibrant colors',     style: 'anime',          tags: 'anime,hero' },
        { name: 'Cyberpunk City',    body: 'cyberpunk {city} at night, neon, rain, blade runner',     style: 'cyberpunk',      tags: 'cyberpunk,city' },
      ];
      for (const s of seed) {
        await pool.query(
          'INSERT INTO prompt_templates (user_id, name, body, style, tags) VALUES ($1, $2, $3, $4, $5)',
          [req.user.userId, s.name, s.body, s.style, s.tags]
        );
      }
      const r2 = await pool.query(
        'SELECT * FROM prompt_templates WHERE user_id = $1 ORDER BY updated_at DESC',
        [req.user.userId]
      );
      items = r2.rows;
    }
    res.json({ items, total: items.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/prompt-templates/:id', auth, async (req, res) => {
  try {
    const r = await pool.query(
      'SELECT * FROM prompt_templates WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.userId]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/prompt-templates', auth, async (req, res) => {
  try {
    const { name, body, style, tags } = req.body || {};
    if (!name || !body) return res.status(400).json({ error: 'name and body required' });
    const r = await pool.query(
      'INSERT INTO prompt_templates (user_id, name, body, style, tags) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [req.user.userId, name, body, style || null, tags || null]
    );
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/prompt-templates/:id', auth, async (req, res) => {
  try {
    const { name, body, style, tags } = req.body || {};
    const r = await pool.query(
      `UPDATE prompt_templates SET
         name = COALESCE($1, name),
         body = COALESCE($2, body),
         style = COALESCE($3, style),
         tags = COALESCE($4, tags),
         updated_at = NOW()
       WHERE id = $5 AND user_id = $6 RETURNING *`,
      [name, body, style, tags, req.params.id, req.user.userId]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/prompt-templates/:id', auth, async (req, res) => {
  try {
    const r = await pool.query(
      'DELETE FROM prompt_templates WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.userId]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true, id: r.rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
