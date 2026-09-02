-- Voira / EchoSpeak — FAZ 2.1: Speaking priorities cloud sync
--
-- Apply manually in Supabase SQL Editor (do NOT auto-apply from CI/agent).
-- Depends on: 20260824180000_user_progress_foundation.sql
--
-- Adds self-declared onboarding speaking priorities to user_profiles.
-- Canonical ids only (never localized display strings), e.g.:
--   pronunciation | fluency | vocabulary | grammar | confidence | listening_response
--
-- ---------------------------------------------------------------------------
-- Forward
-- ---------------------------------------------------------------------------

alter table public.user_profiles
  add column if not exists speaking_priorities jsonb not null default '[]'::jsonb;

alter table public.user_profiles
  drop constraint if exists user_profiles_speaking_priorities_is_array_check;

alter table public.user_profiles
  add constraint user_profiles_speaking_priorities_is_array_check
  check (jsonb_typeof(speaking_priorities) = 'array');

comment on column public.user_profiles.speaking_priorities is
  'Self-declared speaking priorities from onboarding (canonical ids). Separate from weak_words / detected weakAreas.';

-- ---------------------------------------------------------------------------
-- Rollback
-- ---------------------------------------------------------------------------
-- alter table public.user_profiles
--   drop constraint if exists user_profiles_speaking_priorities_is_array_check;
-- alter table public.user_profiles
--   drop column if exists speaking_priorities;
