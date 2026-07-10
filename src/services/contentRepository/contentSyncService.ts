import { Lesson } from '../../types/lesson';
import { getCacheInfo, getCachedLessons, setCachedLessons } from './contentCacheService';
import {
  CONTENT_REPOSITORY_MODE,
  ContentRepositoryMode,
} from './contentRepositoryConfig';
import { localLessonSource } from './localLessonSource';
import { remoteLessonSource } from './remoteLessonSource';
import {
  isLessonArchived,
  isLessonPublished,
  normalizeLessonForRuntime,
} from './contentVersioning';

type SyncSource = 'local' | 'remote' | 'cache' | 'fallback';

function isValidLessonShape(input: unknown): input is Lesson {
  if (!input || typeof input !== 'object') return false;
  const lesson = input as Partial<Lesson>;
  return (
    typeof lesson.id === 'string' &&
    typeof lesson.title === 'string' &&
    typeof lesson.subtitle === 'string' &&
    typeof lesson.category === 'string' &&
    typeof lesson.type === 'string' &&
    Array.isArray(lesson.segments)
  );
}

function validateAndNormalizeLessons(lessons: Lesson[]): {
  validLessons: Lesson[];
  invalidCount: number;
  filteredOutCount: number;
  archivedCount: number;
  nonPublishedCount: number;
} {
  let invalidCount = 0;
  let archivedCount = 0;
  let nonPublishedCount = 0;
  const valid: Lesson[] = [];

  for (const raw of lessons) {
    if (!isValidLessonShape(raw)) {
      invalidCount += 1;
      continue;
    }

    const lesson = normalizeLessonForRuntime(raw);
    if (isLessonArchived(lesson)) {
      archivedCount += 1;
      continue;
    }

    if (!isLessonPublished(lesson)) {
      nonPublishedCount += 1;
      continue;
    }

    valid.push(lesson);
  }

  return {
    validLessons: valid,
    invalidCount,
    filteredOutCount: archivedCount + nonPublishedCount,
    archivedCount,
    nonPublishedCount,
  };
}

function dedupeById(lessons: Lesson[]): Lesson[] {
  const byId = new Map<string, Lesson>();
  for (const lesson of lessons) {
    if (!byId.has(lesson.id)) byId.set(lesson.id, lesson);
  }
  return Array.from(byId.values());
}

function logSyncSummary(
  mode: ContentRepositoryMode,
  source: SyncSource,
  lessons: Lesson[],
  diagnostics: {
    invalidCount: number;
    filteredOutCount: number;
    archivedCount: number;
    nonPublishedCount: number;
  },
): void {
  if (!__DEV__) return;
  const cacheInfo = getCacheInfo();
  console.log('[EchoSpeak Content Repository]', {
    mode,
    source,
    totalRuntimeLessons: lessons.length,
    publishedCount: lessons.length,
    archivedDraftFilteredCount: diagnostics.filteredOutCount,
    archivedFilteredCount: diagnostics.archivedCount,
    draftReviewFilteredCount: diagnostics.nonPublishedCount,
    invalidRemovedCount: diagnostics.invalidCount,
    cacheCount: cacheInfo.count,
  });
}

async function resolveLocalLessons(source: SyncSource = 'local'): Promise<Lesson[]> {
  const localLessons = await localLessonSource.getAllLessons();
  const deduped = dedupeById(localLessons);
  const validated = validateAndNormalizeLessons(deduped);
  logSyncSummary(CONTENT_REPOSITORY_MODE, source, validated.validLessons, validated);
  return validated.validLessons;
}

export async function syncLessonsForRuntime(): Promise<Lesson[]> {
  if (CONTENT_REPOSITORY_MODE === 'local_only') {
    return resolveLocalLessons('local');
  }

  try {
    const remoteLessons = await remoteLessonSource.getAllLessons();
    const dedupedRemote = dedupeById(remoteLessons);
    const remoteValidated = validateAndNormalizeLessons(dedupedRemote);

    if (remoteValidated.validLessons.length > 0) {
      setCachedLessons(remoteValidated.validLessons);
      logSyncSummary(
        CONTENT_REPOSITORY_MODE,
        'remote',
        remoteValidated.validLessons,
        remoteValidated,
      );
      return remoteValidated.validLessons;
    }

    const cached = getCachedLessons();
    if (cached.length > 0) {
      const cacheValidated = validateAndNormalizeLessons(dedupeById(cached));
      logSyncSummary(CONTENT_REPOSITORY_MODE, 'cache', cacheValidated.validLessons, cacheValidated);
      if (cacheValidated.validLessons.length > 0) {
        return cacheValidated.validLessons;
      }
    }

    return resolveLocalLessons('fallback');
  } catch (error) {
    if (__DEV__) {
      console.warn('[EchoSpeak Content Repository] remote sync failed, using local fallback', error);
    }
    return resolveLocalLessons('fallback');
  }
}
