-- RLS audit: fill missing policies and harden storage

-- 1. Jobs: missing DELETE policy
CREATE POLICY "Users can delete own jobs"
  ON jobs FOR DELETE
  USING (auth.uid() = user_id);

-- 2. Personas: missing DELETE policy
CREATE POLICY "Users can delete own persona"
  ON personas FOR DELETE
  USING (auth.uid() = user_id);

-- 3. Ensure no table has public INSERT/UPDATE/DELETE access
--    (SELECT-only public policies are intentionally absent.)

-- 4. Storage bucket for long recordings
INSERT INTO storage.buckets (id, name, public)
  VALUES ('recordings', 'recordings', false)
  ON CONFLICT (id) DO NOTHING;

-- RLS on storage objects is enabled by default on Supabase projects,
-- but we ensure policies exist for the recordings bucket:
CREATE POLICY "Users can view own recordings"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'recordings' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload own recordings"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'recordings' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own recordings"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'recordings' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own recordings"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'recordings' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Revoke public access on the bucket
UPDATE storage.buckets
  SET public = false
  WHERE id = 'recordings';
