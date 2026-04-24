const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const { optimizePrompt } = require('../services/openrouter');

const ALLOWED_SORT_COLUMNS = ['created_at', 'style', 'target_quality'];

// Get all optimized prompts
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 12, search = '', sort = 'created_at', order = 'DESC' } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM prompt_optimizer WHERE user_id = $1';
    let countQuery = 'SELECT COUNT(*) FROM prompt_optimizer WHERE user_id = $1';
    const params = [req.user.userId];
    const countParams = [req.user.userId];

    if (search) {
      query += ' AND (original_prompt ILIKE $2 OR optimized_prompt ILIKE $2)';
      countQuery += ' AND (original_prompt ILIKE $2 OR optimized_prompt ILIKE $2)';
      params.push(`%${search}%`);
      countParams.push(`%${search}%`);
    }

    const sortColumn = ALLOWED_SORT_COLUMNS.includes(sort) ? sort : 'created_at';
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    query += ` ORDER BY ${sortColumn} ${sortOrder} LIMIT $` + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    const [result, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, countParams)
    ]);

    res.json({
      items: result.rows,
      total: parseInt(countResult.rows[0].count),
      totalPages: Math.ceil(countResult.rows[0].count / limit),
      page: parseInt(page)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single optimized prompt
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM prompt_optimizer WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Optimize a new prompt (calls OpenRouter)
router.post('/', auth, async (req, res) => {
  try {
    const { original_prompt, style, target_quality } = req.body;

    if (!original_prompt) {
      return res.status(400).json({ error: 'Original prompt is required' });
    }

    const aiResult = await optimizePrompt(original_prompt, style, target_quality);

    const result = await pool.query(
      `INSERT INTO prompt_optimizer (user_id, original_prompt, optimized_prompt, style, target_quality, ai_response)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        req.user.userId,
        original_prompt,
        aiResult.optimizedPrompt,
        style || 'general',
        target_quality || 'high',
        JSON.stringify(aiResult)
      ]
    );

    await pool.query(
      `INSERT INTO ai_history (user_id, feature, title, input_data, ai_response) VALUES ($1, $2, $3, $4, $5)`,
      [req.user.userId, 'prompt-optimizer', `Optimized: ${original_prompt.substring(0, 80)}`, JSON.stringify({ original_prompt, style, target_quality }), JSON.stringify(aiResult)]
    ).catch(() => {});

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update optimized prompt
router.put('/:id', auth, async (req, res) => {
  try {
    const { original_prompt, optimized_prompt, style, target_quality } = req.body;
    const result = await pool.query(
      `UPDATE prompt_optimizer SET original_prompt = $1, optimized_prompt = $2, style = $3, target_quality = $4
       WHERE id = $5 AND user_id = $6 RETURNING *`,
      [original_prompt, optimized_prompt, style, target_quality, req.params.id, req.user.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk delete
router.delete('/bulk', auth, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'ids array required' });
    const result = await pool.query(
      'DELETE FROM prompt_optimizer WHERE id = ANY($1) AND user_id = $2 RETURNING id',
      [ids, req.user.userId]
    );
    res.json({ deleted: result.rowCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete optimized prompt
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM prompt_optimizer WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.id, req.user.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
