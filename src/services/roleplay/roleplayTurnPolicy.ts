import type { RoleplayTurn } from '../../types/roleplay';
import { createRoleplayClientTurnId } from './roleplayTurnId';

export function normalizeRoleplayTranscript(transcript: string): string | null {
  const normalized = transcript.trim().replace(/\s+/g, ' ');
  return normalized.length > 0 ? normalized : null;
}

export function createPendingRoleplayTurn(
  transcript: string,
  now = Date.now(),
): RoleplayTurn | null {
  const text = normalizeRoleplayTranscript(transcript);
  if (!text) return null;
  const clientTurnId = createRoleplayClientTurnId(now);
  return {
    id: clientTurnId,
    clientTurnId,
    role: 'user',
    text,
    createdAt: new Date(now).toISOString(),
  };
}

export function shouldCompleteRoleplay(input: {
  shouldEndSession: boolean;
  turnCount: number;
  maxTurns: number;
  status: 'active' | 'completed';
}): boolean {
  return input.shouldEndSession || input.status === 'completed' || input.turnCount >= input.maxTurns;
}

export function appendRoleplayTurnOnce(turns: RoleplayTurn[], turn: RoleplayTurn): RoleplayTurn[] {
  return turns.some((existing) => existing.id === turn.id) ? turns : [...turns, turn];
}
