import assert from 'node:assert/strict';
import test from 'node:test';
import type { PracticeResult } from '../../types/learning';
import { WEAK_WORD_PRACTICE_LESSON_ID } from '../../data/weakWordPracticeLesson';
import {
  filterProfilePracticeResults,
  selectRecentProfileAttempts,
  computeMetricAverages,
  computeSpeakingTrend,
  collectMetricSamples,
} from './profileEvidenceService';
import {
  detectSpeakingFocusAreas,
  resolveStrongestWeakestMetrics,
  resolveUserSpeakingPriorities,
} from './speakingFocusAreaService';
import { buildPersonalSpeakingProfile } from './personalSpeakingProfileService';
import {
  buildSpeakingProgressEvidence,
  resolvePrimaryInsightId,
} from './speakingProgressEvidenceService';
import { buildProfileConsistencySnapshot } from './profileConsistencyService';
import { resolveNextSpeakingFocus, resolvePrimaryCurrentFocus } from './nextSpeakingFocusService';
import { createDefaultLearningProfile } from '../../types/learning';
import { buildWeakWordCatalog } from '../weakWords/weakWordCatalogService';
import type { WeakWordAggregate } from '../sync/mergeProgress';

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
    completenessScore: partial.completenessScore,
    correctWords: partial.correctWords ?? [],
    wordsToImprove: partial.wordsToImprove ?? [],
    pronunciationWeakEvents: partial.pronunciationWeakEvents,
    weakAreasDetected: partial.weakAreasDetected ?? [],
    aiCoachCommentTr: '',
    nextFocusTr: '',
    createdAt: partial.createdAt ?? '2026-01-01T00:00:00.000Z',
  };
}

function makeAggregate(
  partial: Partial<WeakWordAggregate> & Pick<WeakWordAggregate, 'normalizedWord' | 'displayWord'>,
): WeakWordAggregate {
  return {
    attemptCount: partial.attemptCount ?? 2,
    weakCount: partial.weakCount ?? 2,
    bestScore: partial.bestScore ?? partial.lastScore ?? 50,
    lastScore: partial.lastScore ?? 50,
    averageScore: partial.averageScore ?? partial.lastScore ?? 50,
    firstSeenAt: partial.firstSeenAt ?? '2026-01-01T00:00:00.000Z',
    lastSeenAt: partial.lastSeenAt ?? '2026-01-02T00:00:00.000Z',
    recentHealthyStreak: partial.recentHealthyStreak ?? 0,
    dedicatedPracticeCount: partial.dedicatedPracticeCount ?? 0,
    resolvedAt: partial.resolvedAt ?? null,
    ...partial,
  };
}

// Evidence windows
test('recent attempts selected correctly', () => {
  const results = Array.from({ length: 12 }, (_, index) =>
    makeResult({
      resultId: `r${index}`,
      lessonId: 'l1',
      nativeScore: 60 + index,
      createdAt: `2026-01-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`,
    }),
  );
  const recent = selectRecentProfileAttempts(results);
  assert.equal(recent.length, 10);
  assert.equal(recent[0]?.resultId, 'r11');
});

test('old attempts excluded from recent profile average window', () => {
  const recent = Array.from({ length: 10 }, (_, i) =>
    makeResult({
      resultId: `n${i}`,
      lessonId: 'l1',
      nativeScore: 80 + (i % 3),
      createdAt: `2026-08-${String(i + 1).padStart(2, '0')}T00:00:00.000Z`,
    }),
  );
  const results = [
    makeResult({ resultId: 'old', lessonId: 'l1', nativeScore: 20, createdAt: '2025-01-01T00:00:00.000Z' }),
    ...recent,
  ];
  const profile = buildPersonalSpeakingProfile({ practiceResults: results, weakWordCatalog: [] });
  assert.ok((profile.recentAverageScore ?? 0) >= 80);
});

test('synthetic weak-word practice excluded from profile', () => {
  const results = [
    makeResult({
      resultId: 'synthetic',
      lessonId: WEAK_WORD_PRACTICE_LESSON_ID,
      nativeScore: 95,
    }),
    makeResult({ resultId: 'real', lessonId: 'l1', nativeScore: 70 }),
  ];
  assert.equal(filterProfilePracticeResults(results).length, 1);
  const profile = buildPersonalSpeakingProfile({ practiceResults: results, weakWordCatalog: [] });
  assert.equal(profile.totalAnalyzedAttempts, 1);
});

// Metrics
test('strongest metric with sufficient samples', () => {
  const results = [
    makeResult({ resultId: '1', lessonId: 'l1', pronunciationScore: 90, fluencyScore: 60 }),
    makeResult({ resultId: '2', lessonId: 'l1', pronunciationScore: 88, fluencyScore: 62 }),
    makeResult({ resultId: '3', lessonId: 'l1', pronunciationScore: 89, fluencyScore: 61 }),
  ];
  const { strongest } = resolveStrongestWeakestMetrics(results);
  assert.equal(strongest?.metric, 'pronunciation');
});

test('weakest metric requires 2+ eligible metrics', () => {
  const results = [
    makeResult({ resultId: '1', lessonId: 'l1', pronunciationScore: 90, fluencyScore: 60 }),
    makeResult({ resultId: '2', lessonId: 'l1', pronunciationScore: 88, fluencyScore: 62 }),
    makeResult({ resultId: '3', lessonId: 'l1', pronunciationScore: 89, fluencyScore: 61 }),
  ];
  const { weakest } = resolveStrongestWeakestMetrics(results);
  assert.equal(weakest?.metric, 'fluency');
});

test('insufficient samples → no metric claim', () => {
  const results = [makeResult({ resultId: '1', lessonId: 'l1', pronunciationScore: 80, fluencyScore: 70 })];
  const { strongest, weakest } = resolveStrongestWeakestMetrics(results);
  assert.equal(strongest, null);
  assert.equal(weakest, null);
});

test('null metrics ignored', () => {
  const results = [
    makeResult({ resultId: '1', lessonId: 'l1', pronunciationScore: NaN, fluencyScore: 70 }),
    makeResult({ resultId: '2', lessonId: 'l1', pronunciationScore: NaN, fluencyScore: 72 }),
    makeResult({ resultId: '3', lessonId: 'l1', pronunciationScore: NaN, fluencyScore: 71 }),
  ];
  const averages = computeMetricAverages(results);
  assert.equal(averages.pronunciation, undefined);
  assert.ok(typeof averages.fluency === 'number');
});

test('non-finite metrics ignored', () => {
  const samples = collectMetricSamples(
    [makeResult({ resultId: '1', lessonId: 'l1', rhythmScore: Infinity })],
    'prosody',
  );
  assert.equal(samples.length, 0);
});

// Trend
test('<4 attempts → insufficient trend', () => {
  const results = [
    makeResult({ resultId: '1', lessonId: 'l1', nativeScore: 60 }),
    makeResult({ resultId: '2', lessonId: 'l1', nativeScore: 62 }),
  ];
  assert.equal(computeSpeakingTrend(results).trend, 'insufficient_data');
});

test('improving recent trend', () => {
  const results = [
    makeResult({ resultId: '1', lessonId: 'l1', nativeScore: 60, createdAt: '2026-01-01T00:00:00.000Z' }),
    makeResult({ resultId: '2', lessonId: 'l1', nativeScore: 62, createdAt: '2026-01-02T00:00:00.000Z' }),
    makeResult({ resultId: '3', lessonId: 'l1', nativeScore: 74, createdAt: '2026-01-03T00:00:00.000Z' }),
    makeResult({ resultId: '4', lessonId: 'l1', nativeScore: 76, createdAt: '2026-01-04T00:00:00.000Z' }),
  ];
  assert.equal(computeSpeakingTrend(results).trend, 'improving');
});

test('stable trend', () => {
  const results = [
    makeResult({ resultId: '1', lessonId: 'l1', nativeScore: 70, createdAt: '2026-01-01T00:00:00.000Z' }),
    makeResult({ resultId: '2', lessonId: 'l1', nativeScore: 71, createdAt: '2026-01-02T00:00:00.000Z' }),
    makeResult({ resultId: '3', lessonId: 'l1', nativeScore: 70, createdAt: '2026-01-03T00:00:00.000Z' }),
    makeResult({ resultId: '4', lessonId: 'l1', nativeScore: 71, createdAt: '2026-01-04T00:00:00.000Z' }),
  ];
  assert.equal(computeSpeakingTrend(results).trend, 'stable');
});

test('declining trend', () => {
  const results = [
    makeResult({ resultId: '1', lessonId: 'l1', nativeScore: 78, createdAt: '2026-01-01T00:00:00.000Z' }),
    makeResult({ resultId: '2', lessonId: 'l1', nativeScore: 76, createdAt: '2026-01-02T00:00:00.000Z' }),
    makeResult({ resultId: '3', lessonId: 'l1', nativeScore: 62, createdAt: '2026-01-03T00:00:00.000Z' }),
    makeResult({ resultId: '4', lessonId: 'l1', nativeScore: 60, createdAt: '2026-01-04T00:00:00.000Z' }),
  ];
  assert.equal(computeSpeakingTrend(results).trend, 'declining');
});

test('one outlier does not dominate unexpectedly when outside recent window', () => {
  const results = [
    makeResult({ resultId: 'outlier', lessonId: 'l1', nativeScore: 10, createdAt: '2024-01-01T00:00:00.000Z' }),
    ...Array.from({ length: 10 }, (_, i) =>
      makeResult({
        resultId: `r${i}`,
        lessonId: 'l1',
        nativeScore: 72,
        createdAt: `2026-08-${String(i + 1).padStart(2, '0')}T00:00:00.000Z`,
      }),
    ),
  ];
  assert.equal(computeSpeakingTrend(results).trend, 'stable');
});

// Focus areas
test('repeated weak pronunciation → pronunciation focus', () => {
  const results = [
    makeResult({
      resultId: '1',
      lessonId: 'l1',
      pronunciationScore: 55,
      pronunciationWeakEvents: [{ word: 'world', severity: 'severe', score: 40 }],
    }),
    makeResult({
      resultId: '2',
      lessonId: 'l1',
      pronunciationScore: 58,
      pronunciationWeakEvents: [{ word: 'work', severity: 'severe', score: 42 }],
    }),
  ];
  const areas = detectSpeakingFocusAreas({
    practiceResults: results,
    weakWordCatalog: [],
    weakestMetric: null,
  });
  assert.ok(areas.includes('pronunciation'));
});

test('low fluency → fluency focus', () => {
  const results = Array.from({ length: 3 }, (_, i) =>
    makeResult({
      resultId: `f${i}`,
      lessonId: 'l1',
      fluencyScore: 55,
      pronunciationScore: 80,
    }),
  );
  const areas = detectSpeakingFocusAreas({
    practiceResults: results,
    weakWordCatalog: [],
    weakestMetric: { metric: 'fluency', average: 55 },
  });
  assert.ok(areas.includes('fluency'));
});

test('many active weak words → weak_words focus', () => {
  const catalog = buildWeakWordCatalog([
    makeAggregate({ normalizedWord: 'a', displayWord: 'a', lastScore: 50 }),
    makeAggregate({ normalizedWord: 'b', displayWord: 'b', lastScore: 48 }),
    makeAggregate({ normalizedWord: 'c', displayWord: 'c', lastScore: 45 }),
  ]);
  const areas = detectSpeakingFocusAreas({
    practiceResults: [],
    weakWordCatalog: catalog,
    weakestMetric: null,
  });
  assert.ok(areas.includes('weak_words'));
});

test('max 3 focus areas', () => {
  const catalog = buildWeakWordCatalog([
    makeAggregate({ normalizedWord: 'a', displayWord: 'a', lastScore: 40 }),
    makeAggregate({ normalizedWord: 'b', displayWord: 'b', lastScore: 42 }),
    makeAggregate({ normalizedWord: 'c', displayWord: 'c', lastScore: 44 }),
  ]);
  const results = Array.from({ length: 3 }, (_, i) =>
    makeResult({
      resultId: `x${i}`,
      lessonId: 'l1',
      fluencyScore: 50,
      pronunciationScore: 55,
      pronunciationWeakEvents: [{ word: 'w', severity: 'severe', score: 40 }],
      completenessScore: 50,
    }),
  );
  const areas = detectSpeakingFocusAreas({
    practiceResults: results,
    weakWordCatalog: catalog,
    weakestMetric: { metric: 'fluency', average: 50 },
  });
  assert.ok(areas.length <= 3);
});

test('user vocabulary priority does not become detected weakness without evidence', () => {
  const priorities = resolveUserSpeakingPriorities(['vocabulary', 'confidence']);
  const areas = detectSpeakingFocusAreas({
    practiceResults: [],
    weakWordCatalog: [],
    weakestMetric: null,
  });
  assert.deepEqual(priorities, ['vocabulary', 'confidence']);
  assert.ok(!areas.includes('vocabulary' as never));
});

// Goal alignment
test('user priorities preserved separately', () => {
  const profile = buildPersonalSpeakingProfile({
    practiceResults: [],
    weakWordCatalog: [],
    userPriorities: ['vocabulary', 'confidence'],
  });
  assert.deepEqual(profile.userPriorities, ['vocabulary', 'confidence']);
});

test('detected focus independently derived', () => {
  const profile = buildPersonalSpeakingProfile({
    practiceResults: [
      makeResult({ resultId: '1', lessonId: 'l1', fluencyScore: 55, pronunciationScore: 80 }),
      makeResult({ resultId: '2', lessonId: 'l1', fluencyScore: 54, pronunciationScore: 82 }),
      makeResult({ resultId: '3', lessonId: 'l1', fluencyScore: 56, pronunciationScore: 81 }),
    ],
    weakWordCatalog: [],
    userPriorities: ['vocabulary'],
  });
  assert.ok(profile.detectedFocusAreas.includes('fluency'));
  assert.ok(!profile.userPriorities.includes('fluency'));
});

// Insight
test('insufficient-data insight', () => {
  assert.equal(
    resolvePrimaryInsightId({
      totalAttempts: 0,
      recentTrend: 'insufficient_data',
      detectedFocusAreas: [],
      improvingWeakWordCount: 0,
      weakestMetric: null,
    }),
    'profile_insufficient_data',
  );
});

test('improving insight', () => {
  assert.equal(
    resolvePrimaryInsightId({
      totalAttempts: 5,
      recentTrend: 'improving',
      detectedFocusAreas: [],
      improvingWeakWordCount: 0,
      weakestMetric: null,
    }),
    'profile_recent_improvement',
  );
});

test('pronunciation-focus insight', () => {
  assert.equal(
    resolvePrimaryInsightId({
      totalAttempts: 5,
      recentTrend: 'stable',
      detectedFocusAreas: ['pronunciation'],
      improvingWeakWordCount: 0,
      weakestMetric: 'pronunciation',
    }),
    'profile_pronunciation_focus',
  );
});

test('balanced progress insight', () => {
  assert.equal(
    resolvePrimaryInsightId({
      totalAttempts: 5,
      recentTrend: 'stable',
      detectedFocusAreas: [],
      improvingWeakWordCount: 0,
      weakestMetric: null,
    }),
    'profile_balanced_progress',
  );
});

// Progress evidence
test('retry improvement surfaced', () => {
  const results = [
    makeResult({
      resultId: '2',
      lessonId: 'l1',
      segmentId: 's1',
      nativeScore: 82,
      createdAt: '2026-01-02T00:00:00.000Z',
    }),
    makeResult({
      resultId: '1',
      lessonId: 'l1',
      segmentId: 's1',
      nativeScore: 65,
      createdAt: '2026-01-01T00:00:00.000Z',
    }),
  ];
  const evidence = buildSpeakingProgressEvidence({
    practiceResults: results,
    weakWordCatalog: [],
    recentTrend: 'stable',
    recentTrendDelta: null,
  });
  assert.ok(evidence.some((item) => item.kind === 'retry_improvement'));
});

test('improving weak words surfaced', () => {
  const catalog = buildWeakWordCatalog([
    makeAggregate({
      normalizedWord: 'word',
      displayWord: 'word',
      attemptCount: 4,
      weakCount: 3,
      lastScore: 74,
      averageScore: 58,
    }),
  ]);
  const evidence = buildSpeakingProgressEvidence({
    practiceResults: [],
    weakWordCatalog: catalog,
    recentTrend: 'stable',
    recentTrendDelta: null,
  });
  assert.ok(evidence.some((item) => item.kind === 'weak_words_improving'));
});

test('mastered word surfaced', () => {
  const catalog = buildWeakWordCatalog([
    makeAggregate({
      normalizedWord: 'word',
      displayWord: 'word',
      attemptCount: 6,
      weakCount: 3,
      lastScore: 85,
      averageScore: 62,
      recentHealthyStreak: 2,
      dedicatedPracticeCount: 2,
    }),
  ]);
  const evidence = buildSpeakingProgressEvidence({
    practiceResults: [],
    weakWordCatalog: catalog,
    recentTrend: 'stable',
    recentTrendDelta: null,
  });
  assert.ok(evidence.some((item) => item.kind === 'weak_word_mastered'));
});

test('max evidence item count respected', () => {
  const catalog = buildWeakWordCatalog([
    makeAggregate({
      normalizedWord: 'a',
      displayWord: 'a',
      attemptCount: 4,
      weakCount: 3,
      lastScore: 74,
      averageScore: 58,
    }),
    makeAggregate({
      normalizedWord: 'b',
      displayWord: 'b',
      attemptCount: 6,
      weakCount: 3,
      lastScore: 85,
      averageScore: 62,
      recentHealthyStreak: 2,
    }),
  ]);
  const results = [
    makeResult({
      resultId: '2',
      lessonId: 'l1',
      segmentId: 's1',
      nativeScore: 90,
      createdAt: '2026-01-02T00:00:00.000Z',
    }),
    makeResult({
      resultId: '1',
      lessonId: 'l1',
      segmentId: 's1',
      nativeScore: 70,
      createdAt: '2026-01-01T00:00:00.000Z',
    }),
  ];
  const evidence = buildSpeakingProgressEvidence({
    practiceResults: results,
    weakWordCatalog: catalog,
    recentTrend: 'improving',
    recentTrendDelta: 8,
  });
  assert.ok(evidence.length <= 3);
});

// Consistency
test('weekly practice count uses normal attempts only', () => {
  const now = Date.parse('2026-08-12T12:00:00.000Z');
  const results = [
    makeResult({
      resultId: '1',
      lessonId: 'l1',
      createdAt: '2026-08-10T10:00:00.000Z',
    }),
    makeResult({
      resultId: '2',
      lessonId: 'l1',
      createdAt: '2026-08-11T10:00:00.000Z',
    }),
  ];
  const snapshot = buildProfileConsistencySnapshot({
    profile: createDefaultLearningProfile({ currentStreak: 2 }),
    practiceResults: results,
    nowMs: now,
  });
  assert.equal(snapshot.practicesThisWeek, 2);
});

test('weak-word training does not inflate consistency', () => {
  const now = Date.parse('2026-08-12T12:00:00.000Z');
  const results = [
    makeResult({
      resultId: 'synthetic',
      lessonId: WEAK_WORD_PRACTICE_LESSON_ID,
      createdAt: '2026-08-10T10:00:00.000Z',
    }),
    makeResult({
      resultId: 'real',
      lessonId: 'l1',
      createdAt: '2026-08-11T10:00:00.000Z',
    }),
  ];
  const snapshot = buildProfileConsistencySnapshot({
    profile: createDefaultLearningProfile(),
    practiceResults: results,
    nowMs: now,
  });
  assert.equal(snapshot.practicesThisWeek, 1);
});

test('streak uses canonical existing source', () => {
  const snapshot = buildProfileConsistencySnapshot({
    profile: createDefaultLearningProfile({ currentStreak: 4 }),
    practiceResults: [makeResult({ resultId: '1', lessonId: 'l1' })],
  });
  assert.equal(snapshot.currentStreak, 4);
});

// Cross-screen consistency
test('Home and Progress resolve same current focus', () => {
  const results = [
    makeResult({ resultId: '1', lessonId: 'l1', fluencyScore: 55, pronunciationScore: 80 }),
    makeResult({ resultId: '2', lessonId: 'l1', fluencyScore: 54, pronunciationScore: 82 }),
    makeResult({ resultId: '3', lessonId: 'l1', fluencyScore: 56, pronunciationScore: 81 }),
  ];
  const profile = buildPersonalSpeakingProfile({ practiceResults: results, weakWordCatalog: [] });
  const focus = resolvePrimaryCurrentFocus(profile);
  assert.equal(focus, profile.detectedFocusAreas[0] ?? 'fluency');
});

test('profile rehydrate yields same derived values', () => {
  const input = {
    practiceResults: [
      makeResult({ resultId: '1', lessonId: 'l1', nativeScore: 70 }),
      makeResult({ resultId: '2', lessonId: 'l1', nativeScore: 72 }),
      makeResult({ resultId: '3', lessonId: 'l1', nativeScore: 74 }),
      makeResult({ resultId: '4', lessonId: 'l1', nativeScore: 76 }),
    ],
    weakWordCatalog: [] as ReturnType<typeof buildWeakWordCatalog>,
    userPriorities: ['pronunciation' as const],
  };
  const first = buildPersonalSpeakingProfile(input);
  const second = buildPersonalSpeakingProfile(input);
  assert.deepEqual(first, second);
});

test('next focus recommends weak words when severe active words exist', () => {
  const catalog = buildWeakWordCatalog([
    makeAggregate({ normalizedWord: 'a', displayWord: 'a', lastScore: 35 }),
    makeAggregate({ normalizedWord: 'b', displayWord: 'b', lastScore: 38 }),
  ]);
  const profile = buildPersonalSpeakingProfile({ practiceResults: [], weakWordCatalog: catalog });
  const next = resolveNextSpeakingFocus({
    profile,
    weakWordCatalog: catalog,
    userPriorities: [],
    practiceResults: [],
  });
  assert.equal(next, 'next_weak_words_practice');
});
