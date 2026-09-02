import type { PracticeMode, PracticeResult } from '../../../types/learning';

export const ATTEMPT_COMPARISON_SIMILAR_THRESHOLD = 3;

export interface AttemptComparisonContext {
  lessonId: string;
  segmentId?: string;
  mode: PracticeMode;
  attemptId: string;
  createdAt: string;
  nativeScore: number;
}

export type AttemptComparisonDirection = 'improved' | 'declined' | 'similar';

export interface AttemptComparison {
  previousScore: number;
  currentScore: number;
  delta: number;
  direction: AttemptComparisonDirection;
}

function attemptKey(result: PracticeResult): string {
  return result.attemptId ?? result.resultId;
}

function segmentMatches(a?: string, b?: string): boolean {
  return (a ?? '') === (b ?? '');
}

export function findComparablePriorAttempt(
  priorAttempts: PracticeResult[],
  current: AttemptComparisonContext,
): PracticeResult | null {
  const candidates = priorAttempts
    .filter((entry) => {
      if (attemptKey(entry) === current.attemptId) return false;
      if (entry.lessonId !== current.lessonId) return false;
      if (!segmentMatches(entry.segmentId, current.segmentId)) return false;
      if (entry.mode !== current.mode) return false;
      if (!Number.isFinite(entry.nativeScore)) return false;
      const entryTime = Date.parse(entry.createdAt);
      const currentTime = Date.parse(current.createdAt);
      if (Number.isFinite(entryTime) && Number.isFinite(currentTime) && entryTime >= currentTime) {
        return false;
      }
      return true;
    })
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  return candidates[0] ?? null;
}

export function compareAttempts(
  currentScore: number,
  previousScore: number,
  similarThreshold = ATTEMPT_COMPARISON_SIMILAR_THRESHOLD,
): AttemptComparison | null {
  if (!Number.isFinite(currentScore) || !Number.isFinite(previousScore)) {
    return null;
  }

  const delta = Math.round(currentScore - previousScore);
  let direction: AttemptComparisonDirection = 'similar';
  if (delta > similarThreshold) direction = 'improved';
  else if (delta < -similarThreshold) direction = 'declined';

  return {
    previousScore: Math.round(previousScore),
    currentScore: Math.round(currentScore),
    delta,
    direction,
  };
}

export function buildAttemptComparison(
  priorAttempts: PracticeResult[],
  current: AttemptComparisonContext,
): AttemptComparison | null {
  const prior = findComparablePriorAttempt(priorAttempts, current);
  if (!prior) return null;
  return compareAttempts(current.nativeScore, prior.nativeScore);
}
