-- Add profile jsonb and onboarding_complete to personas
ALTER TABLE personas
  ADD COLUMN IF NOT EXISTS profile JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN NOT NULL DEFAULT false;
