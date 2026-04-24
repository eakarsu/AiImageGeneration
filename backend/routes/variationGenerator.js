const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const { generateVariations } = require('../services/openrouter');

const ALLOWED_SORT_COLUMNS = ['created_at', 'variation_type', 'num_variations'];

// Get all variations
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 12, search = '', sort = 'created_at', order = 'DESC' } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM variation_generator WHERE user_id = $1';
    let countQuery = 'SELECT COUNT(*) FROM variation_generator WHERE user_id = $1';
    const params = [req.user.userId];
    const countParams = [req.user.userId];

    if (search) {
      query += ' AND (original_prompt ILIKE $2 OR variation_type ILIKE $2)';
      countQuery += ' AND (original_prompt ILIKE $2 OR variation_type ILIKE $2)';
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

// Get single variation set
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM variation_generator WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Generate new variations (calls OpenRouter)
router.post('/', auth, async (req, res) => {
  try {
    const { original_prompt, num_variations, variation_type } = req.body;

    if (!original_prompt) {
      return res.status(400).json({ error: 'Original prompt is required' });
    }

    const aiResult = await generateVariations(
      original_prompt,
      num_variations || 5,
      variation_type || 'creative'
    );

    const result = await pool.query(
      `INSERT INTO variation_generator (user_id, original_prompt, num_variations, variation_type, variations, ai_response)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        req.user.userId,
        original_prompt,
        num_variations || 5,
        variation_type || 'creative',
        JSON.stringify(aiResult.variations),
        JSON.stringify(aiResult)
      ]
    );

    await pool.query(
      `INSERT INTO ai_history (user_id, feature, title, input_data, ai_response) VALUES ($1, $2, $3, $4, $5)`,
      [req.user.userId, 'variation-generator', `Variations: ${original_prompt.substring(0, 80)}`, JSON.stringify({ original_prompt, num_variations, variation_type }), JSON.stringify(aiResult)]
    ).catch(() => {});

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update variation set
router.put('/:id', auth, async (req, res) => {
  try {
    const { original_prompt, num_variations, variation_type, variations } = req.body;
    const result = await pool.query(
      `UPDATE variation_generator SET original_prompt = $1, num_variations = $2, variation_type = $3, variations = $4
       WHERE id = $5 AND user_id = $6 RETURNING *`,
      [original_prompt, num_variations, variation_type, JSON.stringify(variations), req.params.id, req.user.userId]
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
      'DELETE FROM variation_generator WHERE id = ANY($1) AND user_id = $2 RETURNING id',
      [ids, req.user.userId]
    );
    res.json({ deleted: result.rowCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete variation set
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM variation_generator WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.id, req.user.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
