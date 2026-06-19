-- Usage tracking for per-user and global rate limits

CREATE TABLE IF NOT EXISTS usage (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_type   TEXT NOT NULL CHECK (period_type IN ('daily', 'monthly')),
  period_start  DATE NOT NULL,
  call_count    INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, period_type, period_start)
);

ALTER TABLE usage ENABLE ROW LEVEL SECURITY;

-- Users can view their own usage
CREATE POLICY "Users can view own usage"
  ON usage FOR SELECT
  USING (auth.uid() = user_id);

-- Service role needs INSERT/UPDATE for counters
-- (called from server-side API routes with anon key + session)
CREATE POLICY "Users can insert own usage"
  ON usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own usage"
  ON usage FOR UPDATE
  USING (auth.uid() = user_id);

-- Index for fast lookups on rate-limit checks
CREATE INDEX IF NOT EXISTS idx_usage_user_period
  ON usage (user_id, period_type, period_start);

-- Updated_at trigger
CREATE TRIGGER usage_updated_at
  BEFORE UPDATE ON usage
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Atomic increment function (avoids race conditions from client-side upsert)
CREATE OR REPLACE FUNCTION increment_usage(
  p_user_id UUID,
  p_period_type TEXT,
  p_period_start DATE
) RETURNS void AS $$
BEGIN
  INSERT INTO usage (user_id, period_type, period_start, call_count)
    VALUES (p_user_id, p_period_type, p_period_start, 1)
    ON CONFLICT (user_id, period_type, period_start)
    DO UPDATE SET call_count = usage.call_count + 1, updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Allow authenticated users to call this function
GRANT EXECUTE ON FUNCTION increment_usage TO authenticated;
