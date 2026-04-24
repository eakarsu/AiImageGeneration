const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = require('./db');
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use('/generated_images', express.static(path.join(__dirname, 'generated_images')));

// Auto-create AI feature tables on startup
pool.query(`
  CREATE TABLE IF NOT EXISTS prompt_optimizer (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    original_prompt TEXT,
    optimized_prompt TEXT,
    style VARCHAR(100),
    target_quality VARCHAR(50),
    ai_response JSONB,
    created_at TIMESTAMP DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS art_instructor (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    topic VARCHAR(255),
    skill_level VARCHAR(50),
    art_form VARCHAR(50),
    lesson_content TEXT,
    ai_response JSONB,
    created_at TIMESTAMP DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS style_transfer (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    source_style VARCHAR(100),
    target_style VARCHAR(100),
    content_description TEXT,
    analysis_prompt TEXT,
    ai_response JSONB,
    created_at TIMESTAMP DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS upscaler (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    image_description TEXT,
    current_resolution VARCHAR(20),
    target_resolution VARCHAR(20),
    use_case VARCHAR(50),
    enhancement_prompt TEXT,
    ai_response JSONB,
    created_at TIMESTAMP DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS variation_generator (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    original_prompt TEXT,
    num_variations INTEGER,
    variation_type VARCHAR(50),
    variations JSONB,
    ai_response JSONB,
    created_at TIMESTAMP DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS brand_asset_creator (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    brand_name VARCHAR(255),
    brand_values TEXT,
    asset_type VARCHAR(50),
    color_preferences VARCHAR(255),
    generation_prompt TEXT,
    ai_response JSONB,
    created_at TIMESTAMP DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS ai_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    feature VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    input_data JSONB,
    ai_response JSONB,
    created_at TIMESTAMP DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
  )
`).catch(err => console.error('AI table creation skipped:', err.message));

// Existing Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/generations', require('./routes/generations'));
app.use('/api/gallery', require('./routes/gallery'));
app.use('/api/prompts', require('./routes/prompts'));
app.use('/api/styles', require('./routes/styles'));
app.use('/api/history', require('./routes/history'));

// New AI Feature Routes
app.use('/api/prompt-optimizer', require('./routes/promptOptimizer'));
app.use('/api/art-instructor', require('./routes/artInstructor'));
app.use('/api/style-transfer', require('./routes/styleTransfer'));
app.use('/api/upscaler', require('./routes/upscaler'));
app.use('/api/variation-generator', require('./routes/variationGenerator'));
app.use('/api/brand-asset-creator', require('./routes/brandAssetCreator'));
app.use('/api/ai-history', require('./routes/aiHistory'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/sd-status', async (req, res) => {
  const sdUrl = process.env.SD_SERVER_URL || 'http://127.0.0.1:5050';
  try {
    const response = await fetch(`${sdUrl}/health`);
    const data = await response.json();
    res.json(data);
  } catch (e) {
    res.json({ status: 'unavailable', message: 'SD server is not running' });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
