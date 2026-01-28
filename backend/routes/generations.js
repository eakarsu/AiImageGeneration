const express = require('express');
const auth = require('../middleware/auth');
const pool = require('../db');
const { generateImage } = require('../imageGenerator');
const path = require('path');
const fs = require('fs');
const router = express.Router();

const imagesDir = path.join(__dirname, '..', 'generated_images');
if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });

router.post('/', auth, async (req, res) => {
  try {
    const { prompt, style, title, negative_prompt, seed, num_inference_steps, guidance_scale } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

    const options = {
      negative_prompt: negative_prompt || '',
      seed: seed ? parseInt(seed) : null,
      num_inference_steps: num_inference_steps ? parseInt(num_inference_steps) : 25,
      guidance_scale: guidance_scale ? parseFloat(guidance_scale) : 7.5,
    };

    const imageBuffer = await generateImage(prompt, style || 'digital_art', options);
    const filename = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.png`;
    const filepath = path.join(imagesDir, filename);
    fs.writeFileSync(filepath, imageBuffer);

    const imageUrl = `/generated_images/${filename}`;

    // Save to history
    await pool.query(
      'INSERT INTO history (user_id, prompt, style, image_url, status, negative_prompt, seed) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [req.user.id, prompt, style || 'digital_art', imageUrl, 'completed', negative_prompt || null, seed ? parseInt(seed) : null]
    );

    // Save to gallery
    const result = await pool.query(
      'INSERT INTO gallery (user_id, title, description, image_url, prompt, style, negative_prompt, seed) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [req.user.id, title || `Generated: ${prompt.substring(0, 30)}`, `Generated with style: ${style || 'digital_art'}`, imageUrl, prompt, style || 'digital_art', negative_prompt || null, seed ? parseInt(seed) : null]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
