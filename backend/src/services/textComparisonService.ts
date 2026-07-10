import type { TextComparisonResult } from '../types/analysis.js';
import { expandContractions, normalizeForComparison, tokenize } from '../utils/normalize.js';

const FUNCTION_WORDS = new Set([
  'a',
  'an',
  'the',
  'to',
  'for',
  'in',
  'on',
  'at',
  'and',
  'are',
  'is',
  'am',
  'i',
  'you',
  'he',
  'she',
  'it',
  'we',
  'they',
  'my',
  'your',
  'his',
  'her',
  'our',
  'their',
  'this',
  'that',
  'these',
  'those',
  'of',
  'with',
  'as',
  'by',
  'from',
  'or',
  'but',
  'so',
  'if',
  'be',
  'been',
  'being',
  'was',
  'were',
  'do',
  'does',
  'did',
  'have',
  'has',
  'had',
  'will',
  'would',
  'can',
  'could',
  'should',
  'may',
  'might',
  'must',
  'please',
  'me',
  'him',
  'us',
  'them',
]);

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

function isExactMatch(targetWord: string, spokenWord: string): boolean {
  return targetWord === spokenWord;
}

function isFuzzyMatch(targetWord: string, spokenWord: string): boolean {
  if (targetWord === spokenWord) return false;
  if (targetWord.length <= 3 || spokenWord.length <= 3) return false;
  if (Math.abs(targetWord.length - spokenWord.length) > 2) return false;

  const maxDistance = targetWord.length <= 5 ? 1 : 2;
  return levenshtein(targetWord, spokenWord) <= maxDistance;
}

function splitMissingWords(words: string[]): {
  functionWordsMissing: string[];
  contentWordsMissing: string[];
} {
  const functionWordsMissing: string[] = [];
  const contentWordsMissing: string[] = [];

  for (const word of words) {
    if (FUNCTION_WORDS.has(word)) {
      functionWordsMissing.push(word);
    } else {
      contentWordsMissing.push(word);
    }
  }

  return { functionWordsMissing, contentWordsMissing };
}

export function compareTranscriptToTarget(
  transcript: string,
  targetText: string,
): TextComparisonResult {
  const normalizedTranscript = expandContractions(transcript);
  const normalizedTarget = expandContractions(targetText);
  const targetWords = tokenize(targetText);
  const transcriptWords = tokenize(transcript);

  if (targetWords.length === 0) {
    return {
      matchPercent: 0,
      coveragePercent: 0,
      orderScore: 0,
      correctWords: [],
      missingWords: [],
      wordsToImprove: [],
      normalizedTranscript,
      normalizedTarget,
      targetWordCount: 0,
      transcriptWordCount: transcriptWords.length,
      matchedWordCount: 0,
      missingWordCount: 0,
      functionWordsMissing: [],
      contentWordsMissing: [],
    };
  }

  const correctWords: string[] = [];
  const missingWords: string[] = [];
  const wordsToImprove: string[] = [];
  const usedTranscriptIndices = new Set<number>();

  let transcriptIndex = 0;
  let orderedMatchCount = 0;

  for (const targetWord of targetWords) {
    let matched = false;

    for (let index = transcriptIndex; index < transcriptWords.length; index++) {
      if (usedTranscriptIndices.has(index)) continue;

      const spokenWord = transcriptWords[index];

      if (isExactMatch(targetWord, spokenWord)) {
        correctWords.push(targetWord);
        usedTranscriptIndices.add(index);
        transcriptIndex = index + 1;
        orderedMatchCount += 1;
        matched = true;
        break;
      }

      if (isFuzzyMatch(targetWord, spokenWord)) {
        wordsToImprove.push(targetWord);
        usedTranscriptIndices.add(index);
        transcriptIndex = index + 1;
        orderedMatchCount += 1;
        matched = true;
        break;
      }
    }

    if (!matched) {
      missingWords.push(targetWord);
    }
  }

  const matchedWordCount = correctWords.length;
  const missingWordCount = missingWords.length;
  const targetWordCount = targetWords.length;
  const transcriptWordCount = transcriptWords.length;

  const coveragePercent = Math.round((matchedWordCount / targetWordCount) * 100);
  const orderScore = Math.round((orderedMatchCount / targetWordCount) * 100);
  const matchPercent = Math.round(
    ((matchedWordCount + wordsToImprove.length * 0.5) / targetWordCount) * 100,
  );

  const { functionWordsMissing, contentWordsMissing } = splitMissingWords(missingWords);

  return {
    matchPercent,
    coveragePercent,
    orderScore,
    correctWords,
    missingWords,
    wordsToImprove,
    normalizedTranscript,
    normalizedTarget,
    targetWordCount,
    transcriptWordCount,
    matchedWordCount,
    missingWordCount,
    functionWordsMissing,
    contentWordsMissing,
  };
}

/** @deprecated internal helper kept for tests */
export function normalizeTranscriptForComparison(text: string): string {
  return normalizeForComparison(text);
}
