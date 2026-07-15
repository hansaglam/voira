import safeAsyncStorage from './safeAsyncStorage';
import type { VocabularyItem } from '../types/vocabulary';
import { normalizeVocabularyTerm } from '../utils/vocabularyMeanings';

export const VOCABULARY_STORAGE_KEY = 'ECHOSPEAK_VOCABULARY_ITEMS_V1';

function normalizeWordKey(word: string): string {
  return normalizeVocabularyTerm(word);
}

function isValidItem(value: unknown): value is VocabularyItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<VocabularyItem>;
  return (
    typeof item.id === 'string' &&
    typeof item.word === 'string' &&
    typeof item.translationTr === 'string' &&
    typeof item.createdAt === 'string' &&
    item.word.trim().length > 0 &&
    item.translationTr.trim().length > 0
  );
}

function parseItems(raw: string | null): VocabularyItem[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidItem);
  } catch {
    return [];
  }
}

function sortNewestFirst(items: VocabularyItem[]): VocabularyItem[] {
  return [...items].sort((a, b) => {
    if (a.createdAt === b.createdAt) return 0;
    return a.createdAt < b.createdAt ? 1 : -1;
  });
}

export async function getVocabularyItems(): Promise<VocabularyItem[]> {
  try {
    const raw = await safeAsyncStorage.getItem(VOCABULARY_STORAGE_KEY);
    return sortNewestFirst(parseItems(raw));
  } catch {
    return [];
  }
}

export async function isVocabularySaved(word: string): Promise<boolean> {
  const items = await getVocabularyItems();
  const key = normalizeWordKey(word);
  return items.some((item) => normalizeWordKey(item.word) === key);
}

export async function addVocabularyItem(
  input: Omit<VocabularyItem, 'id' | 'createdAt'> & { id?: string; createdAt?: string },
): Promise<{ item: VocabularyItem | null; added: boolean }> {
  const word = input.word.trim();
  const translationTr = input.translationTr.trim();
  if (!word || !translationTr) {
    return { item: null, added: false };
  }

  try {
    const items = await getVocabularyItems();
    const key = normalizeWordKey(word);
    const existing = items.find((item) => normalizeWordKey(item.word) === key);
    if (existing) {
      return { item: existing, added: false };
    }

    const item: VocabularyItem = {
      id: input.id ?? `vocab-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      word,
      translationTr,
      contextSentence: input.contextSentence?.trim() || undefined,
      contextTr: input.contextTr?.trim() || undefined,
      lessonId: input.lessonId,
      lessonTitle: input.lessonTitle,
      segmentId: input.segmentId,
      categoryId: input.categoryId,
      categoryTitle: input.categoryTitle,
      createdAt: input.createdAt ?? new Date().toISOString(),
    };

    const next = sortNewestFirst([item, ...items]);
    await safeAsyncStorage.setItem(VOCABULARY_STORAGE_KEY, JSON.stringify(next));
    return { item, added: true };
  } catch {
    return { item: null, added: false };
  }
}

export async function removeVocabularyItem(id: string): Promise<boolean> {
  try {
    const items = await getVocabularyItems();
    const next = items.filter((item) => item.id !== id);
    if (next.length === items.length) return false;
    await safeAsyncStorage.setItem(VOCABULARY_STORAGE_KEY, JSON.stringify(next));
    return true;
  } catch {
    return false;
  }
}

export async function clearVocabularyItems(): Promise<void> {
  try {
    await safeAsyncStorage.removeItem(VOCABULARY_STORAGE_KEY);
  } catch {
    // ignore
  }
}
