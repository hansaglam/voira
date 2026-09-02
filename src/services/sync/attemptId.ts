import type { PracticeResult } from '../../types/learning';

/**
 * Stable client attempt id for sync idempotency.
 * Prefer existing attemptId / resultId; migrate legacy rows deterministically.
 */
export function resolvePracticeAttemptId(result: PracticeResult): string {
  const attemptId = typeof result.attemptId === 'string' ? result.attemptId.trim() : '';
  if (attemptId) return attemptId;

  const resultId = typeof result.resultId === 'string' ? result.resultId.trim() : '';
  if (resultId) return resultId;

  return buildLegacyAttemptId(result);
}

export function buildLegacyAttemptId(result: {
  lessonId: string;
  segmentId?: string;
  sessionId?: string;
  mode: string;
  createdAt: string;
  nativeScore?: number;
}): string {
  const parts = [
    'legacy',
    result.mode,
    result.lessonId,
    result.segmentId ?? 'none',
    result.sessionId ?? 'none',
    result.createdAt,
    String(result.nativeScore ?? 0),
  ];
  return parts.join(':');
}

export function withStableAttemptId(result: PracticeResult): PracticeResult {
  const attemptId = resolvePracticeAttemptId(result);
  return {
    ...result,
    attemptId,
    resultId: result.resultId?.trim() ? result.resultId : attemptId,
  };
}

export function createPracticeAttemptId(lessonId: string): string {
  const random =
    typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `attempt-${random}-${lessonId}`;
}
