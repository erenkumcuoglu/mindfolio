-- Add preview jsonb column to ideas for rich link cards
ALTER TABLE ideas
  ADD COLUMN IF NOT EXISTS preview JSONB;
