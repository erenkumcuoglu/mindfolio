-- Async transcription jobs.
--
-- Long recordings cannot be transcribed synchronously within Netlify's function
-- timeout, so transcription runs in a Supabase Edge Function (see
-- supabase/functions/transcribe) that writes the result here. The client inserts
-- a job, invokes the function, and polls this row until status = done | error.

create table if not exists public.transcript_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  mime_type text not null default 'audio/mp4',
  status text not null default 'pending',   -- pending | processing | done | error
  result text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.transcript_jobs enable row level security;

-- Users may read and create only their own jobs. status/result are written by
-- the Edge Function using the service role, which bypasses RLS — so there is no
-- user-facing UPDATE/DELETE policy on purpose.
drop policy if exists "transcript_jobs_select_own" on public.transcript_jobs;
drop policy if exists "transcript_jobs_insert_own" on public.transcript_jobs;

create policy "transcript_jobs_select_own"
  on public.transcript_jobs for select to authenticated
  using (user_id = auth.uid());

create policy "transcript_jobs_insert_own"
  on public.transcript_jobs for insert to authenticated
  with check (user_id = auth.uid());

create index if not exists transcript_jobs_user_created_idx
  on public.transcript_jobs (user_id, created_at desc);
