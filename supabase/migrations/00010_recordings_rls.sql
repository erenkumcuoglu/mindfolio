-- Direct-to-Storage audio upload for transcription.
--
-- Motivation: mobile previously sent audio as a base64 JSON body to
-- /api/ai/transcribe, but Netlify's synchronous-function body limit is 6MB, so
-- recordings longer than ~4-5 min never reached the route. The client now
-- uploads audio straight to Storage and the route only receives { storagePath,
-- mimeType }. That requires per-user RLS on the `recordings` bucket.
--
-- Path convention: `${auth.uid()}/<timestamp>.<ext>` — the first path segment
-- is the owner id, which the policies below enforce.

-- Ensure the bucket exists and is PRIVATE (no public read).
insert into storage.buckets (id, name, public)
values ('recordings', 'recordings', false)
on conflict (id) do nothing;

-- Policies are re-createable (no CREATE POLICY IF NOT EXISTS in Postgres).
drop policy if exists "recordings_insert_own" on storage.objects;
drop policy if exists "recordings_select_own" on storage.objects;
drop policy if exists "recordings_delete_own" on storage.objects;

create policy "recordings_insert_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'recordings'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "recordings_select_own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'recordings'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "recordings_delete_own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'recordings'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
