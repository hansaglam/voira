import type { PronunciationAssessmentResult } from './pronunciationAssessment/pronunciationAssessmentTypes.js';
import type { SpeechAnalysisMode, SpeechScores, TextComparisonResult } from '../types/analysis.js';
import { clampScore, tokenize } from '../utils/normalize.js';

const WORDS_PER_SECOND_ESTIMATE = 2.4;
const TEXT_MATCH_PRONUNCIATION_CAP = 70;
const TEXT_MATCH_NATIVE_CAP = 80;
const TEXT_MATCH_FLUENCY_CAP = 80;
const TEXT_MATCH_RHYTHM_CAP = 80;

export interface BuildAnalysisScoresInput {
  comparison: TextComparisonResult;
  durationMillis: number;
  targetText: string;
  pronunciationAssessment?: PronunciationAssessmentResult | null;
}

function computeDurationSanityScore(
  durationMillis: number,
  targetWordCount: number,
): number {
  if (targetWordCount <= 0) return 50;

  const expectedDurationMs = (targetWordCount / WORDS_PER_SECOND_ESTIMATE) * 1000;
  const ratio = durationMillis / expectedDurationMs;

  if (ratio < 0.45) return 35;
  if (ratio < 0.6) return 50;
  if (ratio < 0.75) return 65;
  if (ratio <= 1.6) return 90;
  if (ratio <= 2.2) return 70;
  return 55;
}

function applyCoverageCap(score: number, coveragePercent: number): number {
  if (coveragePercent < 50) return Math.min(score, 45);
  if (coveragePercent < 65) return Math.min(score, 60);
  if (coveragePercent < 80) return Math.min(score, 72);
  if (coveragePercent < 90) return Math.min(score, 82);
  return score;
}

function applyTranscriptLengthCap(
  score: number,
  transcriptWordCount: number,
  targetWordCount: number,
): number {
  if (targetWordCount <= 0) return score;

  const ratio = transcriptWordCount / targetWordCount;
  if (ratio < 0.55) return Math.min(score, 58);
  if (ratio < 0.75) return Math.min(score, 65);
  return score;
}

function applyDurationCap(
  score: number,
  durationMillis: number,
  targetWordCount: number,
): number {
  if (targetWordCount <= 0) return score;

  const expectedDurationMs = (targetWordCount / WORDS_PER_SECOND_ESTIMATE) * 1000;
  const ratio = durationMillis / expectedDurationMs;

  if (ratio < 0.45) return Math.min(score, 60);
  if (ratio < 0.6) return Math.min(score, 68);
  return score;
}

function applyMissingWordPenalty(score: number, missingWordCount: number): number {
  if (missingWordCount >= 3) return score - 12;
  if (missingWordCount === 2) return score - 8;
  if (missingWordCount === 1) return score - 4;
  return score;
}

function buildConfidenceScore(
  matchScore: number,
  completenessScore: number,
  durationMillis: number,
): number {
  return clampScore(
    Math.round(30 + matchScore * 0.3 + completenessScore * 0.25 + Math.min(12, durationMillis / 400)),
  );
}

function buildTextMatchOnlyScores(
  comparison: TextComparisonResult,
  durationMillis: number,
  targetText: string,
): SpeechScores {
  const matchScore = clampScore(comparison.matchPercent);
  const completenessScore = clampScore(comparison.coveragePercent);
  const orderScore = clampScore(comparison.orderScore);
  const durationScore = computeDurationSanityScore(
    durationMillis,
    comparison.targetWordCount || tokenize(targetText).length,
  );

  if (matchScore < 15) {
    return {
      matchScore,
      completenessScore,
      nativeScore: clampScore(Math.min(matchScore, completenessScore)),
      pronunciationScore: matchScore,
      fluencyScore: clampScore(Math.max(10, durationScore)),
      rhythmScore: clampScore(Math.max(10, matchScore)),
      confidenceScore: clampScore(Math.max(12, matchScore + 5)),
      analysisMode: 'text_match_only',
      pronunciationAssessmentAvailable: false,
    };
  }

  const fluencyScore = clampScore(
    Math.min(
      TEXT_MATCH_FLUENCY_CAP,
      Math.round(durationScore * 0.55 + completenessScore * 0.45),
    ),
  );
  const pronunciationScore = clampScore(
    Math.min(TEXT_MATCH_PRONUNCIATION_CAP, Math.round(completenessScore * 0.65 + matchScore * 0.15)),
  );
  const rhythmScore = clampScore(
    Math.min(
      TEXT_MATCH_RHYTHM_CAP,
      Math.round(fluencyScore * 0.55 + orderScore * 0.25 + completenessScore * 0.2),
    ),
  );

  let nativeScore = clampScore(
    Math.round(
      completenessScore * 0.45 +
        matchScore * 0.25 +
        orderScore * 0.15 +
        durationScore * 0.15,
    ),
  );

  nativeScore = clampScore(applyMissingWordPenalty(nativeScore, comparison.missingWordCount));
  nativeScore = applyCoverageCap(nativeScore, comparison.coveragePercent);
  nativeScore = applyTranscriptLengthCap(
    nativeScore,
    comparison.transcriptWordCount,
    comparison.targetWordCount,
  );
  nativeScore = applyDurationCap(nativeScore, durationMillis, comparison.targetWordCount);
  nativeScore = Math.min(TEXT_MATCH_NATIVE_CAP, nativeScore);

  if (matchScore < 25) {
    nativeScore = clampScore(Math.min(nativeScore, matchScore * 0.65));
  }

  return {
    matchScore,
    completenessScore,
    nativeScore,
    pronunciationScore,
    fluencyScore,
    rhythmScore,
    confidenceScore: buildConfidenceScore(matchScore, completenessScore, durationMillis),
    analysisMode: 'text_match_only',
    pronunciationAssessmentAvailable: false,
  };
}

function buildPronunciationAssessmentScores(
  comparison: TextComparisonResult,
  durationMillis: number,
  targetText: string,
  assessment: PronunciationAssessmentResult,
): SpeechScores {
  const completenessScore = clampScore(
    assessment.completenessScore ?? comparison.coveragePercent,
  );
  const matchScore = clampScore(comparison.matchPercent);

  const pronunciationScore = clampScore(
    assessment.pronunciationScore ??
      assessment.accuracyScore ??
      matchScore,
  );
  const fluencyScore = clampScore(
    assessment.fluencyScore ??
      computeDurationSanityScore(durationMillis, tokenize(targetText).length),
  );
  const rhythmScore = clampScore(
    assessment.prosodyScore ??
      Math.round(fluencyScore * 0.55 + pronunciationScore * 0.45),
  );

  const nativeScore = clampScore(
    Math.round(
      pronunciationScore * 0.4 +
        fluencyScore * 0.25 +
        completenessScore * 0.2 +
        rhythmScore * 0.15,
    ),
  );

  return {
    matchScore,
    completenessScore,
    nativeScore,
    pronunciationScore,
    fluencyScore,
    rhythmScore,
    confidenceScore: buildConfidenceScore(matchScore, completenessScore, durationMillis),
    analysisMode: 'pronunciation_assessment',
    pronunciationAssessmentAvailable: true,
  };
}

export function buildAnalysisScores(input: BuildAnalysisScoresInput): SpeechScores {
  const assessment = input.pronunciationAssessment;

  if (assessment?.ok) {
    return buildPronunciationAssessmentScores(
      input.comparison,
      input.durationMillis,
      input.targetText,
      assessment,
    );
  }

  return buildTextMatchOnlyScores(
    input.comparison,
    input.durationMillis,
    input.targetText,
  );
}

/** @deprecated Use buildAnalysisScores — kept for existing imports during migration. */
export function buildScoresFromComparison(
  comparison: TextComparisonResult,
  durationMillis: number,
  targetText: string,
): SpeechScores {
  return buildAnalysisScores({ comparison, durationMillis, targetText });
}

export function resolveSpeechAnalysisMode(
  assessment?: PronunciationAssessmentResult | null,
): SpeechAnalysisMode {
  return assessment?.ok ? 'pronunciation_assessment' : 'text_match_only';
}
