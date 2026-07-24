BEGIN;
CREATE TABLE IF NOT EXISTS runtime_ai_interactions(
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id),
  feature TEXT NOT NULL,
  input JSONB NOT NULL,
  output JSONB NOT NULL,
  model TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS runtime_ai_interactions_user_idx ON runtime_ai_interactions(user_id,created_at DESC);
COMMIT;
