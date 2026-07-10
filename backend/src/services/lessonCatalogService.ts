import fs from 'node:fs/promises';
import { LESSON_CATALOG_SNAPSHOT_PATH } from '../config.js';
import type { LessonCatalogSnapshot } from '../types/lessonCatalog.js';

/**
 * Reads the generated lesson catalog snapshot for the audio admin panel.
 * Regenerate with: npm run generate:catalog --prefix backend
 */
export async function readLessonCatalogSnapshot(): Promise<LessonCatalogSnapshot> {
  try {
    const raw = await fs.readFile(LESSON_CATALOG_SNAPSHOT_PATH, 'utf8');
    const parsed = JSON.parse(raw) as LessonCatalogSnapshot;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
