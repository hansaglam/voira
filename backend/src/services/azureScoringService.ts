import type { PronunciationAssessmentResult } from './pronunciationAssessment/pronunciationAssessmentTypes.js';
import { clampScore } from '../utils/normalize.js';

const WEAK_WORD_ACCURACY_THRESHOLD = 70;
const SEVERE_WEAK_WORD_ACCURACY_THRESHOLD = 50;

export interface AzureScoreMetrics {
  accuracyScore: number;
  pronunciationScore: number;
  fluencyScore: number;
  completenessScore: number;
  prosodyScore?: number;
}

export interface AzureWeakWordCounts {
  weakWordCount: number;
  severeWeakWordCount: number;
}

export interface AzureScoringDecision {
  rawWeightedScore: number;
  finalScore: number;
  weakWordCount: number;
  severeWeakWordCount: number;
  appliedCaps: string[];
  resultLabel: string;
}

export function countAzureWeakWords(
  assessment?: PronunciationAssessmentResult | null,
): AzureWeakWordCounts {
  if (!assessment?.ok || !assessment.wordScores?.length) {
    return { weakWordCount: 0, severeWeakWordCount: 0 };
  }

  let weakWordCount = 0;
  let severeWeakWordCount = 0;

  for (const word of assessment.wordScores) {
    const accuracy = word.accuracyScore;
    if (accuracy === undefined) {
      continue;
    }

    if (accuracy < WEAK_WORD_ACCURACY_THRESHOLD) {
      weakWordCount += 1;
    }

    if (accuracy < SEVERE_WEAK_WORD_ACCURACY_THRESHOLD) {
      severeWeakWordCount += 1;
    }
  }

  return { weakWordCount, severeWeakWordCount };
}

export function computeAzureWeightedScore(metrics: AzureScoreMetrics): number {
  const fluencyWeight = metrics.prosodyScore === undefined ? 0.2 : 0.15;
  const prosodyWeight = metrics.prosodyScore === undefined ? 0 : 0.05;

  return clampScore(
    Math.round(
      metrics.accuracyScore * 0.35 +
        metrics.pronunciationScore * 0.3 +
        metrics.fluencyScore * fluencyWeight +
        metrics.completenessScore * 0.15 +
        (metrics.prosodyScore ?? 0) * prosodyWeight,
    ),
  );
}

function applyCap(
  score: number,
  cap: number,
  reason: string,
  appliedCaps: string[],
): number {
  if (score > cap) {
    appliedCaps.push(reason);
    return cap;
  }

  return score;
}

export function applyAzurePronunciationCaps(
  rawWeightedScore: number,
  metrics: AzureScoreMetrics,
  weakWordCounts: AzureWeakWordCounts,
): { finalScore: number; appliedCaps: string[] } {
  const appliedCaps: string[] = [];
  let finalScore = rawWeightedScore;

  if (metrics.accuracyScore < 45) {
    finalScore = applyCap(finalScore, 50, 'accuracy<45', appliedCaps);
  } else if (metrics.accuracyScore < 55) {
    finalScore = applyCap(finalScore, 60, 'accuracy<55', appliedCaps);
  } else if (metrics.accuracyScore < 65) {
    finalScore = applyCap(finalScore, 70, 'accuracy<65', appliedCaps);
  }

  if (metrics.pronunciationScore < 50) {
    finalScore = applyCap(finalScore, 60, 'pronunciation<50', appliedCaps);
  } else if (metrics.pronunciationScore < 60) {
    finalScore = applyCap(finalScore, 70, 'pronunciation<60', appliedCaps);
  }

  if (metrics.fluencyScore < 45) {
    finalScore = applyCap(finalScore, 70, 'fluency<45', appliedCaps);
  }

  if (metrics.prosodyScore !== undefined && metrics.prosodyScore < 35) {
    finalScore = applyCap(finalScore, 75, 'prosody<35', appliedCaps);
  }

  if (weakWordCounts.weakWordCount >= 3) {
    finalScore = applyCap(finalScore, 75, 'weakWordCount>=3', appliedCaps);
  } else if (weakWordCounts.weakWordCount >= 2) {
    finalScore = applyCap(finalScore, 80, 'weakWordCount>=2', appliedCaps);
  }

  if (weakWordCounts.severeWeakWordCount >= 3) {
    finalScore = applyCap(finalScore, 65, 'severeWeakWordCount>=3', appliedCaps);
  } else if (weakWordCounts.severeWeakWordCount >= 2) {
    finalScore = applyCap(finalScore, 70, 'severeWeakWordCount>=2', appliedCaps);
  }

  if (metrics.completenessScore >= 90 && metrics.accuracyScore < 65) {
    finalScore = applyCap(finalScore, 70, 'highCompletenessLowAccuracy', appliedCaps);
  }

  if (metrics.completenessScore >= 90 && metrics.pronunciationScore < 60) {
    finalScore = applyCap(finalScore, 70, 'highCompletenessLowPronunciation', appliedCaps);
  }

  return {
    finalScore: clampScore(finalScore),
    appliedCaps,
  };
}

export function resolveScoreResultLabel(
  finalScore: number,
  accuracyScore?: number,
): string {
  if (accuracyScore !== undefined && accuracyScore < 70 && finalScore >= 85) {
    return 'İyi deneme';
  }

  if (finalScore <= 39) {
    return 'Tekrar dene';
  }

  if (finalScore <= 59) {
    return 'Temel cümleyi kurdun';
  }

  if (finalScore <= 74) {
    return 'Gelişiyor';
  }

  if (finalScore <= 84) {
    return 'İyi deneme';
  }

  if (accuracyScore !== undefined && accuracyScore < 70) {
    return 'İyi deneme';
  }

  return 'Harika iş';
}

export function buildAzureScoringDecision(
  metrics: AzureScoreMetrics,
  assessment?: PronunciationAssessmentResult | null,
): AzureScoringDecision {
  const weakWordCounts = countAzureWeakWords(assessment);
  const rawWeightedScore = computeAzureWeightedScore(metrics);
  const { finalScore, appliedCaps } = applyAzurePronunciationCaps(
    rawWeightedScore,
    metrics,
    weakWordCounts,
  );

  return {
    rawWeightedScore,
    finalScore,
    weakWordCount: weakWordCounts.weakWordCount,
    severeWeakWordCount: weakWordCounts.severeWeakWordCount,
    appliedCaps,
    resultLabel: resolveScoreResultLabel(finalScore, metrics.accuracyScore),
  };
}

export function logAzureScoringDecision(
  decision: AzureScoringDecision,
  metrics: AzureScoreMetrics,
  selectedFeedbackType?: string,
): void {
  console.log('[EchoSpeak Score] azure scoring decision', {
    rawWeightedScore: decision.rawWeightedScore,
    finalScore: decision.finalScore,
    accuracyScore: metrics.accuracyScore,
    pronunciationScore: metrics.pronunciationScore,
    fluencyScore: metrics.fluencyScore,
    completenessScore: metrics.completenessScore,
    prosodyScore: metrics.prosodyScore ?? null,
    weakWordCount: decision.weakWordCount,
    severeWeakWordCount: decision.severeWeakWordCount,
    appliedCaps: decision.appliedCaps,
    resultLabel: decision.resultLabel,
    selectedFeedbackType: selectedFeedbackType ?? null,
  });
}
