import type { WeakWordItem } from '../../types/weakWords';
import { isActiveWeakWordStatus } from './weakWordStatusService';
import {
  WEAK_WORD_QUEUE_DEFAULT_SIZE,
  WEAK_WORD_QUEUE_MAX_SIZE,
} from './weakWordThresholds';

export interface WeakWordPracticeQueue {
  items: WeakWordItem[];
  isEmpty: boolean;
}

export function buildWeakWordPracticeQueue(
  catalog: WeakWordItem[],
  options?: {
    maxSize?: number;
    includeImproving?: boolean;
    includeMastered?: boolean;
  },
): WeakWordPracticeQueue {
  const maxSize = Math.min(
    options?.maxSize ?? WEAK_WORD_QUEUE_DEFAULT_SIZE,
    WEAK_WORD_QUEUE_MAX_SIZE,
  );
  const includeImproving = options?.includeImproving ?? true;
  const includeMastered = options?.includeMastered ?? false;

  const eligible = catalog.filter((item) => {
    if (!includeMastered && item.status === 'mastered') return false;
    if (item.status === 'improving' && !includeImproving) return false;
    if (item.status === 'mastered') return includeMastered;
    return isActiveWeakWordStatus(item.status);
  });

  if (eligible.length === 0) {
    return { items: [], isEmpty: true };
  }

  const sorted = [...eligible].sort(
    (a, b) => b.priorityScore - a.priorityScore || a.displayWord.localeCompare(b.displayWord),
  );

  return { items: sorted.slice(0, maxSize), isEmpty: false };
}
