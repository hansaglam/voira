import assert from 'node:assert/strict';
import test from 'node:test';
import type { PracticeResult } from '../../types/learning';
import type { WeakWordPracticeRecord } from '../../types/weakWords';
import {
  applyWeakWordsFromAttempt,
  buildWeakWordAggregatesFromResults,
  type WeakWordAggregate,
} from '../sync/mergeProgress';
import { resolveWeakWordStatus } from './weakWordStatusService';
import { calculateWeakWordPriorityScore } from './weakWordPriorityService';
import { buildWeakWordCatalog } from './weakWordCatalogService';
import { buildWeakWordPracticeQueue } from './weakWordPracticeQueueService';
import {
  buildPersonalSpeakingProfile,
  isEligibleWeakWordPracticeScore,
  resolveRecentTrend,
} from './personalSpeakingProfileService';
import { buildHomeWeakWordsPreviewItems } from './weakWordHomePreviewService';

function makeAggregate(
  partial: Partial<WeakWordAggregate> & Pick<WeakWordAggregate, 'normalizedWord' | 'displayWord'>,
): WeakWordAggregate {
  return {
    attemptCount: partial.attemptCount ?? 1,
    weakCount: partial.weakCount ?? 1,
    bestScore: partial.bestScore ?? partial.lastScore ?? 60,
    lastScore: partial.lastScore ?? 60,
    averageScore: partial.averageScore ?? partial.lastScore ?? 60,
    firstSeenAt: partial.firstSeenAt ?? '2026-01-01T00:00:00.000Z',
    lastSeenAt: partial.lastSeenAt ?? '2026-01-02T00:00:00.000Z',
    recentHealthyStreak: partial.recentHealthyStreak ?? 0,
    dedicatedPracticeCount: partial.dedicatedPracticeCount ?? 0,
    resolvedAt: partial.resolvedAt ?? null,
    ...partial,
  };
}

function makeResult(
  partial: Partial<PracticeResult> & Pick<PracticeResult, 'resultId' | 'lessonId'>,
): PracticeResult {
  return {
    resultId: partial.resultId,
    attemptId: partial.attemptId ?? partial.resultId,
    lessonId: partial.lessonId,
    segmentId: partial.segmentId,
    sessionId: partial.sessionId,
    mode: partial.mode ?? 'library',
    pronunciationScore: partial.pronunciationScore ?? 70,
    fluencyScore: partial.fluencyScore ?? 70,
    rhythmScore: partial.rhythmScore ?? 70,
    confidenceScore: partial.confidenceScore ?? 70,
    nativeScore: partial.nativeScore ?? 70,
    correctWords: partial.correctWords ?? [],
    wordsToImprove: partial.wordsToImprove ?? [],
    pronunciationWeakEvents: partial.pronunciationWeakEvents,
    weakAreasDetected: partial.weakAreasDetected ?? [],
    aiCoachCommentTr: partial.aiCoachCommentTr ?? '',
    nextFocusTr: partial.nextFocusTr ?? '',
    createdAt: partial.createdAt ?? '2026-01-01T00:00:00.000Z',
    updatedAt: partial.updatedAt,
    syncStatus: partial.syncStatus,
  };
}

function statusInput(
  aggregate: WeakWordAggregate,
  practiceRecords?: WeakWordPracticeRecord[],
) {
  return resolveWeakWordStatus({ aggregate, practiceRecords });
}

// Status
test('one weak event → new', () => {
  const aggregate = makeAggregate({
    normalizedWord: 'world',
    displayWord: 'world',
    attemptCount: 1,
    weakCount: 1,
    lastScore: 55,
  });
  assert.equal(statusInput(aggregate), 'new');
});

test('repeated failures → repeated', () => {
  const aggregate = makeAggregate({
    normalizedWord: 'perfectly',
    displayWord: 'perfectly',
    attemptCount: 4,
    weakCount: 3,
    lastScore: 52,
    averageScore: 54,
  });
  assert.equal(statusInput(aggregate), 'repeated');
});

test('material recent improvement → improving', () => {
  const aggregate = makeAggregate({
    normalizedWord: 'world',
    displayWord: 'world',
    attemptCount: 4,
    weakCount: 3,
    lastScore: 74,
    averageScore: 58,
  });
  const records: WeakWordPracticeRecord[] = [
    {
      clientEventId: 'evt-1',
      normalizedWord: 'world',
      displayWord: 'world',
      accuracyScore: 74,
      wasWeak: false,
      createdAt: '2026-01-04T00:00:00.000Z',
    },
    {
      clientEventId: 'evt-2',
      normalizedWord: 'world',
      displayWord: 'world',
      accuracyScore: 52,
      wasWeak: true,
      createdAt: '2026-01-03T00:00:00.000Z',
    },
  ];
  assert.equal(statusInput(aggregate, records), 'improving');
});

test('one good attempt does not → mastered', () => {
  const aggregate = makeAggregate({
    normalizedWord: 'world',
    displayWord: 'world',
    attemptCount: 3,
    weakCount: 2,
    lastScore: 82,
    averageScore: 60,
  });
  const records: WeakWordPracticeRecord[] = [
    {
      clientEventId: 'evt-one-good',
      normalizedWord: 'world',
      displayWord: 'world',
      accuracyScore: 82,
      wasWeak: false,
      createdAt: '2026-01-04T00:00:00.000Z',
    },
  ];
  assert.notEqual(statusInput(aggregate, records), 'mastered');
});

test('sustained healthy attempts → mastered', () => {
  const aggregate = makeAggregate({
    normalizedWord: 'world',
    displayWord: 'world',
    attemptCount: 5,
    weakCount: 3,
    lastScore: 84,
    averageScore: 62,
    recentHealthyStreak: 2,
    dedicatedPracticeCount: 2,
  });
  assert.equal(statusInput(aggregate), 'mastered');
});

// Priority
test('repeated severe > new borderline', () => {
  const repeated = calculateWeakWordPriorityScore({
    aggregate: makeAggregate({
      normalizedWord: 'a',
      displayWord: 'a',
      attemptCount: 5,
      weakCount: 4,
      lastScore: 40,
    }),
  });
  const fresh = calculateWeakWordPriorityScore({
    aggregate: makeAggregate({
      normalizedWord: 'b',
      displayWord: 'b',
      attemptCount: 1,
      weakCount: 1,
      lastScore: 68,
    }),
  });
  assert.ok(repeated > fresh);
});

test('recent weakness > stale equal weakness', () => {
  const recent = calculateWeakWordPriorityScore({
    aggregate: makeAggregate({
      normalizedWord: 'recent',
      displayWord: 'recent',
      attemptCount: 3,
      weakCount: 2,
      lastScore: 48,
      lastSeenAt: new Date().toISOString(),
    }),
  });
  const stale = calculateWeakWordPriorityScore({
    aggregate: makeAggregate({
      normalizedWord: 'stale',
      displayWord: 'stale',
      attemptCount: 3,
      weakCount: 2,
      lastScore: 48,
      lastSeenAt: '2020-01-01T00:00:00.000Z',
    }),
  });
  assert.ok(recent > stale);
});

test('improving lowers priority', () => {
  const aggregate = makeAggregate({
    normalizedWord: 'world',
    displayWord: 'world',
    attemptCount: 4,
    weakCount: 3,
    lastScore: 74,
    averageScore: 58,
  });
  const records: WeakWordPracticeRecord[] = [
    {
      clientEventId: 'evt-1',
      normalizedWord: 'world',
      displayWord: 'world',
      accuracyScore: 74,
      wasWeak: false,
      createdAt: '2026-01-04T00:00:00.000Z',
    },
    {
      clientEventId: 'evt-2',
      normalizedWord: 'world',
      displayWord: 'world',
      accuracyScore: 52,
      wasWeak: true,
      createdAt: '2026-01-03T00:00:00.000Z',
    },
  ];
  const repeatedOnly = calculateWeakWordPriorityScore({
    aggregate: makeAggregate({
      normalizedWord: 'repeat',
      displayWord: 'repeat',
      attemptCount: 4,
      weakCount: 3,
      lastScore: 52,
      averageScore: 52,
    }),
  });
  const improving = calculateWeakWordPriorityScore({ aggregate, practiceRecords: records });
  assert.ok(repeatedOnly > improving);
});

test('mastered excluded from active queue', () => {
  const catalog = buildWeakWordCatalog([
    makeAggregate({
      normalizedWord: 'done',
      displayWord: 'done',
      attemptCount: 6,
      weakCount: 3,
      lastScore: 85,
      averageScore: 62,
      recentHealthyStreak: 2,
      dedicatedPracticeCount: 2,
    }),
  ]);
  const queue = buildWeakWordPracticeQueue(catalog);
  assert.equal(queue.isEmpty, true);
  assert.equal(queue.items.length, 0);
});

// Queue
test('highest priority first', () => {
  const catalog = buildWeakWordCatalog([
    makeAggregate({
      normalizedWord: 'low',
      displayWord: 'low',
      attemptCount: 2,
      weakCount: 1,
      lastScore: 66,
    }),
    makeAggregate({
      normalizedWord: 'high',
      displayWord: 'high',
      attemptCount: 5,
      weakCount: 4,
      lastScore: 42,
    }),
  ]);
  const queue = buildWeakWordPracticeQueue(catalog);
  assert.equal(queue.items[0]?.normalizedWord, 'high');
});

test('max session size respected', () => {
  const catalog = buildWeakWordCatalog(
    Array.from({ length: 8 }, (_, index) =>
      makeAggregate({
        normalizedWord: `word${index}`,
        displayWord: `word${index}`,
        attemptCount: 3,
        weakCount: 2,
        lastScore: 50 + index,
      }),
    ),
  );
  const queue = buildWeakWordPracticeQueue(catalog, { maxSize: 3 });
  assert.equal(queue.items.length, 3);
});

test('no weak words → empty queue', () => {
  const queue = buildWeakWordPracticeQueue([]);
  assert.equal(queue.isEmpty, true);
});

test('one word → valid queue', () => {
  const catalog = buildWeakWordCatalog([
    makeAggregate({
      normalizedWord: 'solo',
      displayWord: 'solo',
      attemptCount: 2,
      weakCount: 2,
      lastScore: 50,
    }),
  ]);
  const queue = buildWeakWordPracticeQueue(catalog);
  assert.equal(queue.isEmpty, false);
  assert.equal(queue.items.length, 1);
});

test('mastered not included by default', () => {
  const catalog = buildWeakWordCatalog([
    makeAggregate({
      normalizedWord: 'active',
      displayWord: 'active',
      attemptCount: 2,
      weakCount: 2,
      lastScore: 55,
    }),
    makeAggregate({
      normalizedWord: 'done',
      displayWord: 'done',
      attemptCount: 6,
      weakCount: 3,
      lastScore: 85,
      averageScore: 62,
      recentHealthyStreak: 2,
      dedicatedPracticeCount: 2,
    }),
  ]);
  const queue = buildWeakWordPracticeQueue(catalog);
  assert.equal(queue.items.length, 1);
  assert.equal(queue.items[0]?.normalizedWord, 'active');
});

// Profile
test('strongest metric with sufficient data', () => {
  const results = [
    makeResult({ resultId: '1', lessonId: 'l1', pronunciationScore: 90, fluencyScore: 60, nativeScore: 75 }),
    makeResult({ resultId: '2', lessonId: 'l1', pronunciationScore: 88, fluencyScore: 62, nativeScore: 76 }),
    makeResult({ resultId: '3', lessonId: 'l1', pronunciationScore: 89, fluencyScore: 61, nativeScore: 77 }),
  ];
  const profile = buildPersonalSpeakingProfile({ practiceResults: results, weakWordCatalog: [] });
  assert.equal(profile.strongestMetric?.metric, 'pronunciation');
});

test('weakest metric with sufficient data', () => {
  const results = [
    makeResult({ resultId: '1', lessonId: 'l1', pronunciationScore: 90, fluencyScore: 60, nativeScore: 75 }),
    makeResult({ resultId: '2', lessonId: 'l1', pronunciationScore: 88, fluencyScore: 62, nativeScore: 76 }),
    makeResult({ resultId: '3', lessonId: 'l1', pronunciationScore: 89, fluencyScore: 61, nativeScore: 77 }),
  ];
  const profile = buildPersonalSpeakingProfile({ practiceResults: results, weakWordCatalog: [] });
  assert.equal(profile.weakestMetric?.metric, 'fluency');
});

test('insufficient metric data → null', () => {
  const results = [makeResult({ resultId: '1', lessonId: 'l1', pronunciationScore: 80, fluencyScore: 70 })];
  const profile = buildPersonalSpeakingProfile({ practiceResults: results, weakWordCatalog: [] });
  assert.equal(profile.strongestMetric, null);
  assert.equal(profile.weakestMetric, null);
});

test('active/improving/mastered counts correct', () => {
  const catalog = buildWeakWordCatalog([
    makeAggregate({ normalizedWord: 'a', displayWord: 'a', attemptCount: 2, weakCount: 2, lastScore: 50 }),
    makeAggregate({
      normalizedWord: 'b',
      displayWord: 'b',
      attemptCount: 4,
      weakCount: 3,
      lastScore: 74,
      averageScore: 58,
    }),
    makeAggregate({
      normalizedWord: 'c',
      displayWord: 'c',
      attemptCount: 6,
      weakCount: 3,
      lastScore: 85,
      averageScore: 62,
      recentHealthyStreak: 2,
      dedicatedPracticeCount: 2,
    }),
  ]);
  const profile = buildPersonalSpeakingProfile({ practiceResults: [], weakWordCatalog: catalog });
  assert.equal(profile.activeWeakWordCount, 2);
  assert.equal(profile.improvingWeakWordCount, 1);
  assert.equal(profile.masteredWeakWordCount, 1);
});

test('top weak words priority order', () => {
  const catalog = buildWeakWordCatalog([
    makeAggregate({ normalizedWord: 'low', displayWord: 'low', attemptCount: 2, weakCount: 1, lastScore: 66 }),
    makeAggregate({ normalizedWord: 'high', displayWord: 'high', attemptCount: 5, weakCount: 4, lastScore: 40 }),
  ]);
  const profile = buildPersonalSpeakingProfile({ practiceResults: [], weakWordCatalog: catalog });
  assert.equal(profile.topWeakWords[0]?.normalizedWord, 'high');
});

test('trend requires minimum data', () => {
  const results = [
    makeResult({ resultId: '1', lessonId: 'l1', nativeScore: 60 }),
    makeResult({ resultId: '2', lessonId: 'l1', nativeScore: 62 }),
  ];
  assert.equal(resolveRecentTrend(results), 'insufficient_data');
});

test('improving trend', () => {
  const results = [
    makeResult({ resultId: '1', lessonId: 'l1', nativeScore: 60, createdAt: '2026-01-01T00:00:00.000Z' }),
    makeResult({ resultId: '2', lessonId: 'l1', nativeScore: 62, createdAt: '2026-01-02T00:00:00.000Z' }),
    makeResult({ resultId: '3', lessonId: 'l1', nativeScore: 74, createdAt: '2026-01-03T00:00:00.000Z' }),
    makeResult({ resultId: '4', lessonId: 'l1', nativeScore: 76, createdAt: '2026-01-04T00:00:00.000Z' }),
  ];
  assert.equal(resolveRecentTrend(results), 'improving');
});

test('stable trend', () => {
  const results = [
    makeResult({ resultId: '1', lessonId: 'l1', nativeScore: 70, createdAt: '2026-01-01T00:00:00.000Z' }),
    makeResult({ resultId: '2', lessonId: 'l1', nativeScore: 71, createdAt: '2026-01-02T00:00:00.000Z' }),
    makeResult({ resultId: '3', lessonId: 'l1', nativeScore: 70, createdAt: '2026-01-03T00:00:00.000Z' }),
    makeResult({ resultId: '4', lessonId: 'l1', nativeScore: 71, createdAt: '2026-01-04T00:00:00.000Z' }),
  ];
  assert.equal(resolveRecentTrend(results), 'stable');
});

test('declining trend', () => {
  const results = [
    makeResult({ resultId: '1', lessonId: 'l1', nativeScore: 78, createdAt: '2026-01-01T00:00:00.000Z' }),
    makeResult({ resultId: '2', lessonId: 'l1', nativeScore: 76, createdAt: '2026-01-02T00:00:00.000Z' }),
    makeResult({ resultId: '3', lessonId: 'l1', nativeScore: 62, createdAt: '2026-01-03T00:00:00.000Z' }),
    makeResult({ resultId: '4', lessonId: 'l1', nativeScore: 60, createdAt: '2026-01-04T00:00:00.000Z' }),
  ];
  assert.equal(resolveRecentTrend(results), 'declining');
});

// Persistence
test('healthy practice contributes to improving/mastered history', () => {
  let aggregates = applyWeakWordsFromAttempt([], ['world'], 52, '2026-01-01T00:00:00.000Z', {
    events: [{ word: 'world', severity: 'severe', score: 52 }],
  });
  aggregates = applyWeakWordsFromAttempt(aggregates, [], 84, '2026-01-02T00:00:00.000Z', {
    events: [],
    healthyWords: ['world'],
    healthyScore: 84,
  });
  const item = aggregates.find((entry) => entry.normalizedWord === 'world');
  assert.ok(item);
  assert.equal(item?.attemptCount, 2);
});

test('ineligible recognition mismatch does not become weak word', () => {
  assert.equal(isEligibleWeakWordPracticeScore(50, 'recognition_mismatch'), false);
});

test('missing issue does not become pronunciation weak word', () => {
  assert.equal(isEligibleWeakWordPracticeScore(40, 'missing'), false);
});

test('repeated sync does not double-count', () => {
  const results = [
    makeResult({
      resultId: 'a1',
      lessonId: 'l1',
      pronunciationWeakEvents: [{ word: 'world', severity: 'severe', score: 50 }],
      createdAt: '2026-01-01T00:00:00.000Z',
    }),
  ];
  const first = buildWeakWordAggregatesFromResults(results, []);
  const second = buildWeakWordAggregatesFromResults(results, first);
  assert.deepEqual(first, second);
});

test('guest→account merge remains idempotent', () => {
  const local = buildWeakWordAggregatesFromResults(
    [
      makeResult({
        resultId: 'a1',
        lessonId: 'l1',
        pronunciationWeakEvents: [{ word: 'world', severity: 'borderline', score: 65 }],
      }),
    ],
    [],
  );
  const remote = local;
  const mergedOnce = buildWeakWordAggregatesFromResults(
    [
      makeResult({
        resultId: 'a1',
        lessonId: 'l1',
        pronunciationWeakEvents: [{ word: 'world', severity: 'borderline', score: 65 }],
      }),
    ],
    remote,
  );
  const mergedTwice = buildWeakWordAggregatesFromResults(
    [
      makeResult({
        resultId: 'a1',
        lessonId: 'l1',
        pronunciationWeakEvents: [{ word: 'world', severity: 'borderline', score: 65 }],
      }),
    ],
    mergedOnce,
  );
  assert.deepEqual(mergedOnce, mergedTwice);
});

// Navigation / helper
test('home weak-word preview picks active top items', () => {
  const catalog = buildWeakWordCatalog([
    makeAggregate({ normalizedWord: 'low', displayWord: 'low', attemptCount: 2, weakCount: 1, lastScore: 66 }),
    makeAggregate({ normalizedWord: 'high', displayWord: 'high', attemptCount: 5, weakCount: 4, lastScore: 40 }),
    makeAggregate({
      normalizedWord: 'done',
      displayWord: 'done',
      attemptCount: 6,
      weakCount: 3,
      lastScore: 85,
      averageScore: 62,
      recentHealthyStreak: 2,
      dedicatedPracticeCount: 2,
    }),
  ]);
  const preview = buildHomeWeakWordsPreviewItems(catalog, 2);
  assert.equal(preview.length, 2);
  assert.equal(preview[0]?.word, 'high');
});

test('no weak words → appropriate empty-state CTA data', () => {
  const preview = buildHomeWeakWordsPreviewItems([], 3);
  assert.deepEqual(preview, []);
  const queue = buildWeakWordPracticeQueue([]);
  assert.equal(queue.isEmpty, true);
});
