const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

const ALLOWED_SORT_COLUMNS = ['created_at', 'title', 'feature'];

// Get all AI history for user
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, feature = '', search = '', sort = 'created_at', order = 'DESC' } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM ai_history WHERE user_id = $1';
    let countQuery = 'SELECT COUNT(*) FROM ai_history WHERE user_id = $1';
    const params = [req.user.userId];
    const countParams = [req.user.userId];

    if (feature) {
      query += ' AND feature = $' + (params.length + 1);
      countQuery += ' AND feature = $' + (countParams.length + 1);
      params.push(feature);
      countParams.push(feature);
    }

    if (search) {
      query += ' AND title ILIKE $' + (params.length + 1);
      countQuery += ' AND title ILIKE $' + (countParams.length + 1);
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

// Get single AI history entry
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM ai_history WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.userId]
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
      'DELETE FROM ai_history WHERE id = ANY($1) AND user_id = $2 RETURNING id',
      [ids, req.user.userId]
    );
    res.json({ deleted: result.rowCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete AI history entry
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM ai_history WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.id, req.user.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
