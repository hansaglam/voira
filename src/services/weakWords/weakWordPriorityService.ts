import type { WeakWordStatus } from '../../types/weakWords';
import type { WeakWordAggregate } from '../sync/mergeProgress';
import { PRIORITY_RECENT_DAYS, WORD_ACCURACY_SEVERE_MAX } from './weakWordThresholds';
import { resolveWeakWordStatus, severityWeightFromScore } from './weakWordStatusService';
import type { WeakWordPracticeRecord } from '../../types/weakWords';

export interface WeakWordPriorityInput {
  aggregate: WeakWordAggregate;
  practiceRecords?: WeakWordPracticeRecord[];
}

function daysSince(iso: string | null | undefined, nowMs = Date.now()): number {
  if (!iso) return Number.POSITIVE_INFINITY;
  const parsed = Date.parse(iso);
  if (!Number.isFinite(parsed)) return Number.POSITIVE_INFINITY;
  return (nowMs - parsed) / (1000 * 60 * 60 * 24);
}

/**
 * Deterministic priority — higher means practice sooner.
 * Weights: severity/repetition/recency; improving and mastered are down-ranked.
 */
export function calculateWeakWordPriorityScore(input: WeakWordPriorityInput): number {
  const { aggregate } = input;
  const status = resolveWeakWordStatus(input);

  if (status === 'mastered') return 0;

  const weakRatio =
    aggregate.attemptCount > 0 ? aggregate.weakCount / aggregate.attemptCount : 0;
  const severity = severityWeightFromScore(aggregate.lastScore);
  const repetitionBoost = Math.min(aggregate.weakCount, 6) * 12;
  const ratioBoost = Math.round(weakRatio * 40);
  const recencyBoost =
    daysSince(aggregate.lastSeenAt) <= PRIORITY_RECENT_DAYS ? 15 : 0;
  const severeBoost =
    typeof aggregate.lastScore === 'number' && aggregate.lastScore <= WORD_ACCURACY_SEVERE_MAX
      ? 20
      : 0;
  const improvingPenalty = status === 'improving' ? 35 : 0;
  const newBoost = status === 'new' ? 8 : 0;

  return Math.max(
    0,
    Math.round(
      severity * 25 + repetitionBoost + ratioBoost + recencyBoost + severeBoost + newBoost - improvingPenalty,
    ),
  );
}
