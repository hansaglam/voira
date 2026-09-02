import type {
  PhonemeFeedback,
  WordPronunciationFeedback,
} from '../types/analysis.js';
import {
  PHONEME_FEEDBACK_ACCURACY_MAX,
  WORD_ACCURACY_BORDERLINE_MAX,
  WORD_ACCURACY_SEVERE_MAX,
} from '../config/wordIssueThresholds.js';
import { getCoachCopy } from '../i18n/coachCopy.js';
import type { CoachLanguage } from '../i18n/uiLanguage.js';
import { DEFAULT_COACH_LANGUAGE } from '../i18n/uiLanguage.js';
import type { PronunciationAssessmentResult } from './pronunciationAssessment/pronunciationAssessmentTypes.js';
import {
  classifyAzureWordIssue,
  logWordIssueDebug,
  type WordIssueSeverity,
  type WordIssueType,
} from './wordIssueClassification.js';
import { IS_DEV } from '../config.js';
import { isAnalysisDebugEnabled } from './pronunciationAssessment/pronunciationAssessmentConfig.js';

/** @deprecated use WORD_ACCURACY_BORDERLINE_MAX — kept for external imports */
export const WEAK_WORD_ACCURACY_THRESHOLD = WORD_ACCURACY_BORDERLINE_MAX;
export const SEVERE_WEAK_WORD_ACCURACY_THRESHOLD = WORD_ACCURACY_SEVERE_MAX;

function buildWordFeedbackTr(
  word: string,
  issueType: WordIssueType | null,
  uiLanguage: CoachLanguage,
): string | undefined {
  const copy = getCoachCopy(uiLanguage);

  if (issueType === 'pronunciation') {
    return copy.wordWeak(word);
  }

  if (issueType === 'low_confidence' || issueType === 'recognition_mismatch') {
    return copy.wordUncertain(word);
  }

  if (issueType === 'missing') {
    return copy.wordSkipped(word);
  }

  return undefined;
}

function buildPhonemeFeedbackTr(
  phoneme: string,
  accuracyScore: number | undefined,
  uiLanguage: CoachLanguage,
): string | undefined {
  if (accuracyScore === undefined || accuracyScore >= PHONEME_FEEDBACK_ACCURACY_MAX) {
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

  const debugEnabled = IS_DEV || isAnalysisDebugEnabled();

  const feedback: WordPronunciationFeedback[] = [];

  for (const wordScore of assessment.wordScores) {
    const classification = classifyAzureWordIssue(wordScore);
    logWordIssueDebug(debugEnabled, {
      word: wordScore.word,
      accuracyScore: wordScore.accuracyScore ?? null,
      minPhonemeScore: classification.minPhonemeScore ?? null,
      weakPhonemeCount: classification.weakPhonemeCount,
      errorType: wordScore.errorType ?? 'None',
      issueType: classification.issueType,
      severity: classification.severity,
      reason: classification.reason,
    });

    if (!classification.showAsPronunciationWeak) {
      continue;
    }

    feedback.push({
      word: wordScore.word,
      accuracyScore: wordScore.accuracyScore,
      errorType: wordScore.errorType,
      issueType: classification.issueType ?? undefined,
      severity: classification.severity ?? undefined,
      persistAsWeakWord: classification.persistAsWeakWord,
      feedbackTr: buildWordFeedbackTr(
        wordScore.word,
        classification.issueType,
        uiLanguage,
      ),
    });
  }

  return feedback;
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
    .filter((word) => classifyAzureWordIssue(word).showAsPronunciationWeak)
    .sort((a, b) => (a.accuracyScore ?? 100) - (b.accuracyScore ?? 100))
    .slice(0, limit)
    .map((word) => word.word);
}

export function getPersistentPronunciationWords(
  assessment?: PronunciationAssessmentResult | null,
): Array<{ word: string; severity: Exclude<WordIssueSeverity, 'informational'> }> {
  if (!assessment?.ok || !assessment.wordScores?.length) {
    return [];
  }

  const out: Array<{ word: string; severity: Exclude<WordIssueSeverity, 'informational'> }> = [];
  for (const wordScore of assessment.wordScores) {
    const classification = classifyAzureWordIssue(wordScore);
    if (!classification.persistAsWeakWord) continue;
    if (classification.severity !== 'severe' && classification.severity !== 'borderline') {
      continue;
    }
    out.push({ word: wordScore.word, severity: classification.severity });
  }
  return out;
}
