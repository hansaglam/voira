import type { LessonSegment } from '../types/segment';
import type { VocabularyEntry } from '../types/vocabulary';

const MAX_FALLBACK_CANDIDATES = 2;

function cleanPhrase(value: string): string {
  return value
    .replace(/^["“]+|["”]+$/g, '')
    .replace(/[…\.]+$/g, '')
    .trim();
}

function dedupeEntries(entries: VocabularyEntry[]): VocabularyEntry[] {
  const seen = new Set<string>();
  const result: VocabularyEntry[] = [];

  for (const entry of entries) {
    const word = cleanPhrase(entry.word);
    const translationTr = entry.translationTr.trim();
    if (!word || !translationTr) continue;
    const key = `${word.toLocaleLowerCase('en-US')}::${translationTr.toLocaleLowerCase('tr-TR')}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ word, translationTr });
  }

  return result;
}

function extractQuotedEnglish(text?: string): string | null {
  if (!text) return null;
  const match = text.match(/"([^"]{2,48})"/);
  if (!match?.[1]) return null;
  return cleanPhrase(match[1]);
}

/**
 * Resolve vocabulary candidates for a segment.
 * Prefers curated `segment.vocabulary`; otherwise suggests from keywords / quoted patterns.
 */
export function getVocabularyCandidates(segment: LessonSegment): VocabularyEntry[] {
  if (segment.vocabulary && segment.vocabulary.length > 0) {
    return dedupeEntries(segment.vocabulary).slice(0, 4);
  }

  const fallback: VocabularyEntry[] = [];
  const focus = segment.focusSkill?.trim();

  const patternWord =
    extractQuotedEnglish(segment.pronunciationTipTr) ??
    extractQuotedEnglish(segment.shadowingInstructionTr);

  if (patternWord && focus) {
    fallback.push({ word: patternWord, translationTr: focus });
  }

  const keywordSource = (segment.highlightedWords?.length
    ? segment.highlightedWords
    : segment.keywords) ?? [];

  for (const keyword of keywordSource) {
    if (fallback.length >= MAX_FALLBACK_CANDIDATES) break;
    const word = cleanPhrase(keyword);
    if (!word || !focus) continue;
    // Prefer phrase-like keywords over single tokens when falling back.
    if (!word.includes(' ') && !word.includes('…') && !word.includes("'")) continue;
    fallback.push({ word, translationTr: focus });
  }

  return dedupeEntries(fallback).slice(0, MAX_FALLBACK_CANDIDATES);
}
