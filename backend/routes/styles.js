const express = require('express');
const auth = require('../middleware/auth');
const pool = require('../db');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM styles ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM styles WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, description, example_prompt, preview_url } = req.body;
    const result = await pool.query(
      'INSERT INTO styles (name, description, example_prompt, preview_url) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, description, example_prompt, preview_url]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { name, description, example_prompt } = req.body;
    const result = await pool.query(
      `UPDATE styles SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        example_prompt = COALESCE($3, example_prompt)
      WHERE id = $4 RETURNING *`,
      [name, description, example_prompt, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM styles WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
