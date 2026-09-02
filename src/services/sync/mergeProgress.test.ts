import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildLegacyAttemptId,
  resolvePracticeAttemptId,
  withStableAttemptId,
} from './attemptId';
import {
  applyWeakWordsFromAttempt,
  buildWeakWordAggregatesFromResults,
  mergePracticeAttempts,
  mergeProgressSnapshots,
  mergeStreak,
  practiceResultToRemoteAttempt,
  type RemotePracticeAttempt,
} from './mergeProgress';
import { normalizeWeakWord } from './normalizeWord';
import type { PracticeResult } from '../../types/learning';
import { shouldSyncProgressForUserId } from './syncGuards';

function makeResult(
  partial: Partial<PracticeResult> & Pick<PracticeResult, 'resultId' | 'lessonId'>,
): PracticeResult {
  return {
    resultId: partial.resultId,
    attemptId: partial.attemptId,
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

test('guest users stay local-only for progress sync', () => {
  assert.equal(shouldSyncProgressForUserId('guest-abc'), false);
  assert.equal(shouldSyncProgressForUserId('local-user'), false);
  assert.equal(shouldSyncProgressForUserId(undefined), false);
  assert.equal(
    shouldSyncProgressForUserId('550e8400-e29b-41d4-a716-446655440000'),
    true,
  );
});

test('legacy result without attempt id gets deterministic migration id', () => {
  const legacy = makeResult({
    resultId: '',
    lessonId: 'lesson-1',
    segmentId: 'seg-1',
    mode: 'library',
    createdAt: '2026-01-02T10:00:00.000Z',
    nativeScore: 81,
  });
  const id = resolvePracticeAttemptId(legacy);
  assert.equal(
    id,
    buildLegacyAttemptId({
      lessonId: 'lesson-1',
      segmentId: 'seg-1',
      mode: 'library',
      createdAt: '2026-01-02T10:00:00.000Z',
      nativeScore: 81,
    }),
  );
  assert.equal(withStableAttemptId(legacy).attemptId, id);
});

test('mergePracticeAttempts unions by client attempt id without duplicates', () => {
  const local = [
    makeResult({ resultId: 'a1', attemptId: 'a1', lessonId: 'l1', nativeScore: 60 }),
    makeResult({ resultId: 'a2', attemptId: 'a2', lessonId: 'l2', nativeScore: 70 }),
  ];
  const remote: RemotePracticeAttempt[] = [
    {
      clientAttemptId: 'a2',
      lessonId: 'l2',
      segmentId: null,
      practiceMode: 'library',
      overallScore: 75,
      pronunciationScore: 75,
      accuracyScore: 70,
      fluencyScore: 70,
      completenessScore: null,
      prosodyScore: 70,
      wordsToImprove: ['the'],
      weakAreas: ['th'],
      coachFeedback: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-03T00:00:00.000Z',
    },
    {
      clientAttemptId: 'a3',
      lessonId: 'l3',
      segmentId: null,
      practiceMode: 'daily',
      overallScore: 80,
      pronunciationScore: 80,
      accuracyScore: 80,
      fluencyScore: 80,
      completenessScore: null,
      prosodyScore: 80,
      wordsToImprove: [],
      weakAreas: [],
      coachFeedback: null,
      createdAt: '2026-01-04T00:00:00.000Z',
      updatedAt: '2026-01-04T00:00:00.000Z',
    },
  ];

  const merged = mergePracticeAttempts(local, remote);
  assert.equal(merged.length, 3);
  assert.equal(merged.filter((item) => item.attemptId === 'a2').length, 1);
  assert.equal(merged.find((item) => item.attemptId === 'a2')?.nativeScore, 75);
});

test('mergeProgressSnapshots unions completed lessons and derives scores from attempts', () => {
  const merged = mergeProgressSnapshots(
    {
      completedLessonIds: ['l1'],
      completedDailySessionIds: ['d1'],
      currentStreak: 2,
      lastPracticeDate: '2026-01-05',
      averageScore: 50,
      bestScore: 50,
      weakAreas: ['old'],
      practiceResults: [
        makeResult({ resultId: 'a1', attemptId: 'a1', lessonId: 'l1', nativeScore: 60 }),
      ],
      englishLevel: 'beginner',
      goals: ['daily_conversation'],
      speakingPriorities: ['pronunciation'],
      dailyMinutes: 5,
      profileUpdatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      englishLevel: 'intermediate',
      primaryGoal: 'travel',
      goals: ['travel'],
      speakingPriorities: ['fluency', 'confidence'],
      dailyMinutes: 10,
      currentStreak: 1,
      bestScore: 90,
      averageScore: 90,
      lastPracticeDate: '2026-01-04',
      completedLessonIds: ['l2'],
      completedDailySessionIds: ['d2'],
      updatedAt: '2026-01-02T00:00:00.000Z',
    },
    [
      {
        clientAttemptId: 'a2',
        lessonId: 'l2',
        segmentId: null,
        practiceMode: 'library',
        overallScore: 90,
        pronunciationScore: 90,
        accuracyScore: 90,
        fluencyScore: 90,
        completenessScore: null,
        prosodyScore: 90,
        wordsToImprove: [],
        weakAreas: [],
        coachFeedback: null,
        createdAt: '2026-01-04T00:00:00.000Z',
        updatedAt: '2026-01-04T00:00:00.000Z',
      },
    ],
  );

  assert.deepEqual(merged.completedLessonIds.sort(), ['l1', 'l2']);
  assert.deepEqual(merged.completedDailySessionIds.sort(), ['d1', 'd2']);
  assert.equal(merged.bestScore, 90);
  assert.equal(merged.averageScore, 75);
  assert.equal(merged.englishLevel, 'intermediate');
  assert.equal(merged.dailyMinutes, 10);
  assert.deepEqual(merged.speakingPriorities, ['fluency', 'confidence']);
});

test('mergeStreak prefers side with newer lastPracticeDate', () => {
  const streak = mergeStreak({
    localStreak: 5,
    remoteStreak: 2,
    localLastPracticeDate: '2026-01-10',
    remoteLastPracticeDate: '2026-01-08',
  });
  assert.equal(streak.currentStreak, 5);
  assert.equal(streak.lastPracticeDate, '2026-01-10');
});

test('weak-word aggregation normalizes and updates scores deterministically', () => {
  assert.equal(normalizeWeakWord('  The! '), 'the');
  assert.equal(normalizeWeakWord(''), null);
  assert.equal(normalizeWeakWord('Perfectly,'), 'perfectly');
  assert.equal(normalizeWeakWord('Wi-Fi'), 'wi-fi');
  assert.equal(normalizeWeakWord('wi-fi'), 'wi-fi');

  const once = applyWeakWordsFromAttempt([], ['The', 'world.'], 60, '2026-01-01T00:00:00.000Z');
  assert.equal(once.length, 2);
  const twice = applyWeakWordsFromAttempt(once, ['the'], 80, '2026-01-02T00:00:00.000Z');
  const theWord = twice.find((item) => item.normalizedWord === 'the');
  assert.ok(theWord);
  assert.equal(theWord?.weakCount, 2);
  assert.equal(theWord?.attemptCount, 2);
  assert.equal(theWord?.bestScore, 80);
  assert.equal(theWord?.lastScore, 80);
});

test('healthy later attempt updates best/average without increasing weakCount', () => {
  const weak = applyWeakWordsFromAttempt(
    [],
    [],
    40,
    '2026-01-01T00:00:00.000Z',
    {
      events: [{ word: 'perfectly', severity: 'severe', score: 40 }],
    },
  );
  const improved = applyWeakWordsFromAttempt(
    weak,
    [],
    90,
    '2026-01-02T00:00:00.000Z',
    {
      events: [],
      healthyWords: ['perfectly'],
      healthyScore: 90,
    },
  );
  const row = improved.find((item) => item.normalizedWord === 'perfectly');
  assert.ok(row);
  assert.equal(row?.weakCount, 1);
  assert.equal(row?.attemptCount, 2);
  assert.equal(row?.bestScore, 90);
  assert.equal(row?.lastScore, 90);
});

test('buildWeakWordAggregatesFromResults is idempotent for duplicate sync', () => {
  const results = [
    makeResult({
      resultId: 'attempt-a',
      attemptId: 'attempt-a',
      lessonId: 'lesson-a',
      wordsToImprove: ['perfectly'],
      pronunciationWeakEvents: [{ word: 'perfectly', severity: 'severe', score: 42 }],
      correctWords: ['she', 'said', 'it'],
      nativeScore: 55,
      createdAt: '2026-01-01T00:00:00.000Z',
    }),
  ];

  const first = buildWeakWordAggregatesFromResults(results, []);
  const second = buildWeakWordAggregatesFromResults(results, first);
  assert.equal(first.length, 1);
  assert.equal(second.length, 1);
  assert.equal(first[0]?.attemptCount, second[0]?.attemptCount);
  assert.equal(first[0]?.weakCount, second[0]?.weakCount);
  assert.equal(first[0]?.lastScore, second[0]?.lastScore);
});

test('pending attempt ids remain stable across retries', () => {
  const first = withStableAttemptId(
    makeResult({ resultId: 'attempt-1', attemptId: 'attempt-1', lessonId: 'l1' }),
  );
  const retry = withStableAttemptId({ ...first, syncStatus: 'pending' });
  assert.equal(resolvePracticeAttemptId(first), resolvePracticeAttemptId(retry));
});

test('practiceResultToRemoteAttempt maps snake-compatible payload and clamps scores', () => {
  const payload = practiceResultToRemoteAttempt(
    makeResult({
      resultId: 'attempt-xyz',
      attemptId: 'attempt-xyz',
      lessonId: 'lesson-1',
      mode: 'daily',
      nativeScore: 140,
      pronunciationScore: -5,
      confidenceScore: 88,
      fluencyScore: 70,
      rhythmScore: 65,
      wordsToImprove: ['the'],
      weakAreasDetected: ['th'],
      aiCoachCommentTr: 'ok',
      nextFocusTr: 'th',
    }),
  );

  assert.equal(payload.clientAttemptId, 'attempt-xyz');
  assert.equal(payload.practiceMode, 'daily');
  assert.equal(payload.overallScore, 100);
  assert.equal(payload.pronunciationScore, 0);
  assert.equal(payload.accuracyScore, 88);
  assert.equal(payload.prosodyScore, 65);
  assert.equal(payload.completenessScore, null);
  assert.deepEqual(payload.wordsToImprove, ['the']);
  assert.deepEqual(payload.weakAreas, ['th']);
  assert.equal(payload.coachFeedback?.aiCoachCommentTr, 'ok');
  assert.equal(typeof payload.coachFeedback, 'object');
  assert.equal(Array.isArray(payload.coachFeedback), false);
});
