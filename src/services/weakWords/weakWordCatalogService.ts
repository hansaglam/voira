import type { WeakWordItem } from '../../types/weakWords';
import type { WeakWordPracticeRecord } from '../../types/weakWords';
import type { WeakWordAggregate } from '../sync/mergeProgress';
import { calculateWeakWordPriorityScore } from './weakWordPriorityService';
import { resolveWeakWordStatus } from './weakWordStatusService';

export function aggregateToWeakWordItem(
  aggregate: WeakWordAggregate,
  practiceRecords?: WeakWordPracticeRecord[],
): WeakWordItem {
  const statusInput = { aggregate, practiceRecords };
  const status = resolveWeakWordStatus(statusInput);
  const priorityScore = calculateWeakWordPriorityScore(statusInput);

  const wordRecords = (practiceRecords ?? [])
    .filter((record) => record.normalizedWord === aggregate.normalizedWord)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  const previousWeakAccuracy =
    wordRecords.find((record) => record.wasWeak)?.accuracyScore ??
    (typeof aggregate.averageScore === 'number' && aggregate.weakCount >= 2
      ? Math.round(aggregate.averageScore)
      : null);

  return {
    normalizedWord: aggregate.normalizedWord,
    displayWord: aggregate.displayWord,
    attemptCount: aggregate.attemptCount,
    weakCount: aggregate.weakCount,
    lastAccuracy: aggregate.lastScore,
    bestAccuracy: aggregate.bestScore,
    averageAccuracy: aggregate.averageScore,
    firstSeenAt: aggregate.firstSeenAt,
    lastSeenAt: aggregate.lastSeenAt,
    lastPracticedAt: wordRecords[0]?.createdAt ?? aggregate.lastSeenAt,
    status,
    priorityScore,
    latestEligibleIssueType: 'pronunciation',
    previousWeakAccuracy,
  };
}

export function buildWeakWordCatalog(
  aggregates: WeakWordAggregate[],
  practiceRecords?: WeakWordPracticeRecord[],
): WeakWordItem[] {
  return aggregates
    .map((aggregate) => aggregateToWeakWordItem(aggregate, practiceRecords))
    .sort((a, b) => b.priorityScore - a.priorityScore || a.displayWord.localeCompare(b.displayWord));
}

export function filterWeakWordsByStatus(
  items: WeakWordItem[],
  statuses: WeakWordItem['status'][],
): WeakWordItem[] {
  const allowed = new Set(statuses);
  return items.filter((item) => allowed.has(item.status));
}
