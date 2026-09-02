import type { WordPronunciationFeedback } from '../../audioAnalysis/audioAnalysisTypes';
import type { AiSpeechAnalysisOutput } from '../../ai/aiTypes';

export type PrimaryTakeawayKind =
  | 'wrong_sentence'
  | 'severe_pronunciation'
  | 'completeness'
  | 'low_fluency'
  | 'prosody'
  | 'borderline_pronunciation'
  | 'positive';

export interface PrimaryTakeaway {
  kind: PrimaryTakeawayKind;
  messageKey: string;
  messageParams?: Record<string, string | number>;
}

const SHORT_WORD_MAX_CHARS = 2;

function isShortNoiseWord(word: string): boolean {
  const normalized = word.replace(/[^\w]/g, '');
  return normalized.length <= SHORT_WORD_MAX_CHARS;
}

function pronunciationCandidates(
  feedback: WordPronunciationFeedback[] | undefined,
  missingWords: string[],
): WordPronunciationFeedback[] {
  if (!feedback?.length) return [];

  return feedback.filter((item) => {
    if (item.issueType === 'missing' || item.issueType === 'insertion') return false;
    if (item.issueType === 'recognition_mismatch' || item.issueType === 'low_confidence') {
      return false;
    }
    if (isShortNoiseWord(item.word)) return false;
    if (
      missingWords.some(
        (missing) => missing.toLocaleLowerCase('en-US') === item.word.toLocaleLowerCase('en-US'),
      )
    ) {
      return false;
    }
    return item.issueType === 'pronunciation' || item.issueType == null;
  });
}

function worstPronunciationWord(
  items: WordPronunciationFeedback[],
  severity: 'severe' | 'borderline',
): WordPronunciationFeedback | null {
  const filtered = items.filter((item) => item.severity === severity || (severity === 'borderline' && item.severity == null));
  if (filtered.length === 0) return null;

  return [...filtered].sort((a, b) => {
    const aScore = typeof a.accuracyScore === 'number' ? a.accuracyScore : 100;
    const bScore = typeof b.accuracyScore === 'number' ? b.accuracyScore : 100;
    return aScore - bScore;
  })[0];
}

export function resolvePrimaryTakeaway(analysis: AiSpeechAnalysisOutput): PrimaryTakeaway {
  if (analysis.feedbackType === 'wrong_sentence') {
    return {
      kind: 'wrong_sentence',
      messageKey: 'analysis.takeawayWrongSentence',
    };
  }

  const missingCount = analysis.missingWords?.length ?? 0;
  const completeness = analysis.completenessScore;
  const fluency = analysis.fluencyScore;
  const prosody = analysis.prosodyScore;
  const candidates = pronunciationCandidates(
    analysis.wordPronunciationFeedback,
    analysis.missingWords ?? [],
  );

  const severeWord = worstPronunciationWord(candidates, 'severe');
  if (severeWord) {
    return {
      kind: 'severe_pronunciation',
      messageKey: 'analysis.takeawaySevereWord',
      messageParams: { word: severeWord.word },
    };
  }

  if (
    analysis.feedbackType === 'missing_words' ||
    missingCount >= 2 ||
    (typeof completeness === 'number' && completeness < 70)
  ) {
    return {
      kind: 'completeness',
      messageKey: 'analysis.takeawayCompleteness',
    };
  }

  if (analysis.feedbackType === 'fluency_issue' || fluency < 65) {
    return {
      kind: 'low_fluency',
      messageKey: 'analysis.takeawayFluency',
    };
  }

  if (analysis.feedbackType === 'prosody_issue' || (typeof prosody === 'number' && prosody < 65)) {
    return {
      kind: 'prosody',
      messageKey: 'analysis.takeawayProsody',
    };
  }

  const borderlineWord = worstPronunciationWord(candidates, 'borderline');
  if (borderlineWord) {
    return {
      kind: 'borderline_pronunciation',
      messageKey: 'analysis.takeawayBorderlineWord',
      messageParams: { word: borderlineWord.word },
    };
  }

  if (analysis.nativeScore >= 85 || analysis.feedbackType === 'good_result') {
    return {
      kind: 'positive',
      messageKey: 'analysis.takeawayPositiveStrong',
    };
  }

  return {
    kind: 'positive',
    messageKey: 'analysis.takeawayPositiveKeep',
  };
}
