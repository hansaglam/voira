import type {
  PhonemeFeedback,
  WordPronunciationFeedback,
} from '../types/analysis.js';
import type { PronunciationAssessmentResult } from './pronunciationAssessment/pronunciationAssessmentTypes.js';

const WEAK_WORD_ACCURACY_THRESHOLD = 70;
const WEAK_PHONEME_ACCURACY_THRESHOLD = 65;

function buildWordFeedbackTr(word: string, accuracyScore?: number, errorType?: string): string | undefined {
  if (errorType && errorType !== 'None') {
    return `'${word}' kelimesinde telaffuz hatası görüldü.`;
  }

  if (accuracyScore !== undefined && accuracyScore < WEAK_WORD_ACCURACY_THRESHOLD) {
    return `'${word}' kelimesinin telaffuzu zayıf kaldı.`;
  }

  return undefined;
}

function buildPhonemeFeedbackTr(phoneme: string, accuracyScore?: number): string | undefined {
  if (accuracyScore === undefined || accuracyScore >= WEAK_PHONEME_ACCURACY_THRESHOLD) {
    return undefined;
  }

  if (phoneme.toLowerCase().includes('th')) {
    return 'TH sesi zayıf kaldı; dil uçlarını hafifçe ısırarak dene.';
  }

  return `'${phoneme}' sesinin netliğini artırmayı dene.`;
}

export function buildWordPronunciationFeedback(
  assessment?: PronunciationAssessmentResult | null,
): WordPronunciationFeedback[] {
  if (!assessment?.ok || !assessment.wordScores?.length) {
    return [];
  }

  return assessment.wordScores
    .map((wordScore) => ({
      word: wordScore.word,
      accuracyScore: wordScore.accuracyScore,
      errorType: wordScore.errorType,
      feedbackTr: buildWordFeedbackTr(
        wordScore.word,
        wordScore.accuracyScore,
        wordScore.errorType,
      ),
    }))
    .filter((entry) => entry.feedbackTr || (entry.accuracyScore ?? 100) < WEAK_WORD_ACCURACY_THRESHOLD);
}

export function buildPhonemeFeedback(
  assessment?: PronunciationAssessmentResult | null,
): PhonemeFeedback[] {
  if (!assessment?.ok || !assessment.wordScores?.length) {
    return [];
  }

  const feedback: PhonemeFeedback[] = [];

  for (const wordScore of assessment.wordScores) {
    for (const phonemeScore of wordScore.phonemes ?? []) {
      const feedbackTr = buildPhonemeFeedbackTr(
        phonemeScore.phoneme,
        phonemeScore.accuracyScore,
      );

      if (!feedbackTr) {
        continue;
      }

      feedback.push({
        phoneme: phonemeScore.phoneme,
        accuracyScore: phonemeScore.accuracyScore,
        feedbackTr,
      });
    }
  }

  return feedback.slice(0, 6);
}

export function getWeakestAzureWords(
  assessment?: PronunciationAssessmentResult | null,
  limit = 2,
): string[] {
  if (!assessment?.ok || !assessment.wordScores?.length) {
    return [];
  }

  return [...assessment.wordScores]
    .filter((word) => word.accuracyScore !== undefined)
    .sort((a, b) => (a.accuracyScore ?? 100) - (b.accuracyScore ?? 100))
    .slice(0, limit)
    .map((word) => word.word);
}
