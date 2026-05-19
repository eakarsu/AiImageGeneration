/*
 * routes/exportData.js — Apply pass 5
 *
 * Mechanical (no-LLM) export endpoints. Audit (batch_04 §28) flagged:
 *   "missing non-AI features → No download/export options".
 *
 * Provides JSON exports the frontend can save as `.json` files for the
 * authenticated user, scoped to their data only. No third-party calls; no
 * schema changes; existing routes unchanged.
 *
 * - GET /api/export/gallery        — caller's full gallery as JSON
 * - GET /api/export/ai-history     — caller's full AI feature history
 * - GET /api/export/portfolio      — combined gallery + recent prompts
 */

const express = require('express');
const auth = require('../middleware/auth');
const pool = require('../db');
const router = express.Router();

function jsonResponse(res, name, payload) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="${name}-${Date.now()}.json"`);
  res.send(JSON.stringify(payload, null, 2));
}

router.get('/gallery', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM gallery WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id],
    );
    jsonResponse(res, 'gallery-export', {
      user_id: req.user.id,
      exported_at: new Date().toISOString(),
      count: result.rows.length,
      items: result.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/ai-history', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM ai_history WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id],
    );
    jsonResponse(res, 'ai-history-export', {
      user_id: req.user.id,
      exported_at: new Date().toISOString(),
      count: result.rows.length,
      items: result.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/portfolio', auth, async (req, res) => {
  try {
    const safeQuery = async (sql, params = []) => {
      try { return (await pool.query(sql, params)).rows; } catch (_) { return []; }
    };
    const [gallery, aiHistory, prompts] = await Promise.all([
      safeQuery('SELECT * FROM gallery WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]),
      safeQuery('SELECT * FROM ai_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT 200', [req.user.id]),
      safeQuery('SELECT * FROM prompts WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100', [req.user.id]),
    ]);
    jsonResponse(res, 'portfolio-export', {
      user_id: req.user.id,
      exported_at: new Date().toISOString(),
      gallery,
      ai_history: aiHistory,
      prompts,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
