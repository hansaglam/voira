import { selectDailyPracticeSession } from '../../data/learningAlgorithm';
import { contentCatalog } from '../../data/content/contentCatalog';
import { logLessonAudioAssetValidation } from '../../data/lessonAudioAssets';
import { fetchAudioRegistry, applyRemoteAudioAssets } from '../audio/audioRegistryService';
import { Lesson, LessonCategory } from '../../types/lesson';
import { UserLearningProfile } from '../../types/learning';
import { resolveLessonPremium } from '../../utils/lessonUtils';
import { LessonQueryOptions } from './contentRepositoryTypes';
import { localLessonSource } from './localLessonSource';
import { syncLessonsForRuntime } from './contentSyncService';
import { ContentStatus, resolveLessonContentStatus } from './contentStatus';

// TODO: Add remoteLessonSource for admin-managed content from a future API.
// TODO: Route reads through a source selector (local vs remote vs hybrid).
// TODO: Add offline cache layer for remote lessons with stale-while-revalidate.
// TODO: Support content versioning and rollback for published lesson updates.
// TODO: Gate experimental or draft packs behind feature flags in production.

let runtimeLessons: Lesson[] = [];
let repositoryInitPromise: Promise<void> | null = null;
let isRepositoryInitialized = false;

function normalizeStatusFilter(
  status?: ContentStatus | ContentStatus[],
): ContentStatus[] | null {
  if (!status) return null;
  return Array.isArray(status) ? status : [status];
}

function matchesQueryOptions(lesson: Lesson, options?: LessonQueryOptions): boolean {
  const statusFilter = normalizeStatusFilter(options?.status);
  const effectiveStatus = resolveLessonContentStatus(lesson.status);
  if (statusFilter && !statusFilter.includes(effectiveStatus)) return false;

  if (options?.category && lesson.category !== options.category) return false;
  if (options?.level && lesson.level !== options.level) return false;
  if (options?.type && lesson.type !== options.type) return false;
  if (options?.includePremium === false && resolveLessonPremium(lesson)) return false;
  return true;
}

function searchInLesson(lesson: Lesson, query: string): boolean {
  const normalizedQuery = query.trim().toLocaleLowerCase('tr-TR');
  if (!normalizedQuery) return true;

  const haystack = [
    lesson.title,
    lesson.subtitle,
    lesson.focusSkill,
    lesson.learningObjectiveTr,
    ...lesson.tags,
    ...lesson.keywords,
  ]
    .join(' ')
    .toLocaleLowerCase('tr-TR');

  return haystack.includes(normalizedQuery);
}

async function loadFallbackLocalLessons(): Promise<Lesson[]> {
  return localLessonSource.getAllLessons();
}

export async function initializeContentRepository(): Promise<void> {
  if (isRepositoryInitialized) return;
  if (repositoryInitPromise) return repositoryInitPromise;

  repositoryInitPromise = (async () => {
    try {
      const syncedLessons = await syncLessonsForRuntime();
      await fetchAudioRegistry();
      runtimeLessons = applyRemoteAudioAssets(syncedLessons);
    } catch {
      const fallbackLessons = await loadFallbackLocalLessons();
      await fetchAudioRegistry();
      runtimeLessons = applyRemoteAudioAssets(fallbackLessons);
    } finally {
      logLessonAudioAssetValidation(contentCatalog);
      isRepositoryInitialized = true;
      repositoryInitPromise = null;
    }
  })();

  return repositoryInitPromise;
}

export async function getRuntimeLessons(): Promise<Lesson[]> {
  if (!isRepositoryInitialized) {
    await initializeContentRepository();
  }
  return runtimeLessons;
}

export async function getAllLessons(options?: LessonQueryOptions): Promise<Lesson[]> {
  const lessons = await getRuntimeLessons();
  return lessons.filter((lesson) => matchesQueryOptions(lesson, options));
}

export async function getLessonById(id: string): Promise<Lesson | undefined> {
  const lessons = await getRuntimeLessons();
  return lessons.find((lesson) => lesson.id === id);
}

export async function getLessonsByCategory(
  category: LessonCategory,
  options?: LessonQueryOptions,
): Promise<Lesson[]> {
  const lessons = await getRuntimeLessons();
  return lessons.filter((lesson) =>
    matchesQueryOptions(lesson, { ...options, category }),
  );
}

export async function getFreeLessonsByCategory(
  category: LessonCategory,
): Promise<Lesson[]> {
  return getLessonsByCategory(category, { includePremium: false });
}

export async function getPremiumLessonsByCategory(
  category: LessonCategory,
): Promise<Lesson[]> {
  const lessons = await getLessonsByCategory(category, { includePremium: true });
  return lessons.filter((lesson) => lesson.isPremium);
}

export async function getRecommendedDailyLessons(
  userProfile: UserLearningProfile,
): Promise<Lesson[]> {
  const publishedLessons = await getRuntimeLessons();
  const session = selectDailyPracticeSession(userProfile, publishedLessons);

  return session.lessonIds
    .map((lessonId) => publishedLessons.find((lesson) => lesson.id === lessonId))
    .filter((lesson): lesson is Lesson => !!lesson);
}

export async function searchLessons(
  query: string,
  options?: LessonQueryOptions,
): Promise<Lesson[]> {
  const lessons = await getRuntimeLessons();
  return lessons
    .filter((lesson) => matchesQueryOptions(lesson, options))
    .filter((lesson) => searchInLesson(lesson, query));
}
