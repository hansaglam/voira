import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import type { VocabularyItem } from '../types/vocabulary';
import {
  addVocabularyItem,
  getVocabularyItems,
  isVocabularySaved,
  removeVocabularyItem,
} from '../storage/vocabularyStorage';
import {
  canAddVocabularyItem,
  getVocabularyLimit,
  isVocabularyLimitReached,
} from '../constants/vocabularyLimits';
import { normalizeVocabularyTerm } from '../utils/vocabularyMeanings';
import { usePremium } from '../context/PremiumContext';

export type AddVocabularyResult = {
  item: VocabularyItem | null;
  added: boolean;
  /** Blocked because freemium / SpeakPlus cap was reached. */
  blockedByLimit?: boolean;
};

export function useVocabulary() {
  const { isPremium } = usePremium();
  const [items, setItems] = useState<VocabularyItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const next = await getVocabularyItems();
    setItems(next);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const count = items.length;
  const limit = getVocabularyLimit(isPremium);
  const limitReached = isVocabularyLimitReached(count, isPremium);
  const canAdd = canAddVocabularyItem(count, isPremium);

  const savedWordKeys = useMemo(
    () => new Set(items.map((item) => normalizeVocabularyTerm(item.word))),
    [items],
  );

  const isSaved = useCallback(
    (word: string) => savedWordKeys.has(normalizeVocabularyTerm(word)),
    [savedWordKeys],
  );

  const addItem = useCallback(
    async (input: Omit<VocabularyItem, 'id' | 'createdAt'>): Promise<AddVocabularyResult> => {
      const current = await getVocabularyItems();
      if (!canAddVocabularyItem(current.length, isPremium)) {
        return { item: null, added: false, blockedByLimit: true };
      }

      const result = await addVocabularyItem(input);
      if (result.added) {
        await refresh();
      }
      return result;
    },
    [isPremium, refresh],
  );

  const removeItem = useCallback(
    async (id: string) => {
      const removed = await removeVocabularyItem(id);
      if (removed) {
        await refresh();
      }
      return removed;
    },
    [refresh],
  );

  return {
    items,
    isLoading,
    count,
    limit,
    limitReached,
    canAdd,
    isPremium,
    addItem,
    removeItem,
    isSaved,
    refresh,
    isSavedAsync: isVocabularySaved,
  };
}
