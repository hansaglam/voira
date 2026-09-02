import test from 'node:test';
import assert from 'node:assert/strict';
import { compareTranscriptToTarget } from './textComparisonService.js';
import { buildCoachFeedbackTr, resolveCoachFeedbackDecision } from './coachFeedbackService.js';
import { applyAnalysisFeedbackPresentation } from './analysisFeedbackPresentationService.js';
import { reconcileWordFeedback } from './wordFeedbackReconciliationService.js';
import { buildAnalysisScores, buildScoresFromComparison } from './speechScoreService.js';
import { detectWeakAreas } from './weakAreaDetectionService.js';
import {
  buildPhonemeFeedback,
  buildWordPronunciationFeedback,
} from './pronunciationFeedbackService.js';
import { getPronunciationSkipReason, isAzurePronunciationConfigured } from './pronunciationAssessment/pronunciationAssessmentConfig.js';
import {
  buildPronunciationAssessmentDebug,
  resolvePronunciationDecision,
} from './pronunciationAssessment/pronunciationAssessmentProvider.js';
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
    provider: 'azure',
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
    uiLanguage: 'tr',
    targetText: target,
    transcript,
    comparison,
    scores,
    weakAreas: detectWeakAreas(target, transcript, comparison, 3126),
    analysisMode: scores.analysisMode,
    matchScore: scores.matchScore,
  });

  assert.ok(scores.nativeScore < 55);
  assert.equal(coach.feedbackType, 'wrong_sentence');
  assert.match(
    coach.aiCoachCommentTr,
    /Hedef cümleden farklı bir şey söyledin/i,
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
    uiLanguage: 'tr',
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
    uiLanguage: 'tr',
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
  assert.match(coach.aiCoachCommentTr, /kelime eşleş|Azure telaffuz/i);
});

test('azure scoring allows 85+ when pronunciation assessment succeeds on full match', () => {
  const target = 'Can I get a medium latte?';
  const comparison = compareTranscriptToTarget('can i get a medium latte', target);
  const pronunciationAssessment: PronunciationAssessmentResult = {
    ok: true,
    provider: 'azure',
    pronunciationScore: 92,
    accuracyScore: 91,
    fluencyScore: 90,
    completenessScore: 98,
    prosodyScore: 88,
    wordScores: [
      { word: 'can', accuracyScore: 95 },
      { word: 'medium', accuracyScore: 93 },
      { word: 'latte', accuracyScore: 90 },
    ],
  };

  const scores = buildAnalysisScores({
    comparison,
    durationMillis: 3200,
    targetText: target,
    pronunciationAssessment,
  });

  assert.equal(scores.analysisMode, 'pronunciation_assessment');
  assert.equal(scores.scoreSource, 'azure_pronunciation');
  assert.equal(scores.pronunciationProvider, 'azure');
  assert.ok(scores.nativeScore >= 85);
});

test('azure scoring caps final score when transcript coverage is very low', () => {
  const target = 'I think that is enough for today';
  const comparison = compareTranscriptToTarget('i think', target);
  const pronunciationAssessment: PronunciationAssessmentResult = {
    ok: true,
    provider: 'azure',
    pronunciationScore: 92,
    accuracyScore: 90,
    fluencyScore: 88,
    completenessScore: 40,
    prosodyScore: 85,
  };

  const scores = buildAnalysisScores({
    comparison,
    durationMillis: 3200,
    targetText: target,
    pronunciationAssessment,
  });

  assert.ok(scores.nativeScore <= 65);
});

test('azure scoring caps final score when transcript is too short', () => {
  const target = 'Where is the check-in counter for this flight?';
  const comparison = compareTranscriptToTarget('where is', target);
  const pronunciationAssessment: PronunciationAssessmentResult = {
    ok: true,
    provider: 'azure',
    pronunciationScore: 90,
    accuracyScore: 88,
    fluencyScore: 86,
    completenessScore: 88,
    prosodyScore: 84,
  };

  const scores = buildAnalysisScores({
    comparison,
    durationMillis: 3200,
    targetText: target,
    pronunciationAssessment,
  });

  assert.ok(scores.nativeScore <= 55);
});

test('buildCoachFeedbackTr mentions weak azure words in pronunciation mode', () => {
  const target = 'I think that is enough';
  const transcript = 'i think that is enough';
  const comparison = compareTranscriptToTarget(transcript, target);
  const pronunciationAssessment: PronunciationAssessmentResult = {
    ok: true,
    provider: 'azure',
    pronunciationScore: 78,
    accuracyScore: 72,
    fluencyScore: 80,
    completenessScore: 98,
    prosodyScore: 75,
    wordScores: [
      { word: 'think', accuracyScore: 58, errorType: 'Mispronunciation' },
    ],
  };
  const scores = buildAnalysisScores({
    comparison,
    durationMillis: 3200,
    targetText: target,
    pronunciationAssessment,
  });
  const coach = buildCoachFeedbackTr({
    uiLanguage: 'tr',
    targetText: target,
    transcript,
    comparison,
    scores,
    weakAreas: [],
    analysisMode: scores.analysisMode,
    matchScore: scores.matchScore,
    pronunciationAssessment,
  });

  assert.match(coach.aiCoachCommentTr, /think/i);
  assert.match(coach.aiCoachCommentTr, /telaffuz/i);
  assert.doesNotMatch(coach.aiCoachCommentTr, /Kelimeleri doğru sırayla söyledin/i);
});

test('azure coach feedback prioritizes wrong sentence over pronunciation tips', () => {
  const target = 'Where is the check-in counter for this flight?';
  const transcript = 'good morning';
  const comparison = compareTranscriptToTarget(transcript, target);
  const pronunciationAssessment: PronunciationAssessmentResult = {
    ok: true,
    provider: 'azure',
    pronunciationScore: 88,
    accuracyScore: 90,
    fluencyScore: 85,
    completenessScore: 35,
    prosodyScore: 82,
    wordScores: [
      { word: 'good', accuracyScore: 92 },
      { word: 'morning', accuracyScore: 88 },
    ],
  };
  const scores = buildAnalysisScores({
    comparison,
    durationMillis: 2800,
    targetText: target,
    pronunciationAssessment,
  });
  const coach = buildCoachFeedbackTr({
    uiLanguage: 'tr',
    targetText: target,
    transcript,
    comparison,
    scores,
    weakAreas: detectWeakAreas(target, transcript, comparison, 2800),
    analysisMode: scores.analysisMode,
    matchScore: scores.matchScore,
    pronunciationAssessment,
  });

  assert.equal(scores.analysisMode, 'pronunciation_assessment');
  assert.match(coach.aiCoachCommentTr, /Hedef cümleden farklı bir şey söyledin/i);
  assert.doesNotMatch(coach.aiCoachCommentTr, /Kelimeleri doğru sırayla söyledin/i);
});

test('azure coach feedback focuses on completion when words are missing', () => {
  const target = 'I have experience in customer service and sales.';
  const transcript = 'I have customer service.';
  const comparison = compareTranscriptToTarget(transcript, target);
  const pronunciationAssessment: PronunciationAssessmentResult = {
    ok: true,
    provider: 'azure',
    pronunciationScore: 82,
    accuracyScore: 80,
    fluencyScore: 78,
    completenessScore: 55,
    prosodyScore: 76,
    wordScores: [
      { word: 'have', accuracyScore: 88 },
      { word: 'customer', accuracyScore: 85 },
      { word: 'service', accuracyScore: 84 },
    ],
  };
  const scores = buildAnalysisScores({
    comparison,
    durationMillis: 3200,
    targetText: target,
    pronunciationAssessment,
  });
  const coach = buildCoachFeedbackTr({
    uiLanguage: 'tr',
    targetText: target,
    transcript,
    comparison,
    scores,
    weakAreas: [],
    analysisMode: scores.analysisMode,
    matchScore: scores.matchScore,
    pronunciationAssessment,
  });

  assert.match(coach.aiCoachCommentTr, /atladın|eksik/i);
  assert.match(coach.aiCoachCommentTr, /Eksik kalan kelimeler/i);
  assert.doesNotMatch(coach.aiCoachCommentTr, /Kelimeleri doğru sırayla söyledin/i);
});

test('azure coach feedback mentions low fluency when rhythm is weak', () => {
  const target = 'Can I get a medium latte?';
  const transcript = 'can i get a medium latte';
  const comparison = compareTranscriptToTarget(transcript, target);
  const pronunciationAssessment: PronunciationAssessmentResult = {
    ok: true,
    provider: 'azure',
    pronunciationScore: 82,
    accuracyScore: 80,
    fluencyScore: 62,
    completenessScore: 98,
    prosodyScore: 78,
    wordScores: [
      { word: 'can', accuracyScore: 90 },
      { word: 'medium', accuracyScore: 88 },
      { word: 'latte', accuracyScore: 86 },
    ],
  };
  const scores = buildAnalysisScores({
    comparison,
    durationMillis: 3200,
    targetText: target,
    pronunciationAssessment,
  });
  const coach = buildCoachFeedbackTr({
    uiLanguage: 'tr',
    targetText: target,
    transcript,
    comparison,
    scores,
    weakAreas: [],
    analysisMode: scores.analysisMode,
    matchScore: scores.matchScore,
    pronunciationAssessment,
  });

  assert.match(coach.aiCoachCommentTr, /akıcılık düşük/i);
  assert.match(coach.aiCoachCommentTr, /tek parça/i);
});

test('azure coach feedback gives positive message on strong results', () => {
  const target = 'Can I get a medium latte?';
  const transcript = 'can i get a medium latte';
  const comparison = compareTranscriptToTarget(transcript, target);
  const pronunciationAssessment: PronunciationAssessmentResult = {
    ok: true,
    provider: 'azure',
    pronunciationScore: 92,
    accuracyScore: 91,
    fluencyScore: 90,
    completenessScore: 98,
    prosodyScore: 88,
    wordScores: [
      { word: 'can', accuracyScore: 95 },
      { word: 'medium', accuracyScore: 93 },
      { word: 'latte', accuracyScore: 90 },
    ],
  };
  const scores = buildAnalysisScores({
    comparison,
    durationMillis: 3200,
    targetText: target,
    pronunciationAssessment,
  });
  const coach = buildCoachFeedbackTr({
    uiLanguage: 'tr',
    targetText: target,
    transcript,
    comparison,
    scores,
    weakAreas: [],
    analysisMode: scores.analysisMode,
    matchScore: scores.matchScore,
    pronunciationAssessment,
  });

  assert.match(coach.aiCoachCommentTr, /Güzel iş/i);
  assert.match(coach.aiCoachCommentTr, /akıcı söyledin/i);
});

test('resolveCoachFeedbackDecision selects wrong_sentence for unrelated transcript', () => {
  const target = 'Where is the check-in counter for this flight?';
  const transcript = 'good morning';
  const comparison = compareTranscriptToTarget(transcript, target);
  const pronunciationAssessment: PronunciationAssessmentResult = {
    ok: true,
    provider: 'azure',
    pronunciationScore: 88,
    accuracyScore: 90,
    fluencyScore: 85,
    completenessScore: 35,
    prosodyScore: 82,
  };
  const scores = buildAnalysisScores({
    comparison,
    durationMillis: 2800,
    targetText: target,
    pronunciationAssessment,
  });

  const decision = resolveCoachFeedbackDecision({
    targetText: target,
    transcript,
    comparison,
    scores,
    weakAreas: [],
    analysisMode: scores.analysisMode,
    matchScore: scores.matchScore,
    pronunciationAssessment,
  });

  assert.equal(decision.feedbackType, 'wrong_sentence');
});

test('wrong sentence suppresses misleading coach and weak pronunciation words', () => {
  const target = 'In my previous role, I managed social media campaigns.';
  const transcript = 'Good morning.';
  const comparison = compareTranscriptToTarget(transcript, target);
  const pronunciationAssessment: PronunciationAssessmentResult = {
    ok: true,
    provider: 'azure',
    pronunciationScore: 17,
    accuracyScore: 30,
    fluencyScore: 9,
    completenessScore: 33,
    prosodyScore: 7,
    wordScores: [
      { word: 'previous', accuracyScore: 12, errorType: 'Omission' },
      { word: 'role', accuracyScore: 18, errorType: 'Omission' },
      { word: 'managed', accuracyScore: 15, errorType: 'Omission' },
      { word: 'social', accuracyScore: 20, errorType: 'Omission' },
      { word: 'media', accuracyScore: 14, errorType: 'Omission' },
      { word: 'campaigns', accuracyScore: 10, errorType: 'Omission' },
    ],
  };
  const scores = buildAnalysisScores({
    comparison,
    durationMillis: 2800,
    targetText: target,
    pronunciationAssessment,
  });
  const reconciled = reconcileWordFeedback(target, comparison, pronunciationAssessment);
  const coach = buildCoachFeedbackTr({
    uiLanguage: 'tr',
    targetText: target,
    transcript,
    comparison,
    scores,
    weakAreas: [],
    analysisMode: scores.analysisMode,
    matchScore: scores.matchScore,
    pronunciationAssessment,
  });
  const presentation = applyAnalysisFeedbackPresentation({
    feedbackType: coach.feedbackType ?? 'general',
    targetText: target,
    comparison,
    reconciled,
    weakAreasDetected: [],
  });

  assert.equal(coach.feedbackType, 'wrong_sentence');
  assert.ok(scores.nativeScore <= 20);
  assert.match(coach.aiCoachCommentTr, /Hedef cümleden farklı bir şey söyledin/i);
  assert.doesNotMatch(coach.aiCoachCommentTr, /Kelimeleri doğru sırayla söyledin/i);
  assert.doesNotMatch(coach.aiCoachCommentTr, /telaffuz/i);
  assert.equal(presentation.wordPronunciationFeedback.length, 0);
  assert.ok(presentation.missingWords.length >= 6);
});

test('missing final word keeps weak pronunciation only for spoken words', () => {
  const target = 'In my previous role, I managed social media campaigns.';
  const transcript = 'In my previous role, I managed social media.';
  const comparison = compareTranscriptToTarget(transcript, target);
  const pronunciationAssessment: PronunciationAssessmentResult = {
    ok: true,
    provider: 'azure',
    pronunciationScore: 78,
    accuracyScore: 76,
    fluencyScore: 80,
    completenessScore: 88,
    prosodyScore: 74,
    wordScores: [
      { word: 'previous', accuracyScore: 58, errorType: 'Mispronunciation' },
      { word: 'managed', accuracyScore: 62, errorType: 'Mispronunciation' },
      { word: 'social', accuracyScore: 84 },
      { word: 'media', accuracyScore: 86 },
      { word: 'campaigns', accuracyScore: 0, errorType: 'Omission' },
    ],
  };
  const scores = buildAnalysisScores({
    comparison,
    durationMillis: 4200,
    targetText: target,
    pronunciationAssessment,
  });
  const reconciled = reconcileWordFeedback(target, comparison, pronunciationAssessment);
  const coach = buildCoachFeedbackTr({
    uiLanguage: 'tr',
    targetText: target,
    transcript,
    comparison,
    scores,
    weakAreas: [],
    analysisMode: scores.analysisMode,
    matchScore: scores.matchScore,
    pronunciationAssessment,
  });
  const presentation = applyAnalysisFeedbackPresentation({
    feedbackType: coach.feedbackType ?? 'general',
    targetText: target,
    comparison,
    reconciled,
    weakAreasDetected: [],
  });

  assert.equal(coach.feedbackType, 'clarity_issue');
  assert.ok(
    presentation.missingWords.some((word) => word.toLocaleLowerCase('en-US').includes('campaign')),
  );
  assert.ok(
    presentation.wordPronunciationFeedback.every((entry) => {
      const spokenWords = [...comparison.correctWords, ...comparison.wordsToImprove];
      return spokenWords.some(
        (spoken) => spoken.toLocaleLowerCase('en-US') === entry.word.toLocaleLowerCase('en-US'),
      );
    }),
  );
  assert.ok(
    !presentation.wordPronunciationFeedback.some((entry) =>
      entry.word.toLocaleLowerCase('en-US').includes('campaign'),
    ),
  );
});

test('strong coverage with weak azure words selects weak_pronunciation feedback', () => {
  const target = 'In my previous role, I managed social media campaigns.';
  const transcript = 'in my previous role i managed social media campaigns';
  const comparison = compareTranscriptToTarget(transcript, target);
  const pronunciationAssessment: PronunciationAssessmentResult = {
    ok: true,
    provider: 'azure',
    pronunciationScore: 76,
    accuracyScore: 78,
    fluencyScore: 82,
    completenessScore: 96,
    prosodyScore: 78,
    wordScores: [
      { word: 'previous', accuracyScore: 55, errorType: 'Mispronunciation' },
      { word: 'managed', accuracyScore: 84 },
      { word: 'campaigns', accuracyScore: 86 },
    ],
  };
  const scores = buildAnalysisScores({
    comparison,
    durationMillis: 5200,
    targetText: target,
    pronunciationAssessment,
  });
  const reconciled = reconcileWordFeedback(target, comparison, pronunciationAssessment);
  const decision = resolveCoachFeedbackDecision({
    targetText: target,
    transcript,
    comparison,
    scores,
    weakAreas: [],
    analysisMode: scores.analysisMode,
    matchScore: scores.matchScore,
    pronunciationAssessment,
  });
  const presentation = applyAnalysisFeedbackPresentation({
    feedbackType: decision.feedbackType,
    targetText: target,
    comparison,
    reconciled,
    weakAreasDetected: [],
  });

  assert.equal(decision.feedbackType, 'weak_pronunciation');
  assert.ok(presentation.wordPronunciationFeedback.length > 0);
  assert.ok(
    presentation.wordPronunciationFeedback.some((entry) =>
      entry.word.toLocaleLowerCase('en-US').includes('previous'),
    ),
  );
});

test('rebalanced azure scoring caps full sentence with bad pronunciation', () => {
  const target = 'In my previous role, I managed social media campaigns.';
  const transcript = 'in my previous role i managed social media campaigns';
  const comparison = compareTranscriptToTarget(transcript, target);
  const pronunciationAssessment: PronunciationAssessmentResult = {
    ok: true,
    provider: 'azure',
    pronunciationScore: 50,
    accuracyScore: 45,
    fluencyScore: 55,
    completenessScore: 100,
    prosodyScore: 60,
    wordScores: [
      { word: 'previous', accuracyScore: 40 },
      { word: 'managed', accuracyScore: 42 },
      { word: 'campaigns', accuracyScore: 48 },
    ],
  };
  const scores = buildAnalysisScores({
    comparison,
    durationMillis: 5200,
    targetText: target,
    pronunciationAssessment,
  });
  const coach = buildCoachFeedbackTr({
    uiLanguage: 'tr',
    targetText: target,
    transcript,
    comparison,
    scores,
    weakAreas: [],
    analysisMode: scores.analysisMode,
    matchScore: scores.matchScore,
    pronunciationAssessment,
  });

  assert.ok(scores.nativeScore <= 60);
  assert.ok(
    coach.feedbackType === 'clarity_issue' || coach.feedbackType === 'weak_pronunciation',
  );
  assert.doesNotMatch(coach.aiCoachCommentTr, /Harika iş/i);
  assert.doesNotMatch(coach.aiCoachCommentTr, /tamamlamaya yaklaştın/i);
});

test('rebalanced azure scoring keeps moderate pronunciation below excellent range', () => {
  const target = 'In my previous role, I managed social media campaigns.';
  const transcript = 'in my previous role i managed social media campaigns';
  const comparison = compareTranscriptToTarget(transcript, target);
  const pronunciationAssessment: PronunciationAssessmentResult = {
    ok: true,
    provider: 'azure',
    pronunciationScore: 68,
    accuracyScore: 65,
    fluencyScore: 75,
    completenessScore: 100,
    prosodyScore: 72,
    wordScores: [
      { word: 'previous', accuracyScore: 62 },
      { word: 'managed', accuracyScore: 64 },
    ],
  };
  const scores = buildAnalysisScores({
    comparison,
    durationMillis: 5200,
    targetText: target,
    pronunciationAssessment,
  });
  const coach = buildCoachFeedbackTr({
    uiLanguage: 'tr',
    targetText: target,
    transcript,
    comparison,
    scores,
    weakAreas: [],
    analysisMode: scores.analysisMode,
    matchScore: scores.matchScore,
    pronunciationAssessment,
  });

  assert.ok(scores.nativeScore <= 75);
  assert.equal(coach.feedbackType, 'clarity_issue');
  assert.match(coach.aiCoachCommentTr, /telaffuz netliği düşük/i);
});

test('rebalanced azure scoring allows excellent result for strong pronunciation', () => {
  const target = 'In my previous role, I managed social media campaigns.';
  const transcript = 'in my previous role i managed social media campaigns';
  const comparison = compareTranscriptToTarget(transcript, target);
  const pronunciationAssessment: PronunciationAssessmentResult = {
    ok: true,
    provider: 'azure',
    pronunciationScore: 85,
    accuracyScore: 88,
    fluencyScore: 82,
    completenessScore: 100,
    prosodyScore: 80,
    wordScores: [
      { word: 'previous', accuracyScore: 90 },
      { word: 'managed', accuracyScore: 88 },
      { word: 'campaigns', accuracyScore: 86 },
    ],
  };
  const scores = buildAnalysisScores({
    comparison,
    durationMillis: 5200,
    targetText: target,
    pronunciationAssessment,
  });
  const coach = buildCoachFeedbackTr({
    uiLanguage: 'tr',
    targetText: target,
    transcript,
    comparison,
    scores,
    weakAreas: [],
    analysisMode: scores.analysisMode,
    matchScore: scores.matchScore,
    pronunciationAssessment,
  });

  assert.ok(scores.nativeScore >= 85);
  assert.equal(coach.feedbackType, 'good_result');
  assert.match(coach.aiCoachCommentTr, /Güzel iş/i);
});

test('rebalanced coach keeps missing words feedback for low completeness', () => {
  const target = 'I have experience in customer service and sales.';
  const transcript = 'I have customer service.';
  const comparison = compareTranscriptToTarget(transcript, target);
  const pronunciationAssessment: PronunciationAssessmentResult = {
    ok: true,
    provider: 'azure',
    pronunciationScore: 82,
    accuracyScore: 80,
    fluencyScore: 78,
    completenessScore: 55,
    prosodyScore: 76,
  };
  const scores = buildAnalysisScores({
    comparison,
    durationMillis: 3200,
    targetText: target,
    pronunciationAssessment,
  });
  const coach = buildCoachFeedbackTr({
    uiLanguage: 'tr',
    targetText: target,
    transcript,
    comparison,
    scores,
    weakAreas: [],
    analysisMode: scores.analysisMode,
    matchScore: scores.matchScore,
    pronunciationAssessment,
  });

  assert.equal(coach.feedbackType, 'missing_words');
});

test('rebalanced coach keeps wrong sentence feedback for unrelated transcript', () => {
  const target = 'Where is the check-in counter for this flight?';
  const transcript = 'good morning';
  const comparison = compareTranscriptToTarget(transcript, target);
  const pronunciationAssessment: PronunciationAssessmentResult = {
    ok: true,
    provider: 'azure',
    pronunciationScore: 88,
    accuracyScore: 90,
    fluencyScore: 85,
    completenessScore: 35,
    prosodyScore: 82,
  };
  const scores = buildAnalysisScores({
    comparison,
    durationMillis: 2800,
    targetText: target,
    pronunciationAssessment,
  });
  const decision = resolveCoachFeedbackDecision({
    targetText: target,
    transcript,
    comparison,
    scores,
    weakAreas: [],
    analysisMode: scores.analysisMode,
    matchScore: scores.matchScore,
    pronunciationAssessment,
  });

  assert.equal(decision.feedbackType, 'wrong_sentence');
  assert.ok(scores.matchScore < 40);
});

test('pronunciation feedback helpers surface weak words and phonemes', () => {
  const assessment: PronunciationAssessmentResult = {
    ok: true,
    provider: 'azure',
    pronunciationScore: 80,
    wordScores: [
      {
        word: 'think',
        accuracyScore: 55,
        phonemes: [{ phoneme: 'th', accuracyScore: 40 }],
      },
    ],
  };

  const wordFeedback = buildWordPronunciationFeedback(assessment);
  const phonemeFeedback = buildPhonemeFeedback(assessment);

  assert.ok(wordFeedback.some((entry) => entry.word === 'think'));
  assert.ok(phonemeFeedback.some((entry) => entry.phoneme === 'th'));
});

test('pronunciation skip reason reflects azure env configuration', () => {
  const configured = isAzurePronunciationConfigured();
  const skipReason = getPronunciationSkipReason();
  assert.equal(skipReason === null, configured);
});

test('pronunciation decision skips when reference text is missing', () => {
  const decision = resolvePronunciationDecision({
    audioBuffer: Buffer.from('audio'),
    mimeType: 'audio/m4a',
    referenceText: '   ',
    language: 'en-US',
    durationMillis: 2000,
    lessonId: 'lesson-1',
    segmentId: 'segment-1',
  });

  assert.equal(decision.willAttempt, false);
  assert.equal(decision.reasonIfSkipped, 'missing_reference_text');
});

test('pronunciation debug explains fallback reason', () => {
  const request = {
    audioBuffer: Buffer.from('audio'),
    mimeType: 'audio/m4a',
    referenceText: 'Good morning',
    language: 'en-US' as const,
    durationMillis: 2000,
    lessonId: 'lesson-1',
    segmentId: 'segment-1',
  };
  const decision = {
    enabled: true,
    hasProvider: true,
    willAttempt: true,
    reasonIfSkipped: null,
  };
  const result: PronunciationAssessmentResult = {
    ok: false,
    errorCode: 'audio_conversion_failed',
    messageTr: 'Ses dosyası Azure telaffuz analizi için dönüştürülemedi.',
  };

  const debug = buildPronunciationAssessmentDebug(request, result, decision);

  assert.equal(debug.referenceTextLength, 12);
  assert.equal(debug.audioMimeType, 'audio/m4a');
  assert.equal(debug.fallbackReason, 'audio_conversion_failed');
});
