import test from 'node:test';
import assert from 'node:assert/strict';
import { compareTranscriptToTarget } from './textComparisonService.js';
import { buildCoachFeedbackTr } from './coachFeedbackService.js';
import { buildAnalysisScores, buildScoresFromComparison } from './speechScoreService.js';
import { detectWeakAreas } from './weakAreaDetectionService.js';
import type { PronunciationAssessmentResult } from './pronunciationAssessment/pronunciationAssessmentTypes.js';

test('compareTranscriptToTarget detects correct and missing words', () => {
  const result = compareTranscriptToTarget(
    'i would like a latte please',
    'I would like a latte, please.',
  );

  assert.ok(result.matchPercent >= 80);
  assert.ok(result.correctWords.includes('latte'));
  assert.equal(result.missingWords.length, 0);
});

test('compareTranscriptToTarget reports partial mismatch', () => {
  const result = compareTranscriptToTarget(
    'i want coffee',
    'I would like a latte, please.',
  );

  assert.ok(result.matchPercent < 60);
  assert.ok(result.missingWords.length > 0);
});

test('compareTranscriptToTarget keeps missing words out of wordsToImprove', () => {
  const target = 'Good morning! How are you doing today?';
  const transcript = 'good morning';
  const result = compareTranscriptToTarget(transcript, target);

  assert.deepEqual(result.correctWords, ['good', 'morning']);
  assert.ok(result.missingWords.includes('how'));
  assert.ok(result.missingWords.includes('doing'));
  assert.deepEqual(result.wordsToImprove, []);
});

test('compareTranscriptToTarget separates missing words from close matches', () => {
  const target = 'I have experience in customer service and sales.';
  const transcript = 'I have customer service.';
  const result = compareTranscriptToTarget(transcript, target);

  assert.deepEqual(result.correctWords, ['i', 'have', 'customer', 'service']);
  assert.deepEqual(result.missingWords, ['experience', 'in', 'and', 'sales']);
  assert.deepEqual(result.wordsToImprove, []);
});

test('compareTranscriptToTarget puts close mismatches in wordsToImprove only', () => {
  const target = 'I think that is enough';
  const transcript = 'i thnk that is enough';
  const result = compareTranscriptToTarget(transcript, target);

  assert.ok(result.wordsToImprove.includes('think'));
  assert.ok(!result.missingWords.includes('think'));
});

test('buildAnalysisScores returns low scores for poor match', () => {
  const comparison = compareTranscriptToTarget('hello', 'I would like a latte, please.');
  const scores = buildAnalysisScores({
    comparison,
    durationMillis: 2500,
    targetText: 'I would like a latte, please.',
  });

  assert.ok(scores.nativeScore < 40);
  assert.ok(scores.pronunciationScore < 40);
  assert.equal(scores.analysisMode, 'text_match_only');
  assert.equal(scores.pronunciationAssessmentAvailable, false);
});

test('buildAnalysisScores caps native score when pronunciation assessment is disabled', () => {
  const target = 'Can I get a medium latte?';
  const comparison = compareTranscriptToTarget('can i get a medium latte', target);
  const scores = buildAnalysisScores({
    comparison,
    durationMillis: 3200,
    targetText: target,
  });

  assert.equal(scores.matchScore, 100);
  assert.equal(scores.analysisMode, 'text_match_only');
  assert.ok(scores.pronunciationScore <= 70);
  assert.ok(scores.nativeScore <= 80);
  assert.ok(scores.nativeScore < 96);
});

test('buildAnalysisScores allows high native score when pronunciation provider succeeds', () => {
  const target = 'Can I get a medium latte?';
  const comparison = compareTranscriptToTarget('can i get a medium latte', target);
  const pronunciationAssessment: PronunciationAssessmentResult = {
    ok: true,
    pronunciationScore: 92,
    fluencyScore: 90,
    completenessScore: 98,
    prosodyScore: 88,
    accuracyScore: 92,
  };

  const scores = buildAnalysisScores({
    comparison,
    durationMillis: 3200,
    targetText: target,
    pronunciationAssessment,
  });

  assert.equal(scores.analysisMode, 'pronunciation_assessment');
  assert.equal(scores.pronunciationAssessmentAvailable, true);
  assert.ok(scores.nativeScore >= 88);
});

test('buildScoresFromComparison remains compatible with text-match-only scoring', () => {
  const target = 'Can I get a medium latte?';
  const comparison = compareTranscriptToTarget('can i get a medium latte', target);
  const scores = buildScoresFromComparison(comparison, 3200, target);

  assert.ok(scores.matchScore >= 80);
  assert.ok(scores.nativeScore <= 80);
});

test('detectWeakAreas flags th sound when missing', () => {
  const target = 'I think that is enough';
  const transcript = 'i thnk that is enough';
  const comparison = compareTranscriptToTarget(transcript, target);
  const weak = detectWeakAreas(target, transcript, comparison, 2800);

  assert.ok(weak.includes('th sesi'));
  assert.ok(weak.length <= 3);
});

test('detectWeakAreas avoids w/v noise for unrelated low-match sentences', () => {
  const target = 'Good morning! How are you doing today?';
  const transcript = 'good night i m fine';
  const comparison = compareTranscriptToTarget(transcript, target);
  const weak = detectWeakAreas(target, transcript, comparison, 3126);

  assert.ok(comparison.matchPercent < 25);
  assert.ok(weak.includes('hedef cümle'));
  assert.ok(weak.includes('eksik kelimeler'));
  assert.ok(!weak.includes('w / v farkı'));
  assert.ok(weak.length <= 3);
});

test('detectWeakAreas flags w/v only for clear contrast words in target', () => {
  const target = 'We want to visit the village';
  const transcript = 'we went to visit a village';
  const comparison = compareTranscriptToTarget(transcript, target);

  assert.ok(comparison.matchPercent >= 25);
  assert.ok(detectWeakAreas(target, transcript, comparison, 3200).includes('w / v farkı'));
});

test('buildCoachFeedbackTr uses low-score copy for poor matches', () => {
  const target = 'Good morning! How are you doing today?';
  const transcript = 'good night i m fine';
  const comparison = compareTranscriptToTarget(transcript, target);
  const scores = buildAnalysisScores({
    comparison,
    durationMillis: 3126,
    targetText: target,
  });
  const coach = buildCoachFeedbackTr({
    targetText: target,
    transcript,
    comparison,
    scores,
    weakAreas: detectWeakAreas(target, transcript, comparison, 3126),
    analysisMode: scores.analysisMode,
    matchScore: scores.matchScore,
  });

  assert.ok(scores.nativeScore < 55);
  assert.match(
    coach.aiCoachCommentTr,
    /hedef cümleyle eşleşme düşük görünüyor/i,
  );
});

test('buildCoachFeedbackTr prioritizes missing-word guidance when words were not spoken', () => {
  const target = 'I have experience in customer service and sales.';
  const transcript = 'I have customer service.';
  const comparison = compareTranscriptToTarget(transcript, target);
  const scores = buildAnalysisScores({
    comparison,
    durationMillis: 3200,
    targetText: target,
  });
  const coach = buildCoachFeedbackTr({
    targetText: target,
    transcript,
    comparison,
    scores,
    weakAreas: detectWeakAreas(target, transcript, comparison, 3200),
    analysisMode: scores.analysisMode,
    matchScore: scores.matchScore,
  });

  assert.match(coach.aiCoachCommentTr, /eksik kaldı/i);
  assert.equal(
    coach.nextFocusTr,
    'Bir sonraki denemede cümleyi baştan sona tamamlamaya odaklan.',
  );
  assert.doesNotMatch(coach.aiCoachCommentTr, /daha net söylemeye çalış/i);
});

test('strict scoring: partial check-in counter transcript misses function words', () => {
  const target = 'Where is the check-in counter for this flight?';
  const transcript = 'Where is the check in counter';
  const comparison = compareTranscriptToTarget(transcript, target);

  assert.ok(comparison.missingWords.includes('for'));
  assert.ok(comparison.missingWords.includes('this'));
  assert.ok(comparison.missingWords.includes('flight'));
  assert.ok(comparison.coveragePercent < 75);

  const scores = buildAnalysisScores({
    comparison,
    durationMillis: 3200,
    targetText: target,
  });

  assert.ok(scores.nativeScore < 80);
  assert.ok(scores.nativeScore <= 72);
});

test('strict scoring: customer service partial transcript stays below 55', () => {
  const target = 'I have experience in customer service and sales.';
  const transcript = 'I have customer service';
  const comparison = compareTranscriptToTarget(transcript, target);
  const scores = buildAnalysisScores({
    comparison,
    durationMillis: 3200,
    targetText: target,
  });

  assert.deepEqual(comparison.missingWords, ['experience', 'in', 'and', 'sales']);
  assert.ok(scores.nativeScore < 55);
});

test('strict scoring: iced latte missing an and please stays below 80', () => {
  const target = 'Can I get an iced latte, please?';
  const transcript = 'Can I get iced latte';
  const comparison = compareTranscriptToTarget(transcript, target);
  const scores = buildAnalysisScores({
    comparison,
    durationMillis: 2800,
    targetText: target,
  });

  assert.ok(comparison.missingWords.includes('an'));
  assert.ok(comparison.missingWords.includes('please'));
  assert.ok(scores.nativeScore < 80);
  assert.ok(scores.matchScore < 100);
});

test('strict scoring: full correct transcript gets high coverage and score', () => {
  const target = 'Can I get a medium latte?';
  const transcript = 'can i get a medium latte';
  const comparison = compareTranscriptToTarget(transcript, target);
  const scores = buildAnalysisScores({
    comparison,
    durationMillis: 3200,
    targetText: target,
  });

  assert.ok(comparison.coveragePercent >= 95);
  assert.equal(scores.matchScore, 100);
  assert.ok(scores.nativeScore >= 70);
  assert.ok(scores.nativeScore <= 80);
});

test('strict scoring: very short recording caps native score', () => {
  const target = 'Where is the check-in counter for this flight?';
  const transcript = 'Where is the check in counter for this flight';
  const comparison = compareTranscriptToTarget(transcript, target);
  const scores = buildAnalysisScores({
    comparison,
    durationMillis: 1400,
    targetText: target,
  });

  assert.ok(scores.nativeScore <= 60);
});

test('buildCoachFeedbackTr avoids native pronunciation claims in text_match_only mode', () => {
  const target = 'Can I get a medium latte?';
  const transcript = 'can i get a medium latte';
  const comparison = compareTranscriptToTarget(transcript, target);
  const scores = buildAnalysisScores({
    comparison,
    durationMillis: 3200,
    targetText: target,
  });
  const coach = buildCoachFeedbackTr({
    targetText: target,
    transcript,
    comparison,
    scores,
    weakAreas: [],
    analysisMode: scores.analysisMode,
    matchScore: scores.matchScore,
  });

  assert.equal(scores.analysisMode, 'text_match_only');
  assert.doesNotMatch(coach.aiCoachCommentTr, /native/i);
  assert.doesNotMatch(coach.aiCoachCommentTr, /çok doğal telaffuz/i);
  assert.match(coach.aiCoachCommentTr, /kelime eşleş/i);
});
