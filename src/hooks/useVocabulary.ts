import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import type { VocabularyItem } from '../types/vocabulary';
import {
  addVocabularyItem,
  getVocabularyItems,
  isVocabularySaved,
  removeVocabularyItem,
} from '../storage/vocabularyStorage';

function normalizeKey(word: string, translationTr: string): string {
  return `${word.trim().toLocaleLowerCase('en-US')}::${translationTr.trim().toLocaleLowerCase('tr-TR')}`;
}

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

  const savedKeys = useMemo(
    () => new Set(items.map((item) => normalizeKey(item.word, item.translationTr))),
    [items],
  );

  const isSaved = useCallback(
    (word: string, translationTr: string) => savedKeys.has(normalizeKey(word, translationTr)),
    [savedKeys],
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
