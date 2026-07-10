import type { TextComparisonResult } from '../types/analysis.js';
import { normalizeForComparison, tokenize } from '../utils/normalize.js';

const TH_WORDS = new Set([
  'think',
  'this',
  'that',
  'they',
  'there',
  'thing',
  'thought',
  'through',
  'with',
]);

const WV_WORDS = new Set([
  'we',
  'very',
  'visit',
  'village',
  'warm',
  'work',
  'want',
  'would',
]);

const LINKING_WORDS = new Set(['are', 'you', 'to', 'a', 'an', 'the', 'i']);

const REDUCTION_WORDS = ['gonna', 'wanna', 'gotta', 'kinda', 'sorta', 'lemme', 'gimme'];

const MS_PER_WORD_ESTIMATE = 420;
const MAX_WEAK_AREAS = 3;

export interface WeakAreaDetectionInput {
  targetText: string;
  transcript: string;
  comparison: TextComparisonResult;
  durationMillis?: number;
}

function isWordMissed(
  word: string,
  missing: Set<string>,
  improve: Set<string>,
): boolean {
  return missing.has(word) || improve.has(word);
}

function hasRhythmIssue(
  targetText: string,
  transcript: string,
  durationMillis: number | undefined,
): boolean {
  const targetWordCount = tokenize(targetText).length;
  const transcriptWordCount = tokenize(transcript).length;

  if (
    targetWordCount > 0 &&
    (transcriptWordCount < targetWordCount * 0.6 ||
      transcriptWordCount > targetWordCount * 1.8)
  ) {
    return true;
  }

  if (!durationMillis || targetWordCount === 0) return false;

  const expectedDurationMs = targetWordCount * MS_PER_WORD_ESTIMATE;
  const durationRatio = durationMillis / expectedDurationMs;
  return durationRatio < 0.45 || durationRatio > 2.2;
}

function isPartialTranscript(targetText: string, transcript: string): boolean {
  const targetWordCount = tokenize(targetText).length;
  const transcriptWordCount = tokenize(transcript).length;
  return targetWordCount > 0 && transcriptWordCount < targetWordCount * 0.75;
}

function endsWithHeavyFinalConsonant(word: string): boolean {
  return (
    /(ght|ng|nd|nk|mp|st|ld|lf|rk|rm|rn|ct|pt|ft)$/i.test(word) ||
    /[bcdfghjklmnpqrstvwxyz]{2}$/i.test(word)
  );
}

function detectThArea(
  targetWords: string[],
  missing: Set<string>,
  improve: Set<string>,
): boolean {
  const thInTarget = targetWords.filter((word) => TH_WORDS.has(word));
  if (thInTarget.length === 0) return false;
  return thInTarget.some((word) => isWordMissed(word, missing, improve));
}

function detectWVArea(
  targetWords: string[],
  missing: Set<string>,
  improve: Set<string>,
): boolean {
  const wvInTarget = targetWords.filter((word) => WV_WORDS.has(word));
  if (wvInTarget.length === 0) return false;
  return wvInTarget.some((word) => isWordMissed(word, missing, improve));
}

function detectLinkingArea(
  comparison: TextComparisonResult,
  targetWords: string[],
): boolean {
  const missingLinking = comparison.missingWords.filter((word) =>
    LINKING_WORDS.has(word),
  );
  if (missingLinking.length > 0) return true;

  const missedChunks = targetWords.filter(
    (word) =>
      comparison.missingWords.includes(word) ||
      comparison.wordsToImprove.includes(word),
  );
  return missedChunks.length >= 3;
}

function detectFinalSoundsArea(
  targetWords: string[],
  missing: Set<string>,
  improve: Set<string>,
): boolean {
  const finalHeavyWords = targetWords.filter(endsWithHeavyFinalConsonant);
  if (finalHeavyWords.length === 0) return false;
  return finalHeavyWords.some((word) => isWordMissed(word, missing, improve));
}

function detectReductionArea(
  targetLower: string,
  transcriptLower: string,
  missing: Set<string>,
  improve: Set<string>,
): boolean {
  const reductionInTarget = REDUCTION_WORDS.filter((word) => targetLower.includes(word));
  if (reductionInTarget.length === 0) return false;

  return reductionInTarget.some(
    (word) =>
      !transcriptLower.includes(word) && isWordMissed(word, missing, improve),
  );
}

function detectLowMatchAreas(
  targetText: string,
  transcript: string,
  comparison: TextComparisonResult,
  durationMillis: number | undefined,
): string[] {
  const areas: string[] = ['hedef cümle'];

  if (comparison.missingWords.length > 0) {
    areas.push('eksik kelimeler');
  }

  if (
    hasRhythmIssue(targetText, transcript, durationMillis) ||
    isPartialTranscript(targetText, transcript) ||
    comparison.matchPercent < 25
  ) {
    areas.push('ritim ve vurgu');
  }

  return areas.slice(0, MAX_WEAK_AREAS);
}

function detectStandardAreas(input: WeakAreaDetectionInput): string[] {
  const { targetText, transcript, comparison, durationMillis } = input;
  const targetWords = tokenize(targetText);
  const targetLower = normalizeForComparison(targetText);
  const transcriptLower = normalizeForComparison(transcript);
  const missing = new Set(comparison.missingWords);
  const improve = new Set(comparison.wordsToImprove);
  const areas: string[] = [];

  if (comparison.missingWords.length >= 2) {
    areas.push('eksik kelimeler');
  }

  if (detectLinkingArea(comparison, targetWords)) {
    areas.push('kelime bağlama');
  }

  if (detectThArea(targetWords, missing, improve)) {
    areas.push('th sesi');
  }

  if (detectWVArea(targetWords, missing, improve)) {
    areas.push('w / v farkı');
  }

  if (detectFinalSoundsArea(targetWords, missing, improve)) {
    areas.push('kelime sonu sesleri');
  }

  if (detectReductionArea(targetLower, transcriptLower, missing, improve)) {
    areas.push('günlük konuşma kısaltmaları');
  }

  const rhythmOrPartial =
    hasRhythmIssue(targetText, transcript, durationMillis) ||
    (comparison.matchPercent < 70 && isPartialTranscript(targetText, transcript));

  if (rhythmOrPartial) {
    areas.push('ritim ve vurgu');
  }

  return dedupeLimited(areas);
}

function dedupeLimited(areas: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const area of areas) {
    if (seen.has(area)) continue;
    seen.add(area);
    result.push(area);
    if (result.length >= MAX_WEAK_AREAS) break;
  }

  return result;
}

export function detectWeakAreas(
  targetText: string,
  transcript: string,
  comparison: TextComparisonResult,
  durationMillis?: number,
): string[] {
  if (comparison.matchPercent < 25) {
    return detectLowMatchAreas(targetText, transcript, comparison, durationMillis);
  }

  return detectStandardAreas({
    targetText,
    transcript,
    comparison,
    durationMillis,
  });
}
