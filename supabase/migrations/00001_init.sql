-- Mindfolio initial schema

-- Jobs table (background processing)
CREATE TABLE IF NOT EXISTS jobs (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type      TEXT NOT NULL CHECK (type IN ('transcribe','generate-linkedin','generate-substack','generate-blog')),
  status    TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
  input     JSONB NOT NULL DEFAULT '{}',
  output    TEXT,
  error     TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own jobs"
  ON jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own jobs"
  ON jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own jobs"
  ON jobs FOR UPDATE
  USING (auth.uid() = user_id);

-- Drafts table (content drafts from transcriptions / generated content)
CREATE TABLE IF NOT EXISTS drafts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT,
  content     TEXT NOT NULL DEFAULT '',
  source      TEXT NOT NULL DEFAULT 'written' CHECK (source IN ('transcript','written','generated')),
  transcript  TEXT,
  idea_id     UUID, -- FK aşağıda eklenir (ideas tablosu drafts'tan SONRA tanımlanıyor)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own drafts"
  ON drafts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own drafts"
  ON drafts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own drafts"
  ON drafts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own drafts"
  ON drafts FOR DELETE
  USING (auth.uid() = user_id);

-- Ideas table (blog ideas, bookmarks, notes)
CREATE TABLE IF NOT EXISTS ideas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  content     TEXT,
  url         TEXT,
  source_type TEXT DEFAULT 'note',
  tags        TEXT[] DEFAULT '{}',
  pillar      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ideas"
  ON ideas FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ideas"
  ON ideas FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ideas"
  ON ideas FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own ideas"
  ON ideas FOR DELETE
  USING (auth.uid() = user_id);

-- Personas table (writing personas, one per user)
CREATE TABLE IF NOT EXISTS personas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  voice       TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE personas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own persona"
  ON personas FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own persona"
  ON personas FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own persona"
  ON personas FOR UPDATE
  USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER drafts_updated_at
  BEFORE UPDATE ON drafts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER ideas_updated_at
  BEFORE UPDATE ON ideas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER personas_updated_at
  BEFORE UPDATE ON personas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- drafts.idea_id → ideas(id) FK'sini her iki tablo da var olduktan sonra ekle.
-- (PostgREST'in draft↔idea ilişkisini embed edebilmesi için bu FK ŞART.)
ALTER TABLE drafts
  ADD CONSTRAINT drafts_idea_id_fkey
  FOREIGN KEY (idea_id) REFERENCES ideas(id) ON DELETE SET NULL;
