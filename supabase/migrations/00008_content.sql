-- Content management table

CREATE TABLE IF NOT EXISTS content (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  category     TEXT,
  tags         TEXT[] DEFAULT '{}',
  notes        TEXT,
  scheduled_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own content"
  ON content FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own content"
  ON content FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own content"
  ON content FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own content"
  ON content FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_content_user_category ON content (user_id, category);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_content_updated_at
  BEFORE UPDATE ON content
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
