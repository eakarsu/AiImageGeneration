const express = require('express');
const auth = require('../middleware/auth');
const pool = require('../db');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM prompts ORDER BY created_at DESC');
    res.json(result.rows);
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

router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM prompts WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
