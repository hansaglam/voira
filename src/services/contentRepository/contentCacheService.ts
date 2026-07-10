import { Lesson } from '../../types/lesson';

let cachedLessons: Lesson[] = [];
let lastUpdatedAt: string | undefined;

export function getCachedLessons(): Lesson[] {
  return cachedLessons;
}

export function setCachedLessons(lessons: Lesson[]): void {
  cachedLessons = lessons;
  lastUpdatedAt = new Date().toISOString();
}

export function clearCachedLessons(): void {
  cachedLessons = [];
  lastUpdatedAt = undefined;
}

export function getCacheInfo(): { count: number; lastUpdatedAt?: string } {
  return {
    count: cachedLessons.length,
    lastUpdatedAt,
  };
}

// TODO: Add persistent cache with AsyncStorage or SQLite when remote sync is enabled.
