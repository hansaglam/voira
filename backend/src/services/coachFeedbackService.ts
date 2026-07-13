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

export interface CoachFeedbackInput {
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

const TEXT_MATCH_NOTE_TR =
  'Bu analiz kelime eşleşmesine göre hazırlanmıştır; gerçek telaffuz puanı için Azure telaffuz değerlendirmesi gerekir.';

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

function formatWeakWordPhrase(words: string[]): string {
  if (words.length === 0) {
    return '';
  }

  if (words.length === 1) {
    return `'${words[0]}'`;
  }

  return `'${words[0]}' ve '${words[1]}'`;
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
  feedbackType?: CoachFeedbackType,
): string {
  switch (feedbackType) {
    case 'wrong_sentence':
      return 'Önce hedef cümleyi doğru kelimelerle baştan sona tamamlamaya odaklan.';
    case 'missing_words':
      return 'Bir sonraki denemede cümleyi baştan sona tamamlamaya odaklan.';
    case 'clarity_issue':
      return 'Zayıf görünen kelimeleri daha yavaş ve net söylemeye odaklan.';
    case 'weak_pronunciation':
      return 'Zayıf kalan kelimeleri daha net söylemeye odaklan.';
    case 'fluency_issue':
      return 'Cümleyi tek parça ve daha akıcı söylemeyi dene.';
    case 'prosody_issue':
      return 'Önemli kelimelere hafif vurgu vererek tekrar dene.';
    case 'good_result':
      return 'Bir sonraki denemede daha doğal vurgu ve ritme odaklanabilirsin.';
    default:
      break;
  }

  const missingCount = comparison.missingWordCount || comparison.missingWords.length;
  const improveOnlyCount = getImproveOnlyWords(comparison).length;

  if (missingCount >= 2) {
    return 'Bir sonraki denemede cümleyi baştan sona tamamlamaya odaklan.';
  }

  if (missingCount > improveOnlyCount && missingCount > 0) {
    return 'Bir sonraki denemede cümleyi tamamlamaya odaklan.';
  }

  if (improveOnlyCount > 0) {
    return 'Ritmi hedef cümleyle benzer tutmayı dene.';
  }

  const primaryWeakArea = weakAreas[0];
  if (!primaryWeakArea) {
    return 'Önce kısa bölümler halinde, sonra tam cümle olarak söyle.';
  }
  return `Öncelik: ${primaryWeakArea}`;
}

function appendTextMatchNote(comment: string, analysisMode: SpeechAnalysisMode): string {
  if (analysisMode !== 'text_match_only') {
    return comment;
  }

  if (comment.includes('Detaylı telaffuz')) {
    return comment;
  }

  return `${comment} ${TEXT_MATCH_NOTE_TR}`;
}

function buildMissingWordsComment(missingCount: number): string {
  if (missingCount >= 2) {
    return 'Bazı kelimeler eksik kaldı. Bir sonraki denemede cümleyi baştan sona tamamlamaya odaklan.';
  }

  return 'Bu denemede bazı kelimeler eksik kaldı. Bir sonraki denemede cümleyi tamamlamaya odaklan.';
}

function buildShortRecordingComment(): string {
  return 'Kayıt hedef cümleye göre kısa görünüyor. Cümleyi acele etmeden tamamını söylemeyi dene.';
}

function buildLowOrderComment(): string {
  return 'Kelimeleri doğru sırada ve cümle akışında söylemeye çalış.';
}

function buildImproveWordsComment(): string {
  return 'Ritmi hedef cümleyle benzer tutmayı dene.';
}

function combineCoachComments(...parts: string[]): string {
  return parts.filter(Boolean).join(' ');
}

function buildStrictnessComments(input: CoachFeedbackInput): string[] {
  const { comparison, durationMillis } = input;
  const parts: string[] = [];
  const missingCount = comparison.missingWordCount || comparison.missingWords.length;
  const targetWordCount = comparison.targetWordCount;

  if (missingCount >= 2) {
    parts.push(buildMissingWordsComment(missingCount));
  }

  if (isRecordingTooShort(durationMillis, targetWordCount)) {
    parts.push(buildShortRecordingComment());
  }

  if (comparison.orderScore < LOW_ORDER_SCORE_THRESHOLD && missingCount === 0) {
    parts.push(buildLowOrderComment());
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
  pronunciationAssessment?: PronunciationAssessmentResult | null,
): string {
  const severeWeakWords = getSevereWeakAzureWords(pronunciationAssessment, 2);
  let comment =
    'Cümleyi büyük ölçüde tamamladın fakat telaffuz netliği düşük kaldı. Önce zayıf görünen kelimeleri daha yavaş ve net söylemeye odaklan.';

  if (severeWeakWords.length > 0) {
    comment += ` Özellikle ${formatWeakWordPhrase(severeWeakWords)} kelimelerini daha net söylemeyi dene.`;
  }

  return comment;
}

function buildPronunciationAssessmentComment(
  input: CoachFeedbackInput,
  decision: CoachFeedbackDecision,
): string {
  const { comparison, pronunciationAssessment } = input;
  const weakWords = getWeakAzureWords(pronunciationAssessment, 2);
  const missingWordsText = formatMissingWords(comparison.missingWords);
  const completenessScore = decision.completenessScore;

  switch (decision.feedbackType) {
    case 'wrong_sentence':
      return 'Hedef cümleden farklı bir şey söyledin. Önce hedef cümleyi baştan sona doğru kelimelerle söylemeye odaklan.';

    case 'missing_words': {
      let comment = 'Cümlenin bazı kelimeleri eksik kaldı. Önce hedef cümleyi baştan sona tamamlamaya odaklan.';
      if (missingWordsText) {
        comment += ` Eksik kalan kelimeler: ${missingWordsText}.`;
      }
      return comment;
    }

    case 'clarity_issue':
      return buildClarityIssueComment(pronunciationAssessment);

    case 'weak_pronunciation':
      return `Cümleyi büyük ölçüde tamamladın ama bazı kelimelerin telaffuzu zayıf kaldı. Özellikle ${formatWeakWordPhrase(weakWords)} kelimelerini daha net söylemeye odaklan.`;

    case 'fluency_issue':
      return 'Kelimeleri doğru söyledin ama akıcılık düşük kaldı. Cümleyi kelime kelime değil, daha bağlı ve tek parça halinde söylemeyi dene.';

    case 'prosody_issue':
      return 'Telaffuzun anlaşılır ama vurgu ve tonlama daha doğal olabilir. Önemli kelimelere hafif vurgu vererek tekrar dene.';

    case 'good_result':
      return 'Güzel iş. Cümleyi anlaşılır ve akıcı söyledin. Bir sonraki denemede daha doğal vurgu ve ritme odaklanabilirsin.';

    default:
      if (decision.pronunciationScore < 65 || decision.accuracyScore < 65) {
        return 'Cümle anlaşılıyor ama telaffuz netliği düşük; hedef cümleyi daha yavaş ve net söylemeyi dene.';
      }

      if (completenessScore >= CLARITY_COMPLETENESS_THRESHOLD) {
        return 'Cümleyi büyük ölçüde tamamladın fakat telaffuz netliğini güçlendirmeye devam et. Zayıf kalan kelimeleri daha yavaş ve net söyle.';
      }

      return 'Bir sonraki denemede hem tamamlamayı hem telaffuz netliğini güçlendirmeye odaklan.';
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
  const matchScore = input.matchScore ?? scores.matchScore ?? comparison.matchPercent;
  const analysisMode = input.analysisMode ?? scores.analysisMode;
  const hasMissing = comparison.missingWords.length > 0;
  const missingCount = comparison.missingWordCount || comparison.missingWords.length;
  const improveOnlyWords = getImproveOnlyWords(comparison);
  const hasImprove = improveOnlyWords.length > 0;
  const strictnessComments = buildStrictnessComments(input);

  if (analysisMode === 'pronunciation_assessment') {
    const decision = resolveCoachFeedbackDecision(input);

    return {
      aiCoachCommentTr: buildPronunciationAssessmentComment(input, decision),
      nextFocusTr: buildNextFocus(weakAreas, comparison, decision.feedbackType),
      feedbackType: decision.feedbackType,
    };
  }

  const textMatchFeedbackType = resolveTextMatchFeedbackType(input);
  const nextFocusTr = buildNextFocus(weakAreas, comparison, textMatchFeedbackType);

  if (analysisMode === 'text_match_only') {
    if (textMatchFeedbackType === 'good_result') {
      return {
        aiCoachCommentTr: appendTextMatchNote(
          'Kelime eşleşmen iyi görünüyor. Azure telaffuz değerlendirmesi açıldığında gerçek telaffuz puanını da görebilirsin.',
          analysisMode,
        ),
        nextFocusTr,
        feedbackType: textMatchFeedbackType,
      };
    }

    if (textMatchFeedbackType === 'wrong_sentence') {
      return {
        aiCoachCommentTr: appendTextMatchNote(
          'Hedef cümleden farklı bir şey söyledin. Önce hedef cümleyi baştan sona doğru kelimelerle söylemeye odaklan.',
          analysisMode,
        ),
        nextFocusTr,
        feedbackType: textMatchFeedbackType,
      };
    }

    if (textMatchFeedbackType === 'missing_words') {
      const parts = [
        'Cümlenin bazı kelimeleri eksik kaldı. Önce hedef cümleyi baştan sona tamamlamaya odaklan.',
        ...strictnessComments,
      ];
      if (hasImprove) parts.push(buildImproveWordsComment());

      return {
        aiCoachCommentTr: appendTextMatchNote(combineCoachComments(...parts), analysisMode),
        nextFocusTr,
        feedbackType: textMatchFeedbackType,
      };
    }

    if (matchScore < 55) {
      const parts = [
        'Bu denemede hedef cümleyle eşleşme düşük görünüyor. Cümleyi daha yavaş ve parça parça tekrar etmeyi dene.',
        ...strictnessComments,
      ];
      if (hasMissing && missingCount < 2) parts.push(buildMissingWordsComment(missingCount));
      if (hasImprove) parts.push(buildImproveWordsComment());

      return {
        aiCoachCommentTr: appendTextMatchNote(combineCoachComments(...parts), analysisMode),
        nextFocusTr,
        feedbackType: textMatchFeedbackType,
      };
    }

    if (strictnessComments.length > 0) {
      const parts = [...strictnessComments];
      if (hasImprove) parts.push(buildImproveWordsComment());
      if (hasMissing && missingCount < 2) parts.push(buildMissingWordsComment(missingCount));

      return {
        aiCoachCommentTr: appendTextMatchNote(combineCoachComments(...parts), analysisMode),
        nextFocusTr,
        feedbackType: textMatchFeedbackType,
      };
    }

    if (hasMissing && !hasImprove) {
      return {
        aiCoachCommentTr: appendTextMatchNote(buildMissingWordsComment(missingCount), analysisMode),
        nextFocusTr,
        feedbackType: textMatchFeedbackType,
      };
    }

    if (hasImprove) {
      const parts = [buildImproveWordsComment()];
      if (hasMissing) parts.unshift(buildMissingWordsComment(missingCount));

      return {
        aiCoachCommentTr: appendTextMatchNote(combineCoachComments(...parts), analysisMode),
        nextFocusTr,
        feedbackType: textMatchFeedbackType,
      };
    }

    return {
      aiCoachCommentTr: appendTextMatchNote(
        `Cümleyi doğru kelimelerle tamamladın (%${matchScore} eşleşme). Azure telaffuz değerlendirmesi açıldığında gerçek telaffuz puanını da görebilirsin.`,
        analysisMode,
      ),
      nextFocusTr,
      feedbackType: textMatchFeedbackType,
    };
  }

  if (scores.nativeScore >= 80 && !hasMissing && !hasImprove) {
    return {
      aiCoachCommentTr:
        'Genel olarak iyi gidiyorsun. Bir sonraki denemede ritmi biraz daha doğal hale getirmeye odaklan.',
      nextFocusTr,
      feedbackType: 'good_result',
    };
  }

  if (textMatchFeedbackType === 'wrong_sentence') {
    const parts = [
      'Hedef cümleden farklı bir şey söyledin. Önce hedef cümleyi baştan sona doğru kelimelerle söylemeye odaklan.',
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
      'Bu denemede hedef cümleyle eşleşme düşük görünüyor. Cümleyi daha yavaş ve parça parça tekrar etmeyi dene.',
      ...strictnessComments,
    ];
    if (hasMissing && missingCount < 2) parts.push(buildMissingWordsComment(missingCount));
    if (hasImprove) parts.push(buildImproveWordsComment());

    return {
      aiCoachCommentTr: combineCoachComments(...parts),
      nextFocusTr,
      feedbackType: textMatchFeedbackType,
    };
  }

  if (strictnessComments.length > 0) {
    const parts = [...strictnessComments];
    if (hasImprove) parts.push(buildImproveWordsComment());

    return {
      aiCoachCommentTr: combineCoachComments(...parts),
      nextFocusTr,
      feedbackType: textMatchFeedbackType,
    };
  }

  if (hasMissing && !hasImprove) {
    return {
      aiCoachCommentTr: buildMissingWordsComment(missingCount),
      nextFocusTr,
      feedbackType: textMatchFeedbackType === 'general' ? 'missing_words' : textMatchFeedbackType,
    };
  }

  if (hasImprove) {
    const parts = [buildImproveWordsComment()];
    if (hasMissing) parts.unshift(buildMissingWordsComment(missingCount));

    return {
      aiCoachCommentTr: combineCoachComments(...parts),
      nextFocusTr,
      feedbackType: textMatchFeedbackType,
    };
  }

  return {
    aiCoachCommentTr: `Cümlenin büyük kısmı anlaşılır (%${matchScore} eşleşme). Bir sonraki denemede eksik kalan kelimeleri daha net söylemeye çalış.`,
    nextFocusTr,
    feedbackType: textMatchFeedbackType,
  };
}

export { logCoachDecision };
