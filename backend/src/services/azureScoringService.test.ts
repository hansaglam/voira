import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyAzurePronunciationCaps,
  buildAzureScoringDecision,
  computeAzureWeightedScore,
  resolveScoreResultLabel,
} from './azureScoringService.js';
import type { PronunciationAssessmentResult } from './pronunciationAssessment/pronunciationAssessmentTypes.js';

test('computeAzureWeightedScore prioritizes accuracy and pronunciation over completeness', () => {
  const highCompletionLowPronunciation = computeAzureWeightedScore({
    accuracyScore: 45,
    pronunciationScore: 50,
    fluencyScore: 55,
    completenessScore: 100,
    prosodyScore: 60,
  });

  const balanced = computeAzureWeightedScore({
    accuracyScore: 75,
    pronunciationScore: 78,
    fluencyScore: 70,
    completenessScore: 80,
    prosodyScore: 72,
  });

  assert.ok(highCompletionLowPronunciation < balanced);
  assert.ok(highCompletionLowPronunciation < 70);
});

test('applyAzurePronunciationCaps limits generous completion-only scores', () => {
  const decision = buildAzureScoringDecision(
    {
      accuracyScore: 45,
      pronunciationScore: 50,
      fluencyScore: 55,
      completenessScore: 100,
      prosodyScore: 60,
    },
    {
      ok: true,
      provider: 'azure',
      wordScores: [
        { word: 'previous', accuracyScore: 40 },
        { word: 'managed', accuracyScore: 42 },
      ],
    } as PronunciationAssessmentResult,
  );

  assert.ok(decision.finalScore <= 60);
  assert.notEqual(decision.resultLabel, 'Harika iş');
});

test('applyAzurePronunciationCaps keeps moderate pronunciation below 75', () => {
  const decision = buildAzureScoringDecision(
    {
      accuracyScore: 65,
      pronunciationScore: 68,
      fluencyScore: 75,
      completenessScore: 100,
      prosodyScore: 72,
    },
    {
      ok: true,
      provider: 'azure',
      wordScores: [{ word: 'managed', accuracyScore: 62 }],
    } as PronunciationAssessmentResult,
  );

  assert.ok(decision.finalScore <= 75);
  assert.notEqual(decision.resultLabel, 'Harika iş');
});

test('applyAzurePronunciationCaps allows strong pronunciation to reach excellent range', () => {
  const decision = buildAzureScoringDecision(
    {
      accuracyScore: 88,
      pronunciationScore: 85,
      fluencyScore: 82,
      completenessScore: 100,
      prosodyScore: 80,
    },
    {
      ok: true,
      provider: 'azure',
      wordScores: [
        { word: 'previous', accuracyScore: 90 },
        { word: 'managed', accuracyScore: 88 },
      ],
    } as PronunciationAssessmentResult,
  );

  assert.ok(decision.finalScore >= 85);
  assert.equal(decision.resultLabel, 'Harika iş');
});

test('resolveScoreResultLabel never returns Harika iş when accuracy is below 70', () => {
  assert.equal(resolveScoreResultLabel(90, 65), 'İyi deneme');
});

test('applyAzurePronunciationCaps redistributes prosody weight to fluency when prosody is missing', () => {
  const withProsody = computeAzureWeightedScore({
    accuracyScore: 80,
    pronunciationScore: 80,
    fluencyScore: 70,
    completenessScore: 90,
    prosodyScore: 70,
  });

  const withoutProsody = computeAzureWeightedScore({
    accuracyScore: 80,
    pronunciationScore: 80,
    fluencyScore: 70,
    completenessScore: 90,
  });

  assert.equal(withProsody, withoutProsody);
});

test('applyAzurePronunciationCaps applies explicit weak-word penalties', () => {
  const { finalScore, appliedCaps } = applyAzurePronunciationCaps(
    82,
    {
      accuracyScore: 72,
      pronunciationScore: 74,
      fluencyScore: 78,
      completenessScore: 96,
      prosodyScore: 70,
    },
    {
      weakWordCount: 3,
      severeWeakWordCount: 2,
    },
  );

  assert.ok(finalScore <= 70);
  assert.ok(appliedCaps.includes('weakWordCount>=3'));
  assert.ok(appliedCaps.includes('severeWeakWordCount>=2'));
});
