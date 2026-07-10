import { contentCatalog } from '../../data/content/contentCatalog';
import { Lesson, LessonCategory } from '../../types/lesson';
import { normalizeLessonForRuntime } from './contentVersioning';
import { resolveLessonPremium } from '../../utils/lessonUtils';
import { LessonContentSource, LessonQueryOptions } from './contentRepositoryTypes';
import {
  ContentStatus,
  DRAFT_CONTENT_STATUSES,
  resolveLessonContentStatus,
} from './contentStatus';

function dedupeLessonsById(lessonList: Lesson[]): Lesson[] {
  const byId = new Map<string, Lesson>();
  for (const lesson of lessonList) {
    if (!byId.has(lesson.id)) {
      byId.set(lesson.id, lesson);
    }
  }
  return Array.from(byId.values());
}

function normalizeStatusFilter(
  status: LessonQueryOptions['status'],
): ContentStatus[] | null {
  if (!status) return null;
  return Array.isArray(status) ? status : [status];
}

function isLessonVisible(lesson: Lesson, options?: LessonQueryOptions): boolean {
  const effectiveStatus = resolveLessonContentStatus(lesson.status);
  const statusFilter = normalizeStatusFilter(options?.status);

  if (statusFilter) {
    return statusFilter.includes(effectiveStatus);
  }

  if (effectiveStatus === 'published') {
    return true;
  }

  if (
    __DEV__ &&
    options?.includeDrafts &&
    DRAFT_CONTENT_STATUSES.includes(effectiveStatus)
  ) {
    return true;
  }

  return false;
}

function matchesQueryOptions(lesson: Lesson, options?: LessonQueryOptions): boolean {
  if (!isLessonVisible(lesson, options)) {
    return false;
  }

  if (options?.category && lesson.category !== options.category) {
    return false;
  }

  if (options?.level && lesson.level !== options.level) {
    return false;
  }

  if (options?.type && lesson.type !== options.type) {
    return false;
  }

  if (options?.includePremium === false && resolveLessonPremium(lesson)) {
    return false;
  }

  return true;
}

function enrichLessons(lessonList: Lesson[]): Lesson[] {
  return lessonList.map((lesson) => normalizeLessonForRuntime(lesson));
}

function filterLessons(lessonList: Lesson[], options?: LessonQueryOptions): Lesson[] {
  return enrichLessons(
    dedupeLessonsById(lessonList).filter((lesson) => matchesQueryOptions(lesson, options)),
  );
}

function searchInLesson(lesson: Lesson, query: string): boolean {
  const normalizedQuery = query.trim().toLocaleLowerCase('tr-TR');
  if (!normalizedQuery) {
    return true;
  }

  const haystack = [
    lesson.title,
    lesson.subtitle,
    lesson.focusSkill,
    lesson.learningObjectiveTr,
    ...lesson.keywords,
    ...lesson.tags,
  ]
    .join(' ')
    .toLocaleLowerCase('tr-TR');

  return haystack.includes(normalizedQuery);
}

export const localLessonSource: LessonContentSource = {
  async getAllLessons(options?: LessonQueryOptions): Promise<Lesson[]> {
    return filterLessons(contentCatalog, options);
  },

  async getLessonById(id: string, options?: LessonQueryOptions): Promise<Lesson | undefined> {
    const lesson = contentCatalog.find((item) => item.id === id);
    if (!lesson || !matchesQueryOptions(lesson, options)) {
      return undefined;
    }
    return normalizeLessonForRuntime(lesson);
  },

  async getLessonsByCategory(
    category: LessonCategory,
    options?: LessonQueryOptions,
  ): Promise<Lesson[]> {
    return filterLessons(contentCatalog, { ...options, category });
  },

  async searchLessons(query: string, options?: LessonQueryOptions): Promise<Lesson[]> {
    return filterLessons(contentCatalog, options).filter((lesson) =>
      searchInLesson(lesson, query),
    );
  },
};
