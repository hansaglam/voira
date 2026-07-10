/**
 * Generates backend/data/lessonCatalogSnapshot.json from the live mobile catalog.
 *
 * Run from repo root:
 *   npm run generate:catalog --prefix backend
 *
 * TODO: wire into CI or a shared content package when the catalog moves out of src/.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { contentCatalog } from '../../src/data/content/catalog/index.js';
import { resolveLessonContentStatus } from '../../src/services/contentRepository/contentStatus.js';
import { CATEGORY_LABELS } from '../../src/types/lesson.js';
import type { LessonCatalogSnapshot } from '../src/types/lessonCatalog.js';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const outputPath = path.join(scriptDir, '..', 'data', 'lessonCatalogSnapshot.json');

function isLiveLesson(status: ReturnType<typeof resolveLessonContentStatus>): boolean {
  return status === 'published';
}

function buildSnapshot(): LessonCatalogSnapshot {
  return contentCatalog
    .filter((lesson) => isLiveLesson(resolveLessonContentStatus(lesson.status)))
    .map((lesson) => ({
      lessonId: lesson.id,
      title: lesson.title,
      subtitle: lesson.subtitle,
      category: lesson.category,
      categoryLabel: CATEGORY_LABELS[lesson.category],
      isPremium: lesson.isPremium,
      level: lesson.level,
      segments: [...lesson.segments]
        .sort((a, b) => a.order - b.order)
        .map((segment) => ({
          segmentId: segment.id,
          text: segment.text,
          translationTr: segment.translationTr,
        })),
    }))
    .sort((a, b) => {
      const categoryCompare = a.category.localeCompare(b.category);
      if (categoryCompare !== 0) return categoryCompare;
      return a.title.localeCompare(b.title);
    });
}

const snapshot = buildSnapshot();
const lessonCount = snapshot.length;
const segmentCount = snapshot.reduce((total, lesson) => total + lesson.segments.length, 0);

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');

console.log('[EchoSpeak Admin Audio] catalog snapshot generated');
console.log(`  lessons: ${lessonCount}`);
console.log(`  segments: ${segmentCount}`);
console.log(`  output: ${outputPath}`);
