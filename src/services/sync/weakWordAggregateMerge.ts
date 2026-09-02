import type { WeakWordPracticeRecord } from '../../types/weakWords';
import type { PracticeResult } from '../../types/learning';
import {
  applyWeakWordsFromAttempt,
  buildWeakWordAggregatesFromResults,
  type WeakWordAggregate,
} from './mergeProgress';
import { normalizeWeakWord } from './normalizeWord';
import { WORD_ACCURACY_HEALTHY_MIN } from '../weakWords/weakWordThresholds';

export function createEmptyWeakWordAggregate(
  normalizedWord: string,
  displayWord: string,
  seenAt: string,
): WeakWordAggregate {
  return {
    normalizedWord,
    displayWord,
    attemptCount: 0,
    weakCount: 0,
    bestScore: null,
    lastScore: null,
    averageScore: null,
    firstSeenAt: seenAt,
    lastSeenAt: seenAt,
    resolvedAt: null,
    recentHealthyStreak: 0,
    dedicatedPracticeCount: 0,
  };
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, score));
}

function maxNullable(a: number | null, b: number | null): number | null {
  if (a == null) return b;
  if (b == null) return a;
  return Math.max(a, b);
}

function minIso(a: string, b: string): string {
  return Date.parse(a) <= Date.parse(b) ? a : b;
}

/**
 * Merge two aggregate snapshots for the same word.
 * Status must be re-derived — never pick the higher status label directly.
 */
export function mergeWeakWordAggregatePair(
  left: WeakWordAggregate,
  right: WeakWordAggregate,
): WeakWordAggregate {
  const leftTime = Date.parse(left.lastSeenAt);
  const rightTime = Date.parse(right.lastSeenAt);
  const newer = leftTime >= rightTime ? left : right;
  const older = leftTime >= rightTime ? right : left;

  const attemptCount = Math.max(left.attemptCount, right.attemptCount);
  const weakCount = Math.max(left.weakCount, right.weakCount);
  const dedicatedPracticeCount = Math.max(
    left.dedicatedPracticeCount ?? 0,
    right.dedicatedPracticeCount ?? 0,
  );

  const recentHealthyStreak = newer.recentHealthyStreak ?? 0;

  const previousAverage = older.averageScore ?? newer.lastScore ?? 0;
  const nextAverage =
    attemptCount > 0 && newer.lastScore != null
      ? Math.round(
          ((previousAverage * Math.max(older.attemptCount, 1)) + newer.lastScore) /
            Math.max(attemptCount, 1) *
            10,
        ) / 10
      : newer.averageScore ?? older.averageScore;

  return {
    normalizedWord: left.normalizedWord,
    displayWord: newer.displayWord || older.displayWord,
    attemptCount,
    weakCount,
    bestScore: maxNullable(left.bestScore, right.bestScore),
    lastScore: newer.lastScore ?? older.lastScore,
    averageScore: nextAverage ?? newer.averageScore ?? older.averageScore,
    firstSeenAt: minIso(left.firstSeenAt, right.firstSeenAt),
    lastSeenAt: newer.lastSeenAt,
    resolvedAt: left.resolvedAt ?? right.resolvedAt,
    recentHealthyStreak,
    dedicatedPracticeCount,
  };
}

export function mergeWeakWordAggregateSets(
  ...sets: WeakWordAggregate[][]
): WeakWordAggregate[] {
  const byWord = new Map<string, WeakWordAggregate>();

  for (const set of sets) {
    for (const item of set) {
      const prior = byWord.get(item.normalizedWord);
      byWord.set(
        item.normalizedWord,
        prior ? mergeWeakWordAggregatePair(prior, item) : { ...item },
      );
    }
  }

  return Array.from(byWord.values());
}

export interface DedicatedWordPracticeInput {
  normalizedWord: string;
  displayWord: string;
  accuracyScore: number;
  wasWeak: boolean;
  createdAt: string;
}

/**
 * Apply one dedicated weak-word practice outcome.
 * Healthy dedicated practice updates scores/streak without incrementing weakCount.
 */
export function applyDedicatedWordPractice(
  existing: WeakWordAggregate[],
  input: DedicatedWordPracticeInput,
): WeakWordAggregate[] {
  const normalized = normalizeWeakWord(input.displayWord);
  if (!normalized) return existing;

  const byWord = new Map(existing.map((item) => [item.normalizedWord, { ...item }]));
  const prior =
    byWord.get(normalized) ??
    createEmptyWeakWordAggregate(normalized, input.displayWord, input.createdAt);

  const score = clampScore(input.accuracyScore);
  const nextAttemptCount = prior.attemptCount + 1;
  const previousAverage = prior.averageScore ?? score;
  const nextAverage =
    Math.round(((previousAverage * prior.attemptCount) + score) / nextAttemptCount * 10) / 10;

  if (input.wasWeak) {
    byWord.set(normalized, {
      ...prior,
      displayWord: prior.displayWord || input.displayWord,
      attemptCount: nextAttemptCount,
      weakCount: prior.weakCount + 1,
      bestScore: prior.bestScore == null ? score : Math.max(prior.bestScore, score),
      lastScore: score,
      averageScore: nextAverage,
      lastSeenAt: input.createdAt,
      recentHealthyStreak: 0,
      dedicatedPracticeCount: (prior.dedicatedPracticeCount ?? 0) + 1,
      resolvedAt: null,
    });
    return Array.from(byWord.values());
  }

  const nextStreak =
    score >= WORD_ACCURACY_HEALTHY_MIN ? (prior.recentHealthyStreak ?? 0) + 1 : 0;

  byWord.set(normalized, {
    ...prior,
    displayWord: prior.displayWord || input.displayWord,
    attemptCount: nextAttemptCount,
    bestScore: prior.bestScore == null ? score : Math.max(prior.bestScore, score),
    lastScore: score,
    averageScore: nextAverage,
    lastSeenAt: input.createdAt,
    recentHealthyStreak: nextStreak,
    dedicatedPracticeCount: (prior.dedicatedPracticeCount ?? 0) + 1,
  });

  return Array.from(byWord.values());
}

export function applyPracticeRecordsToAggregates(
  base: WeakWordAggregate[],
  records: WeakWordPracticeRecord[],
): WeakWordAggregate[] {
  const deduped = dedupePracticeRecords(records);
  const sorted = [...deduped].sort(
    (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt),
  );

  return sorted.reduce(
    (aggregates, record) =>
      applyDedicatedWordPractice(aggregates, {
        normalizedWord: record.normalizedWord,
        displayWord: record.displayWord,
        accuracyScore: record.accuracyScore,
        wasWeak: record.wasWeak,
        createdAt: record.createdAt,
      }),
    base,
  );
}

export function dedupePracticeRecords(
  records: WeakWordPracticeRecord[],
): WeakWordPracticeRecord[] {
  const byId = new Map<string, WeakWordPracticeRecord>();
  for (const record of records) {
    const key =
      record.clientEventId?.trim() ||
      `${record.normalizedWord}:${record.createdAt}:${record.accuracyScore}`;
    if (!byId.has(key)) {
      byId.set(key, record);
    }
  }
  return Array.from(byId.values());
}

export interface RebuildWeakWordAggregatesInput {
  practiceResults: PracticeResult[];
  practiceRecords?: WeakWordPracticeRecord[];
  remoteAggregates?: WeakWordAggregate[];
}

/**
 * Canonical weak-word aggregate rebuild:
 * 1) sentence-level pronunciation evidence from practice results
 * 2) dedicated word-practice records applied chronologically
 * 3) merge with remote/cloud aggregates without dropping newer dedicated evidence
 */
export function rebuildCanonicalWeakWordAggregates(
  input: RebuildWeakWordAggregatesInput,
): WeakWordAggregate[] {
  const sentenceAggregates = buildWeakWordAggregatesFromResults(input.practiceResults, []);
  const cached = input.remoteAggregates ?? [];
  const pending = (input.practiceRecords ?? []).filter(
    (record) => record.syncStatus === 'pending',
  );
  const merged = mergeWeakWordAggregateSets(sentenceAggregates, cached);
  if (pending.length === 0) return merged;
  return applyPracticeRecordsToAggregates(merged, pending);
}
