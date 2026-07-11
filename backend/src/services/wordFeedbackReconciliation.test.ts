import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { compareTranscriptToTarget } from './textComparisonService.js';
import {
  normalizeWordToken,
  reconcileWordFeedback,
  wordsEquivalentForReconciliation,
} from './wordFeedbackReconciliationService.js';
import type { PronunciationAssessmentResult } from './pronunciationAssessment/pronunciationAssessmentTypes.js';

describe('wordFeedbackReconciliation', () => {
  test('wordsEquivalentForReconciliation handles punctuation and plural variants', () => {
    assert.equal(wordsEquivalentForReconciliation('check-in', 'checkin'), true);
    assert.equal(wordsEquivalentForReconciliation('flights', 'flight'), true);
    assert.equal(wordsEquivalentForReconciliation('Please', 'please'), true);
    assert.equal(wordsEquivalentForReconciliation('latte', 'coffee'), false);
  });

  test('reconcileWordFeedback moves azure-heard please from missing to weak pronunciation', () => {
    const target = 'I need a refill, please.';
    const transcript = 'i need refill';
    const comparison = compareTranscriptToTarget(transcript, target);
    const assessment: PronunciationAssessmentResult = {
      ok: true,
      provider: 'azure',
      pronunciationScore: 78,
      wordScores: [
        { word: 'I', accuracyScore: 90 },
        { word: 'need', accuracyScore: 88 },
        { word: 'a', accuracyScore: 85 },
        { word: 'refill', accuracyScore: 82 },
        { word: 'please', accuracyScore: 58, errorType: 'Mispronunciation' },
      ],
    };

    assert.ok(comparison.missingWords.includes('please'));

    const reconciled = reconcileWordFeedback(target, comparison, assessment);

    assert.ok(!reconciled.missingWords.includes('please'));
    assert.ok(
      reconciled.wordPronunciationFeedback.some((entry) => wordsEquivalentForReconciliation(entry.word, 'please')),
    );
  });

  test('reconcileWordFeedback keeps truly missing words out of weak pronunciation', () => {
    const target = 'I have experience in customer service and sales.';
    const transcript = 'I have customer service.';
    const comparison = compareTranscriptToTarget(transcript, target);
    const assessment: PronunciationAssessmentResult = {
      ok: true,
      provider: 'azure',
      pronunciationScore: 78,
      wordScores: [
        { word: 'I', accuracyScore: 95 },
        { word: 'have', accuracyScore: 90 },
        { word: 'customer', accuracyScore: 88 },
        { word: 'service', accuracyScore: 55, errorType: 'Mispronunciation' },
      ],
    };

    const reconciled = reconcileWordFeedback(target, comparison, assessment);

    assert.ok(reconciled.missingWords.includes('experience'));
    assert.ok(reconciled.missingWords.includes('sales'));
    assert.ok(
      reconciled.wordPronunciationFeedback.some((entry) => wordsEquivalentForReconciliation(entry.word, 'service')),
    );
    assert.ok(!reconciled.missingWords.some((word) => wordsEquivalentForReconciliation(word, 'service')));
    assert.ok(!reconciled.wordPronunciationFeedback.some((entry) => wordsEquivalentForReconciliation(entry.word, 'experience')));
  });

  test('reconcileWordFeedback removes azure-recognized non-weak words from missing list', () => {
    const target = 'Can I get an iced latte, please?';
    const transcript = 'can i get iced latte';
    const comparison = compareTranscriptToTarget(transcript, target);
    const assessment: PronunciationAssessmentResult = {
      ok: true,
      provider: 'azure',
      pronunciationScore: 85,
      wordScores: [
        { word: 'can', accuracyScore: 92 },
        { word: 'I', accuracyScore: 90 },
        { word: 'get', accuracyScore: 91 },
        { word: 'an', accuracyScore: 88 },
        { word: 'iced', accuracyScore: 87 },
        { word: 'latte', accuracyScore: 89 },
      ],
    };

    const reconciled = reconcileWordFeedback(target, comparison, assessment);

    assert.ok(!reconciled.missingWords.includes('an'));
    assert.ok(!reconciled.wordPronunciationFeedback.some((entry) => wordsEquivalentForReconciliation(entry.word, 'an')));
    assert.ok(reconciled.missingWords.includes('please'));
  });

  test('reconcileWordFeedback does not duplicate the same word in missing and weak lists', () => {
    const target = 'I think that is enough';
    const transcript = 'i think that is enough';
    const comparison = compareTranscriptToTarget(transcript, target);
    const assessment: PronunciationAssessmentResult = {
      ok: true,
      provider: 'azure',
      pronunciationScore: 78,
      wordScores: [
        { word: 'think', accuracyScore: 55, errorType: 'Mispronunciation' },
        { word: 'that', accuracyScore: 90 },
        { word: 'enough', accuracyScore: 88 },
      ],
    };

    const reconciled = reconcileWordFeedback(target, comparison, assessment);
    const weakWords = reconciled.wordPronunciationFeedback.map((entry) => normalizeWordToken(entry.word));

    for (const missingWord of reconciled.missingWords) {
      assert.ok(!weakWords.includes(normalizeWordToken(missingWord)));
    }
  });
});
