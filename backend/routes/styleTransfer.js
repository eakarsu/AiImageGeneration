const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const { analyzeStyleTransfer } = require('../services/openrouter');

const ALLOWED_SORT_COLUMNS = ['created_at', 'source_style', 'target_style'];

// Get all style transfers
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 12, search = '', sort = 'created_at', order = 'DESC' } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM style_transfer WHERE user_id = $1';
    let countQuery = 'SELECT COUNT(*) FROM style_transfer WHERE user_id = $1';
    const params = [req.user.userId];
    const countParams = [req.user.userId];

    if (search) {
      query += ' AND (source_style ILIKE $2 OR target_style ILIKE $2 OR content_description ILIKE $2)';
      countQuery += ' AND (source_style ILIKE $2 OR target_style ILIKE $2 OR content_description ILIKE $2)';
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

// Get single style transfer
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM style_transfer WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new style transfer analysis (calls OpenRouter)
router.post('/', auth, async (req, res) => {
  try {
    const { source_style, target_style, content_description } = req.body;

    if (!source_style || !target_style || !content_description) {
      return res.status(400).json({ error: 'Source style, target style, and content description are required' });
    }

    const aiResult = await analyzeStyleTransfer(source_style, target_style, content_description);

    const result = await pool.query(
      `INSERT INTO style_transfer (user_id, source_style, target_style, content_description, analysis_prompt, ai_response)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        req.user.userId,
        source_style,
        target_style,
        content_description,
        aiResult.analysisPrompt,
        JSON.stringify(aiResult)
      ]
    );

    await pool.query(
      `INSERT INTO ai_history (user_id, feature, title, input_data, ai_response) VALUES ($1, $2, $3, $4, $5)`,
      [req.user.userId, 'style-transfer', `Transfer: ${source_style} → ${target_style}`, JSON.stringify({ source_style, target_style, content_description }), JSON.stringify(aiResult)]
    ).catch(() => {});

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update style transfer
router.put('/:id', auth, async (req, res) => {
  try {
    const { source_style, target_style, content_description, analysis_prompt } = req.body;
    const result = await pool.query(
      `UPDATE style_transfer SET source_style = $1, target_style = $2, content_description = $3, analysis_prompt = $4
       WHERE id = $5 AND user_id = $6 RETURNING *`,
      [source_style, target_style, content_description, analysis_prompt, req.params.id, req.user.userId]
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
      'DELETE FROM style_transfer WHERE id = ANY($1) AND user_id = $2 RETURNING id',
      [ids, req.user.userId]
    );
    res.json({ deleted: result.rowCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete style transfer
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM style_transfer WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.id, req.user.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
