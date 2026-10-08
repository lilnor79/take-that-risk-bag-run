-- Paste in Supabase SQL Editor. Enable anonymous sign-ins in Authentication > Providers.
create table if not exists public.scores (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 18),
  score bigint not null check (score >= 0),
  level integer not null check (level >= 1),
  updated_at timestamptz not null default now()
);
alter table public.scores enable row level security;
grant select on public.scores to anon, authenticated;
grant insert, update on public.scores to authenticated;
create policy "everyone can read scores" on public.scores for select to anon, authenticated using (true);
create policy "players insert own score" on public.scores for insert to authenticated with check (auth.uid() = user_id);
create policy "players update own score" on public.scores for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- This is an MVP scoreboard. Client-reported scores can be falsified; production requires server-side game validation.
