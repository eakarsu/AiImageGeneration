const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const { getArtInstruction } = require('../services/openrouter');

const ALLOWED_SORT_COLUMNS = ['created_at', 'topic', 'skill_level', 'art_form'];

// Get all art lessons
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 12, search = '', skill_level = '', sort = 'created_at', order = 'DESC' } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM art_instructor WHERE user_id = $1';
    let countQuery = 'SELECT COUNT(*) FROM art_instructor WHERE user_id = $1';
    const params = [req.user.userId];
    const countParams = [req.user.userId];

    if (search) {
      query += ' AND (topic ILIKE $2 OR art_form ILIKE $2)';
      countQuery += ' AND (topic ILIKE $2 OR art_form ILIKE $2)';
      params.push(`%${search}%`);
      countParams.push(`%${search}%`);
    }

    if (skill_level) {
      const idx = params.length + 1;
      query += ` AND skill_level = $${idx}`;
      countQuery += ` AND skill_level = $${idx}`;
      params.push(skill_level);
      countParams.push(skill_level);
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

// Get single lesson
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM art_instructor WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new art lesson (calls OpenRouter)
router.post('/', auth, async (req, res) => {
  try {
    const { topic, skill_level, art_form } = req.body;

    if (!topic) {
      return res.status(400).json({ error: 'Topic is required' });
    }

    const aiResult = await getArtInstruction(topic, skill_level, art_form);

    const result = await pool.query(
      `INSERT INTO art_instructor (user_id, topic, skill_level, art_form, lesson_content, ai_response)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        req.user.userId,
        topic,
        skill_level || 'beginner',
        art_form || 'digital',
        aiResult.lesson,
        JSON.stringify(aiResult)
      ]
    );

    await pool.query(
      `INSERT INTO ai_history (user_id, feature, title, input_data, ai_response) VALUES ($1, $2, $3, $4, $5)`,
      [req.user.userId, 'art-instructor', `Lesson: ${topic}`, JSON.stringify({ topic, skill_level, art_form }), JSON.stringify(aiResult)]
    ).catch(() => {});

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update lesson
router.put('/:id', auth, async (req, res) => {
  try {
    const { topic, skill_level, art_form, lesson_content } = req.body;
    const result = await pool.query(
      `UPDATE art_instructor SET topic = $1, skill_level = $2, art_form = $3, lesson_content = $4
       WHERE id = $5 AND user_id = $6 RETURNING *`,
      [topic, skill_level, art_form, lesson_content, req.params.id, req.user.userId]
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
      'DELETE FROM art_instructor WHERE id = ANY($1) AND user_id = $2 RETURNING id',
      [ids, req.user.userId]
    );
    res.json({ deleted: result.rowCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete lesson
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM art_instructor WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.id, req.user.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
