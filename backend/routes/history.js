const express = require('express');
const auth = require('../middleware/auth');
const pool = require('../db');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const { search, style, page = 1, limit = 12 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [req.user.id];
    let where = 'WHERE user_id = $1';
    let paramIndex = 2;

    if (search) {
      where += ` AND prompt ILIKE $${paramIndex}`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (style) {
      where += ` AND style ILIKE $${paramIndex}`;
      params.push(`%${style}%`);
      paramIndex++;
    }

    const countResult = await pool.query(`SELECT COUNT(*) FROM history ${where}`, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(parseInt(limit));
    params.push(offset);
    const result = await pool.query(
      `SELECT * FROM history ${where} ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
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
    const result = await pool.query('SELECT * FROM history WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM history WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
