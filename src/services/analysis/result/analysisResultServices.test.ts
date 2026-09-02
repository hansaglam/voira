import assert from 'node:assert/strict';
import test from 'node:test';
import type { AiSpeechAnalysisOutput } from '../../ai/aiTypes';
import type { PracticeResult } from '../../../types/learning';
import {
  buildAttemptComparison,
  compareAttempts,
  findComparablePriorAttempt,
} from './analysisAttemptComparisonService';
import { resolvePrimaryTakeaway } from './analysisPrimaryTakeawayService';
import {
  buildRankedWordIssues,
  splitWordIssuePreview,
  wordQualifiesForProfileMessage,
} from './analysisWordFeedbackService';
import { buildWhatWentWell } from './analysisWhatWentWellService';
import { resolveAnalysisCtaEmphasis } from './analysisResultCtaService';
import { createPracticeAttemptId } from '../../sync/attemptId';

function baseAnalysis(overrides: Partial<AiSpeechAnalysisOutput> = {}): AiSpeechAnalysisOutput {
  return {
    transcript: 'hello world',
    wordMatchScore: 80,
    pronunciationScore: 75,
    fluencyScore: 70,
    rhythmScore: 72,
    confidenceScore: 68,
    nativeScore: 72,
    correctWords: ['hello', 'world'],
    missingWords: [],
    wordsToImprove: [],
    weakAreasDetected: [],
    pronunciationIssues: [],
    rhythmIssues: [],
    aiCoachCommentTr: 'coach',
    nextFocusTr: 'focus',
    recommendedLessonIds: [],
    pronunciationAssessmentAvailable: true,
    ...overrides,
  };
}

function practiceResult(partial: Partial<PracticeResult> & { lessonId: string }): PracticeResult {
  const attemptId = partial.attemptId ?? createPracticeAttemptId(partial.lessonId);
  return {
    resultId: attemptId,
    attemptId,
    lessonId: partial.lessonId,
    segmentId: partial.segmentId,
    mode: partial.mode ?? 'library',
    pronunciationScore: partial.pronunciationScore ?? 70,
    fluencyScore: partial.fluencyScore ?? 70,
    rhythmScore: partial.rhythmScore ?? 70,
    confidenceScore: partial.confidenceScore ?? 70,
    nativeScore: partial.nativeScore ?? 70,
    correctWords: partial.correctWords ?? [],
    wordsToImprove: partial.wordsToImprove ?? [],
    weakAreasDetected: partial.weakAreasDetected ?? [],
    aiCoachCommentTr: partial.aiCoachCommentTr ?? '',
    nextFocusTr: partial.nextFocusTr ?? '',
    createdAt: partial.createdAt ?? '2026-01-01T10:00:00.000Z',
    ...partial,
  };
}

test('severe pronunciation becomes primary takeaway', () => {
  const takeaway = resolvePrimaryTakeaway(
    baseAnalysis({
      wordPronunciationFeedback: [
        {
          word: 'perfectly',
          accuracyScore: 38,
          issueType: 'pronunciation',
          severity: 'severe',
        },
      ],
    }),
  );
  assert.equal(takeaway.kind, 'severe_pronunciation');
  assert.equal(takeaway.messageParams?.word, 'perfectly');
});

test('multiple omissions prioritize completeness takeaway', () => {
  const takeaway = resolvePrimaryTakeaway(
    baseAnalysis({
      missingWords: ['wifi', 'please'],
      completenessScore: 55,
      feedbackType: 'missing_words',
    }),
  );
  assert.equal(takeaway.kind, 'completeness');
});

test('low fluency when no severe word issue', () => {
  const takeaway = resolvePrimaryTakeaway(
    baseAnalysis({
      fluencyScore: 52,
      feedbackType: 'fluency_issue',
      wordPronunciationFeedback: [],
    }),
  );
  assert.equal(takeaway.kind, 'low_fluency');
});

test('strong result produces positive takeaway', () => {
  const takeaway = resolvePrimaryTakeaway(
    baseAnalysis({ nativeScore: 90, feedbackType: 'good_result' }),
  );
  assert.equal(takeaway.kind, 'positive');
});

test('severe pronunciation ranked before borderline', () => {
  const issues = buildRankedWordIssues({
    hasRealPronunciation: true,
    wordPronunciationFeedback: [
      { word: 'think', accuracyScore: 58, issueType: 'pronunciation', severity: 'borderline' },
      { word: 'perfectly', accuracyScore: 42, issueType: 'pronunciation', severity: 'severe' },
    ],
  });
  assert.equal(issues[0]?.word, 'perfectly');
});

test('missing content word ranked sensibly', () => {
  const issues = buildRankedWordIssues({
    hasRealPronunciation: true,
    missingWords: ['wifi'],
    wordPronunciationFeedback: [],
  });
  assert.equal(issues[0]?.category, 'missing');
  assert.equal(issues[0]?.word, 'wifi');
});

test('low-confidence not persisted for profile message', () => {
  const issues = buildRankedWordIssues({
    hasRealPronunciation: true,
    wordPronunciationFeedback: [
      { word: 'world', issueType: 'low_confidence', persistAsWeakWord: false },
    ],
  });
  assert.equal(issues[0]?.category, 'uncertain');
  assert.equal(wordQualifiesForProfileMessage(issues[0]!), false);
});

test('max preview count', () => {
  const issues = Array.from({ length: 8 }, (_, i) => ({
    word: `word${i}`,
    category: 'pronunciation' as const,
    rankScore: i,
  }));
  const { preview, remainder } = splitWordIssuePreview(issues, 5);
  assert.equal(preview.length, 5);
  assert.equal(remainder.length, 3);
});

test('same lesson and segment finds prior attempt', () => {
  const prior = practiceResult({
    lessonId: 'l1',
    segmentId: 's1',
    nativeScore: 68,
    createdAt: '2026-01-01T09:00:00.000Z',
  });
  const found = findComparablePriorAttempt([prior], {
    lessonId: 'l1',
    segmentId: 's1',
    mode: 'library',
    attemptId: createPracticeAttemptId('l1'),
    createdAt: '2026-01-01T10:00:00.000Z',
    nativeScore: 79,
  });
  assert.equal(found?.nativeScore, 68);
});

test('different lesson not compared', () => {
  const prior = practiceResult({ lessonId: 'l2', segmentId: 's1', nativeScore: 68 });
  const found = findComparablePriorAttempt([prior], {
    lessonId: 'l1',
    segmentId: 's1',
    mode: 'library',
    attemptId: createPracticeAttemptId('l1'),
    createdAt: '2026-01-01T10:00:00.000Z',
    nativeScore: 79,
  });
  assert.equal(found, null);
});

test('improvement +11', () => {
  const comparison = compareAttempts(79, 68);
  assert.equal(comparison?.delta, 11);
  assert.equal(comparison?.direction, 'improved');
});

test('decrease -5', () => {
  const comparison = compareAttempts(74, 79);
  assert.equal(comparison?.delta, -5);
  assert.equal(comparison?.direction, 'declined');
});

test('near-equal state', () => {
  const comparison = compareAttempts(71, 70);
  assert.equal(comparison?.direction, 'similar');
});

test('no previous attempt', () => {
  const comparison = buildAttemptComparison([], {
    lessonId: 'l1',
    segmentId: 's1',
    mode: 'library',
    attemptId: createPracticeAttemptId('l1'),
    createdAt: '2026-01-01T10:00:00.000Z',
    nativeScore: 79,
  });
  assert.equal(comparison, null);
});

test('meaningful issue emphasizes retry CTA', () => {
  assert.equal(
    resolveAnalysisCtaEmphasis(baseAnalysis({ nativeScore: 55, wordsToImprove: ['hello'] })),
    'retry',
  );
});

test('excellent score emphasizes continue CTA', () => {
  assert.equal(
    resolveAnalysisCtaEmphasis(
      baseAnalysis({ nativeScore: 90, feedbackType: 'good_result', missingWords: [] }),
    ),
    'continue',
  );
});

test('retry creates new attempt id', () => {
  const a = createPracticeAttemptId('lesson-a');
  const b = createPracticeAttemptId('lesson-a');
  assert.notEqual(a, b);
});

test('previous attempt remains in history when appending', () => {
  const first = practiceResult({
    lessonId: 'l1',
    segmentId: 's1',
    nativeScore: 68,
    createdAt: '2026-01-01T09:00:00.000Z',
  });
  const second = practiceResult({
    lessonId: 'l1',
    segmentId: 's1',
    nativeScore: 79,
    createdAt: '2026-01-01T10:00:00.000Z',
  });
  const history = [first, second];
  assert.equal(history.length, 2);
  assert.equal(history[0]?.nativeScore, 68);
});

test('persistent pronunciation word produces profile message eligibility', () => {
  const issues = buildRankedWordIssues({
    hasRealPronunciation: true,
    wordPronunciationFeedback: [
      {
        word: 'perfectly',
        issueType: 'pronunciation',
        severity: 'severe',
        persistAsWeakWord: true,
      },
    ],
  });
  assert.equal(wordQualifiesForProfileMessage(issues[0]!), true);
});

test('missing word does not produce profile message', () => {
  const issues = buildRankedWordIssues({
    hasRealPronunciation: true,
    missingWords: ['wifi'],
  });
  assert.equal(wordQualifiesForProfileMessage(issues[0]!), false);
});
