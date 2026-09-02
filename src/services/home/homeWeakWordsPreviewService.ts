import type { PracticeResult } from '../../types/learning';
import type { HomeWeakWordPreviewItem } from './homeTypes';

/**
 * Persistent weak-word preview for Home (max 3).
 * Requires the word to appear as weak on at least 2 attempts — no one-off noise.
 */
export function buildHomeWeakWordsPreview(input: {
  practiceResults: PracticeResult[];
  limit?: number;
}): HomeWeakWordPreviewItem[] {
  const results = Array.isArray(input.practiceResults) ? input.practiceResults : [];
  const limit = input.limit ?? 3;
  const byWord = new Map<
    string,
    { word: string; count: number; scoreSum: number; lastScore: number }
  >();

  for (const result of results) {
    const events =
      result.pronunciationWeakEvents?.map((event) => ({
        word: event.word,
        score: typeof event.score === 'number' ? event.score : result.pronunciationScore,
      })) ??
      (result.wordsToImprove ?? []).map((word) => ({
        word,
        score: result.pronunciationScore,
      }));

    for (const event of events) {
      const trimmed = event.word?.trim();
      if (!trimmed) continue;
      const key = trimmed.toLocaleLowerCase('en-US');
      const prior = byWord.get(key);
      if (!prior) {
        byWord.set(key, {
          word: trimmed,
          count: 1,
          scoreSum: event.score,
          lastScore: event.score,
        });
      } else {
        byWord.set(key, {
          word: prior.word,
          count: prior.count + 1,
          scoreSum: prior.scoreSum + event.score,
          lastScore: event.score,
        });
      }
    }
  }

  return Array.from(byWord.values())
    .filter((item) => item.count >= 2)
    .map((item) => ({
      word: item.word,
      score: Math.round(item.scoreSum / item.count),
    }))
    .sort((a, b) => a.score - b.score || a.word.localeCompare(b.word))
    .slice(0, limit);
}
