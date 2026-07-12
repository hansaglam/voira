import type {
  AnalysisFeedbackType,
  TextComparisonResult,
  WordPronunciationFeedback,
} from '../types/analysis.js';
import { tokenize } from '../utils/normalize.js';
import type { ReconciledWordFeedback } from './wordFeedbackReconciliationService.js';
import { wordsEquivalentForReconciliation } from './wordFeedbackReconciliationService.js';

const WRONG_SENTENCE_WEAK_AREAS = ['hedef cümle', 'baştan dene', 'kelime eşleşmesi'];
const CLARITY_ISSUE_WEAK_AREAS = [
  'telaffuz netliği',
  'yavaş ve net söyle',
  'zayıf kelimeler',
];

export interface FeedbackPresentationInput {
  feedbackType: AnalysisFeedbackType;
  targetText: string;
  comparison: TextComparisonResult;
  reconciled: ReconciledWordFeedback;
  weakAreasDetected: string[];
}

export interface FeedbackPresentationResult {
  missingWords: string[];
  wordsToImprove: string[];
  wordPronunciationFeedback: WordPronunciationFeedback[];
  weakAreasDetected: string[];
  weakWordCountAfterFilter: number;
}

function isWordActuallySpoken(word: string, comparison: TextComparisonResult): boolean {
  const spokenWords = [...comparison.correctWords, ...comparison.wordsToImprove];
  return spokenWords.some((spoken) => wordsEquivalentForReconciliation(spoken, word));
}

function filterToSpokenWeakWords(
  feedback: WordPronunciationFeedback[],
  comparison: TextComparisonResult,
): WordPronunciationFeedback[] {
  return feedback.filter((entry) => isWordActuallySpoken(entry.word, comparison));
}

function resolveMissingWordsForWrongSentence(targetText: string): string[] {
  return tokenize(targetText);
}

export function applyAnalysisFeedbackPresentation(
  input: FeedbackPresentationInput,
): FeedbackPresentationResult {
  const { feedbackType, targetText, comparison, reconciled, weakAreasDetected } = input;
  const weakBefore = reconciled.wordPronunciationFeedback.length;

  if (feedbackType === 'wrong_sentence') {
    return {
      missingWords: resolveMissingWordsForWrongSentence(targetText),
      wordsToImprove: [],
      wordPronunciationFeedback: [],
      weakAreasDetected: WRONG_SENTENCE_WEAK_AREAS,
      weakWordCountAfterFilter: 0,
    };
  }

  if (feedbackType === 'missing_words') {
    const filtered = filterToSpokenWeakWords(reconciled.wordPronunciationFeedback, comparison);
    return {
      missingWords: reconciled.missingWords,
      wordsToImprove: reconciled.wordsToImprove,
      wordPronunciationFeedback: filtered,
      weakAreasDetected,
      weakWordCountAfterFilter: filtered.length,
    };
  }

  if (feedbackType === 'clarity_issue') {
    const filtered = filterToSpokenWeakWords(reconciled.wordPronunciationFeedback, comparison);
    return {
      missingWords: reconciled.missingWords,
      wordsToImprove: reconciled.wordsToImprove,
      wordPronunciationFeedback: filtered,
      weakAreasDetected: CLARITY_ISSUE_WEAK_AREAS,
      weakWordCountAfterFilter: filtered.length,
    };
  }

  return {
    missingWords: reconciled.missingWords,
    wordsToImprove: reconciled.wordsToImprove,
    wordPronunciationFeedback: reconciled.wordPronunciationFeedback,
    weakAreasDetected,
    weakWordCountAfterFilter: weakBefore,
  };
}

export function shouldSuppressPhonemeFeedback(feedbackType: AnalysisFeedbackType): boolean {
  return feedbackType === 'wrong_sentence';
}
