import type {
  RoleplayCoachingCategory,
  RoleplayCoachingOutcome,
  RoleplayNextFocus,
  RoleplayPersonalizationContext,
  RoleplaySessionStatus,
  RoleplayTurn,
} from '../../types/roleplay.js';
import type { RoleplayOwnerKind, RoleplayOwnerRef } from './roleplayOwnerKey.js';

export type RoleplayGenerationStatus = 'pending' | 'completed' | 'failed';
export type RoleplayCoachingStatus = 'not_started' | 'pending' | 'completed' | 'failed';

export class RoleplayPurgeRejectedError extends Error {
  constructor() {
    super('ACTIVE_SESSION_PURGE_REJECTED');
  }
}

export class RoleplaySequenceAllocationRejectedError extends Error {
  constructor() {
    super('ROLEPLAY_SEQUENCE_ALLOCATION_REJECTED');
  }
}

export interface RoleplaySessionEntity {
  id: string;
  ownerKind: RoleplayOwnerKind;
  authUserId: string | null;
  guestOwnerKey: string | null;
  scenarioId: string;
  status: RoleplaySessionStatus | 'expired';
  level: RoleplayPersonalizationContext['level'];
  userTurnCount: number;
  nextSequenceNo: number;
  openingAssistantText: string | null;
  startedAt: string;
  completedAt: string | null;
  expiresAt: string;
  durationMs: number | null;
  personalization: RoleplayPersonalizationContext;
  createdAt: string;
  updatedAt: string;
  coachingStatus: RoleplayCoachingStatus;
  coachingClaimedAt: string | null;
  coachingCompletedAt: string | null;
  coachingOutcome: RoleplayCoachingOutcome | null;
  primaryTakeawayType: RoleplayCoachingCategory | null;
  nextFocus: RoleplayNextFocus | null;
  coachingUsedFallback: boolean;
}

export type ClaimRoleplayCoachingResult =
  | { kind: 'claim'; session: RoleplaySessionEntity }
  | { kind: 'completed'; session: RoleplaySessionEntity }
  | { kind: 'in_flight'; session: RoleplaySessionEntity };

export interface RoleplayExchangeEntity {
  id: string;
  sessionId: string;
  clientTurnId: string;
  sequenceNo: number;
  userText: string;
  assistantText: string | null;
  generationStatus: RoleplayGenerationStatus;
  generationClaimedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type BeginUserTurnResult =
  | {
      kind: 'existing_completed';
      exchange: RoleplayExchangeEntity;
      session: RoleplaySessionEntity;
    }
  | {
      kind: 'claim_generation';
      exchange: RoleplayExchangeEntity;
      session: RoleplaySessionEntity;
    }
  | {
      kind: 'in_flight';
      exchange: RoleplayExchangeEntity;
      session: RoleplaySessionEntity;
    };

export interface CreateRoleplaySessionInput {
  owner: RoleplayOwnerRef;
  scenarioId: string;
  level: RoleplayPersonalizationContext['level'];
  personalization: RoleplayPersonalizationContext;
  openingAssistantText: string;
  expiresAt: string;
}

export interface RoleplaySessionRepository {
  createSession(input: CreateRoleplaySessionInput): Promise<RoleplaySessionEntity>;

  getSessionForOwner(
    sessionId: string,
    owner: RoleplayOwnerRef,
  ): Promise<RoleplaySessionEntity | null>;

  listCompletedSessionsForOwner(input: {
    owner: RoleplayOwnerRef;
    completedFrom: string;
    completedBefore: string;
  }): Promise<RoleplaySessionEntity[]>;

  touchSessionExpiry(sessionId: string, expiresAt: string): Promise<void>;

  allocateNextSequenceNo(sessionId: string): Promise<number>;

  beginUserTurn(input: {
    sessionId: string;
    owner: RoleplayOwnerRef;
    clientTurnId: string;
    userText: string;
  }): Promise<BeginUserTurnResult | null>;

  completeExchange(input: {
    sessionId: string;
    exchangeId: string;
    assistantText: string;
  }): Promise<RoleplayExchangeEntity | null>;

  failExchange(input: {
    sessionId: string;
    exchangeId: string;
  }): Promise<void>;

  incrementUserTurnCount(sessionId: string): Promise<number>;

  getBoundedContext(sessionId: string, limit: number): Promise<RoleplayTurn[]>;

  /** Ends turn acceptance without deleting the transcript needed for coaching. */
  freezeSession(input: {
    sessionId: string;
    status: Extract<RoleplaySessionStatus, 'completed' | 'abandoned'>;
    durationMs: number;
  }): Promise<RoleplaySessionEntity | null>;

  claimCoaching(sessionId: string): Promise<ClaimRoleplayCoachingResult | null>;

  saveCoachingMetadata(input: {
    sessionId: string;
    outcome: RoleplayCoachingOutcome;
    primaryTakeawayType: RoleplayCoachingCategory;
    nextFocus: RoleplayNextFocus;
    usedFallback: boolean;
  }): Promise<RoleplaySessionEntity | null>;

  failCoaching(sessionId: string): Promise<void>;

  completeSession(input: {
    sessionId: string;
    status: Extract<RoleplaySessionStatus, 'completed' | 'abandoned'>;
    durationMs: number;
  }): Promise<RoleplaySessionEntity | null>;

  expireSession(sessionId: string): Promise<void>;

  purgeTransientTurns(sessionId: string): Promise<void>;

  expireStaleSessions(nowIso: string): Promise<number>;

  purgeEndedSessionTexts(limit?: number): Promise<number>;

  resetForTests?(): void;
}

export function exchangesToTurns(
  openingText: string | null,
  exchanges: RoleplayExchangeEntity[],
): RoleplayTurn[] {
  const turns: RoleplayTurn[] = [];
  if (openingText) {
    turns.push({
      id: 'opening',
      role: 'assistant',
      text: openingText,
      createdAt: exchanges[0]?.createdAt ?? new Date().toISOString(),
    });
  }
  for (const exchange of exchanges) {
    turns.push({
      id: exchange.id,
      role: 'user',
      text: exchange.userText,
      createdAt: exchange.createdAt,
      clientTurnId: exchange.clientTurnId,
    });
    if (exchange.assistantText) {
      turns.push({
        id: `${exchange.id}:assistant`,
        role: 'assistant',
        text: exchange.assistantText,
        createdAt: exchange.updatedAt,
      });
    }
  }
  return turns;
}
