import type {
  CoachFeedback,
  SpeechAnalysisMode,
  SpeechScores,
  TextComparisonResult,
} from '../types/analysis.js';
import type { PronunciationAssessmentResult } from './pronunciationAssessment/pronunciationAssessmentTypes.js';
import { getWeakestAzureWords } from './pronunciationFeedbackService.js';

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

function getImproveOnlyWords(comparison: TextComparisonResult): string[] {
  const missingSet = new Set(comparison.missingWords);
  return comparison.wordsToImprove.filter((word) => !missingSet.has(word));
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
): string {
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

function buildAzurePronunciationComment(input: CoachFeedbackInput): string | null {
  const { scores, comparison, pronunciationAssessment } = input;
  const weakWords = getWeakestAzureWords(pronunciationAssessment, 2);
  const fluencyScore = scores.fluencyScore;
  const pronunciationScore = scores.pronunciationScore;
  const completenessScore = scores.completenessScore ?? comparison.coveragePercent;
  const prosodyScore = scores.prosodyScore;

  if (comparison.missingWordCount >= 2) {
    return 'Kelimeleri doğru sırayla söyledin ama cümle eksik kaldı; önce tüm kelimeleri tamamlamaya odaklan.';
  }

  if (weakWords.length > 0 && weakWords.some((word) => /think|thank|three|through/i.test(word))) {
    return `Kelimeleri doğru sırayla söyledin ama '${weakWords[0]}' kelimesindeki TH sesi zayıf kalmış.`;
  }

  if (weakWords.length > 0) {
    return `Kelimeleri doğru sırayla söyledin ama '${weakWords[0]}' kelimesinin telaffuzu zayıf kalmış.`;
  }

  if (fluencyScore < 70) {
    return 'Cümleyi tamamlamışsın fakat akıcılık düşük; kelimeler arasında fazla duraklama var.';
  }

  if ((prosodyScore ?? pronunciationScore) >= 80 && completenessScore >= 85) {
    return 'Telaffuz iyi, şimdi daha doğal ritim için cümleyi tek parça halinde söylemeyi dene.';
  }

  if (pronunciationScore >= 85 && fluencyScore >= 80) {
    return 'Telaffuzun güçlü görünüyor. Bir sonraki denemede ritmi biraz daha doğal hale getirmeye odaklan.';
  }

  if (pronunciationScore < 65) {
    return 'Cümle anlaşılıyor ama telaffuz netliği düşük; hedef cümleyi daha yavaş ve net söylemeyi dene.';
  }

  return null;
}

export function buildCoachFeedbackTr(input: CoachFeedbackInput): CoachFeedback {
  const { comparison, scores, weakAreas } = input;
  const matchScore = input.matchScore ?? scores.matchScore ?? comparison.matchPercent;
  const analysisMode = input.analysisMode ?? scores.analysisMode;
  const hasMissing = comparison.missingWords.length > 0;
  const missingCount = comparison.missingWordCount || comparison.missingWords.length;
  const improveOnlyWords = getImproveOnlyWords(comparison);
  const hasImprove = improveOnlyWords.length > 0;
  const nextFocusTr = buildNextFocus(weakAreas, comparison);
  const strictnessComments = buildStrictnessComments(input);

  if (analysisMode === 'pronunciation_assessment') {
    const azureComment = buildAzurePronunciationComment(input);
    if (azureComment) {
      const parts = [azureComment, ...strictnessComments];
      return {
        aiCoachCommentTr: combineCoachComments(...parts),
        nextFocusTr,
      };
    }
  }

  if (analysisMode === 'text_match_only') {
    if (matchScore >= 85 && !hasMissing && !hasImprove && comparison.coveragePercent >= 95) {
      return {
        aiCoachCommentTr: appendTextMatchNote(
          'Kelime eşleşmen iyi görünüyor. Azure telaffuz değerlendirmesi açıldığında gerçek telaffuz puanını da görebilirsin.',
          analysisMode,
        ),
        nextFocusTr,
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
      };
    }

    if (strictnessComments.length > 0) {
      const parts = [...strictnessComments];
      if (hasImprove) parts.push(buildImproveWordsComment());
      if (hasMissing && missingCount < 2) parts.push(buildMissingWordsComment(missingCount));

      return {
        aiCoachCommentTr: appendTextMatchNote(combineCoachComments(...parts), analysisMode),
        nextFocusTr,
      };
    }

    if (hasMissing && !hasImprove) {
      return {
        aiCoachCommentTr: appendTextMatchNote(buildMissingWordsComment(missingCount), analysisMode),
        nextFocusTr,
      };
    }

    if (hasImprove) {
      const parts = [buildImproveWordsComment()];
      if (hasMissing) parts.unshift(buildMissingWordsComment(missingCount));

      return {
        aiCoachCommentTr: appendTextMatchNote(combineCoachComments(...parts), analysisMode),
        nextFocusTr,
      };
    }

    return {
      aiCoachCommentTr: appendTextMatchNote(
        `Cümleyi doğru kelimelerle tamamladın (%${matchScore} eşleşme). Azure telaffuz değerlendirmesi açıldığında gerçek telaffuz puanını da görebilirsin.`,
        analysisMode,
      ),
      nextFocusTr,
    };
  }

  if (scores.nativeScore >= 80 && !hasMissing && !hasImprove) {
    return {
      aiCoachCommentTr:
        'Genel olarak iyi gidiyorsun. Bir sonraki denemede ritmi biraz daha doğal hale getirmeye odaklan.',
      nextFocusTr,
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
    };
  }

  if (strictnessComments.length > 0) {
    const parts = [...strictnessComments];
    if (hasImprove) parts.push(buildImproveWordsComment());

    return {
      aiCoachCommentTr: combineCoachComments(...parts),
      nextFocusTr,
    };
  }

  if (hasMissing && !hasImprove) {
    return {
      aiCoachCommentTr: buildMissingWordsComment(missingCount),
      nextFocusTr,
    };
  }

  if (hasImprove) {
    const parts = [buildImproveWordsComment()];
    if (hasMissing) parts.unshift(buildMissingWordsComment(missingCount));

    return {
      aiCoachCommentTr: combineCoachComments(...parts),
      nextFocusTr,
    };
  }

  return {
    aiCoachCommentTr: `Cümlenin büyük kısmı anlaşılır (%${matchScore} eşleşme). Bir sonraki denemede eksik kalan kelimeleri daha net söylemeye çalış.`,
    nextFocusTr,
  };
}
