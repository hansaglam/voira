import type { LessonSegment } from '../types/segment';
import type { VocabularyCandidate, VocabularyEntry } from '../types/vocabulary';
import {
  lookupVocabularyMeaning,
  normalizeVocabularyTerm,
  resolveVocabularyMeaning,
} from './vocabularyMeanings';

const MAX_FALLBACK_CANDIDATES = 3;

function cleanPhrase(value: string): string {
  return value
    .replace(/^["“]+|["”]+$/g, '')
    .replace(/[…\.]+$/g, '')
    .trim();
}

function extractQuotedEnglish(text?: string): string | null {
  if (!text) return null;
  const match = text.match(/"([^"]{2,48})"/);
  if (!match?.[1]) return null;
  return cleanPhrase(match[1]);
}

function toCandidate(
  wordRaw: string,
  curatedMeaningTr: string | undefined,
  segment: LessonSegment,
): VocabularyCandidate | null {
  const word = cleanPhrase(wordRaw);
  if (!word) return null;

  const resolved = resolveVocabularyMeaning(word, {
    curatedMeaningTr,
    focusSkill: segment.focusSkill,
    contextTr: segment.translationTr,
  });
  if (!resolved) return null;

  return {
    word,
    translationTr: resolved.meaningTr,
    usedContextFallback: resolved.usedContextFallback,
    contextSentence: segment.text?.trim() || undefined,
    contextTr: segment.translationTr?.trim() || undefined,
  };
}

function dedupeCandidates(entries: VocabularyCandidate[]): VocabularyCandidate[] {
  const seen = new Set<string>();
  const result: VocabularyCandidate[] = [];

  for (const entry of entries) {
    const key = normalizeVocabularyTerm(entry.word);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(entry);
  }

  return result;
}

/**
 * Resolve vocabulary candidates for a segment.
 * Prefers curated `segment.vocabulary` (enriched with local dictionary).
 * Fallback never uses focusSkill as the Turkish meaning.
 */
export function getVocabularyCandidates(segment: LessonSegment): VocabularyCandidate[] {
  const curated = segment.vocabulary ?? [];
  if (curated.length > 0) {
    const fromCurated = curated
      .map((entry: VocabularyEntry) => toCandidate(entry.word, entry.translationTr, segment))
      .filter((entry): entry is VocabularyCandidate => Boolean(entry));
    return dedupeCandidates(fromCurated).slice(0, 4);
  }

  const fallback: VocabularyCandidate[] = [];

  const patternWord =
    extractQuotedEnglish(segment.pronunciationTipTr) ??
    extractQuotedEnglish(segment.shadowingInstructionTr);

  if (patternWord) {
    const candidate = toCandidate(patternWord, undefined, segment);
    if (candidate) fallback.push(candidate);
  }

  const keywordSource =
    (segment.highlightedWords?.length ? segment.highlightedWords : segment.keywords) ?? [];

  for (const keyword of keywordSource) {
    if (fallback.length >= MAX_FALLBACK_CANDIDATES) break;
    const word = cleanPhrase(keyword);
    if (!word) continue;
    const hasKnownMeaning = Boolean(lookupVocabularyMeaning(word));
    // Prefer known phrases; skip tiny function words unless they have a dictionary gloss.
    if (
      !hasKnownMeaning &&
      !word.includes(' ') &&
      !word.includes('-') &&
      !word.includes('…') &&
      word.length < 6
    ) {
      continue;
    }
    const candidate = toCandidate(word, undefined, segment);
    if (candidate) fallback.push(candidate);
  }

  return dedupeCandidates(fallback).slice(0, MAX_FALLBACK_CANDIDATES);
}
