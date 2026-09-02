import { randomUUID } from 'node:crypto';
import type { AnalysisRequestIdentity } from '../../middleware/analysisRequestIdentity.js';
import type {
  RoleplayCompleteSuccess,
  RoleplayCoachingResult,
  RoleplayRespondSuccess,
  RoleplaySessionStartSuccess,
  RoleplayTurn,
} from '../../types/roleplay.js';
import {
  ROLEPLAY_CONTEXT_TURN_LIMIT,
  ROLEPLAY_MAX_USER_TEXT_LENGTH,
  ROLEPLAY_MAX_USER_TURNS,
  ROLEPLAY_SESSION_TTL_MS,
} from '../../config/roleplayConfig.js';
import { resolveRoleplayAccess, sanitizeRoleplayPersonalization } from './roleplayAccessService.js';
import { generateOpeningTurn, generateRoleplayResponse } from './roleplayAiService.js';
import { getRoleplayScenarioById } from './roleplayScenarioCatalog.js';
import {
  isPromptInjectionAttempt,
  sanitizeUserTurnText,
} from './roleplayPromptService.js';
import { resolveRoleplayOwnerRef } from './roleplayOwnerKey.js';
import { toPersistedPersonalization } from './roleplayPersonalizationPersistence.js';
import { runRoleplayCleanupOpportunistic } from './roleplayCleanupService.js';
import {
  getRoleplaySessionRepository,
  resetRoleplaySessionRepositoryForTests,
} from './roleplaySessionRepositoryFactory.js';
import type { RoleplayExchangeEntity, RoleplaySessionEntity } from './roleplaySessionRepository.js';
import {
  buildDeterministicRoleplayCoachingFallback,
  generateRoleplayCoaching,
} from './roleplayCoachingService.js';

const coachingInFlight = new Map<string, Promise<RoleplayCompleteSuccess>>();

function assertActiveSession(session: RoleplaySessionEntity): void {
  if (session.status === 'expired') {
    throw new RoleplayServiceError('ROLEPLAY_SESSION_EXPIRED');
  }
  if (session.status !== 'active') {
    throw new RoleplayServiceError('ROLEPLAY_SESSION_ENDED');
  }
  if (Date.parse(session.expiresAt) <= Date.now()) {
    throw new RoleplayServiceError('ROLEPLAY_SESSION_EXPIRED');
  }
}

export type RoleplayServiceErrorCode =
  | 'ROLEPLAY_SESSION_NOT_FOUND'
  | 'ROLEPLAY_SESSION_EXPIRED'
  | 'ROLEPLAY_INVALID_TURN'
  | 'ROLEPLAY_AI_UNAVAILABLE'
  | 'ROLEPLAY_ACCESS_DENIED'
  | 'ROLEPLAY_SESSION_ENDED'
  | 'ROLEPLAY_TEXT_TOO_LONG'
  | 'ROLEPLAY_MAX_TURNS_REACHED';

export class RoleplayServiceError extends Error {
  constructor(public readonly code: RoleplayServiceErrorCode) {
    super(code);
  }
}

function exchangeToApiTurns(exchange: RoleplayExchangeEntity): {
  userTurn: RoleplayTurn;
  assistantTurn: RoleplayTurn;
} {
  return {
    userTurn: {
      id: exchange.id,
      role: 'user',
      text: exchange.userText,
      createdAt: exchange.createdAt,
      clientTurnId: exchange.clientTurnId,
    },
    assistantTurn: {
      id: `${exchange.id}:assistant`,
      role: 'assistant',
      text: exchange.assistantText ?? '',
      createdAt: exchange.updatedAt,
    },
  };
}

export async function startRoleplaySession(input: {
  identity: AnalysisRequestIdentity;
  scenarioId: string;
  personalization?: Parameters<typeof sanitizeRoleplayPersonalization>[0];
  isPremium?: boolean;
}): Promise<RoleplaySessionStartSuccess> {
  await runRoleplayCleanupOpportunistic();

  const scenario = getRoleplayScenarioById(input.scenarioId);
  if (!scenario) {
    throw new RoleplayServiceError('ROLEPLAY_INVALID_TURN');
  }

  const access = resolveRoleplayAccess({
    identity: input.identity,
    isPremium: input.isPremium,
    scenarioPremium: scenario.premium,
  });
  if (!access.allowed) {
    throw new RoleplayServiceError('ROLEPLAY_ACCESS_DENIED');
  }

  const owner = resolveRoleplayOwnerRef(input.identity);
  if (!owner) {
    throw new RoleplayServiceError('ROLEPLAY_ACCESS_DENIED');
  }

  const personalization = toPersistedPersonalization(
    sanitizeRoleplayPersonalization(input.personalization),
  );
  const opening = generateOpeningTurn(scenario.id);
  const openingTurn: RoleplayTurn = {
    id: randomUUID(),
    role: 'assistant',
    text: opening.reply,
    createdAt: new Date().toISOString(),
  };

  const repo = getRoleplaySessionRepository();
  const expiresAt = new Date(Date.now() + ROLEPLAY_SESSION_TTL_MS).toISOString();
  const session = await repo.createSession({
    owner,
    scenarioId: scenario.id,
    level: personalization.level,
    personalization,
    openingAssistantText: openingTurn.text,
    expiresAt,
  });

  return {
    ok: true,
    sessionId: session.id,
    scenarioId: session.scenarioId,
    status: 'active',
    openingTurn,
    turnCount: 0,
    maxTurns: ROLEPLAY_MAX_USER_TURNS,
  };
}

export async function respondRoleplayTurn(input: {
  identity: AnalysisRequestIdentity;
  sessionId: string;
  userText: string;
  clientTurnId: string;
}): Promise<RoleplayRespondSuccess> {
  await runRoleplayCleanupOpportunistic();

  const owner = resolveRoleplayOwnerRef(input.identity);
  if (!owner) {
    throw new RoleplayServiceError('ROLEPLAY_ACCESS_DENIED');
  }

  const repo = getRoleplaySessionRepository();
  const session = await repo.getSessionForOwner(input.sessionId, owner);
  if (!session) {
    throw new RoleplayServiceError('ROLEPLAY_SESSION_NOT_FOUND');
  }

  try {
    assertActiveSession(session);
  } catch (error) {
    if (error instanceof RoleplayServiceError) throw error;
    throw error;
  }

  const clientTurnId = input.clientTurnId.trim();
  if (!clientTurnId) {
    throw new RoleplayServiceError('ROLEPLAY_INVALID_TURN');
  }

  if (session.userTurnCount >= ROLEPLAY_MAX_USER_TURNS) {
    throw new RoleplayServiceError('ROLEPLAY_MAX_TURNS_REACHED');
  }

  const userText = sanitizeUserTurnText(input.userText);
  if (!userText) {
    throw new RoleplayServiceError('ROLEPLAY_INVALID_TURN');
  }
  if (userText.length > ROLEPLAY_MAX_USER_TEXT_LENGTH) {
    throw new RoleplayServiceError('ROLEPLAY_TEXT_TOO_LONG');
  }

  if (isPromptInjectionAttempt(userText)) {
    // remain in-character user content
  }

  const begin = await repo.beginUserTurn({
    sessionId: session.id,
    owner,
    clientTurnId,
    userText,
  });
  if (!begin) {
    throw new RoleplayServiceError('ROLEPLAY_SESSION_NOT_FOUND');
  }

  if (begin.kind === 'existing_completed' && begin.exchange.assistantText) {
    const turns = exchangeToApiTurns(begin.exchange);
    return {
      ok: true,
      sessionId: session.id,
      status: begin.session.status === 'active' ? 'active' : begin.session.status,
      userTurn: turns.userTurn,
      assistantTurn: turns.assistantTurn,
      turnCount: begin.session.userTurnCount,
      shouldEndSession: false,
      maxTurns: ROLEPLAY_MAX_USER_TURNS,
    };
  }

  if (begin.kind === 'in_flight') {
    throw new RoleplayServiceError('ROLEPLAY_AI_UNAVAILABLE');
  }

  const scenario = getRoleplayScenarioById(begin.session.scenarioId);
  if (!scenario) {
    throw new RoleplayServiceError('ROLEPLAY_SESSION_NOT_FOUND');
  }

  const priorTurns = await repo.getBoundedContext(session.id, ROLEPLAY_CONTEXT_TURN_LIMIT);

  const ai = await generateRoleplayResponse({
    scenario,
    personalization: begin.session.personalization,
    priorTurns,
    userText,
  });

  if (!ai.ok) {
    await repo.failExchange({ sessionId: session.id, exchangeId: begin.exchange.id });
    throw new RoleplayServiceError('ROLEPLAY_AI_UNAVAILABLE');
  }

  const completed = await repo.completeExchange({
    sessionId: session.id,
    exchangeId: begin.exchange.id,
    assistantText: ai.response.reply,
  });
  if (!completed) {
    throw new RoleplayServiceError('ROLEPLAY_AI_UNAVAILABLE');
  }

  const turnCount = await repo.incrementUserTurnCount(session.id);
  const newExpiresAt = new Date(Date.now() + ROLEPLAY_SESSION_TTL_MS).toISOString();
  await repo.touchSessionExpiry(session.id, newExpiresAt);

  const shouldEndSession =
    ai.response.shouldEndSession || turnCount >= ROLEPLAY_MAX_USER_TURNS;

  let status: 'active' | 'completed' = 'active';
  if (shouldEndSession) {
    const durationMs = Math.max(0, Date.now() - Date.parse(begin.session.startedAt));
    const ended = await repo.freezeSession({
      sessionId: session.id,
      status: 'completed',
      durationMs,
    });
    status = ended?.status === 'completed' ? 'completed' : 'active';
  }

  const turns = exchangeToApiTurns(completed);
  return {
    ok: true,
    sessionId: session.id,
    status,
    userTurn: turns.userTurn,
    assistantTurn: turns.assistantTurn,
    turnCount,
    shouldEndSession,
    maxTurns: ROLEPLAY_MAX_USER_TURNS,
  };
}

export async function completeRoleplaySessionById(input: {
  identity: AnalysisRequestIdentity;
  sessionId: string;
  abandoned?: boolean;
  uiLanguage?: 'en' | 'tr';
}): Promise<RoleplayCompleteSuccess> {
  await runRoleplayCleanupOpportunistic();

  const owner = resolveRoleplayOwnerRef(input.identity);
  if (!owner) {
    throw new RoleplayServiceError('ROLEPLAY_ACCESS_DENIED');
  }

  const repo = getRoleplaySessionRepository();
  const session = await repo.getSessionForOwner(input.sessionId, owner);
  if (!session) {
    throw new RoleplayServiceError('ROLEPLAY_SESSION_NOT_FOUND');
  }

  const completedAt = session.completedAt ?? new Date().toISOString();
  const durationMs = session.durationMs ?? Math.max(0, Date.parse(completedAt) - Date.parse(session.startedAt));

  const ended = await repo.freezeSession({
    sessionId: session.id,
    status: input.abandoned ? 'abandoned' : 'completed',
    durationMs,
  });
  if (!ended) {
    throw new RoleplayServiceError('ROLEPLAY_SESSION_NOT_FOUND');
  }

  const language = input.uiLanguage === 'tr' ? 'tr' : 'en';
  const existingInFlight = coachingInFlight.get(ended.id);
  if (existingInFlight) return existingInFlight;

  const buildResponse = (coaching: RoleplayCoachingResult): RoleplayCompleteSuccess => ({
    ok: true,
    sessionId: ended.id,
    status: ended.status === 'expired' ? 'abandoned' : ended.status,
    scenarioId: ended.scenarioId,
    turnCount: ended.userTurnCount,
    durationMs: ended.durationMs ?? durationMs,
    completedAt: ended.completedAt ?? completedAt,
    coaching,
  });

  const recoverDurable = (stored: RoleplaySessionEntity): RoleplayCoachingResult => {
    const fallback = buildDeterministicRoleplayCoachingFallback({
      userTurnCount: stored.userTurnCount,
      uiLanguage: language,
      preferredNextFocus: stored.nextFocus ?? 'scenario_practice',
    });
    return {
      ...fallback,
      outcome: stored.coachingOutcome ?? fallback.outcome,
      primaryTakeaway: {
        ...fallback.primaryTakeaway,
        type: stored.primaryTakeawayType ?? fallback.primaryTakeaway.type,
      },
      nextFocus: stored.nextFocus ?? fallback.nextFocus,
      usedFallback: stored.coachingUsedFallback,
    };
  };

  const claim = await repo.claimCoaching(ended.id);
  if (!claim) throw new RoleplayServiceError('ROLEPLAY_SESSION_NOT_FOUND');
  if (claim.kind === 'completed') {
    // A previous response may have been lost after metadata was committed but
    // before the purge completed. Retrying completion also repairs that state.
    await repo.purgeTransientTurns(ended.id).catch(() => undefined);
    return buildResponse(recoverDurable(claim.session));
  }
  if (claim.kind === 'in_flight') {
    const shared = coachingInFlight.get(ended.id);
    if (shared) return shared;
    throw new RoleplayServiceError('ROLEPLAY_AI_UNAVAILABLE');
  }

  const work = (async (): Promise<RoleplayCompleteSuccess> => {
    const turns = await repo.getBoundedContext(ended.id, ROLEPLAY_CONTEXT_TURN_LIMIT);
    const scenario = getRoleplayScenarioById(ended.scenarioId);
    if (!scenario) {
      const fallback = buildDeterministicRoleplayCoachingFallback({
        userTurnCount: ended.userTurnCount,
        uiLanguage: language,
      });
      await repo.saveCoachingMetadata({
        sessionId: ended.id,
        outcome: fallback.outcome,
        primaryTakeawayType: fallback.primaryTakeaway.type,
        nextFocus: fallback.nextFocus,
        usedFallback: true,
      });
      await repo.purgeTransientTurns(ended.id);
      return buildResponse(fallback);
    }

    const generation = input.abandoned || ended.userTurnCount === 0
      ? {
          result: buildDeterministicRoleplayCoachingFallback({
            userTurnCount: ended.userTurnCount,
            uiLanguage: language,
          }),
          aiSucceeded: false,
        }
      : await generateRoleplayCoaching({
          scenario,
          turns,
          level: ended.level,
          goal: ended.personalization.goal,
          focusAreas: ended.personalization.focusAreas,
          uiLanguage: language,
          hasPronunciationEvidence: false,
          hasTimingEvidence: false,
        });

    await repo.saveCoachingMetadata({
      sessionId: ended.id,
      outcome: generation.result.outcome,
      primaryTakeawayType: generation.result.primaryTakeaway.type,
      nextFocus: generation.result.nextFocus,
      usedFallback: generation.result.usedFallback,
    });
    await repo.purgeTransientTurns(ended.id);
    console.log('[Voira Roleplay]', JSON.stringify({
      event: generation.aiSucceeded ? 'roleplay_coaching_generated' : 'roleplay_coaching_failed',
      sessionId: ended.id,
      scenarioId: ended.scenarioId,
      outcome: generation.result.outcome,
      coachingSuccess: generation.aiSucceeded,
    }));
    return buildResponse(generation.result);
  })().catch(async (error) => {
    await repo.failCoaching(ended.id).catch(() => undefined);
    await repo.purgeTransientTurns(ended.id).catch(() => undefined);
    throw error;
  }).finally(() => {
    coachingInFlight.delete(ended.id);
  });

  coachingInFlight.set(ended.id, work);
  return work;
}

export async function listCompletedRoleplayActivity(input: {
  identity: AnalysisRequestIdentity;
  completedFrom: string;
  completedBefore: string;
}) {
  const from = Date.parse(input.completedFrom);
  const before = Date.parse(input.completedBefore);
  if (!Number.isFinite(from) || !Number.isFinite(before) || before <= from || before - from > 15 * 24 * 60 * 60 * 1000) {
    throw new RoleplayServiceError('ROLEPLAY_INVALID_TURN');
  }
  const owner = resolveRoleplayOwnerRef(input.identity);
  if (!owner) throw new RoleplayServiceError('ROLEPLAY_ACCESS_DENIED');
  const sessions = await getRoleplaySessionRepository().listCompletedSessionsForOwner({
    owner,
    completedFrom: new Date(from).toISOString(),
    completedBefore: new Date(before).toISOString(),
  });
  return sessions.map((session) => ({
    sessionId: session.id,
    scenarioId: session.scenarioId,
    completedAt: session.completedAt!,
  }));
}

export { resetRoleplaySessionRepositoryForTests as resetRoleplaySessionStoreForTests };
