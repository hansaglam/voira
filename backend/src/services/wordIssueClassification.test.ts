import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  classifyAzureWordIssue,
  classifyMissingWithoutAzure,
  classifyRecognitionMismatch,
  isPersistentWeakWordAggregate,
  logWordIssueDebug,
} from './wordIssueClassification.js';
import type { PronunciationWordScore } from './pronunciationAssessment/pronunciationAssessmentTypes.js';
import { compareTranscriptToTarget } from './textComparisonService.js';
import {
  normalizeWordToken,
  reconcileWordFeedback,
} from './wordFeedbackReconciliationService.js';
import type { PronunciationAssessmentResult } from './pronunciationAssessment/pronunciationAssessmentTypes.js';
import { resolveCoachFeedbackDecision } from './coachFeedbackService.js';

function word(
  partial: Partial<PronunciationWordScore> & Pick<PronunciationWordScore, 'word'>,
): PronunciationWordScore {
  return {
    word: partial.word,
    accuracyScore: partial.accuracyScore,
    errorType: partial.errorType,
    phonemes: partial.phonemes,
  };
}

describe('wordIssueClassification', () => {
  test('correctly pronounced word is not weak', () => {
    const result = classifyAzureWordIssue(word({ word: 'password', accuracyScore: 92, errorType: 'None' }));
    assert.equal(result.issueType, null);
    assert.equal(result.showAsPronunciationWeak, false);
    assert.equal(result.persistAsWeakWord, false);
  });

  test('clearly low Azure word score is pronunciation weak', () => {
    const result = classifyAzureWordIssue(word({
      word: 'perfectly',
      accuracyScore: 42,
      errorType: 'Mispronunciation',
    }));
    assert.equal(result.issueType, 'pronunciation');
    assert.equal(result.severity, 'severe');
    assert.equal(result.showAsPronunciationWeak, true);
    assert.equal(result.persistAsWeakWord, true);
    assert.equal(result.persistenceMode, 'immediate');
  });

  test('low phoneme evidence can mark healthy-ish word as borderline', () => {
    const result = classifyAzureWordIssue(word({
      word: 'world',
      accuracyScore: 78,
      errorType: 'None',
      phonemes: [
        { phoneme: 'w', accuracyScore: 90 },
        { phoneme: 'er', accuracyScore: 35 },
        { phoneme: 'l', accuracyScore: 50 },
        { phoneme: 'd', accuracyScore: 88 },
      ],
    }));
    assert.equal(result.issueType, 'pronunciation');
    assert.equal(result.severity, 'borderline');
    assert.equal(result.reason, 'phoneme_assisted');
  });

  test('missing / omission is not pronunciation weak', () => {
    const omission = classifyAzureWordIssue(word({
      word: 'wifi',
      accuracyScore: 0,
      errorType: 'Omission',
    }));
    assert.equal(omission.issueType, 'missing');
    assert.equal(omission.persistAsWeakWord, false);

    const noAzure = classifyMissingWithoutAzure('Wi-Fi');
    assert.equal(noAzure.issueType, 'missing');
    assert.equal(noAzure.persistAsWeakWord, false);
  });

  test('Whisper mismatch without Azure pronunciation evidence is not persistent', () => {
    const mismatch = classifyRecognitionMismatch('password');
    assert.equal(mismatch.issueType, 'recognition_mismatch');
    assert.equal(mismatch.persistAsWeakWord, false);
  });

  test('severe single attempt is persistent; borderline once is not; repeated borderline is', () => {
    assert.equal(
      isPersistentWeakWordAggregate({ weakCount: 1, bestScore: 40, lastScore: 40 }),
      true,
    );
    assert.equal(
      isPersistentWeakWordAggregate({ weakCount: 1, bestScore: 62, lastScore: 62 }),
      false,
    );
    assert.equal(
      isPersistentWeakWordAggregate({ weakCount: 2, bestScore: 62, lastScore: 58 }),
      true,
    );
  });

  test('short function words are not persisted', () => {
    const result = classifyAzureWordIssue(word({
      word: 'a',
      accuracyScore: 40,
      errorType: 'Mispronunciation',
    }));
    assert.equal(result.showAsPronunciationWeak, true);
    assert.equal(result.persistAsWeakWord, false);
  });

  test('hyphenated lexical form is not treated as short noise', () => {
    const result = classifyAzureWordIssue(word({
      word: 'Wi-Fi',
      accuracyScore: 45,
      errorType: 'Mispronunciation',
    }));
    assert.equal(result.persistAsWeakWord, true);
  });

  test('punctuation and case normalize equivalently for reconciliation', () => {
    assert.equal(normalizeWordToken('Perfectly,'), 'perfectly');
    assert.equal(normalizeWordToken('perfectly'), 'perfectly');
    assert.equal(normalizeWordToken('PERFECTLY'), 'perfectly');
  });

  test('debug logging excludes spoken words and transcript fields', () => {
    const originalLog = console.log;
    const calls: unknown[][] = [];
    console.log = (...args: unknown[]) => { calls.push(args); };
    try {
      logWordIssueDebug(true, {
        word: 'private-word',
        transcript: 'private transcript',
        issueType: 'pronunciation',
        severity: 'borderline',
      });
    } finally {
      console.log = originalLog;
    }
    const serialized = JSON.stringify(calls);
    assert.doesNotMatch(serialized, /private-word|private transcript/);
    assert.match(serialized, /pronunciation|borderline/);
  });
});

describe('reconcileWordFeedback classification', () => {
  test('omitted wifi stays missing and is not a pronunciation weak word', () => {
    const target = 'Could I get the Wi-Fi password, please?';
    const transcript = 'could i get password please';
    const comparison = compareTranscriptToTarget(transcript, target);
    const assessment: PronunciationAssessmentResult = {
      ok: true,
      provider: 'azure',
      pronunciationScore: 80,
      wordScores: [
        word({ word: 'Could', accuracyScore: 90 }),
        word({ word: 'I', accuracyScore: 95 }),
        word({ word: 'get', accuracyScore: 92 }),
        word({ word: 'the', accuracyScore: 90 }),
        word({ word: 'Wi-Fi', accuracyScore: 0, errorType: 'Omission' }),
        word({ word: 'password', accuracyScore: 88 }),
        word({ word: 'please', accuracyScore: 85 }),
      ],
    };

    const reconciled = reconcileWordFeedback(target, comparison, assessment);
    assert.ok(reconciled.missingWords.some((item) => /wi-?fi/i.test(item)));
    assert.ok(!reconciled.wordPronunciationFeedback.some((item) => /wi-?fi/i.test(item.word)));
    assert.ok(!reconciled.wordsToImprove.some((item) => /wi-?fi/i.test(item)));
  });

  test('mispronounced perfectly becomes pronunciation weak improve word', () => {
    const target = 'She said it perfectly.';
    const transcript = 'she said it perfectly';
    const comparison = compareTranscriptToTarget(transcript, target);
    const assessment: PronunciationAssessmentResult = {
      ok: true,
      provider: 'azure',
      pronunciationScore: 70,
      wordScores: [
        word({ word: 'She', accuracyScore: 90 }),
        word({ word: 'said', accuracyScore: 88 }),
        word({ word: 'it', accuracyScore: 90 }),
        word({
          word: 'perfectly',
          accuracyScore: 38,
          errorType: 'Mispronunciation',
          phonemes: [{ phoneme: 'p', accuracyScore: 40 }],
        }),
      ],
    };

    const reconciled = reconcileWordFeedback(target, comparison, assessment);
    assert.ok(
      reconciled.wordPronunciationFeedback.some((item) => item.word.toLowerCase().includes('perfect')),
    );
    assert.ok(reconciled.wordsToImprove.some((item) => item.toLowerCase().includes('perfect')));
  });

  test('fuzzy STT improve without Azure is not promoted to wordsToImprove', () => {
    const target = 'I think that is enough';
    const transcript = 'i sink that is enough';
    const comparison = compareTranscriptToTarget(transcript, target);
    // Fuzzy leftover may or may not appear depending on distance rules;
    // without Azure it must never become pronunciation improve.
    const reconciled = reconcileWordFeedback(target, comparison, null);
    assert.deepEqual(reconciled.wordsToImprove, []);
    assert.deepEqual(reconciled.wordPronunciationFeedback, []);
  });

  test('coach missing_words path does not describe omission as pronunciation', () => {
    const target = 'Could I get the Wi-Fi password, please?';
    const transcript = 'could i get password please';
    const comparison = compareTranscriptToTarget(transcript, target);
    const decision = resolveCoachFeedbackDecision({
      targetText: target,
      transcript,
      comparison: {
        ...comparison,
        missingWords: ['Wi-Fi'],
        missingWordCount: 1,
        coveragePercent: 60,
      },
      scores: {
        matchScore: 60,
        completenessScore: 60,
        nativeScore: 55,
        pronunciationScore: 80,
        accuracyScore: 80,
        fluencyScore: 75,
        rhythmScore: 75,
        confidenceScore: 75,
        analysisMode: 'pronunciation_assessment',
        pronunciationAssessmentAvailable: true,
        pronunciationProvider: 'azure',
        scoreSource: 'azure_pronunciation',
      },
      weakAreas: [],
      analysisMode: 'pronunciation_assessment',
      pronunciationAssessment: {
        ok: true,
        provider: 'azure',
        pronunciationScore: 80,
        wordScores: [
          word({ word: 'Wi-Fi', accuracyScore: 0, errorType: 'Omission' }),
          word({ word: 'password', accuracyScore: 88 }),
        ],
      },
    });

    assert.equal(decision.feedbackType, 'missing_words');
  });
});
