const express = require('express');
const auth = require('../middleware/auth');
const pool = require('../db');
const router = express.Router();

const ALLOWED_SORT_COLUMNS = ['created_at', 'title', 'category'];

router.get('/', auth, async (req, res) => {
  try {
    const { search, category, page = 1, limit = 20, sort = 'created_at', order = 'DESC' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    let where = '';
    let paramIndex = 1;

    if (search) {
      where += `${where ? ' AND' : ' WHERE'} (title ILIKE $${paramIndex} OR description ILIKE $${paramIndex} OR prompt_text ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (category) {
      where += `${where ? ' AND' : ' WHERE'} category ILIKE $${paramIndex}`;
      params.push(`%${category}%`);
      paramIndex++;
    }

    const sortColumn = ALLOWED_SORT_COLUMNS.includes(sort) ? sort : 'created_at';
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const countResult = await pool.query(`SELECT COUNT(*) FROM prompts${where}`, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(parseInt(limit));
    params.push(offset);
    const result = await pool.query(
      `SELECT * FROM prompts${where} ORDER BY ${sortColumn} ${sortOrder} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params
    );

    res.json({
      items: result.rows,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM prompts WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { title, description, prompt_text, category } = req.body;
    const result = await pool.query(
      'INSERT INTO prompts (title, description, prompt_text, category) VALUES ($1, $2, $3, $4) RETURNING *',
      [title, description, prompt_text, category]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { title, description, prompt_text, category } = req.body;
    const result = await pool.query(
      `UPDATE prompts SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        prompt_text = COALESCE($3, prompt_text),
        category = COALESCE($4, category)
      WHERE id = $5 RETURNING *`,
      [title, description, prompt_text, category, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk delete - must be before /:id
router.delete('/bulk', auth, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'ids array required' });
    const result = await pool.query('DELETE FROM prompts WHERE id = ANY($1) RETURNING id', [ids]);
    res.json({ deleted: result.rowCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM prompts WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
