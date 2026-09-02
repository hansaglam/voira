import assert from 'node:assert/strict';
import test from 'node:test';
import type { PracticeResult } from '../../types/learning';
import type { WeakWordPracticeRecord } from '../../types/weakWords';
import {
  applyWeakWordsFromAttempt,
  buildWeakWordAggregatesFromResults,
  type WeakWordAggregate,
} from '../sync/mergeProgress';
import {
  applyDedicatedWordPractice,
  rebuildCanonicalWeakWordAggregates,
  mergeWeakWordAggregateSets,
} from '../sync/weakWordAggregateMerge';
import { resolveWeakWordStatus } from '../weakWords/weakWordStatusService';
import { buildWeakWordCatalog } from '../weakWords/weakWordCatalogService';
import { buildWeakWordPracticeQueue } from '../weakWords/weakWordPracticeQueueService';
import {
  buildPersonalSpeakingProfile,
  isEligibleWeakWordPracticeScore,
} from '../weakWords/personalSpeakingProfileService';
import { buildProgressSummary } from '../progress/progressSummaryService';
import { createDefaultLearningProfile } from '../../types/learning';

const WEAK_WORD_PRACTICE_LESSON_ID = '__weak_word_practice__';

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
    resolvedAt: partial.resolvedAt ?? null,
    recentHealthyStreak: partial.recentHealthyStreak ?? 0,
    dedicatedPracticeCount: partial.dedicatedPracticeCount ?? 0,
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

function makePracticeRecord(
  partial: Partial<WeakWordPracticeRecord> & Pick<WeakWordPracticeRecord, 'normalizedWord'>,
): WeakWordPracticeRecord {
  return {
    clientEventId: partial.clientEventId ?? `evt-${partial.normalizedWord}-${partial.createdAt ?? '1'}`,
    displayWord: partial.displayWord ?? partial.normalizedWord,
    accuracyScore: partial.accuracyScore ?? 80,
    wasWeak: partial.wasWeak ?? false,
    createdAt: partial.createdAt ?? '2026-01-03T00:00:00.000Z',
    syncStatus: partial.syncStatus ?? 'synced',
    ...partial,
  };
}

test('word practice evidence survives local rehydrate', () => {
  const sentence = buildWeakWordAggregatesFromResults(
    [
      makeResult({
        resultId: '1',
        lessonId: 'l1',
        pronunciationWeakEvents: [{ word: 'perfectly', severity: 'severe', score: 48 }],
      }),
    ],
    [],
  );
  const withPractice = applyDedicatedWordPractice(sentence, {
    normalizedWord: 'perfectly',
    displayWord: 'perfectly',
    accuracyScore: 84,
    wasWeak: false,
    createdAt: '2026-01-04T00:00:00.000Z',
  });
  const rehydrated = rebuildCanonicalWeakWordAggregates({
    practiceResults: [
      makeResult({
        resultId: '1',
        lessonId: 'l1',
        pronunciationWeakEvents: [{ word: 'perfectly', severity: 'severe', score: 48 }],
      }),
    ],
    practiceRecords: [],
    remoteAggregates: withPractice,
  });
  const item = rehydrated.find((entry) => entry.normalizedWord === 'perfectly');
  assert.equal(item?.lastScore, 84);
  assert.equal(item?.recentHealthyStreak, 1);
});

test('signed-in word practice survives cloud rehydrate', () => {
  const remote: WeakWordAggregate[] = [
    makeAggregate({
      normalizedWord: 'perfectly',
      displayWord: 'perfectly',
      attemptCount: 3,
      weakCount: 2,
      lastScore: 84,
      averageScore: 58,
      recentHealthyStreak: 2,
      dedicatedPracticeCount: 2,
      lastSeenAt: '2026-01-05T00:00:00.000Z',
    }),
  ];
  const rebuilt = rebuildCanonicalWeakWordAggregates({
    practiceResults: [
      makeResult({
        resultId: '1',
        lessonId: 'l1',
        pronunciationWeakEvents: [{ word: 'perfectly', severity: 'severe', score: 48 }],
      }),
    ],
    practiceRecords: [],
    remoteAggregates: remote,
  });
  const status = resolveWeakWordStatus({
    aggregate: rebuilt.find((item) => item.normalizedWord === 'perfectly')!,
  });
  assert.equal(status, 'mastered');
});

test('remote sync does not overwrite newer valid word-practice evidence', () => {
  const staleRemote = [
    makeAggregate({
      normalizedWord: 'world',
      displayWord: 'world',
      attemptCount: 3,
      weakCount: 2,
      lastScore: 52,
      lastSeenAt: '2026-01-01T00:00:00.000Z',
      recentHealthyStreak: 0,
    }),
  ];
  const newerLocal = [
    makeAggregate({
      normalizedWord: 'world',
      displayWord: 'world',
      attemptCount: 5,
      weakCount: 2,
      lastScore: 86,
      lastSeenAt: '2026-01-05T00:00:00.000Z',
      recentHealthyStreak: 2,
      dedicatedPracticeCount: 2,
    }),
  ];
  const merged = mergeWeakWordAggregateSets(staleRemote, newerLocal);
  const item = merged.find((entry) => entry.normalizedWord === 'world');
  assert.equal(item?.lastScore, 86);
  assert.equal(item?.recentHealthyStreak, 2);
});

test('repeated sync is idempotent', () => {
  const results = [
    makeResult({
      resultId: '1',
      lessonId: 'l1',
      pronunciationWeakEvents: [{ word: 'world', severity: 'severe', score: 50 }],
    }),
  ];
  const remote = [
    makeAggregate({
      normalizedWord: 'world',
      displayWord: 'world',
      attemptCount: 2,
      weakCount: 2,
      lastScore: 82,
      recentHealthyStreak: 2,
      dedicatedPracticeCount: 2,
      lastSeenAt: '2026-01-04T00:00:00.000Z',
    }),
  ];
  const first = rebuildCanonicalWeakWordAggregates({
    practiceResults: results,
    practiceRecords: [],
    remoteAggregates: remote,
  });
  const second = rebuildCanonicalWeakWordAggregates({
    practiceResults: results,
    practiceRecords: [],
    remoteAggregates: first,
  });
  assert.deepEqual(first, second);
});

test('guest→account practice evidence uploads once via pending record semantics', () => {
  const pending: WeakWordPracticeRecord[] = [
    makePracticeRecord({
      normalizedWord: 'world',
      displayWord: 'world',
      accuracyScore: 84,
      wasWeak: false,
      createdAt: '2026-01-04T00:00:00.000Z',
      clientEventId: 'evt-1',
      syncStatus: 'pending',
    }),
    makePracticeRecord({
      normalizedWord: 'world',
      displayWord: 'world',
      accuracyScore: 84,
      wasWeak: false,
      createdAt: '2026-01-04T00:00:00.000Z',
      clientEventId: 'evt-1',
      syncStatus: 'pending',
    }),
  ];
  const rebuilt = rebuildCanonicalWeakWordAggregates({
    practiceResults: [
      makeResult({
        resultId: '1',
        lessonId: 'l1',
        pronunciationWeakEvents: [{ word: 'world', severity: 'severe', score: 50 }],
      }),
    ],
    practiceRecords: pending,
    remoteAggregates: [],
  });
  const item = rebuilt.find((entry) => entry.normalizedWord === 'world');
  assert.equal(item?.dedicatedPracticeCount, 1);
});

test('healthy word practices can eventually produce improving', () => {
  let aggregates = buildWeakWordAggregatesFromResults(
    [
      makeResult({
        resultId: '1',
        lessonId: 'l1',
        pronunciationWeakEvents: [{ word: 'world', severity: 'severe', score: 48 }],
      }),
      makeResult({
        resultId: '2',
        lessonId: 'l1',
        pronunciationWeakEvents: [{ word: 'world', severity: 'borderline', score: 55 }],
      }),
    ],
    [],
  );
  aggregates = applyDedicatedWordPractice(aggregates, {
    normalizedWord: 'world',
    displayWord: 'world',
    accuracyScore: 74,
    wasWeak: false,
    createdAt: '2026-01-04T00:00:00.000Z',
  });
  const status = resolveWeakWordStatus({
    aggregate: aggregates.find((item) => item.normalizedWord === 'world')!,
  });
  assert.equal(status, 'improving');
});

test('sufficient healthy practices can produce mastered', () => {
  let aggregates = buildWeakWordAggregatesFromResults(
    [
      makeResult({
        resultId: '1',
        lessonId: 'l1',
        pronunciationWeakEvents: [{ word: 'world', severity: 'severe', score: 48 }],
      }),
      makeResult({
        resultId: '2',
        lessonId: 'l1',
        pronunciationWeakEvents: [{ word: 'world', severity: 'borderline', score: 55 }],
      }),
    ],
    [],
  );
  aggregates = applyDedicatedWordPractice(aggregates, {
    normalizedWord: 'world',
    displayWord: 'world',
    accuracyScore: 84,
    wasWeak: false,
    createdAt: '2026-01-04T00:00:00.000Z',
  });
  aggregates = applyDedicatedWordPractice(aggregates, {
    normalizedWord: 'world',
    displayWord: 'world',
    accuracyScore: 86,
    wasWeak: false,
    createdAt: '2026-01-05T00:00:00.000Z',
  });
  const status = resolveWeakWordStatus({
    aggregate: aggregates.find((item) => item.normalizedWord === 'world')!,
  });
  assert.equal(status, 'mastered');
});

test('one healthy attempt does not produce mastered', () => {
  let aggregates = buildWeakWordAggregatesFromResults(
    [
      makeResult({
        resultId: '1',
        lessonId: 'l1',
        pronunciationWeakEvents: [{ word: 'world', severity: 'severe', score: 48 }],
      }),
      makeResult({
        resultId: '2',
        lessonId: 'l1',
        pronunciationWeakEvents: [{ word: 'world', severity: 'borderline', score: 55 }],
      }),
    ],
    [],
  );
  aggregates = applyDedicatedWordPractice(aggregates, {
    normalizedWord: 'world',
    displayWord: 'world',
    accuracyScore: 84,
    wasWeak: false,
    createdAt: '2026-01-04T00:00:00.000Z',
  });
  const status = resolveWeakWordStatus({
    aggregate: aggregates.find((item) => item.normalizedWord === 'world')!,
  });
  assert.notEqual(status, 'mastered');
});

test('mastered word can become active again after later severe sentence evidence', () => {
  const mastered = makeAggregate({
    normalizedWord: 'world',
    displayWord: 'world',
    attemptCount: 6,
    weakCount: 2,
    lastScore: 86,
    averageScore: 62,
    recentHealthyStreak: 2,
    dedicatedPracticeCount: 2,
    lastSeenAt: '2026-01-05T00:00:00.000Z',
  });
  const regressed = applyWeakWordsFromAttempt([mastered], ['world'], 44, '2026-01-06T00:00:00.000Z', {
    events: [{ word: 'world', severity: 'severe', score: 44 }],
  });
  const item = regressed.find((entry) => entry.normalizedWord === 'world');
  assert.equal(item?.recentHealthyStreak, 0);
  const status = resolveWeakWordStatus({ aggregate: item! });
  assert.equal(status, 'repeated');
});

test('recognition mismatch practice does not create weak evidence', () => {
  assert.equal(isEligibleWeakWordPracticeScore(50, 'recognition_mismatch'), false);
});

test('missing issue does not create pronunciation evidence', () => {
  assert.equal(isEligibleWeakWordPracticeScore(40, 'missing'), false);
});

test('healthy practice does not increment weak failure count incorrectly', () => {
  const base = [
    makeAggregate({
      normalizedWord: 'world',
      displayWord: 'world',
      attemptCount: 3,
      weakCount: 2,
      lastScore: 52,
      averageScore: 55,
    }),
  ];
  const next = applyDedicatedWordPractice(base, {
    normalizedWord: 'world',
    displayWord: 'world',
    accuracyScore: 86,
    wasWeak: false,
    createdAt: '2026-01-04T00:00:00.000Z',
  });
  const item = next.find((entry) => entry.normalizedWord === 'world');
  assert.equal(item?.weakCount, 2);
  assert.equal(item?.dedicatedPracticeCount, 1);
});

test('weak-word practice does not enter normal lesson completion metrics', () => {
  const normalResults = [
    makeResult({ resultId: '1', lessonId: 'daily-neighbor-greeting', nativeScore: 70 }),
  ];
  assert.equal(
    normalResults.some((result) => result.lessonId === WEAK_WORD_PRACTICE_LESSON_ID),
    false,
  );
  const polluted = [
    ...normalResults,
    makeResult({ resultId: '2', lessonId: WEAK_WORD_PRACTICE_LESSON_ID, nativeScore: 100 }),
  ];
  const filtered = polluted.filter(
    (result) => result.lessonId !== WEAK_WORD_PRACTICE_LESSON_ID,
  );
  const summary = buildProgressSummary(createDefaultLearningProfile(), filtered, []);
  assert.equal(summary.averageNativeScore, 70);
  assert.equal(filtered.length, 1);
});

test('weak-word practice does not distort normal speaking average', () => {
  const results = [
    makeResult({ resultId: '1', lessonId: 'lesson-a', nativeScore: 60 }),
    makeResult({ resultId: '2', lessonId: 'lesson-b', nativeScore: 80 }),
  ];
  const withSynthetic = [
    ...results,
    makeResult({ resultId: '3', lessonId: WEAK_WORD_PRACTICE_LESSON_ID, nativeScore: 100 }),
  ];
  const baseline = buildProgressSummary(createDefaultLearningProfile(), results, []);
  const polluted = buildProgressSummary(
    createDefaultLearningProfile(),
    withSynthetic.filter((result) => result.lessonId !== WEAK_WORD_PRACTICE_LESSON_ID),
    [],
  );
  assert.equal(baseline.averageNativeScore, polluted.averageNativeScore);
});

test('profile counts remain same after cloud rehydrate', () => {
  const remote = [
    makeAggregate({
      normalizedWord: 'a',
      displayWord: 'a',
      attemptCount: 3,
      weakCount: 2,
      lastScore: 50,
    }),
    makeAggregate({
      normalizedWord: 'b',
      displayWord: 'b',
      attemptCount: 4,
      weakCount: 3,
      lastScore: 74,
      averageScore: 58,
      recentHealthyStreak: 1,
    }),
    makeAggregate({
      normalizedWord: 'c',
      displayWord: 'c',
      attemptCount: 6,
      weakCount: 3,
      lastScore: 85,
      averageScore: 62,
      recentHealthyStreak: 2,
    }),
  ];
  const aggregates = rebuildCanonicalWeakWordAggregates({
    practiceResults: [],
    practiceRecords: [],
    remoteAggregates: remote,
  });
  const catalog = buildWeakWordCatalog(aggregates);
  const profile = buildPersonalSpeakingProfile({ practiceResults: [], weakWordCatalog: catalog });
  assert.equal(profile.activeWeakWordCount, 2);
  assert.equal(profile.masteredWeakWordCount, 1);
});

test('priority queue remains same after cloud rehydrate', () => {
  const remote = [
    makeAggregate({
      normalizedWord: 'low',
      displayWord: 'low',
      attemptCount: 2,
      weakCount: 2,
      lastScore: 66,
    }),
    makeAggregate({
      normalizedWord: 'high',
      displayWord: 'high',
      attemptCount: 5,
      weakCount: 4,
      lastScore: 40,
    }),
  ];
  const aggregates = rebuildCanonicalWeakWordAggregates({
    practiceResults: [],
    remoteAggregates: remote,
  });
  const queue = buildWeakWordPracticeQueue(buildWeakWordCatalog(aggregates));
  assert.equal(queue.items[0]?.normalizedWord, 'high');
});

test('same evidence on two devices derives same status', () => {
  const remote = makeAggregate({
    normalizedWord: 'perfectly',
    displayWord: 'perfectly',
    attemptCount: 5,
    weakCount: 2,
    lastScore: 86,
    averageScore: 58,
    recentHealthyStreak: 2,
    dedicatedPracticeCount: 2,
    lastSeenAt: '2026-01-05T00:00:00.000Z',
  });
  const deviceA = resolveWeakWordStatus({
    aggregate: rebuildCanonicalWeakWordAggregates({
      practiceResults: [],
      remoteAggregates: [remote],
    })[0]!,
  });
  const deviceB = resolveWeakWordStatus({
    aggregate: rebuildCanonicalWeakWordAggregates({
      practiceResults: [],
      remoteAggregates: [remote],
    })[0]!,
  });
  assert.equal(deviceA, deviceB);
  assert.equal(deviceA, 'mastered');
});

test('logout/login does not erase signed-in mastery evidence from cloud aggregates', () => {
  const cloud = [
    makeAggregate({
      normalizedWord: 'perfectly',
      displayWord: 'perfectly',
      attemptCount: 5,
      weakCount: 2,
      lastScore: 86,
      recentHealthyStreak: 2,
      dedicatedPracticeCount: 2,
      lastSeenAt: '2026-01-05T00:00:00.000Z',
    }),
  ];
  const afterLogin = rebuildCanonicalWeakWordAggregates({
    practiceResults: [],
    practiceRecords: [],
    remoteAggregates: cloud,
  });
  const status = resolveWeakWordStatus({
    aggregate: afterLogin[0]!,
  });
  assert.equal(status, 'mastered');
});
