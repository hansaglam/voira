-- Voira / EchoSpeak — FAZ 1B / 1B.1: Cloud progress foundation (hardened)
--
-- Apply manually in Supabase SQL Editor (do NOT auto-apply from CI/agent).
-- Intended as a one-time production apply. Not yet applied.
-- Rollback notes are at the bottom of this file.
--
-- Tables:
--   public.user_profiles     — learning preferences + aggregate scores
--   public.practice_attempts — idempotent practice history (no raw audio / transcript)
--   public.weak_words        — lexical weak-word aggregates (not skill weakAreas)
--
-- App compatibility notes (verified against repositories):
--   scores are 0–100 (backend clampScore / client nativeScore)
--   daily_minutes is 5 | 10 | 15
--   practice_mode is 'daily' | 'library'
--   english_level is beginner | intermediate | advanced | unsure
--   coach_feedback is a JSON object when present
--   attemptId maps to client_attempt_id (includes legacy:… ids)

-- ---------------------------------------------------------------------------
-- user_profiles
-- ---------------------------------------------------------------------------

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  english_level text null,
  primary_goal text null,
  goals jsonb not null default '[]'::jsonb,
  daily_minutes integer null,
  current_streak integer not null default 0,
  best_score numeric null,
  average_score numeric null,
  last_practice_date date null,
  completed_lesson_ids jsonb not null default '[]'::jsonb,
  completed_daily_session_ids jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint user_profiles_english_level_check
    check (
      english_level is null
      or english_level in ('beginner', 'intermediate', 'advanced', 'unsure')
    ),
  constraint user_profiles_daily_minutes_check
    check (daily_minutes is null or daily_minutes in (5, 10, 15)),
  constraint user_profiles_current_streak_check
    check (current_streak >= 0),
  constraint user_profiles_best_score_check
    check (best_score is null or (best_score >= 0 and best_score <= 100)),
  constraint user_profiles_average_score_check
    check (average_score is null or (average_score >= 0 and average_score <= 100)),
  constraint user_profiles_goals_is_array_check
    check (jsonb_typeof(goals) = 'array'),
  constraint user_profiles_completed_lesson_ids_is_array_check
    check (jsonb_typeof(completed_lesson_ids) = 'array'),
  constraint user_profiles_completed_daily_session_ids_is_array_check
    check (jsonb_typeof(completed_daily_session_ids) = 'array')
);

create index if not exists user_profiles_updated_at_idx
  on public.user_profiles (updated_at desc);

-- ---------------------------------------------------------------------------
-- practice_attempts
-- ---------------------------------------------------------------------------

create table if not exists public.practice_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  client_attempt_id text not null,
  lesson_id text not null,
  segment_id text null,
  practice_mode text not null,
  overall_score numeric null,
  pronunciation_score numeric null,
  accuracy_score numeric null,
  fluency_score numeric null,
  completeness_score numeric null,
  prosody_score numeric null,
  words_to_improve jsonb not null default '[]'::jsonb,
  weak_areas jsonb not null default '[]'::jsonb,
  coach_feedback jsonb null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint practice_attempts_user_client_attempt_unique
    unique (user_id, client_attempt_id),
  constraint practice_attempts_client_attempt_id_nonempty_check
    check (btrim(client_attempt_id) <> ''),
  constraint practice_attempts_lesson_id_nonempty_check
    check (btrim(lesson_id) <> ''),
  constraint practice_attempts_practice_mode_check
    check (practice_mode in ('daily', 'library')),
  constraint practice_attempts_overall_score_check
    check (overall_score is null or (overall_score >= 0 and overall_score <= 100)),
  constraint practice_attempts_pronunciation_score_check
    check (pronunciation_score is null or (pronunciation_score >= 0 and pronunciation_score <= 100)),
  constraint practice_attempts_accuracy_score_check
    check (accuracy_score is null or (accuracy_score >= 0 and accuracy_score <= 100)),
  constraint practice_attempts_fluency_score_check
    check (fluency_score is null or (fluency_score >= 0 and fluency_score <= 100)),
  constraint practice_attempts_completeness_score_check
    check (completeness_score is null or (completeness_score >= 0 and completeness_score <= 100)),
  constraint practice_attempts_prosody_score_check
    check (prosody_score is null or (prosody_score >= 0 and prosody_score <= 100)),
  constraint practice_attempts_words_to_improve_is_array_check
    check (jsonb_typeof(words_to_improve) = 'array'),
  constraint practice_attempts_weak_areas_is_array_check
    check (jsonb_typeof(weak_areas) = 'array'),
  constraint practice_attempts_coach_feedback_is_object_check
    check (coach_feedback is null or jsonb_typeof(coach_feedback) = 'object')
);

create index if not exists practice_attempts_user_id_created_at_idx
  on public.practice_attempts (user_id, created_at desc);

create index if not exists practice_attempts_user_id_lesson_id_idx
  on public.practice_attempts (user_id, lesson_id);

-- ---------------------------------------------------------------------------
-- weak_words
-- ---------------------------------------------------------------------------

create table if not exists public.weak_words (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  normalized_word text not null,
  display_word text not null,
  attempt_count integer not null default 0,
  weak_count integer not null default 0,
  best_score numeric null,
  last_score numeric null,
  average_score numeric null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  resolved_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint weak_words_user_normalized_unique
    unique (user_id, normalized_word),
  constraint weak_words_normalized_word_nonempty_check
    check (btrim(normalized_word) <> ''),
  constraint weak_words_display_word_nonempty_check
    check (btrim(display_word) <> ''),
  constraint weak_words_attempt_count_check
    check (attempt_count >= 0),
  constraint weak_words_weak_count_check
    check (weak_count >= 0 and weak_count <= attempt_count),
  constraint weak_words_best_score_check
    check (best_score is null or (best_score >= 0 and best_score <= 100)),
  constraint weak_words_last_score_check
    check (last_score is null or (last_score >= 0 and last_score <= 100)),
  constraint weak_words_average_score_check
    check (average_score is null or (average_score >= 0 and average_score <= 100))
);

create index if not exists weak_words_user_id_last_seen_at_idx
  on public.weak_words (user_id, last_seen_at desc);

-- ---------------------------------------------------------------------------
-- updated_at trigger function (simple; controlled search_path; not SECURITY DEFINER)
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at_timestamp()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_profiles_set_updated_at on public.user_profiles;
create trigger user_profiles_set_updated_at
before update on public.user_profiles
for each row
execute function public.set_updated_at_timestamp();

drop trigger if exists practice_attempts_set_updated_at on public.practice_attempts;
create trigger practice_attempts_set_updated_at
before update on public.practice_attempts
for each row
execute function public.set_updated_at_timestamp();

drop trigger if exists weak_words_set_updated_at on public.weak_words;
create trigger weak_words_set_updated_at
before update on public.weak_words
for each row
execute function public.set_updated_at_timestamp();

-- ---------------------------------------------------------------------------
-- Privileges
-- authenticated: CRUD subject to RLS
-- anon: no access
-- service_role: full table access (bypasses RLS; backend admin only)
-- ---------------------------------------------------------------------------

revoke all on table public.user_profiles from anon;
revoke all on table public.user_profiles from authenticated;
revoke all on table public.practice_attempts from anon;
revoke all on table public.practice_attempts from authenticated;
revoke all on table public.weak_words from anon;
revoke all on table public.weak_words from authenticated;

grant select, insert, update, delete on table public.user_profiles to authenticated;
grant select, insert, update, delete on table public.practice_attempts to authenticated;
grant select, insert, update, delete on table public.weak_words to authenticated;

grant all on table public.user_profiles to service_role;
grant all on table public.practice_attempts to service_role;
grant all on table public.weak_words to service_role;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.user_profiles enable row level security;
alter table public.practice_attempts enable row level security;
alter table public.weak_words enable row level security;

-- Force RLS for table owners as defense in depth (service_role still bypasses).
alter table public.user_profiles force row level security;
alter table public.practice_attempts force row level security;
alter table public.weak_words force row level security;

-- user_profiles
drop policy if exists "user_profiles_select_own" on public.user_profiles;
create policy "user_profiles_select_own"
  on public.user_profiles
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "user_profiles_insert_own" on public.user_profiles;
create policy "user_profiles_insert_own"
  on public.user_profiles
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "user_profiles_update_own" on public.user_profiles;
create policy "user_profiles_update_own"
  on public.user_profiles
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user_profiles_delete_own" on public.user_profiles;
create policy "user_profiles_delete_own"
  on public.user_profiles
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- practice_attempts
drop policy if exists "practice_attempts_select_own" on public.practice_attempts;
create policy "practice_attempts_select_own"
  on public.practice_attempts
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "practice_attempts_insert_own" on public.practice_attempts;
create policy "practice_attempts_insert_own"
  on public.practice_attempts
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "practice_attempts_update_own" on public.practice_attempts;
create policy "practice_attempts_update_own"
  on public.practice_attempts
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "practice_attempts_delete_own" on public.practice_attempts;
create policy "practice_attempts_delete_own"
  on public.practice_attempts
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- weak_words
drop policy if exists "weak_words_select_own" on public.weak_words;
create policy "weak_words_select_own"
  on public.weak_words
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "weak_words_insert_own" on public.weak_words;
create policy "weak_words_insert_own"
  on public.weak_words
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "weak_words_update_own" on public.weak_words;
create policy "weak_words_update_own"
  on public.weak_words
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "weak_words_delete_own" on public.weak_words;
create policy "weak_words_delete_own"
  on public.weak_words
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Rollback (manual — do not auto-run)
-- ---------------------------------------------------------------------------
-- drop policy if exists "weak_words_delete_own" on public.weak_words;
-- drop policy if exists "weak_words_update_own" on public.weak_words;
-- drop policy if exists "weak_words_insert_own" on public.weak_words;
-- drop policy if exists "weak_words_select_own" on public.weak_words;
-- drop policy if exists "practice_attempts_delete_own" on public.practice_attempts;
-- drop policy if exists "practice_attempts_update_own" on public.practice_attempts;
-- drop policy if exists "practice_attempts_insert_own" on public.practice_attempts;
-- drop policy if exists "practice_attempts_select_own" on public.practice_attempts;
-- drop policy if exists "user_profiles_delete_own" on public.user_profiles;
-- drop policy if exists "user_profiles_update_own" on public.user_profiles;
-- drop policy if exists "user_profiles_insert_own" on public.user_profiles;
-- drop policy if exists "user_profiles_select_own" on public.user_profiles;
-- revoke all on table public.weak_words from anon, authenticated, service_role;
-- revoke all on table public.practice_attempts from anon, authenticated, service_role;
-- revoke all on table public.user_profiles from anon, authenticated, service_role;
-- drop trigger if exists weak_words_set_updated_at on public.weak_words;
-- drop trigger if exists practice_attempts_set_updated_at on public.practice_attempts;
-- drop trigger if exists user_profiles_set_updated_at on public.user_profiles;
-- drop table if exists public.weak_words;
-- drop table if exists public.practice_attempts;
-- drop table if exists public.user_profiles;
-- -- Only drop set_updated_at_timestamp if no other tables use it:
-- -- drop function if exists public.set_updated_at_timestamp();
