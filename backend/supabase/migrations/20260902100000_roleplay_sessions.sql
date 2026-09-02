-- Phase 7A.3 roleplay session authority (MANUAL REVIEW — NOT APPLIED)
--
-- Privacy lifecycle:
--   ACTIVE: opening_assistant_text + exchange user/assistant text retained (bounded by turn limits).
--   COMPLETED / ABANDONED / EXPIRED: exchange rows deleted; opening_assistant_text cleared; session metadata retained.
--   No permanent transcript archive. No audio. No unrelated historical transcripts.
--
-- Authority: backend service_role only. Mobile clients never mutate these tables directly.

-- ---------------------------------------------------------------------------
-- Sessions (metadata + opening text while active)
-- ---------------------------------------------------------------------------
create table if not exists public.roleplay_sessions (
  id uuid primary key default gen_random_uuid(),

  owner_kind text not null check (owner_kind in ('authenticated', 'guest')),

  -- Exactly one owner reference (structural — no fake auth.users for guests)
  auth_user_id uuid null references auth.users (id) on delete cascade,
  guest_owner_key text null,

  scenario_id text not null check (char_length(scenario_id) > 0),
  status text not null default 'active'
    check (status in ('active', 'completed', 'abandoned', 'expired')),

  -- Supports unsure explicitly (not normalized away at persistence layer)
  level text not null
    check (level in ('beginner', 'intermediate', 'advanced', 'unsure')),

  user_turn_count integer not null default 0 check (user_turn_count >= 0),

  -- Atomically incremented when allocating exchange sequence_no (active sessions only)
  next_sequence_no integer not null default 1 check (next_sequence_no > 0),

  -- Transient while status = active; cleared on complete/abandon/expire cleanup
  opening_assistant_text text null,

  started_at timestamptz not null default now(),
  completed_at timestamptz null,
  expires_at timestamptz not null,
  duration_ms integer null check (duration_ms is null or duration_ms >= 0),

  -- Whitelisted personalization only (validated server-side before insert)
  personalization jsonb not null default '{}'::jsonb
    check (jsonb_typeof(personalization) = 'object'),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint roleplay_sessions_owner_exactly_one check (
    (owner_kind = 'authenticated' and auth_user_id is not null and guest_owner_key is null)
    or (owner_kind = 'guest' and guest_owner_key is not null and auth_user_id is null)
  ),

  constraint roleplay_sessions_guest_key_format check (
    guest_owner_key is null or guest_owner_key ~ '^g_[a-f0-9]{64}$'
  )
);

-- ---------------------------------------------------------------------------
-- Exchanges (one row per clientTurnId — explicit user/assistant correlation)
-- ---------------------------------------------------------------------------
create table if not exists public.roleplay_exchanges (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.roleplay_sessions (id) on delete cascade,

  client_turn_id text not null check (char_length(client_turn_id) > 0),
  sequence_no integer not null check (sequence_no > 0),

  user_text text not null check (char_length(user_text) > 0),

  -- Null until generation succeeds; row deleted on session cleanup
  assistant_text text null,

  generation_status text not null default 'pending'
    check (generation_status in ('pending', 'completed', 'failed')),

  -- Durable generation lease — stale pending rows become reclaimable
  generation_claimed_at timestamptz null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint roleplay_exchanges_session_client_turn_unique unique (session_id, client_turn_id),
  constraint roleplay_exchanges_session_sequence_unique unique (session_id, sequence_no),

  -- Completed exchanges must have assistant text; failed/pending may not
  constraint roleplay_exchanges_completed_requires_assistant check (
    generation_status <> 'completed' or assistant_text is not null
  )
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index if not exists roleplay_sessions_auth_user_started_idx
  on public.roleplay_sessions (auth_user_id, started_at desc)
  where auth_user_id is not null;

create index if not exists roleplay_sessions_guest_started_idx
  on public.roleplay_sessions (guest_owner_key, started_at desc)
  where guest_owner_key is not null;

create index if not exists roleplay_sessions_expires_at_idx
  on public.roleplay_sessions (expires_at)
  where status = 'active';

create index if not exists roleplay_exchanges_session_sequence_idx
  on public.roleplay_exchanges (session_id, sequence_no asc);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create or replace function public.roleplay_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists roleplay_sessions_set_updated_at on public.roleplay_sessions;
create trigger roleplay_sessions_set_updated_at
  before update on public.roleplay_sessions
  for each row execute function public.roleplay_set_updated_at();

drop trigger if exists roleplay_exchanges_set_updated_at on public.roleplay_exchanges;
create trigger roleplay_exchanges_set_updated_at
  before update on public.roleplay_exchanges
  for each row execute function public.roleplay_set_updated_at();

-- ---------------------------------------------------------------------------
-- Security: backend service_role only
-- ---------------------------------------------------------------------------
alter table public.roleplay_sessions enable row level security;
alter table public.roleplay_exchanges enable row level security;
alter table public.roleplay_sessions force row level security;
alter table public.roleplay_exchanges force row level security;

-- No policies for anon/authenticated — direct client access denied.
revoke all on public.roleplay_sessions from anon, authenticated;
revoke all on public.roleplay_exchanges from anon, authenticated;

grant all on public.roleplay_sessions to service_role;
grant all on public.roleplay_exchanges to service_role;

-- ---------------------------------------------------------------------------
-- Concurrency-safe sequence allocation (service_role only)
-- Atomically increments next_sequence_no on the session row and returns the
-- allocated value. Allocation + insert remain separate requests, but the counter
-- is reserved inside a single UPDATE so concurrent callers receive distinct values.
-- ---------------------------------------------------------------------------
create or replace function public.roleplay_allocate_next_sequence_no(p_session_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_allocated integer;
begin
  update public.roleplay_sessions
     set next_sequence_no = next_sequence_no + 1
   where id = p_session_id
     and status = 'active'
     and expires_at > now()
  returning (next_sequence_no - 1)
    into v_allocated;

  if v_allocated is null then
    raise exception 'ROLEPLAY_SEQUENCE_ALLOCATION_REJECTED'
      using errcode = 'P0001';
  end if;

  return v_allocated;
end;
$$;

revoke all on function public.roleplay_allocate_next_sequence_no(uuid) from public;
grant execute on function public.roleplay_allocate_next_sequence_no(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Cleanup helper (callable by backend via RPC)
-- Purges transient text only for ended sessions (completed / abandoned / expired).
-- ---------------------------------------------------------------------------
create or replace function public.roleplay_purge_transient_session_text(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  select status
    into v_status
    from public.roleplay_sessions
   where id = p_session_id
     for update;

  if v_status is null then
    return;
  end if;

  if v_status not in ('completed', 'abandoned', 'expired') then
    raise exception 'ROLEPLAY_ACTIVE_SESSION_PURGE_REJECTED'
      using errcode = 'P0001';
  end if;

  delete from public.roleplay_exchanges where session_id = p_session_id;

  update public.roleplay_sessions
     set opening_assistant_text = null,
         updated_at = now()
   where id = p_session_id;
end;
$$;

revoke all on function public.roleplay_purge_transient_session_text(uuid) from public;
grant execute on function public.roleplay_purge_transient_session_text(uuid) to service_role;
