-- Audio retention: delete recordings older than 1 hour

-- Cleanup function: removes storage objects older than 1 hour from the recordings bucket
-- Uses SECURITY DEFINER so the admin client can delete any user's files.
CREATE OR REPLACE FUNCTION cleanup_old_recordings()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  deleted_count integer;
BEGIN
  WITH expired AS (
    DELETE FROM storage.objects
    WHERE bucket_id = 'recordings'
      AND created_at < now() - interval '1 hour'
    RETURNING id
  )
  SELECT count(*) INTO deleted_count FROM expired;

  RETURN deleted_count;
END;
$$;

-- Schedule cleanup every 15 minutes via pg_cron (if extension is enabled)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'cleanup-recordings',
      '*/15 * * * *',
      $$SELECT cleanup_old_recordings();$$
    );
  END IF;
END;
$$;
