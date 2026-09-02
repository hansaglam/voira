import type { WeakWordItem } from '../../types/weakWords';
import { isActiveWeakWordStatus } from './weakWordStatusService';

export function buildHomeWeakWordsPreviewItems(
  catalog: WeakWordItem[],
  limit = 3,
): Array<{ word: string; score: number; status: WeakWordItem['status'] }> {
  return catalog
    .filter((item) => isActiveWeakWordStatus(item.status))
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, limit)
    .map((item) => ({
      word: item.displayWord,
      score: Math.round(item.lastAccuracy ?? item.averageAccuracy ?? 0),
      status: item.status,
    }));
}
