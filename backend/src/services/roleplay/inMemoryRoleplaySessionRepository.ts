import { randomUUID } from 'node:crypto';
import type {
  BeginUserTurnResult,
  CreateRoleplaySessionInput,
  RoleplayExchangeEntity,
  RoleplaySessionEntity,
  RoleplaySessionRepository,
} from './roleplaySessionRepository.js';
import { RoleplayPurgeRejectedError, RoleplaySequenceAllocationRejectedError } from './roleplaySessionRepository.js';
import { ownerRefMatchesSession } from './roleplayOwnerKey.js';
import { exchangesToTurns } from './roleplaySessionRepository.js';
import type { RoleplayTurn } from '../../types/roleplay.js';
import { toPersistedPersonalization } from './roleplayPersonalizationPersistence.js';
import {
  classifyExistingExchange,
  isGenerationLeaseStale,
  newGenerationClaimIso,
} from './roleplayGenerationLease.js';
import { ROLEPLAY_COACHING_LEASE_MS } from '../../config/roleplayConfig.js';

const sessions = new Map<string, RoleplaySessionEntity>();
const exchangesBySession = new Map<string, Map<string, RoleplayExchangeEntity>>();
const sessionLocks = new Map<string, Promise<void>>();

function getSessionIfOwned(
  sessionId: string,
  owner: CreateRoleplaySessionInput['owner'],
): RoleplaySessionEntity | null {
  const session = sessions.get(sessionId);
  if (!session) return null;
  if (!ownerRefMatchesSession(owner, session)) return null;
  return session;
}

function isExpired(session: RoleplaySessionEntity, nowIso: string): boolean {
  return Date.parse(session.expiresAt) <= Date.parse(nowIso);
}

async function withSessionLock<T>(sessionId: string, fn: () => Promise<T> | T): Promise<T> {
  const previous = sessionLocks.get(sessionId) ?? Promise.resolve();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  sessionLocks.set(sessionId, previous.then(() => gate));
  await previous;
  try {
    return await fn();
  } finally {
    release();
    if (sessionLocks.get(sessionId) === gate) {
      sessionLocks.delete(sessionId);
    }
  }
}

function allocateNextSequenceNoLocked(session: RoleplaySessionEntity): number {
  if (session.status !== 'active') {
    throw new RoleplaySequenceAllocationRejectedError();
  }
  if (Date.parse(session.expiresAt) <= Date.now()) {
    throw new RoleplaySequenceAllocationRejectedError();
  }
  const allocated = session.nextSequenceNo;
  session.nextSequenceNo += 1;
  session.updatedAt = new Date().toISOString();
  return allocated;
}

function reclaimFailedExchange(
  existing: RoleplayExchangeEntity,
): RoleplayExchangeEntity | null {
  if (existing.generationStatus !== 'failed') return null;
  existing.generationStatus = 'pending';
  existing.assistantText = null;
  existing.generationClaimedAt = newGenerationClaimIso();
  existing.updatedAt = newGenerationClaimIso();
  return existing;
}

function reclaimStalePendingExchange(
  existing: RoleplayExchangeEntity,
  nowMs = Date.now(),
): RoleplayExchangeEntity | null {
  if (existing.generationStatus !== 'pending') return null;
  if (!isGenerationLeaseStale(existing.generationClaimedAt, nowMs)) return null;
  existing.generationClaimedAt = newGenerationClaimIso(nowMs);
  existing.updatedAt = newGenerationClaimIso(nowMs);
  return existing;
}

export class InMemoryRoleplaySessionRepository implements RoleplaySessionRepository {
  async createSession(input: CreateRoleplaySessionInput): Promise<RoleplaySessionEntity> {
    const now = new Date().toISOString();
    const session: RoleplaySessionEntity = {
      id: randomUUID(),
      ownerKind: input.owner.kind,
      authUserId: input.owner.authUserId,
      guestOwnerKey: input.owner.guestOwnerKey,
      scenarioId: input.scenarioId,
      status: 'active',
      level: input.level,
      userTurnCount: 0,
      nextSequenceNo: 1,
      openingAssistantText: input.openingAssistantText,
      startedAt: now,
      completedAt: null,
      expiresAt: input.expiresAt,
      durationMs: null,
      personalization: toPersistedPersonalization(input.personalization),
      createdAt: now,
      updatedAt: now,
      coachingStatus: 'not_started',
      coachingClaimedAt: null,
      coachingCompletedAt: null,
      coachingOutcome: null,
      primaryTakeawayType: null,
      nextFocus: null,
      coachingUsedFallback: false,
    };
    sessions.set(session.id, session);
    exchangesBySession.set(session.id, new Map());
    return session;
  }

  async getSessionForOwner(
    sessionId: string,
    owner: CreateRoleplaySessionInput['owner'],
  ): Promise<RoleplaySessionEntity | null> {
    const session = getSessionIfOwned(sessionId, owner);
    if (!session) return null;
    if (session.status === 'active' && isExpired(session, new Date().toISOString())) {
      session.status = 'expired';
      session.updatedAt = new Date().toISOString();
      await this.purgeTransientTurns(sessionId);
      return session;
    }
    return session;
  }

  async listCompletedSessionsForOwner(input: {
    owner: CreateRoleplaySessionInput['owner'];
    completedFrom: string;
    completedBefore: string;
  }): Promise<RoleplaySessionEntity[]> {
    const from = Date.parse(input.completedFrom);
    const before = Date.parse(input.completedBefore);
    return Array.from(sessions.values())
      .filter((session) => {
        if (!ownerRefMatchesSession(input.owner, session) || session.status !== 'completed' || !session.completedAt) return false;
        const at = Date.parse(session.completedAt);
        return Number.isFinite(at) && at >= from && at < before;
      })
      .sort((a, b) => Date.parse(a.completedAt!) - Date.parse(b.completedAt!));
  }

  async touchSessionExpiry(sessionId: string, expiresAt: string): Promise<void> {
    const session = sessions.get(sessionId);
    if (!session) return;
    session.expiresAt = expiresAt;
    session.updatedAt = new Date().toISOString();
  }

  async allocateNextSequenceNo(sessionId: string): Promise<number> {
    return withSessionLock(sessionId, () => {
      const session = sessions.get(sessionId);
      if (!session) {
        throw new RoleplaySequenceAllocationRejectedError();
      }
      return allocateNextSequenceNoLocked(session);
    });
  }

  async beginUserTurn(input: {
    sessionId: string;
    owner: CreateRoleplaySessionInput['owner'];
    clientTurnId: string;
    userText: string;
  }): Promise<BeginUserTurnResult | null> {
    return withSessionLock(input.sessionId, async () => {
      const session = await this.getSessionForOwner(input.sessionId, input.owner);
      if (!session || session.status !== 'active') return null;

      const map = exchangesBySession.get(session.id) ?? new Map();
      const existing = map.get(input.clientTurnId);

      if (existing) {
        const classified = classifyExistingExchange(existing, session);
        if (classified.kind === 'existing_completed') {
          return classified;
        }
        if (classified.kind === 'in_flight') {
          return classified;
        }

        const reclaimedFailed = reclaimFailedExchange(existing);
        if (reclaimedFailed) {
          return { kind: 'claim_generation', exchange: reclaimedFailed, session };
        }

        const reclaimedStale = reclaimStalePendingExchange(existing);
        if (reclaimedStale) {
          return { kind: 'claim_generation', exchange: reclaimedStale, session };
        }

        return { kind: 'in_flight', exchange: existing, session };
      }

      const now = newGenerationClaimIso();
      let sequenceNo: number;
      try {
        sequenceNo = allocateNextSequenceNoLocked(session);
      } catch (error) {
        if (error instanceof RoleplaySequenceAllocationRejectedError) {
          return null;
        }
        throw error;
      }
      const created: RoleplayExchangeEntity = {
        id: randomUUID(),
        sessionId: session.id,
        clientTurnId: input.clientTurnId,
        sequenceNo,
        userText: input.userText,
        assistantText: null,
        generationStatus: 'pending',
        generationClaimedAt: now,
        createdAt: now,
        updatedAt: now,
      };
      map.set(input.clientTurnId, created);
      exchangesBySession.set(session.id, map);
      return { kind: 'claim_generation', exchange: created, session };
    });
  }

  async completeExchange(input: {
    sessionId: string;
    exchangeId: string;
    assistantText: string;
  }): Promise<RoleplayExchangeEntity | null> {
    const map = exchangesBySession.get(input.sessionId);
    if (!map) return null;
    for (const exchange of map.values()) {
      if (exchange.id === input.exchangeId) {
        exchange.assistantText = input.assistantText;
        exchange.generationStatus = 'completed';
        exchange.updatedAt = new Date().toISOString();
        return exchange;
      }
    }
    return null;
  }

  async failExchange(input: { sessionId: string; exchangeId: string }): Promise<void> {
    const map = exchangesBySession.get(input.sessionId);
    if (!map) return;
    for (const exchange of map.values()) {
      if (exchange.id === input.exchangeId) {
        exchange.generationStatus = 'failed';
        exchange.assistantText = null;
        exchange.generationClaimedAt = null;
        exchange.updatedAt = new Date().toISOString();
        return;
      }
    }
  }

  async incrementUserTurnCount(sessionId: string): Promise<number> {
    const session = sessions.get(sessionId);
    if (!session) return 0;
    session.userTurnCount += 1;
    session.updatedAt = new Date().toISOString();
    return session.userTurnCount;
  }

  async getBoundedContext(sessionId: string, limit: number): Promise<RoleplayTurn[]> {
    const session = sessions.get(sessionId);
    if (!session) return [];
    const map = exchangesBySession.get(sessionId);
    const completed = map
      ? Array.from(map.values())
          .filter((e) => e.generationStatus === 'completed')
          .sort((a, b) => a.sequenceNo - b.sequenceNo)
      : [];
    const allTurns = exchangesToTurns(session.openingAssistantText, completed);
    return allTurns.slice(-limit);
  }

  async freezeSession(input: {
    sessionId: string;
    status: 'completed' | 'abandoned';
    durationMs: number;
  }): Promise<RoleplaySessionEntity | null> {
    return withSessionLock(input.sessionId, () => {
      const session = sessions.get(input.sessionId);
      if (!session) return null;
      if (session.status === 'active') {
        session.status = input.status;
        session.completedAt = new Date().toISOString();
        session.durationMs = input.durationMs;
        session.updatedAt = session.completedAt;
      }
      return session;
    });
  }

  async claimCoaching(sessionId: string) {
    return withSessionLock(sessionId, () => {
      const session = sessions.get(sessionId);
      if (!session || session.status === 'active') return null;
      if (session.coachingStatus === 'completed') return { kind: 'completed' as const, session };
      const claimedAt = session.coachingClaimedAt ? Date.parse(session.coachingClaimedAt) : 0;
      if (
        session.coachingStatus === 'pending' &&
        claimedAt > Date.now() - ROLEPLAY_COACHING_LEASE_MS
      ) {
        return { kind: 'in_flight' as const, session };
      }
      session.coachingStatus = 'pending';
      session.coachingClaimedAt = new Date().toISOString();
      session.updatedAt = session.coachingClaimedAt;
      return { kind: 'claim' as const, session };
    });
  }

  async saveCoachingMetadata(input: {
    sessionId: string;
    outcome: import('../../types/roleplay.js').RoleplayCoachingOutcome;
    primaryTakeawayType: import('../../types/roleplay.js').RoleplayCoachingCategory;
    nextFocus: import('../../types/roleplay.js').RoleplayNextFocus;
    usedFallback: boolean;
  }): Promise<RoleplaySessionEntity | null> {
    return withSessionLock(input.sessionId, () => {
      const session = sessions.get(input.sessionId);
      if (!session) return null;
      const now = new Date().toISOString();
      session.coachingStatus = 'completed';
      session.coachingClaimedAt = null;
      session.coachingCompletedAt = now;
      session.coachingOutcome = input.outcome;
      session.primaryTakeawayType = input.primaryTakeawayType;
      session.nextFocus = input.nextFocus;
      session.coachingUsedFallback = input.usedFallback;
      session.updatedAt = now;
      return session;
    });
  }

  async failCoaching(sessionId: string): Promise<void> {
    const session = sessions.get(sessionId);
    if (!session || session.coachingStatus === 'completed') return;
    session.coachingStatus = 'failed';
    session.coachingClaimedAt = null;
    session.updatedAt = new Date().toISOString();
  }

  async completeSession(input: {
    sessionId: string;
    status: 'completed' | 'abandoned';
    durationMs: number;
  }): Promise<RoleplaySessionEntity | null> {
    const session = sessions.get(input.sessionId);
    if (!session) return null;
    session.status = input.status;
    session.completedAt = new Date().toISOString();
    session.durationMs = input.durationMs;
    session.updatedAt = session.completedAt;
    await this.purgeTransientTurns(input.sessionId);
    return session;
  }

  async expireSession(sessionId: string): Promise<void> {
    const session = sessions.get(sessionId);
    if (!session) return;
    session.status = 'expired';
    session.completedAt = new Date().toISOString();
    session.updatedAt = session.completedAt;
    await this.purgeTransientTurns(sessionId);
  }

  async purgeTransientTurns(sessionId: string): Promise<void> {
    const session = sessions.get(sessionId);
    if (!session) return;
    if (session.status === 'active') {
      throw new RoleplayPurgeRejectedError();
    }
    session.openingAssistantText = null;
    session.updatedAt = new Date().toISOString();
    exchangesBySession.delete(sessionId);
  }

  async expireStaleSessions(nowIso: string): Promise<number> {
    let count = 0;
    for (const session of sessions.values()) {
      if (session.status === 'active' && isExpired(session, nowIso)) {
        await this.expireSession(session.id);
        count += 1;
      }
    }
    return count;
  }

  async purgeEndedSessionTexts(limit = 100): Promise<number> {
    let count = 0;
    for (const session of sessions.values()) {
      if (count >= limit) break;
      if (
        session.status === 'abandoned' ||
        session.status === 'expired' ||
        session.coachingStatus === 'completed' ||
        session.coachingStatus === 'failed'
      ) {
        const hadText =
          session.openingAssistantText !== null ||
          (exchangesBySession.get(session.id)?.size ?? 0) > 0;
        if (hadText) {
          await this.purgeTransientTurns(session.id);
          count += 1;
        }
      }
    }
    return count;
  }

  /** Test helper — force a duplicate sequence_no insert attempt. */
  insertExchangeForTests(
    sessionId: string,
    exchange: Omit<RoleplayExchangeEntity, 'sessionId'>,
  ): void {
    const map = exchangesBySession.get(sessionId) ?? new Map();
    const existing = map.get(exchange.clientTurnId);
    if (existing) {
      throw new Error('duplicate_client_turn_id');
    }
    for (const row of map.values()) {
      if (row.sequenceNo === exchange.sequenceNo) {
        throw new Error('duplicate_sequence_no');
      }
    }
    map.set(exchange.clientTurnId, { ...exchange, sessionId });
    exchangesBySession.set(sessionId, map);
  }

  /** Test helper — simulate a process crash leaving a pending row. */
  setExchangeClaimedAtForTests(sessionId: string, clientTurnId: string, claimedAt: string): void {
    const map = exchangesBySession.get(sessionId);
    const exchange = map?.get(clientTurnId);
    if (!exchange) return;
    exchange.generationClaimedAt = claimedAt;
  }

  resetForTests(): void {
    sessions.clear();
    exchangesBySession.clear();
    sessionLocks.clear();
  }
}

let singleton: InMemoryRoleplaySessionRepository | null = null;

export function getInMemoryRoleplaySessionRepository(): InMemoryRoleplaySessionRepository {
  if (!singleton) {
    singleton = new InMemoryRoleplaySessionRepository();
  }
  return singleton;
}

export function resetInMemoryRoleplaySessionRepositoryForTests(): void {
  singleton?.resetForTests();
  singleton = null;
}
