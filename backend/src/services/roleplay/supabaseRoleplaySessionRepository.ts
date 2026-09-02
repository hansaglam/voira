import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAdminClient, isSupabaseAdminConfigured } from '../supabase/supabaseAdminClient.js';
import type {
  BeginUserTurnResult,
  CreateRoleplaySessionInput,
  RoleplayExchangeEntity,
  RoleplayGenerationStatus,
  RoleplayCoachingStatus,
  RoleplaySessionEntity,
  RoleplaySessionRepository,
} from './roleplaySessionRepository.js';
import { RoleplayPurgeRejectedError, RoleplaySequenceAllocationRejectedError } from './roleplaySessionRepository.js';
import { exchangesToTurns } from './roleplaySessionRepository.js';
import { parsePersistedPersonalization, toPersistedPersonalization } from './roleplayPersonalizationPersistence.js';
import type { RoleplayTurn } from '../../types/roleplay.js';
import {
  classifyExistingExchange,
  generationLeaseCutoffIso,
  newGenerationClaimIso,
} from './roleplayGenerationLease.js';

interface SessionRow {
  id: string;
  owner_kind: 'authenticated' | 'guest';
  auth_user_id: string | null;
  guest_owner_key: string | null;
  scenario_id: string;
  status: 'active' | 'completed' | 'abandoned' | 'expired';
  level: string;
  user_turn_count: number;
  next_sequence_no: number;
  opening_assistant_text: string | null;
  started_at: string;
  completed_at: string | null;
  expires_at: string;
  duration_ms: number | null;
  personalization: unknown;
  created_at: string;
  updated_at: string;
  coaching_status: RoleplayCoachingStatus;
  coaching_claimed_at: string | null;
  coaching_completed_at: string | null;
  outcome: import('../../types/roleplay.js').RoleplayCoachingOutcome | null;
  primary_takeaway_type: import('../../types/roleplay.js').RoleplayCoachingCategory | null;
  next_focus: import('../../types/roleplay.js').RoleplayNextFocus | null;
  coaching_used_fallback: boolean;
}

interface ExchangeRow {
  id: string;
  session_id: string;
  client_turn_id: string;
  sequence_no: number;
  user_text: string;
  assistant_text: string | null;
  generation_status: RoleplayGenerationStatus;
  generation_claimed_at: string | null;
  created_at: string;
  updated_at: string;
}

function mapSession(row: SessionRow): RoleplaySessionEntity {
  return {
    id: row.id,
    ownerKind: row.owner_kind,
    authUserId: row.auth_user_id,
    guestOwnerKey: row.guest_owner_key,
    scenarioId: row.scenario_id,
    status: row.status,
    level: parsePersistedPersonalization({ level: row.level }).level,
    userTurnCount: row.user_turn_count,
    nextSequenceNo: row.next_sequence_no,
    openingAssistantText: row.opening_assistant_text,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    expiresAt: row.expires_at,
    durationMs: row.duration_ms,
    personalization: parsePersistedPersonalization(row.personalization),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    coachingStatus: row.coaching_status ?? 'not_started',
    coachingClaimedAt: row.coaching_claimed_at ?? null,
    coachingCompletedAt: row.coaching_completed_at ?? null,
    coachingOutcome: row.outcome ?? null,
    primaryTakeawayType: row.primary_takeaway_type ?? null,
    nextFocus: row.next_focus ?? null,
    coachingUsedFallback: Boolean(row.coaching_used_fallback),
  };
}

function mapExchange(row: ExchangeRow): RoleplayExchangeEntity {
  return {
    id: row.id,
    sessionId: row.session_id,
    clientTurnId: row.client_turn_id,
    sequenceNo: row.sequence_no,
    userText: row.user_text,
    assistantText: row.assistant_text,
    generationStatus: row.generation_status,
    generationClaimedAt: row.generation_claimed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isExpired(session: RoleplaySessionEntity, nowIso: string): boolean {
  return Date.parse(session.expiresAt) <= Date.parse(nowIso);
}

function ownerSessionFilter(
  client: SupabaseClient,
  sessionId: string,
  owner: CreateRoleplaySessionInput['owner'],
) {
  let query = client.from('roleplay_sessions').select('*').eq('id', sessionId);
  if (owner.kind === 'authenticated') {
    query = query.eq('owner_kind', 'authenticated').eq('auth_user_id', owner.authUserId!);
  } else {
    query = query.eq('owner_kind', 'guest').eq('guest_owner_key', owner.guestOwnerKey!);
  }
  return query.maybeSingle();
}

async function allocateNextSequenceNo(client: SupabaseClient, sessionId: string): Promise<number> {
  const { data, error } = await client.rpc('roleplay_allocate_next_sequence_no', {
    p_session_id: sessionId,
  });
  if (error) {
    if (error.message.includes('ROLEPLAY_SEQUENCE_ALLOCATION_REJECTED')) {
      throw new RoleplaySequenceAllocationRejectedError();
    }
    throw new Error(error.message);
  }
  return data as number;
}

async function tryReclaimExistingExchange(
  client: SupabaseClient,
  existing: RoleplayExchangeEntity,
  session: RoleplaySessionEntity,
): Promise<BeginUserTurnResult> {
  const classified = classifyExistingExchange(existing, session);
  if (classified.kind === 'existing_completed' || classified.kind === 'in_flight') {
    return classified;
  }

  const now = newGenerationClaimIso();

  if (existing.generationStatus === 'failed') {
    const { data: reclaimed, error } = await client
      .from('roleplay_exchanges')
      .update({
        generation_status: 'pending',
        assistant_text: null,
        generation_claimed_at: now,
      })
      .eq('id', existing.id)
      .eq('generation_status', 'failed')
      .select('*')
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (reclaimed) {
      return {
        kind: 'claim_generation',
        exchange: mapExchange(reclaimed as ExchangeRow),
        session,
      };
    }
  }

  const staleCutoff = generationLeaseCutoffIso();
  const { data: reclaimed, error } = await client
    .from('roleplay_exchanges')
    .update({ generation_claimed_at: now })
    .eq('id', existing.id)
    .eq('generation_status', 'pending')
    .or(`generation_claimed_at.is.null,generation_claimed_at.lt.${staleCutoff}`)
    .select('*')
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (reclaimed) {
    return {
      kind: 'claim_generation',
      exchange: mapExchange(reclaimed as ExchangeRow),
      session,
    };
  }

  const { data: refreshed, error: refreshError } = await client
    .from('roleplay_exchanges')
    .select('*')
    .eq('id', existing.id)
    .single();
  if (refreshError) throw new Error(refreshError.message);
  return classifyExistingExchange(mapExchange(refreshed as ExchangeRow), session);
}

export class SupabaseRoleplaySessionRepository implements RoleplaySessionRepository {
  constructor(private readonly client: SupabaseClient) {}

  async createSession(input: CreateRoleplaySessionInput): Promise<RoleplaySessionEntity> {
    const personalization = toPersistedPersonalization(input.personalization);
    const { data, error } = await this.client
      .from('roleplay_sessions')
      .insert({
        owner_kind: input.owner.kind,
        auth_user_id: input.owner.authUserId,
        guest_owner_key: input.owner.guestOwnerKey,
        scenario_id: input.scenarioId,
        status: 'active',
        level: personalization.level,
        user_turn_count: 0,
        opening_assistant_text: input.openingAssistantText,
        expires_at: input.expiresAt,
        personalization,
      })
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? 'roleplay_session_create_failed');
    }
    return mapSession(data as SessionRow);
  }

  async getSessionForOwner(
    sessionId: string,
    owner: CreateRoleplaySessionInput['owner'],
  ): Promise<RoleplaySessionEntity | null> {
    const { data, error } = await ownerSessionFilter(this.client, sessionId, owner);
    if (error || !data) return null;

    let session = mapSession(data as SessionRow);
    if (session.status === 'active' && isExpired(session, new Date().toISOString())) {
      await this.expireSession(sessionId);
      const { data: refreshed } = await ownerSessionFilter(this.client, sessionId, owner);
      if (!refreshed) return null;
      session = mapSession(refreshed as SessionRow);
    }
    return session;
  }

  async listCompletedSessionsForOwner(input: {
    owner: CreateRoleplaySessionInput['owner'];
    completedFrom: string;
    completedBefore: string;
  }): Promise<RoleplaySessionEntity[]> {
    let query = this.client
      .from('roleplay_sessions')
      .select('*')
      .eq('status', 'completed')
      .gte('completed_at', input.completedFrom)
      .lt('completed_at', input.completedBefore)
      .order('completed_at', { ascending: true });
    query = input.owner.kind === 'authenticated'
      ? query.eq('owner_kind', 'authenticated').eq('auth_user_id', input.owner.authUserId!)
      : query.eq('owner_kind', 'guest').eq('guest_owner_key', input.owner.guestOwnerKey!);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => mapSession(row as SessionRow));
  }

  async touchSessionExpiry(sessionId: string, expiresAt: string): Promise<void> {
    await this.client
      .from('roleplay_sessions')
      .update({ expires_at: expiresAt })
      .eq('id', sessionId);
  }

  async allocateNextSequenceNo(sessionId: string): Promise<number> {
    return allocateNextSequenceNo(this.client, sessionId);
  }

  async beginUserTurn(input: {
    sessionId: string;
    owner: CreateRoleplaySessionInput['owner'];
    clientTurnId: string;
    userText: string;
  }): Promise<BeginUserTurnResult | null> {
    const session = await this.getSessionForOwner(input.sessionId, input.owner);
    if (!session || session.status !== 'active') return null;

    const { data: existingRow, error: existingError } = await this.client
      .from('roleplay_exchanges')
      .select('*')
      .eq('session_id', session.id)
      .eq('client_turn_id', input.clientTurnId)
      .maybeSingle();

    if (existingError) {
      throw new Error(existingError.message);
    }

    if (existingRow) {
      return tryReclaimExistingExchange(
        this.client,
        mapExchange(existingRow as ExchangeRow),
        session,
      );
    }

    const sequenceNo = await allocateNextSequenceNo(this.client, session.id).catch((error) => {
      if (error instanceof RoleplaySequenceAllocationRejectedError) {
        return null;
      }
      throw error;
    });
    if (sequenceNo === null) return null;

    const now = newGenerationClaimIso();
    const { data: inserted, error: insertError } = await this.client
      .from('roleplay_exchanges')
      .insert({
        session_id: session.id,
        client_turn_id: input.clientTurnId,
        sequence_no: sequenceNo,
        user_text: input.userText,
        generation_status: 'pending',
        generation_claimed_at: now,
      })
      .select('*')
      .single();

    if (insertError?.code === '23505') {
      const { data: raced } = await this.client
        .from('roleplay_exchanges')
        .select('*')
        .eq('session_id', session.id)
        .eq('client_turn_id', input.clientTurnId)
        .single();
      if (!raced) return null;
      return tryReclaimExistingExchange(
        this.client,
        mapExchange(raced as ExchangeRow),
        session,
      );
    }

    if (insertError || !inserted) {
      throw new Error(insertError?.message ?? 'roleplay_exchange_create_failed');
    }

    return {
      kind: 'claim_generation',
      exchange: mapExchange(inserted as ExchangeRow),
      session,
    };
  }

  async completeExchange(input: {
    sessionId: string;
    exchangeId: string;
    assistantText: string;
  }): Promise<RoleplayExchangeEntity | null> {
    const { data, error } = await this.client
      .from('roleplay_exchanges')
      .update({
        assistant_text: input.assistantText,
        generation_status: 'completed',
      })
      .eq('id', input.exchangeId)
      .eq('session_id', input.sessionId)
      .select('*')
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data ? mapExchange(data as ExchangeRow) : null;
  }

  async failExchange(input: { sessionId: string; exchangeId: string }): Promise<void> {
    const { error } = await this.client
      .from('roleplay_exchanges')
      .update({
        generation_status: 'failed',
        assistant_text: null,
        generation_claimed_at: null,
      })
      .eq('id', input.exchangeId)
      .eq('session_id', input.sessionId);
    if (error) throw new Error(error.message);
  }

  async incrementUserTurnCount(sessionId: string): Promise<number> {
    const { data: current, error: readError } = await this.client
      .from('roleplay_sessions')
      .select('user_turn_count')
      .eq('id', sessionId)
      .single();
    if (readError || !current) return 0;

    const next = (current.user_turn_count as number) + 1;
    const { data, error } = await this.client
      .from('roleplay_sessions')
      .update({ user_turn_count: next })
      .eq('id', sessionId)
      .select('user_turn_count')
      .single();
    if (error) throw new Error(error.message);
    return (data?.user_turn_count as number) ?? next;
  }

  async getBoundedContext(sessionId: string, limit: number): Promise<RoleplayTurn[]> {
    const { data: sessionRow } = await this.client
      .from('roleplay_sessions')
      .select('opening_assistant_text')
      .eq('id', sessionId)
      .maybeSingle();
    if (!sessionRow) return [];

    const { data: rows, error } = await this.client
      .from('roleplay_exchanges')
      .select('*')
      .eq('session_id', sessionId)
      .eq('generation_status', 'completed')
      .order('sequence_no', { ascending: true });
    if (error) throw new Error(error.message);

    const exchanges = (rows ?? []).map((row) => mapExchange(row as ExchangeRow));
    const allTurns = exchangesToTurns(sessionRow.opening_assistant_text as string | null, exchanges);
    return allTurns.slice(-limit);
  }

  async freezeSession(input: {
    sessionId: string;
    status: 'completed' | 'abandoned';
    durationMs: number;
  }): Promise<RoleplaySessionEntity | null> {
    const completedAt = new Date().toISOString();
    const { data, error } = await this.client
      .from('roleplay_sessions')
      .update({ status: input.status, completed_at: completedAt, duration_ms: input.durationMs })
      .eq('id', input.sessionId)
      .eq('status', 'active')
      .select('*')
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (data) return mapSession(data as SessionRow);
    const { data: existing, error: readError } = await this.client
      .from('roleplay_sessions').select('*').eq('id', input.sessionId).maybeSingle();
    if (readError) throw new Error(readError.message);
    return existing ? mapSession(existing as SessionRow) : null;
  }

  async claimCoaching(sessionId: string) {
    const { data: existing, error: readError } = await this.client
      .from('roleplay_sessions').select('*').eq('id', sessionId).maybeSingle();
    if (readError) throw new Error(readError.message);
    if (!existing) return null;
    const session = mapSession(existing as SessionRow);
    if (session.status === 'active') return null;
    if (session.coachingStatus === 'completed') return { kind: 'completed' as const, session };

    const staleIso = new Date(Date.now() - 90_000).toISOString();
    const now = new Date().toISOString();
    let query = this.client
      .from('roleplay_sessions')
      .update({ coaching_status: 'pending', coaching_claimed_at: now })
      .eq('id', sessionId)
      .neq('coaching_status', 'completed');
    if (session.coachingStatus === 'pending') {
      query = query.lt('coaching_claimed_at', staleIso);
    } else {
      query = query.eq('coaching_status', session.coachingStatus);
    }
    const { data: claimed, error } = await query.select('*').maybeSingle();
    if (error) throw new Error(error.message);
    if (claimed) return { kind: 'claim' as const, session: mapSession(claimed as SessionRow) };
    const { data: latest } = await this.client
      .from('roleplay_sessions').select('*').eq('id', sessionId).maybeSingle();
    if (!latest) return null;
    const latestSession = mapSession(latest as SessionRow);
    return latestSession.coachingStatus === 'completed'
      ? { kind: 'completed' as const, session: latestSession }
      : { kind: 'in_flight' as const, session: latestSession };
  }

  async saveCoachingMetadata(input: {
    sessionId: string;
    outcome: import('../../types/roleplay.js').RoleplayCoachingOutcome;
    primaryTakeawayType: import('../../types/roleplay.js').RoleplayCoachingCategory;
    nextFocus: import('../../types/roleplay.js').RoleplayNextFocus;
    usedFallback: boolean;
  }): Promise<RoleplaySessionEntity | null> {
    const now = new Date().toISOString();
    const { data, error } = await this.client.from('roleplay_sessions').update({
      coaching_status: 'completed',
      coaching_claimed_at: null,
      coaching_completed_at: now,
      outcome: input.outcome,
      primary_takeaway_type: input.primaryTakeawayType,
      next_focus: input.nextFocus,
      coaching_used_fallback: input.usedFallback,
    }).eq('id', input.sessionId).select('*').maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapSession(data as SessionRow) : null;
  }

  async failCoaching(sessionId: string): Promise<void> {
    const { error } = await this.client.from('roleplay_sessions').update({
      coaching_status: 'failed', coaching_claimed_at: null,
    }).eq('id', sessionId).neq('coaching_status', 'completed');
    if (error) throw new Error(error.message);
  }

  async completeSession(input: {
    sessionId: string;
    status: 'completed' | 'abandoned';
    durationMs: number;
  }): Promise<RoleplaySessionEntity | null> {
    const completedAt = new Date().toISOString();
    const { data, error } = await this.client
      .from('roleplay_sessions')
      .update({
        status: input.status,
        completed_at: completedAt,
        duration_ms: input.durationMs,
      })
      .eq('id', input.sessionId)
      .select('*')
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return null;

    await this.purgeTransientTurns(input.sessionId);
    return mapSession(data as SessionRow);
  }

  async expireSession(sessionId: string): Promise<void> {
    const completedAt = new Date().toISOString();
    await this.client
      .from('roleplay_sessions')
      .update({
        status: 'expired',
        completed_at: completedAt,
      })
      .eq('id', sessionId)
      .eq('status', 'active');
    await this.purgeTransientTurns(sessionId);
  }

  async purgeTransientTurns(sessionId: string): Promise<void> {
    const { error: rpcError } = await this.client.rpc('roleplay_purge_transient_session_text', {
      p_session_id: sessionId,
    });
    if (rpcError) {
      if (rpcError.message.includes('ROLEPLAY_ACTIVE_SESSION_PURGE_REJECTED')) {
        throw new RoleplayPurgeRejectedError();
      }
      const { data: sessionRow } = await this.client
        .from('roleplay_sessions')
        .select('status')
        .eq('id', sessionId)
        .maybeSingle();
      if (sessionRow?.status === 'active') {
        throw new RoleplayPurgeRejectedError();
      }
      await this.client.from('roleplay_exchanges').delete().eq('session_id', sessionId);
      await this.client
        .from('roleplay_sessions')
        .update({ opening_assistant_text: null })
        .eq('id', sessionId);
    }
  }

  async expireStaleSessions(nowIso: string): Promise<number> {
    const { data, error } = await this.client
      .from('roleplay_sessions')
      .select('id')
      .eq('status', 'active')
      .lte('expires_at', nowIso)
      .limit(50);
    if (error) throw new Error(error.message);

    let count = 0;
    for (const row of data ?? []) {
      await this.expireSession(row.id as string);
      count += 1;
    }
    return count;
  }

  async purgeEndedSessionTexts(limit = 100): Promise<number> {
    const { data, error } = await this.client
      .from('roleplay_sessions')
      .select('id, opening_assistant_text')
      .neq('status', 'active')
      .or('status.in.(abandoned,expired),coaching_status.in.(completed,failed)')
      .not('opening_assistant_text', 'is', null)
      .limit(limit);
    if (error) throw new Error(error.message);

    let count = 0;
    for (const row of data ?? []) {
      await this.purgeTransientTurns(row.id as string);
      count += 1;
    }
    return count;
  }
}

let singleton: SupabaseRoleplaySessionRepository | null = null;

/**
 * Supabase-backed repository — activated when migration is applied and
 * ROLEPLAY_SESSION_STORE=supabase.
 */
export function getSupabaseRoleplaySessionRepository(): RoleplaySessionRepository | null {
  if (!isSupabaseAdminConfigured()) {
    return null;
  }
  const client = getSupabaseAdminClient();
  if (!client) return null;

  if (!singleton) {
    singleton = new SupabaseRoleplaySessionRepository(client);
  }
  return singleton;
}
