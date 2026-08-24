import type {
  PhonemeFeedback,
  WordPronunciationFeedback,
} from '../types/analysis.js';
import { getCoachCopy } from '../i18n/coachCopy.js';
import type { CoachLanguage } from '../i18n/uiLanguage.js';
import { DEFAULT_COACH_LANGUAGE } from '../i18n/uiLanguage.js';
import type { PronunciationAssessmentResult } from './pronunciationAssessment/pronunciationAssessmentTypes.js';

export const WEAK_WORD_ACCURACY_THRESHOLD = 70;
const WEAK_PHONEME_ACCURACY_THRESHOLD = 65;

function buildWordFeedbackTr(
  word: string,
  accuracyScore: number | undefined,
  errorType: string | undefined,
  uiLanguage: CoachLanguage,
): string | undefined {
  const copy = getCoachCopy(uiLanguage);

  if (errorType && errorType !== 'None') {
    return copy.wordError(word);
  }

  if (accuracyScore !== undefined && accuracyScore < WEAK_WORD_ACCURACY_THRESHOLD) {
    return copy.wordWeak(word);
  }

  return undefined;
}

function buildPhonemeFeedbackTr(
  phoneme: string,
  accuracyScore: number | undefined,
  uiLanguage: CoachLanguage,
): string | undefined {
  if (accuracyScore === undefined || accuracyScore >= WEAK_PHONEME_ACCURACY_THRESHOLD) {
    return undefined;
  }

  const copy = getCoachCopy(uiLanguage);

  if (phoneme.toLowerCase().includes('th')) {
    return copy.phonemeTh;
  }

  return copy.phonemeWeak(phoneme);
}

export function buildWordPronunciationFeedback(
  assessment?: PronunciationAssessmentResult | null,
  uiLanguage: CoachLanguage = DEFAULT_COACH_LANGUAGE,
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
        uiLanguage,
      ),
    }))
    .filter((entry) => entry.feedbackTr || (entry.accuracyScore ?? 100) < WEAK_WORD_ACCURACY_THRESHOLD);
}

export function buildPhonemeFeedback(
  assessment?: PronunciationAssessmentResult | null,
  uiLanguage: CoachLanguage = DEFAULT_COACH_LANGUAGE,
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
        uiLanguage,
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
