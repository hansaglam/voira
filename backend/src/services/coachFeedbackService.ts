import type {
  AnalysisFeedbackType,
  CoachFeedback,
  SpeechAnalysisMode,
  SpeechScores,
  TextComparisonResult,
} from '../types/analysis.js';
import { analysisDebugLog } from '../utils/analysisDebugLog.js';
import { tokenize } from '../utils/normalize.js';
import type { PronunciationAssessmentResult } from './pronunciationAssessment/pronunciationAssessmentTypes.js';
import { wordsEquivalentForReconciliation } from './wordFeedbackReconciliationService.js';
import type { CoachLanguage } from '../i18n/uiLanguage.js';
import { DEFAULT_COACH_LANGUAGE } from '../i18n/uiLanguage.js';
import { getCoachCopy, type CoachCopy } from '../i18n/coachCopy.js';

export interface CoachFeedbackInput {
  /** Resolved UI language for coach copy (tr/en/es/pt/id/ar). */
  uiLanguage?: CoachLanguage;
  targetText: string;
  transcript: string;
  comparison: TextComparisonResult;
  scores: SpeechScores;
  weakAreas: string[];
  analysisMode?: SpeechAnalysisMode;
  matchScore?: number;
  durationMillis?: number;
  pronunciationAssessment?: PronunciationAssessmentResult | null;
}

const WORDS_PER_SECOND_ESTIMATE = 2.4;
const LOW_ORDER_SCORE_THRESHOLD = 75;
const WEAK_WORD_ACCURACY_THRESHOLD = 70;
const SEVERE_WEAK_WORD_ACCURACY_THRESHOLD = 50;

const WRONG_SENTENCE_MATCH_THRESHOLD = 40;
const WRONG_SENTENCE_COVERAGE_THRESHOLD = 40;
const MISSING_COMPLETENESS_THRESHOLD = 75;
const MISSING_COVERAGE_THRESHOLD = 75;
const HIGH_COMPLETION_THRESHOLD = 85;
const CLARITY_COMPLETENESS_THRESHOLD = 80;
const STRONG_COVERAGE_THRESHOLD = 75;
const STRONG_COMPLETENESS_THRESHOLD = 75;

export type CoachFeedbackType = AnalysisFeedbackType;

export interface CoachFeedbackDecision {
  feedbackType: CoachFeedbackType;
  nativeScore: number;
  matchScore: number;
  coveragePercent: number;
  correctWordCount: number;
  missingWordCount: number;
  targetWordCount: number;
  pronunciationScore: number;
  accuracyScore: number;
  fluencyScore: number;
  completenessScore: number;
  prosodyScore: number | null;
  weakWordCount: number;
  severeWeakWordCount: number;
}

function getImproveOnlyWords(comparison: TextComparisonResult): string[] {
  const missingSet = new Set(comparison.missingWords);
  return comparison.wordsToImprove.filter((word) => !missingSet.has(word));
}

function getSevereWeakAzureWords(
  assessment?: PronunciationAssessmentResult | null,
  limit = 2,
): string[] {
  if (!assessment?.ok || !assessment.wordScores?.length) {
    return [];
  }

  return [...assessment.wordScores]
    .filter((word) => (
      word.accuracyScore !== undefined
      && word.accuracyScore < SEVERE_WEAK_WORD_ACCURACY_THRESHOLD
    ))
    .sort((a, b) => (a.accuracyScore ?? 100) - (b.accuracyScore ?? 100))
    .slice(0, limit)
    .map((word) => word.word);
}

function countWeakAzureWords(
  assessment?: PronunciationAssessmentResult | null,
): { weakWordCount: number; severeWeakWordCount: number } {
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

function getWeakAzureWords(
  assessment?: PronunciationAssessmentResult | null,
  limit = 2,
): string[] {
  if (!assessment?.ok || !assessment.wordScores?.length) {
    return [];
  }

  return [...assessment.wordScores]
    .filter((word) => (
      word.accuracyScore !== undefined && word.accuracyScore < WEAK_WORD_ACCURACY_THRESHOLD
    ))
    .sort((a, b) => (a.accuracyScore ?? 100) - (b.accuracyScore ?? 100))
    .slice(0, limit)
    .map((word) => word.word);
}

function formatWeakWordPhrase(words: string[], copy: CoachCopy): string {
  if (words.length === 0) {
    return '';
  }

  if (words.length === 1) {
    return copy.quote(words[0]);
  }

  return copy.andJoin(copy.quote(words[0]), copy.quote(words[1]));
}

function formatMissingWords(missingWords: string[], limit = 4): string {
  const words = missingWords.slice(0, limit);
  if (words.length === 0) {
    return '';
  }

  return words.join(', ');
}

function isRecordingTooShort(
  durationMillis: number | undefined,
  targetWordCount: number,
): boolean {
  if (!durationMillis || targetWordCount <= 0) return false;

  const expectedDurationMs = (targetWordCount / WORDS_PER_SECOND_ESTIMATE) * 1000;
  return durationMillis / expectedDurationMs < 0.6;
}

function buildNextFocus(
  weakAreas: string[],
  comparison: TextComparisonResult,
  copy: CoachCopy,
  feedbackType?: CoachFeedbackType,
): string {
  switch (feedbackType) {
    case 'wrong_sentence':
      return copy.nextFocus.wrongSentence;
    case 'missing_words':
      return copy.nextFocus.missingWords;
    case 'clarity_issue':
      return copy.nextFocus.clarityIssue;
    case 'weak_pronunciation':
      return copy.nextFocus.weakPronunciation;
    case 'fluency_issue':
      return copy.nextFocus.fluencyIssue;
    case 'prosody_issue':
      return copy.nextFocus.prosodyIssue;
    case 'good_result':
      return copy.nextFocus.goodResult;
    default:
      break;
  }

  const missingCount = comparison.missingWordCount || comparison.missingWords.length;
  const improveOnlyCount = getImproveOnlyWords(comparison).length;

  if (missingCount >= 2) {
    return copy.nextFocus.missingMany;
  }

  if (missingCount > improveOnlyCount && missingCount > 0) {
    return copy.nextFocus.missingSome;
  }

  if (improveOnlyCount > 0) {
    return copy.nextFocus.improveWords;
  }

  const primaryWeakArea = weakAreas[0];
  if (!primaryWeakArea) {
    return copy.nextFocus.fallback;
  }
  return copy.nextFocus.priority(primaryWeakArea);
}

function appendTextMatchNote(
  comment: string,
  analysisMode: SpeechAnalysisMode,
  copy: CoachCopy,
): string {
  if (analysisMode !== 'text_match_only') {
    return comment;
  }

  if (comment.includes(copy.textMatchNote) || comment.includes('Detaylı telaffuz')) {
    return comment;
  }

  return `${comment} ${copy.textMatchNote}`;
}

function buildMissingWordsComment(missingCount: number, copy: CoachCopy): string {
  if (missingCount >= 2) {
    return copy.missingWordsMany;
  }

  return copy.missingWordsSome;
}

function buildShortRecordingComment(copy: CoachCopy): string {
  return copy.shortRecording;
}

function buildLowOrderComment(copy: CoachCopy): string {
  return copy.lowOrder;
}

function buildImproveWordsComment(copy: CoachCopy): string {
  return copy.improveWords;
}

function combineCoachComments(...parts: string[]): string {
  return parts.filter(Boolean).join(' ');
}

function buildStrictnessComments(input: CoachFeedbackInput, copy: CoachCopy): string[] {
  const { comparison, durationMillis } = input;
  const parts: string[] = [];
  const missingCount = comparison.missingWordCount || comparison.missingWords.length;
  const targetWordCount = comparison.targetWordCount;

  if (missingCount >= 2) {
    parts.push(buildMissingWordsComment(missingCount, copy));
  }

  if (isRecordingTooShort(durationMillis, targetWordCount)) {
    parts.push(buildShortRecordingComment(copy));
  }

  if (comparison.orderScore < LOW_ORDER_SCORE_THRESHOLD && missingCount === 0) {
    parts.push(buildLowOrderComment(copy));
  }

  return parts;
}

function isTranscriptUnrelatedToTarget(
  targetText: string,
  transcript: string,
): boolean {
  const targetTokens = tokenize(targetText);
  const transcriptTokens = tokenize(transcript);

  if (transcriptTokens.length === 0) {
    return true;
  }

  const overlap = transcriptTokens.filter((transcriptWord) =>
    targetTokens.some((targetWord) =>
      wordsEquivalentForReconciliation(targetWord, transcriptWord),
    ),
  ).length;

  if (overlap === 0) {
    return true;
  }

  return overlap / transcriptTokens.length < 0.2;
}

function isWrongSentence(input: CoachFeedbackInput): boolean {
  const { comparison, scores } = input;
  const matchScore = input.matchScore ?? scores.matchScore ?? comparison.matchPercent;
  const coveragePercent = comparison.coveragePercent;
  const correctWordCount = comparison.correctWords.length;

  return (
    scores.nativeScore <= 20
    || matchScore < WRONG_SENTENCE_MATCH_THRESHOLD
    || coveragePercent < WRONG_SENTENCE_COVERAGE_THRESHOLD
    || correctWordCount === 0
    || isTranscriptUnrelatedToTarget(input.targetText, input.transcript)
  );
}

function isMissingWords(input: CoachFeedbackInput): boolean {
  const { comparison, scores } = input;
  const coveragePercent = comparison.coveragePercent;
  const missingWordCount = comparison.missingWordCount || comparison.missingWords.length;
  const completenessScore = scores.completenessScore ?? comparison.coveragePercent;

  if (completenessScore >= HIGH_COMPLETION_THRESHOLD && coveragePercent >= STRONG_COVERAGE_THRESHOLD) {
    return false;
  }

  return (
    completenessScore < MISSING_COMPLETENESS_THRESHOLD
    || missingWordCount >= 1
    || coveragePercent < MISSING_COVERAGE_THRESHOLD
  );
}

function isClarityIssue(input: CoachFeedbackInput, weakWordCount: number): boolean {
  const { comparison, scores } = input;
  const coveragePercent = comparison.coveragePercent;
  const completenessScore = scores.completenessScore ?? comparison.coveragePercent;
  const pronunciationScore = scores.pronunciationScore;
  const accuracyScore = scores.accuracyScore ?? pronunciationScore;

  return (
    coveragePercent >= STRONG_COVERAGE_THRESHOLD
    && completenessScore >= CLARITY_COMPLETENESS_THRESHOLD
    && (
      accuracyScore < 70
      || pronunciationScore < 70
      || weakWordCount >= 2
    )
  );
}

function meetsWeakPronunciationThreshold(input: CoachFeedbackInput, weakWordCount: number): boolean {
  const { comparison, scores } = input;
  const coveragePercent = comparison.coveragePercent;
  const completenessScore = scores.completenessScore ?? comparison.coveragePercent;
  const correctWordCount = comparison.correctWords.length;
  const targetWordCount = Math.max(comparison.targetWordCount, 1);
  const correctRatio = correctWordCount / targetWordCount;

  return (
    coveragePercent >= STRONG_COVERAGE_THRESHOLD
    && completenessScore >= STRONG_COMPLETENESS_THRESHOLD
    && correctRatio >= 0.6
    && weakWordCount > 0
  );
}

export function resolveCoachFeedbackDecision(input: CoachFeedbackInput): CoachFeedbackDecision {
  const { comparison, scores, pronunciationAssessment } = input;
  const matchScore = input.matchScore ?? scores.matchScore ?? comparison.matchPercent;
  const coveragePercent = comparison.coveragePercent;
  const missingWordCount = comparison.missingWordCount || comparison.missingWords.length;
  const correctWordCount = comparison.correctWords.length;
  const targetWordCount = comparison.targetWordCount;
  const pronunciationScore = scores.pronunciationScore;
  const accuracyScore = scores.accuracyScore ?? pronunciationScore;
  const fluencyScore = scores.fluencyScore;
  const completenessScore = scores.completenessScore ?? comparison.coveragePercent;
  const prosodyScore = scores.prosodyScore ?? null;
  const weakWordCounts = countWeakAzureWords(pronunciationAssessment);

  let feedbackType: CoachFeedbackType = 'general';

  if (isWrongSentence(input)) {
    feedbackType = 'wrong_sentence';
  } else if (isMissingWords(input)) {
    feedbackType = 'missing_words';
  } else if (isClarityIssue(input, weakWordCounts.weakWordCount)) {
    feedbackType = 'clarity_issue';
  } else if (meetsWeakPronunciationThreshold(input, weakWordCounts.weakWordCount)) {
    feedbackType = 'weak_pronunciation';
  } else if (
    pronunciationScore >= 75
    && accuracyScore >= 75
    && fluencyScore < 70
  ) {
    feedbackType = 'fluency_issue';
  } else if (
    pronunciationScore >= 75
    && accuracyScore >= 75
    && prosodyScore !== null
    && prosodyScore < 70
  ) {
    feedbackType = 'prosody_issue';
  } else if (
    scores.nativeScore >= 85
    && pronunciationScore >= 80
    && accuracyScore >= 80
    && completenessScore >= 85
    && accuracyScore >= 70
  ) {
    feedbackType = 'good_result';
  }

  return {
    feedbackType,
    nativeScore: scores.nativeScore,
    matchScore,
    coveragePercent,
    correctWordCount,
    missingWordCount,
    targetWordCount,
    pronunciationScore,
    accuracyScore,
    fluencyScore,
    completenessScore,
    prosodyScore,
    weakWordCount: weakWordCounts.weakWordCount,
    severeWeakWordCount: weakWordCounts.severeWeakWordCount,
  };
}

function logCoachDecision(
  decision: CoachFeedbackDecision,
  weakWordCountBeforeFilter: number,
  weakWordCountAfterFilter: number,
): void {
  analysisDebugLog('[EchoSpeak Coach] decision', {
    feedbackType: decision.feedbackType,
    nativeScore: decision.nativeScore,
    matchScore: decision.matchScore,
    coveragePercent: decision.coveragePercent,
    correctWordCount: decision.correctWordCount,
    missingWordCount: decision.missingWordCount,
    targetWordCount: decision.targetWordCount,
    pronunciationScore: decision.pronunciationScore,
    accuracyScore: decision.accuracyScore,
    fluencyScore: decision.fluencyScore,
    completenessScore: decision.completenessScore,
    weakWordCountBeforeFilter,
    weakWordCountAfterFilter,
  });
}

function buildClarityIssueComment(
  copy: CoachCopy,
  pronunciationAssessment?: PronunciationAssessmentResult | null,
): string {
  const severeWeakWords = getSevereWeakAzureWords(pronunciationAssessment, 2);
  let comment = copy.clarityIssue;

  if (severeWeakWords.length > 0) {
    comment += copy.clarityIssueWords(formatWeakWordPhrase(severeWeakWords, copy));
  }

  return comment;
}

function buildPronunciationAssessmentComment(
  input: CoachFeedbackInput,
  decision: CoachFeedbackDecision,
  copy: CoachCopy,
): string {
  const { comparison, pronunciationAssessment } = input;
  const weakWords = getWeakAzureWords(pronunciationAssessment, 2);
  const missingWordsText = formatMissingWords(comparison.missingWords);
  const completenessScore = decision.completenessScore;

  switch (decision.feedbackType) {
    case 'wrong_sentence':
      return copy.wrongSentence;

    case 'missing_words': {
      let comment = copy.missingWordsLead;
      if (missingWordsText) {
        comment += copy.missingWordsList(missingWordsText);
      }
      return comment;
    }

    case 'clarity_issue':
      return buildClarityIssueComment(copy, pronunciationAssessment);

    case 'weak_pronunciation':
      return copy.weakPronunciation(formatWeakWordPhrase(weakWords, copy));

    case 'fluency_issue':
      return copy.fluencyIssue;

    case 'prosody_issue':
      return copy.prosodyIssue;

    case 'good_result':
      return copy.goodResult;

    default:
      if (decision.pronunciationScore < 65 || decision.accuracyScore < 65) {
        return copy.generalLowClarity;
      }

      if (completenessScore >= CLARITY_COMPLETENESS_THRESHOLD) {
        return copy.generalStrengthenClarity;
      }

      return copy.generalBoth;
  }
}

function resolveTextMatchFeedbackType(input: CoachFeedbackInput): CoachFeedbackType {
  if (isWrongSentence(input)) {
    return 'wrong_sentence';
  }

  if (isMissingWords(input)) {
    return 'missing_words';
  }

  const { comparison, scores } = input;
  const matchScore = input.matchScore ?? scores.matchScore ?? comparison.matchPercent;

  if (
    scores.nativeScore >= 85
    && matchScore >= 85
    && comparison.coveragePercent >= 95
    && comparison.missingWords.length === 0
    && getImproveOnlyWords(comparison).length === 0
  ) {
    return 'good_result';
  }

  return 'general';
}

export function buildCoachFeedbackTr(input: CoachFeedbackInput): CoachFeedback {
  const { comparison, scores, weakAreas } = input;
  const copy = getCoachCopy(input.uiLanguage ?? DEFAULT_COACH_LANGUAGE);
  const matchScore = input.matchScore ?? scores.matchScore ?? comparison.matchPercent;
  const analysisMode = input.analysisMode ?? scores.analysisMode;
  const hasMissing = comparison.missingWords.length > 0;
  const missingCount = comparison.missingWordCount || comparison.missingWords.length;
  const improveOnlyWords = getImproveOnlyWords(comparison);
  const hasImprove = improveOnlyWords.length > 0;
  const strictnessComments = buildStrictnessComments(input, copy);

  if (analysisMode === 'pronunciation_assessment') {
    const decision = resolveCoachFeedbackDecision(input);

    return {
      aiCoachCommentTr: buildPronunciationAssessmentComment(input, decision, copy),
      nextFocusTr: buildNextFocus(weakAreas, comparison, copy, decision.feedbackType),
      feedbackType: decision.feedbackType,
    };
  }

  const textMatchFeedbackType = resolveTextMatchFeedbackType(input);
  const nextFocusTr = buildNextFocus(weakAreas, comparison, copy, textMatchFeedbackType);

  if (analysisMode === 'text_match_only') {
    if (textMatchFeedbackType === 'good_result') {
      return {
        aiCoachCommentTr: appendTextMatchNote(
          copy.textMatchGood,
          analysisMode,
          copy,
        ),
        nextFocusTr,
        feedbackType: textMatchFeedbackType,
      };
    }

    if (textMatchFeedbackType === 'wrong_sentence') {
      return {
        aiCoachCommentTr: appendTextMatchNote(
          copy.wrongSentence,
          analysisMode,
          copy,
        ),
        nextFocusTr,
        feedbackType: textMatchFeedbackType,
      };
    }

    if (textMatchFeedbackType === 'missing_words') {
      const parts = [
        copy.missingWordsLead,
        ...strictnessComments,
      ];
      if (hasImprove) parts.push(buildImproveWordsComment(copy));

      return {
        aiCoachCommentTr: appendTextMatchNote(combineCoachComments(...parts), analysisMode, copy),
        nextFocusTr,
        feedbackType: textMatchFeedbackType,
      };
    }

    if (matchScore < 55) {
      const parts = [
        copy.textMatchLow,
        ...strictnessComments,
      ];
      if (hasMissing && missingCount < 2) parts.push(buildMissingWordsComment(missingCount, copy));
      if (hasImprove) parts.push(buildImproveWordsComment(copy));

      return {
        aiCoachCommentTr: appendTextMatchNote(combineCoachComments(...parts), analysisMode, copy),
        nextFocusTr,
        feedbackType: textMatchFeedbackType,
      };
    }

    if (strictnessComments.length > 0) {
      const parts = [...strictnessComments];
      if (hasImprove) parts.push(buildImproveWordsComment(copy));
      if (hasMissing && missingCount < 2) parts.push(buildMissingWordsComment(missingCount, copy));

      return {
        aiCoachCommentTr: appendTextMatchNote(combineCoachComments(...parts), analysisMode, copy),
        nextFocusTr,
        feedbackType: textMatchFeedbackType,
      };
    }

    if (hasMissing && !hasImprove) {
      return {
        aiCoachCommentTr: appendTextMatchNote(buildMissingWordsComment(missingCount, copy), analysisMode, copy),
        nextFocusTr,
        feedbackType: textMatchFeedbackType,
      };
    }

    if (hasImprove) {
      const parts = [buildImproveWordsComment(copy)];
      if (hasMissing) parts.unshift(buildMissingWordsComment(missingCount, copy));

      return {
        aiCoachCommentTr: appendTextMatchNote(combineCoachComments(...parts), analysisMode, copy),
        nextFocusTr,
        feedbackType: textMatchFeedbackType,
      };
    }

    return {
      aiCoachCommentTr: appendTextMatchNote(
        copy.textMatchComplete(matchScore),
        analysisMode,
        copy,
      ),
      nextFocusTr,
      feedbackType: textMatchFeedbackType,
    };
  }

  if (scores.nativeScore >= 80 && !hasMissing && !hasImprove) {
    return {
      aiCoachCommentTr: copy.nativeGood,
      nextFocusTr,
      feedbackType: 'good_result',
    };
  }

  if (textMatchFeedbackType === 'wrong_sentence') {
    const parts = [
      copy.wrongSentence,
      ...strictnessComments,
    ];

    return {
      aiCoachCommentTr: combineCoachComments(...parts),
      nextFocusTr,
      feedbackType: textMatchFeedbackType,
    };
  }

  if (scores.nativeScore < 55) {
    const parts = [
      copy.textMatchLow,
      ...strictnessComments,
    ];
    if (hasMissing && missingCount < 2) parts.push(buildMissingWordsComment(missingCount, copy));
    if (hasImprove) parts.push(buildImproveWordsComment(copy));

    return {
      aiCoachCommentTr: combineCoachComments(...parts),
      nextFocusTr,
      feedbackType: textMatchFeedbackType,
    };
  }

  if (strictnessComments.length > 0) {
    const parts = [...strictnessComments];
    if (hasImprove) parts.push(buildImproveWordsComment(copy));

    return {
      aiCoachCommentTr: combineCoachComments(...parts),
      nextFocusTr,
      feedbackType: textMatchFeedbackType,
    };
  }

  if (hasMissing && !hasImprove) {
    return {
      aiCoachCommentTr: buildMissingWordsComment(missingCount, copy),
      nextFocusTr,
      feedbackType: textMatchFeedbackType === 'general' ? 'missing_words' : textMatchFeedbackType,
    };
  }

  if (hasImprove) {
    const parts = [buildImproveWordsComment(copy)];
    if (hasMissing) parts.unshift(buildMissingWordsComment(missingCount, copy));

    return {
      aiCoachCommentTr: combineCoachComments(...parts),
      nextFocusTr,
      feedbackType: textMatchFeedbackType,
    };
  }

  return {
    aiCoachCommentTr: copy.nativePartial(matchScore),
    nextFocusTr,
    feedbackType: textMatchFeedbackType,
  };
}

export { logCoachDecision };
