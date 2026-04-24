const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const { createBrandAsset } = require('../services/openrouter');

const ALLOWED_SORT_COLUMNS = ['created_at', 'brand_name', 'asset_type'];

// Get all brand assets
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 12, search = '', asset_type = '', sort = 'created_at', order = 'DESC' } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM brand_asset_creator WHERE user_id = $1';
    let countQuery = 'SELECT COUNT(*) FROM brand_asset_creator WHERE user_id = $1';
    const params = [req.user.userId];
    const countParams = [req.user.userId];

    if (search) {
      query += ' AND (brand_name ILIKE $2 OR brand_values ILIKE $2)';
      countQuery += ' AND (brand_name ILIKE $2 OR brand_values ILIKE $2)';
      params.push(`%${search}%`);
      countParams.push(`%${search}%`);
    }

    if (asset_type) {
      const idx = params.length + 1;
      query += ` AND asset_type = $${idx}`;
      countQuery += ` AND asset_type = $${idx}`;
      params.push(asset_type);
      countParams.push(asset_type);
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

// Get single brand asset
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM brand_asset_creator WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new brand asset (calls OpenRouter)
router.post('/', auth, async (req, res) => {
  try {
    const { brand_name, brand_values, asset_type, color_preferences } = req.body;

    if (!brand_name || !asset_type) {
      return res.status(400).json({ error: 'Brand name and asset type are required' });
    }

    const aiResult = await createBrandAsset(
      brand_name,
      brand_values || 'modern, professional',
      asset_type,
      color_preferences || 'blue, white'
    );

    const result = await pool.query(
      `INSERT INTO brand_asset_creator (user_id, brand_name, brand_values, asset_type, color_preferences, generation_prompt, ai_response)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        req.user.userId,
        brand_name,
        brand_values || 'modern, professional',
        asset_type,
        color_preferences || 'blue, white',
        aiResult.generationPrompt,
        JSON.stringify(aiResult)
      ]
    );

    await pool.query(
      `INSERT INTO ai_history (user_id, feature, title, input_data, ai_response) VALUES ($1, $2, $3, $4, $5)`,
      [req.user.userId, 'brand-asset-creator', `Brand: ${brand_name}`, JSON.stringify({ brand_name, brand_values, asset_type, color_preferences }), JSON.stringify(aiResult)]
    ).catch(() => {});

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update brand asset
router.put('/:id', auth, async (req, res) => {
  try {
    const { brand_name, brand_values, asset_type, color_preferences, generation_prompt } = req.body;
    const result = await pool.query(
      `UPDATE brand_asset_creator SET brand_name = $1, brand_values = $2, asset_type = $3, color_preferences = $4, generation_prompt = $5
       WHERE id = $6 AND user_id = $7 RETURNING *`,
      [brand_name, brand_values, asset_type, color_preferences, generation_prompt, req.params.id, req.user.userId]
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
      'DELETE FROM brand_asset_creator WHERE id = ANY($1) AND user_id = $2 RETURNING id',
      [ids, req.user.userId]
    );
    res.json({ deleted: result.rowCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete brand asset
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM brand_asset_creator WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.id, req.user.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
