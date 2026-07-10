/**
 * Generates backend/data/lessonCatalogSnapshot.json from the live mobile catalog.
 *
 * Run from repo root:
 *   npm run generate:catalog --prefix backend
 *
 * Also runs automatically before backend build.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { contentCatalog } from '../../src/data/content/catalog/index.js';
import { resolveLessonContentStatus } from '../../src/services/contentRepository/contentStatus.js';
import { CATEGORY_LABELS } from '../../src/types/lesson.js';
import {
  buildLessonCatalogSnapshot,
  computeLessonCatalogMeta,
} from '../src/services/lessonCatalogSnapshotBuilder.js';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const outputPath = path.join(scriptDir, '..', 'data', 'lessonCatalogSnapshot.json');

const snapshot = buildLessonCatalogSnapshot(contentCatalog, {
  categoryLabels: CATEGORY_LABELS,
  isLiveLesson: (status) => resolveLessonContentStatus(status as Parameters<typeof resolveLessonContentStatus>[0]) === 'published',
});

const meta = computeLessonCatalogMeta(snapshot, 'snapshot', {
  snapshotPath: outputPath,
  generatedAt: new Date().toISOString(),
});

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');

console.log('[EchoSpeak Admin Audio] catalog snapshot generated');
console.log(`  lessons: ${meta.totalLessons}`);
console.log(`  segments: ${meta.totalSegments}`);
console.log(`  production lessons: ${meta.productionLessons}`);
console.log(`  production segments: ${meta.productionSegments}`);
console.log(`  output: ${outputPath}`);
