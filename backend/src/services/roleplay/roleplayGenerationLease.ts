import { ROLEPLAY_GENERATION_LEASE_MS } from '../../config/roleplayConfig.js';
import type { BeginUserTurnResult, RoleplayExchangeEntity, RoleplaySessionEntity } from './roleplaySessionRepository.js';

export function generationLeaseCutoffIso(nowMs = Date.now()): string {
  return new Date(nowMs - ROLEPLAY_GENERATION_LEASE_MS).toISOString();
}

export function isGenerationLeaseStale(
  generationClaimedAt: string | null,
  nowMs = Date.now(),
): boolean {
  if (!generationClaimedAt) return true;
  return Date.parse(generationClaimedAt) + ROLEPLAY_GENERATION_LEASE_MS <= nowMs;
}

export function newGenerationClaimIso(nowMs = Date.now()): string {
  return new Date(nowMs).toISOString();
}

/** Classify an existing exchange before any atomic reclaim attempt. */
export function classifyExistingExchange(
  exchange: RoleplayExchangeEntity,
  session: RoleplaySessionEntity,
  nowMs = Date.now(),
): BeginUserTurnResult {
  if (exchange.generationStatus === 'completed' && exchange.assistantText) {
    return { kind: 'existing_completed', exchange, session };
  }
  if (exchange.generationStatus === 'failed') {
    return { kind: 'claim_generation', exchange, session };
  }
  if (exchange.generationStatus === 'pending') {
    if (isGenerationLeaseStale(exchange.generationClaimedAt, nowMs)) {
      return { kind: 'claim_generation', exchange, session };
    }
    return { kind: 'in_flight', exchange, session };
  }
  return { kind: 'in_flight', exchange, session };
}
