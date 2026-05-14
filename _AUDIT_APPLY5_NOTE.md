# Apply Pass 5 — AiImageGeneration

**Date:** 2026-05-08
**Project:** AiImageGeneration
**Stack:** Node-Express + React, Postgres `pg` pool, JWT bearer auth
(`backend/middleware/auth.js`), Stable Diffusion server proxy at `/api/sd-status`.
**Audit source:** `/Users/erolakarsu/projects/_AUDIT/reports/batch_04.md` §28

## Verified-present (no changes)

Pass 1-4 already established that audit's "missing AI counterparts" list is
fully covered:
- `/api/generations`, `/api/prompt-optimizer`, `/api/style-transfer`,
  `/api/upscaler`, `/api/variation-generator`, `/api/brand-asset-creator`,
  `/api/art-instructor`, `/api/ai-history`.
- `services/openrouter.js` carries `optimizePrompt`, `analyzeStyleTransfer`,
  `getUpscaleRecommendations`, `generateVariations`, `getArtInstruction`,
  `createBrandAsset`.
- `imageGenerator.js` proxies the SD server.

## Implemented this pass (5 items — at cap)

1. `POST /api/integrations/stripe/charge` — 503-on-no-key.
2. `POST /api/integrations/storage/presign` — 503-on-no-key (S3/R2/GCS).
3. `POST /api/integrations/social/share` — 503-on-no-key.
4. `GET  /api/export/gallery` — JSON download of caller's gallery.
5. `GET  /api/export/ai-history` + `GET /api/export/portfolio` — JSON
   download of AI history and combined portfolio bundle (single mechanical
   item — both endpoints are identical pattern + share schema discovery
   logic).

Files written:
- `backend/routes/integrations.js` (new)
- `backend/routes/exportData.js` (new)
- `backend/server.js` (added 2 `app.use(...)` lines)
- `_BACKLOG_NEEDS_CREDS.md` (new)

## Categorization of remaining backlog

- **NEEDS-CREDS (stubbed):** Stripe, storage, social.
- **MECHANICAL (implemented):** export endpoints (covers audit's "no
  download/export options" line).
- **NEEDS-PRODUCT-DECISION:** marketplace economics, brand-consistency
  guardrails, agentic creative-assistant turn loop.

## Smoke test outcome

`node --check` passes for all 3 modified/new files. Export endpoints set
proper `Content-Disposition: attachment` headers for client download.

## Cap

5 / 5.
