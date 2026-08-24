import type { TextComparisonResult, WordPronunciationFeedback } from '../types/analysis.js';
import { getCoachCopy } from '../i18n/coachCopy.js';
import type { CoachLanguage } from '../i18n/uiLanguage.js';
import { DEFAULT_COACH_LANGUAGE } from '../i18n/uiLanguage.js';
import { tokenize } from '../utils/normalize.js';
import type { PronunciationAssessmentResult, PronunciationWordScore } from './pronunciationAssessment/pronunciationAssessmentTypes.js';
import {
  WEAK_WORD_ACCURACY_THRESHOLD,
  buildWordPronunciationFeedback,
} from './pronunciationFeedbackService.js';

export interface ReconciledWordFeedback {
  missingWords: string[];
  wordsToImprove: string[];
  wordPronunciationFeedback: WordPronunciationFeedback[];
  movedFromMissingToWeak: string[];
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = Array.from({ length: a.length + 1 }, () =>
    Array(b.length + 1).fill(0),
  );

  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }

  return matrix[a.length][b.length];
}

export function normalizeWordToken(word: string): string {
  return word
    .trim()
    .toLocaleLowerCase('en-US')
    .replace(/[^\w']/g, '');
}

function compactWordToken(word: string): string {
  return normalizeWordToken(word).replace(/-/g, '');
}

function stripPluralSuffix(word: string): string {
  if (word.endsWith('ies') && word.length > 4) {
    return `${word.slice(0, -3)}y`;
  }
  if (word.endsWith('es') && word.length > 3) {
    return word.slice(0, -2);
  }
  if (word.endsWith('s') && word.length > 3) {
    return word.slice(0, -1);
  }
  return word;
}

function isFuzzyEquivalent(a: string, b: string): boolean {
  if (a.length <= 3 || b.length <= 3) {
    return false;
  }
  if (Math.abs(a.length - b.length) > 2) {
    return false;
  }

  const maxDistance = a.length <= 5 ? 1 : 2;
  return levenshtein(a, b) <= maxDistance;
}

export function wordsEquivalentForReconciliation(a: string, b: string): boolean {
  const left = normalizeWordToken(a);
  const right = normalizeWordToken(b);

  if (!left || !right) {
    return false;
  }

  if (left === right) {
    return true;
  }

  if (compactWordToken(left) === compactWordToken(right)) {
    return true;
  }

  const leftStem = stripPluralSuffix(left);
  const rightStem = stripPluralSuffix(right);
  if (leftStem === rightStem) {
    return true;
  }

  if (
    (left.includes('-') || right.includes('-'))
    && compactWordToken(left) === compactWordToken(right)
  ) {
    return true;
  }

  return isFuzzyEquivalent(leftStem, rightStem);
}

function isWeakAzureWord(wordScore: PronunciationWordScore): boolean {
  const accuracy = wordScore.accuracyScore;
  const hasWeakAccuracy = accuracy !== undefined && accuracy < WEAK_WORD_ACCURACY_THRESHOLD;
  const hasPronunciationError = Boolean(wordScore.errorType && wordScore.errorType !== 'None');
  return hasWeakAccuracy || hasPronunciationError;
}

function isAzureWordActuallySpoken(wordScore: PronunciationWordScore): boolean {
  if (wordScore.errorType === 'Omission') {
    return false;
  }

  if (wordScore.accuracyScore !== undefined && wordScore.accuracyScore <= 10) {
    return false;
  }

  return true;
}

function resolveTargetDisplayWord(
  candidate: string,
  targetText: string,
): string {
  const targetWords = tokenize(targetText);
  for (const targetWord of targetWords) {
    if (wordsEquivalentForReconciliation(targetWord, candidate)) {
      return targetWord;
    }
  }

  return candidate;
}

function findAzureWordMatch(
  targetWord: string,
  azureWords: PronunciationWordScore[],
  usedAzureIndices: Set<number>,
): { index: number; wordScore: PronunciationWordScore } | null {
  for (let index = 0; index < azureWords.length; index++) {
    if (usedAzureIndices.has(index)) {
      continue;
    }

    const azureWord = azureWords[index];
    if (wordsEquivalentForReconciliation(targetWord, azureWord.word)) {
      return { index, wordScore: azureWord };
    }
  }

  return null;
}

function isEquivalentToAny(word: string, candidates: string[]): boolean {
  return candidates.some((candidate) => wordsEquivalentForReconciliation(word, candidate));
}

function mapFeedbackToTargetWords(
  feedback: WordPronunciationFeedback[],
  targetText: string,
): WordPronunciationFeedback[] {
  return feedback.map((entry) => ({
    ...entry,
    word: resolveTargetDisplayWord(entry.word, targetText),
  }));
}

function dedupeWordFeedback(
  feedback: WordPronunciationFeedback[],
): WordPronunciationFeedback[] {
  const seen = new Set<string>();
  const deduped: WordPronunciationFeedback[] = [];

  for (const entry of feedback) {
    const key = normalizeWordToken(entry.word);
    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(entry);
  }

  return deduped;
}

export function reconcileWordFeedback(
  targetText: string,
  comparison: TextComparisonResult,
  assessment?: PronunciationAssessmentResult | null,
  uiLanguage: CoachLanguage = DEFAULT_COACH_LANGUAGE,
): ReconciledWordFeedback {
  if (!assessment?.ok || !assessment.wordScores?.length) {
    return {
      missingWords: [...comparison.missingWords],
      wordsToImprove: [...comparison.wordsToImprove],
      wordPronunciationFeedback: buildWordPronunciationFeedback(assessment, uiLanguage),
      movedFromMissingToWeak: [],
    };
  }

  const azureWords = assessment.wordScores;
  const usedAzureIndices = new Set<number>();
  const reconciledMissing: string[] = [];
  const movedFromMissingToWeak: string[] = [];

  for (const missingWord of comparison.missingWords) {
    const azureMatch = findAzureWordMatch(missingWord, azureWords, usedAzureIndices);

    if (!azureMatch) {
      reconciledMissing.push(missingWord);
      continue;
    }

    usedAzureIndices.add(azureMatch.index);

    if (!isAzureWordActuallySpoken(azureMatch.wordScore)) {
      reconciledMissing.push(missingWord);
      continue;
    }

    if (isWeakAzureWord(azureMatch.wordScore)) {
      movedFromMissingToWeak.push(resolveTargetDisplayWord(missingWord, targetText));
    }
  }

  let wordPronunciationFeedback = mapFeedbackToTargetWords(
    buildWordPronunciationFeedback(assessment, uiLanguage),
    targetText,
  );

  wordPronunciationFeedback = wordPronunciationFeedback.filter(
    (entry) => !isEquivalentToAny(entry.word, reconciledMissing),
  );

  wordPronunciationFeedback = wordPronunciationFeedback.filter((entry) => {
    const azureMatch = azureWords.find((wordScore) =>
      wordsEquivalentForReconciliation(entry.word, wordScore.word),
    );
    return !azureMatch || isAzureWordActuallySpoken(azureMatch);
  });

  for (const movedWord of movedFromMissingToWeak) {
    if (wordPronunciationFeedback.some((entry) => wordsEquivalentForReconciliation(entry.word, movedWord))) {
      continue;
    }

    const azureMatch = azureWords.find((wordScore) => wordsEquivalentForReconciliation(movedWord, wordScore.word));
    if (!azureMatch || !isAzureWordActuallySpoken(azureMatch) || !isWeakAzureWord(azureMatch)) {
      continue;
    }

    wordPronunciationFeedback.push({
      word: movedWord,
      accuracyScore: azureMatch.accuracyScore,
      errorType: azureMatch.errorType,
      feedbackTr: getCoachCopy(uiLanguage).wordWeak(movedWord),
    });
  }

  wordPronunciationFeedback = dedupeWordFeedback(wordPronunciationFeedback);

  const reconciledImprove = comparison.wordsToImprove.filter(
    (word) => !isEquivalentToAny(word, reconciledMissing)
      && !wordPronunciationFeedback.some((entry) => wordsEquivalentForReconciliation(word, entry.word)),
  );

  console.log('[EchoSpeak WordFeedback] reconcile', {
    missingBefore: comparison.missingWords.length,
    missingAfter: reconciledMissing.length,
    movedFromMissingToWeak: movedFromMissingToWeak.length,
    weakPronunciationCount: wordPronunciationFeedback.length,
    improveAfter: reconciledImprove.length,
  });

  return {
    missingWords: reconciledMissing,
    wordsToImprove: reconciledImprove,
    wordPronunciationFeedback,
    movedFromMissingToWeak,
  };
}

export function withReconciledComparison(
  comparison: TextComparisonResult,
  reconciled: ReconciledWordFeedback,
): TextComparisonResult {
  const { functionWordsMissing, contentWordsMissing } = splitMissingByType(reconciled.missingWords);

  return {
    ...comparison,
    missingWords: reconciled.missingWords,
    wordsToImprove: reconciled.wordsToImprove,
    missingWordCount: reconciled.missingWords.length,
    functionWordsMissing,
    contentWordsMissing,
  };
}

function splitMissingByType(words: string[]): {
  functionWordsMissing: string[];
  contentWordsMissing: string[];
} {
  const FUNCTION_WORDS = new Set([
    'a', 'an', 'the', 'to', 'for', 'in', 'on', 'at', 'and', 'are', 'is', 'am', 'i', 'you',
    'please', 'this', 'that', 'with', 'of', 'or', 'but', 'so', 'if', 'be', 'was', 'were',
  ]);

  const functionWordsMissing: string[] = [];
  const contentWordsMissing: string[] = [];

  for (const word of words) {
    if (FUNCTION_WORDS.has(normalizeWordToken(word))) {
      functionWordsMissing.push(word);
    } else {
      contentWordsMissing.push(word);
    }
  }

  return { functionWordsMissing, contentWordsMissing };
}
