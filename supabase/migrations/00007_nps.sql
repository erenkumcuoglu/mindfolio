-- NPS feedback collection

CREATE TABLE IF NOT EXISTS nps_responses (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score      SMALLINT NOT NULL CHECK (score >= 0 AND score <= 10),
  comment    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One response per user (prevent repeated prompting)
CREATE UNIQUE INDEX IF NOT EXISTS idx_nps_responses_user ON nps_responses (user_id);

ALTER TABLE nps_responses ENABLE ROW LEVEL SECURITY;

-- Users can view own NPS responses (needed for "already responded" check)
CREATE POLICY "Users can view own NPS responses"
  ON nps_responses FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert own NPS response
CREATE POLICY "Users can insert own NPS response"
  ON nps_responses FOR INSERT
  WITH CHECK (auth.uid() = user_id);
