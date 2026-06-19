-- Content entries can hold a full draft body (avalon-style "publish prep").
-- Blog drafts generated in Studio are now saved here with their full text.

ALTER TABLE content
  ADD COLUMN IF NOT EXISTS body TEXT;
