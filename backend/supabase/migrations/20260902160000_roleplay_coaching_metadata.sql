-- Phase 7C safe Roleplay coaching metadata (MANUAL REVIEW — NOT APPLIED)
-- No transcript, user phrase, phrase suggestion, raw audio, or freeform coaching text is stored.

alter table public.roleplay_sessions
  add column if not exists coaching_status text not null default 'not_started'
    check (coaching_status in ('not_started', 'pending', 'completed', 'failed')),
  add column if not exists coaching_claimed_at timestamptz null,
  add column if not exists coaching_completed_at timestamptz null,
  add column if not exists outcome text null
    check (outcome is null or outcome in ('completed_goal', 'partially_completed', 'needs_more_practice')),
  add column if not exists primary_takeaway_type text null
    check (primary_takeaway_type is null or primary_takeaway_type in ('communication', 'clarity', 'grammar', 'vocabulary', 'naturalness', 'fluency')),
  add column if not exists next_focus text null
    check (next_focus is null or next_focus in ('pronunciation', 'fluency', 'naturalness', 'grammar', 'vocabulary', 'scenario_practice')),
  add column if not exists coaching_used_fallback boolean not null default false;

create index if not exists roleplay_sessions_coaching_pending_idx
  on public.roleplay_sessions (coaching_claimed_at)
  where coaching_status = 'pending';

comment on column public.roleplay_sessions.outcome is
  'Safe semantic Roleplay outcome only; no transcript or generated free text.';
