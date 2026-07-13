import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import type { VocabularyItem } from '../types/vocabulary';
import {
  addVocabularyItem,
  getVocabularyItems,
  isVocabularySaved,
  removeVocabularyItem,
} from '../storage/vocabularyStorage';
import { normalizeVocabularyTerm } from '../utils/vocabularyMeanings';

export function useVocabulary() {
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

  const savedWordKeys = useMemo(
    () => new Set(items.map((item) => normalizeVocabularyTerm(item.word))),
    [items],
  );

  const isSaved = useCallback(
    (word: string) => savedWordKeys.has(normalizeVocabularyTerm(word)),
    [savedWordKeys],
  );

  const addItem = useCallback(
    async (input: Omit<VocabularyItem, 'id' | 'createdAt'>) => {
      const result = await addVocabularyItem(input);
      if (result.added) {
        await refresh();
      }
      return result;
    },
    [refresh],
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
    count: items.length,
    addItem,
    removeItem,
    isSaved,
    refresh,
    isSavedAsync: isVocabularySaved,
  };
}
