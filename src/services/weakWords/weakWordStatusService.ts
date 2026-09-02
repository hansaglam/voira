import type { WeakWordStatus } from '../../types/weakWords';
import type { WeakWordAggregate } from '../sync/mergeProgress';
import type { WeakWordPracticeRecord } from '../../types/weakWords';
import {
  IMPROVEMENT_DELTA_MIN,
  MASTERED_HEALTHY_ATTEMPTS,
  WORD_ACCURACY_BORDERLINE_MAX,
  WORD_ACCURACY_HEALTHY_MIN,
  WORD_ACCURACY_SEVERE_MAX,
} from './weakWordThresholds';

export interface WeakWordStatusInput {
  aggregate: WeakWordAggregate;
  practiceRecords?: WeakWordPracticeRecord[];
}

function recentPracticeRecords(
  records: WeakWordPracticeRecord[] | undefined,
  normalizedWord: string,
): WeakWordPracticeRecord[] {
  if (!records?.length) return [];
  return records
    .filter((record) => record.normalizedWord === normalizedWord)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

function countRecentHealthyAttempts(
  records: WeakWordPracticeRecord[],
): number {
  let count = 0;
  for (const record of records) {
    if (record.wasWeak) break;
    if (record.accuracyScore >= WORD_ACCURACY_HEALTHY_MIN) {
      count += 1;
    } else {
      break;
    }
  }
  return count;
}

function resolveRecentHealthyStreak(
  aggregate: WeakWordAggregate,
  records: WeakWordPracticeRecord[],
): number {
  const fromAggregate = aggregate.recentHealthyStreak ?? 0;
  const fromRecords = countRecentHealthyAttempts(records);
  return Math.max(fromAggregate, fromRecords);
}

export function resolveWeakWordStatus(input: WeakWordStatusInput): WeakWordStatus {
  const { aggregate } = input;
  const records = recentPracticeRecords(input.practiceRecords, aggregate.normalizedWord);
  const lastScore = aggregate.lastScore;
  const averageScore = aggregate.averageScore;
  const weakRatio = aggregate.attemptCount > 0 ? aggregate.weakCount / aggregate.attemptCount : 0;

  const recentHealthy = resolveRecentHealthyStreak(aggregate, records);
  const hadHistoricalWeakness = aggregate.weakCount >= 2;

  if (
    hadHistoricalWeakness &&
    recentHealthy >= MASTERED_HEALTHY_ATTEMPTS &&
    typeof lastScore === 'number' &&
    lastScore >= WORD_ACCURACY_HEALTHY_MIN
  ) {
    return 'mastered';
  }

  // Sentence-level regression: recent severe weakness overrides prior mastery streak.
  if (
    typeof lastScore === 'number' &&
    lastScore <= WORD_ACCURACY_SEVERE_MAX &&
    aggregate.weakCount >= 2
  ) {
    return 'repeated';
  }

  if (aggregate.weakCount <= 1 && aggregate.attemptCount <= 1) {
    return 'new';
  }

  const improvingFromRecords =
    records.length >= 2 &&
    !records[0]?.wasWeak &&
    records[0]!.accuracyScore >= WORD_ACCURACY_BORDERLINE_MAX &&
    records[1]?.wasWeak &&
    records[0]!.accuracyScore - records[1]!.accuracyScore >= IMPROVEMENT_DELTA_MIN;

  const improvingFromAggregate =
    typeof lastScore === 'number' &&
    typeof averageScore === 'number' &&
    aggregate.weakCount >= 2 &&
    lastScore >= WORD_ACCURACY_BORDERLINE_MAX &&
    lastScore - averageScore >= IMPROVEMENT_DELTA_MIN;

  if (improvingFromRecords || improvingFromAggregate) {
    return 'improving';
  }

  if (aggregate.weakCount >= 2 || weakRatio >= 0.5) {
    return 'repeated';
  }

  if (
    typeof lastScore === 'number' &&
    lastScore < WORD_ACCURACY_BORDERLINE_MAX
  ) {
    return 'new';
  }

  return aggregate.weakCount >= 1 ? 'repeated' : 'new';
}

export function isActiveWeakWordStatus(status: WeakWordStatus): boolean {
  return status === 'new' || status === 'repeated' || status === 'improving';
}

export function severityWeightFromScore(score: number | null): number {
  if (score == null) return 1;
  if (score <= WORD_ACCURACY_SEVERE_MAX) return 3;
  if (score <= WORD_ACCURACY_BORDERLINE_MAX) return 2;
  return 1;
}
