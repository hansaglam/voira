import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { BACKEND_ROOT, IS_DEV, LESSON_CATALOG_SNAPSHOT_PATH } from '../config.js';
import {
  buildLessonCatalogSnapshot,
  computeLessonCatalogMeta,
  type LessonCatalogMeta,
  type LessonCatalogSourceLesson,
} from './lessonCatalogSnapshotBuilder.js';
import type { LessonCatalogSnapshot } from '../types/lessonCatalog.js';

export interface LessonCatalogLoadResult {
  lessons: LessonCatalogSnapshot;
  meta: LessonCatalogMeta;
}

const MOBILE_CATALOG_ROOT = path.join(BACKEND_ROOT, '..', 'src');

/**
 * Reads the lesson catalog for the audio admin panel.
 * Dev: prefers live mobile catalog when available (tsx).
 * Prod: uses generated snapshot at backend/data/lessonCatalogSnapshot.json
 *
 * Regenerate snapshot with: npm run generate:catalog --prefix backend
 */
export async function readLessonCatalogSnapshot(): Promise<LessonCatalogSnapshot> {
  const result = await loadLessonCatalog();
  return result.lessons;
}

export async function loadLessonCatalog(): Promise<LessonCatalogLoadResult> {
  const live = await tryBuildLiveCatalogSnapshot();
  if (live) {
    return live;
  }

  return readSnapshotFromDisk();
}

async function tryBuildLiveCatalogSnapshot(): Promise<LessonCatalogLoadResult | null> {
  if (!IS_DEV) {
    return null;
  }

  try {
    const catalogModule = await import(
      pathToFileURL(path.join(MOBILE_CATALOG_ROOT, 'data', 'content', 'catalog', 'index.ts')).href
    );
    const statusModule = await import(
      pathToFileURL(path.join(MOBILE_CATALOG_ROOT, 'services', 'contentRepository', 'contentStatus.ts')).href
    );
    const lessonTypesModule = await import(
      pathToFileURL(path.join(MOBILE_CATALOG_ROOT, 'types', 'lesson.ts')).href
    );

    const contentCatalog = catalogModule.contentCatalog as LessonCatalogSourceLesson[];
    const resolveLessonContentStatus = statusModule.resolveLessonContentStatus as (
      status: string | undefined,
    ) => string;
    const categoryLabels = lessonTypesModule.CATEGORY_LABELS as Record<string, string>;

    const lessons = buildLessonCatalogSnapshot(contentCatalog, {
      categoryLabels,
      isLiveLesson: (status) => resolveLessonContentStatus(status) === 'published',
    });

    return {
      lessons,
      meta: computeLessonCatalogMeta(lessons, 'live'),
    };
  } catch (error) {
    console.warn(
      '[EchoSpeak Admin Audio] live catalog import failed; falling back to snapshot',
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

async function readSnapshotFromDisk(): Promise<LessonCatalogLoadResult> {
  try {
    const raw = await fs.readFile(LESSON_CATALOG_SNAPSHOT_PATH, 'utf8');
    const parsed = JSON.parse(raw) as LessonCatalogSnapshot;
    const lessons = Array.isArray(parsed) ? parsed : [];
    const stat = await fs.stat(LESSON_CATALOG_SNAPSHOT_PATH);

    return {
      lessons,
      meta: computeLessonCatalogMeta(lessons, 'snapshot', {
        snapshotPath: LESSON_CATALOG_SNAPSHOT_PATH,
        generatedAt: stat.mtime.toISOString(),
      }),
    };
  } catch {
    return {
      lessons: [],
      meta: computeLessonCatalogMeta([], 'snapshot', {
        snapshotPath: LESSON_CATALOG_SNAPSHOT_PATH,
      }),
    };
  }
}
