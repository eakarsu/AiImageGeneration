# Backlog: Needs Credentials — AiImageGeneration

Apply pass 5 stubs.

## Stripe — paid generations / marketplace
- **Endpoint:** `POST /api/integrations/stripe/charge`
- **Env:** `STRIPE_SECRET_KEY`
- **Wire-up TODO:** Credit-pack purchase, marketplace listing fees, payouts.

## Object storage (S3 / R2 / GCS)
- **Endpoint:** `POST /api/integrations/storage/presign`
- **Env:** `STORAGE_PROVIDER`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`,
  `STORAGE_BUCKET`
- **Wire-up TODO:** Signed PUT URL for client-side upload of high-res
  artifacts; lifecycle rules for free-tier expiry.

## Social share / publish
- **Endpoint:** `POST /api/integrations/social/share`
- **Env:** `SOCIAL_PROVIDER`, `SOCIAL_API_KEY`
- **Wire-up TODO:** OAuth flow per provider; media upload + scheduled post.

## Backlog NOT mechanical (deferred)

- **Image marketplace + DRM** — NEEDS-PRODUCT-DECISION (licensing model,
  royalties, dispute handling).
- **Brand consistency guardrails** — NEEDS-PRODUCT-DECISION on enforcement
  scope.
- **Agentic creative assistant** — NEEDS-PRODUCT-DECISION on multi-turn
  intent loop + cost controls.
