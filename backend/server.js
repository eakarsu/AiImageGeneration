const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use('/generated_images', express.static(path.join(__dirname, 'generated_images')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/generations', require('./routes/generations'));
app.use('/api/gallery', require('./routes/gallery'));
app.use('/api/prompts', require('./routes/prompts'));
app.use('/api/styles', require('./routes/styles'));
app.use('/api/history', require('./routes/history'));

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
