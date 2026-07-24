-- Async content generation jobs.
--
-- The two-pass editorial generation of long transcripts exceeds Netlify's
-- synchronous function timeout (observed as 502/504 on /api/ai/generate). Move
-- generation to a Supabase Edge Function (supabase/functions/generate) that
-- writes the result here; the client inserts a job, invokes the function, and
-- polls this row until status = done | error.

create table if not exists public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prompt text not null,
  format text not null default 'raw',
  status text not null default 'pending',   -- pending | processing | done | error
  result text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.generation_jobs enable row level security;

-- Users read/create only their own jobs; status/result are written by the Edge
-- Function via the service role (bypasses RLS), so no user UPDATE/DELETE policy.
drop policy if exists "generation_jobs_select_own" on public.generation_jobs;
drop policy if exists "generation_jobs_insert_own" on public.generation_jobs;

create policy "generation_jobs_select_own"
  on public.generation_jobs for select to authenticated
  using (user_id = auth.uid());

create policy "generation_jobs_insert_own"
  on public.generation_jobs for insert to authenticated
  with check (user_id = auth.uid());

create index if not exists generation_jobs_user_created_idx
  on public.generation_jobs (user_id, created_at desc);
