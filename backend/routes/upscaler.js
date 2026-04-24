const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const { getUpscaleRecommendations } = require('../services/openrouter');

const ALLOWED_SORT_COLUMNS = ['created_at', 'use_case', 'current_resolution', 'target_resolution'];

// Get all upscale requests
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 12, search = '', sort = 'created_at', order = 'DESC' } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM upscaler WHERE user_id = $1';
    let countQuery = 'SELECT COUNT(*) FROM upscaler WHERE user_id = $1';
    const params = [req.user.userId];
    const countParams = [req.user.userId];

    if (search) {
      query += ' AND (image_description ILIKE $2 OR use_case ILIKE $2)';
      countQuery += ' AND (image_description ILIKE $2 OR use_case ILIKE $2)';
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

// Get single upscale request
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM upscaler WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new upscale recommendation (calls OpenRouter)
router.post('/', auth, async (req, res) => {
  try {
    const { image_description, current_resolution, target_resolution, use_case } = req.body;

    if (!image_description) {
      return res.status(400).json({ error: 'Image description is required' });
    }

    const aiResult = await getUpscaleRecommendations(
      image_description,
      current_resolution || '512x512',
      target_resolution || '2048x2048',
      use_case || 'print'
    );

    const result = await pool.query(
      `INSERT INTO upscaler (user_id, image_description, current_resolution, target_resolution, use_case, enhancement_prompt, ai_response)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        req.user.userId,
        image_description,
        current_resolution || '512x512',
        target_resolution || '2048x2048',
        use_case || 'print',
        aiResult.enhancementPrompt,
        JSON.stringify(aiResult)
      ]
    );

    await pool.query(
      `INSERT INTO ai_history (user_id, feature, title, input_data, ai_response) VALUES ($1, $2, $3, $4, $5)`,
      [req.user.userId, 'upscaler', `Upscale: ${image_description.substring(0, 80)}`, JSON.stringify({ image_description, current_resolution, target_resolution, use_case }), JSON.stringify(aiResult)]
    ).catch(() => {});

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update upscale request
router.put('/:id', auth, async (req, res) => {
  try {
    const { image_description, current_resolution, target_resolution, use_case, enhancement_prompt } = req.body;
    const result = await pool.query(
      `UPDATE upscaler SET image_description = $1, current_resolution = $2, target_resolution = $3, use_case = $4, enhancement_prompt = $5
       WHERE id = $6 AND user_id = $7 RETURNING *`,
      [image_description, current_resolution, target_resolution, use_case, enhancement_prompt, req.params.id, req.user.userId]
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
      'DELETE FROM upscaler WHERE id = ANY($1) AND user_id = $2 RETURNING id',
      [ids, req.user.userId]
    );
    res.json({ deleted: result.rowCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete upscale request
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM upscaler WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.id, req.user.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
