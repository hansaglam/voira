import { Lesson, LessonCategory } from '../../types/lesson';
import { LessonContentSource, LessonQueryOptions } from './contentRepositoryTypes';

function devWarn(): void {
  if (__DEV__) {
    console.warn('[EchoSpeak Content] remoteLessonSource is not connected yet');
  }
}

function safeFilterByOptions(lessons: Lesson[], options?: LessonQueryOptions): Lesson[] {
  return lessons.filter((lesson) => {
    if (options?.category && lesson.category !== options.category) return false;
    if (options?.level && lesson.level !== options.level) return false;
    if (options?.type && lesson.type !== options.type) return false;
    if (options?.includePremium === false && lesson.isPremium) return false;
    return true;
  });
}

export const remoteLessonSource: LessonContentSource = {
  async getAllLessons(options?: LessonQueryOptions): Promise<Lesson[]> {
    devWarn();
    // TODO: Replace with Firebase/Admin API call once remote backend is ready.
    // TODO: Map remote DTOs into Lesson domain model here.
    return safeFilterByOptions([], options);
  },

  async getLessonById(id: string, options?: LessonQueryOptions): Promise<Lesson | undefined> {
    devWarn();
    // TODO: Fetch single lesson by id from remote content endpoint.
    const lessons = await this.getAllLessons(options);
    return lessons.find((lesson) => lesson.id === id);
  },

  async getLessonsByCategory(
    category: LessonCategory,
    options?: LessonQueryOptions,
  ): Promise<Lesson[]> {
    devWarn();
    // TODO: Query remote lessons by category with server-side filters.
    return this.getAllLessons({ ...options, category });
  },

  async searchLessons(query: string, options?: LessonQueryOptions): Promise<Lesson[]> {
    devWarn();
    // TODO: Implement remote search with full-text or indexed backend query.
    const normalizedQuery = query.trim().toLocaleLowerCase('tr-TR');
    const lessons = await this.getAllLessons(options);
    if (!normalizedQuery) return lessons;

    return lessons.filter((lesson) => {
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
    });
  },
};
