-- Voira FAZ 5.1 — Durable weak-word dedicated practice evidence on weak_words aggregates
--
-- Apply manually in Supabase SQL Editor (do NOT auto-apply from CI/agent).
--
-- Rationale:
--   Dedicated weak-word training outcomes must survive logout/login and cross-device sync
--   without creating synthetic practice_attempts rows. Sentence-level weak evidence remains
--   rebuilt from practice_attempts; dedicated practice durability is stored on the aggregate:
--     * recent_healthy_streak — consecutive healthy dedicated practices (mastery evidence)
--     * dedicated_practice_count — count of dedicated word-practice sessions (not failures)
--
-- Compatibility:
--   Existing rows default to 0. Old clients ignore new columns; RLS unchanged.

alter table public.weak_words
  add column if not exists recent_healthy_streak integer not null default 0,
  add column if not exists dedicated_practice_count integer not null default 0;

alter table public.weak_words
  drop constraint if exists weak_words_recent_healthy_streak_check;

alter table public.weak_words
  add constraint weak_words_recent_healthy_streak_check
    check (recent_healthy_streak >= 0);

alter table public.weak_words
  drop constraint if exists weak_words_dedicated_practice_count_check;

alter table public.weak_words
  add constraint weak_words_dedicated_practice_count_check
    check (dedicated_practice_count >= 0);
