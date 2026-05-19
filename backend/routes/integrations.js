/*
 * routes/integrations.js — Apply pass 5
 *
 * 503-on-no-key stubs for image-gen monetization integrations called out in
 * batch_04 §28 ("missing non-AI features" + "custom feature suggestions").
 */

const express = require('express');
const auth = require('../middleware/auth');
const router = express.Router();

function requireEnv(req, res, providerName, vars) {
  const missing = vars.filter((v) => !process.env[v] || String(process.env[v]).startsWith('your_'));
  if (missing.length) {
    res.status(503).json({
      error: 'integration_not_configured',
      provider: providerName,
      missing_env: missing,
      message: `${providerName} not configured. Set ${missing.join(', ')} to enable.`,
    });
    return false;
  }
  return true;
}

// Stripe — paid generations / marketplace fees
router.post('/stripe/charge', auth, (req, res) => {
  if (!requireEnv(req, res, 'Stripe', ['STRIPE_SECRET_KEY'])) return;
  res.json({ status: 'stub_with_creds', note: 'Stripe key present; implement PaymentIntent for credits or marketplace fees.' });
});

// AWS S3 / R2 — cloud storage for generated assets
router.post('/storage/presign', auth, (req, res) => {
  if (!requireEnv(req, res, 'ObjectStorage', ['STORAGE_PROVIDER', 'STORAGE_ACCESS_KEY', 'STORAGE_SECRET_KEY', 'STORAGE_BUCKET'])) return;
  res.json({ status: 'stub_with_creds', note: 'Object storage configured; implement signed PUT URL for client upload.' });
});

// Social share / publish (Twitter, Instagram, Mastodon — provider neutral)
router.post('/social/share', auth, (req, res) => {
  if (!requireEnv(req, res, 'Social', ['SOCIAL_PROVIDER', 'SOCIAL_API_KEY'])) return;
  res.json({ status: 'stub_with_creds', note: 'Social provider configured; implement OAuth + media upload + post.' });
});

module.exports = router;
