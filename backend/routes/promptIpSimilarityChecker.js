const express = require('express');

const router = express.Router();

function check(input = {}) {
  const prompt = input.prompt || 'cinematic blue hedgehog mascot racing through golden rings';
  const references = input.references || [
    { title: 'Known game mascot style', protected_terms: ['hedgehog', 'rings'], visual_overlap: 0.78 },
    { title: 'Generic cyberpunk animal poster', protected_terms: [], visual_overlap: 0.31 },
  ];
  return {
    prompt,
    matches: references.map((r) => ({
      ...r,
      risk_score: Math.min(100, Math.round((r.protected_terms.length * 25) + Number(r.visual_overlap) * 60)),
      action: r.protected_terms.length > 0 && r.visual_overlap > 0.6 ? 'rewrite_before_generation' : 'acceptable_with_review',
    })),
  };
}

router.get('/', (req, res) => res.json(check()));
router.post('/check', (req, res) => res.json(check(req.body || {})));

module.exports = router;
