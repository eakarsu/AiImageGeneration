# Audit Apply Notes — AiImageGeneration

## Source
`/Users/erolakarsu/projects/_AUDIT/reports/batch_04.md` section 28.

## Audit vs. Reality
Audit reported "0 AI endpoints" but every endpoint listed as missing actually exists:

- `/generate-image` → `POST /api/generations` (calls Stable Diffusion server via `imageGenerator.js`)
- `/suggest-prompts` → `POST /api/prompt-optimizer` (uses `optimizePrompt` in `services/openrouter.js`)
- `/style-transfer` → `POST /api/style-transfer` (uses `analyzeStyleTransfer`)
- `/upscale-image` → `POST /api/upscaler` (uses `getUpscaleRecommendations`)
- `/generate-variations` → `POST /api/variation-generator` (uses `generateVariations`)

Additional AI functions already implemented in `services/openrouter.js`: `getArtInstruction`, `createBrandAsset`. Persistence to `ai_history` table is wired.

Therefore the audit's "missing AI counterparts" list is fully satisfied by existing code. No mechanical additions needed.

## Implemented (this pass)
None — backlog-only. Adding redundant endpoints would clash with existing routes and confuse callers.

## Backlog
- Custom: agentic creative assistant (multi-turn intent → prompt → image loop), batch generation + scheduling, prompt learning from user history, image marketplace + licensing, brand consistency guardrails, multimodal refinement.
- Non-AI: payment processing, marketplace, download/export options, collaboration/sharing, public profile/portfolio.

## Categorization
- MECHANICAL but unnecessary: audit's missing list is already implemented.
- NEEDS-PRODUCT-DECISION: licensing model, marketplace economics.
- NEEDS-CREDS: payment processor, royalties tracking.
- TOO-RISKY mechanically without product decisions: marketplace + DRM.

## Apply pass 3 (frontend)

LEFT-AS-IS. Every backend AI route (`/api/prompt-optimizer`, `/art-instructor`, `/style-transfer`, `/upscaler`, `/variation-generator`, `/brand-asset-creator`, `/generations`, `/gallery`, `/ai-history`) has a dedicated React page in `frontend/src/pages/` calling it with `Authorization: Bearer ${localStorage.token}`. 43 matching `/api/...` references confirmed. No FE changes needed.

## Apply pass 4 (mechanical backlog)

LEFT-AS-IS. As noted in apply passes 1-3, the audit's "missing AI counterparts" list is already implemented in `services/openrouter.js` + matching routes (`/api/prompt-optimizer`, `/art-instructor`, `/style-transfer`, `/upscaler`, `/variation-generator`, `/brand-asset-creator`) and persisted to `ai_history`. The remaining backlog is explicitly NEEDS-PRODUCT-DECISION (licensing model, marketplace economics, image marketplace + DRM, brand-consistency policy, agentic creative-assistant turn loop) or NEEDS-CREDS (payment processor, royalties tracking). No mechanical work remained at this pass.
