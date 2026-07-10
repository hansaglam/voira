import { applyLessonAudioAssetToLesson } from '../../data/lessonAudioAssets';
import { applyRemoteAudioAssetToLesson } from '../audio/audioRegistryService';
import { Lesson } from '../../types/lesson';
import { enrichLessonMethodology } from '../../utils/practiceMethodology';
import { resolveLessonContentStatus } from './contentStatus';

export function getLessonVersion(lesson: Lesson): number {
  return lesson.version ?? 1;
}

export function isLessonPublished(lesson: Lesson): boolean {
  return resolveLessonContentStatus(lesson.status) === 'published';
}

export function isLessonArchived(lesson: Lesson): boolean {
  return resolveLessonContentStatus(lesson.status) === 'archived';
}

export function normalizeLessonForRuntime(lesson: Lesson): Lesson {
  const enriched = enrichLessonMethodology({
    ...lesson,
    status: resolveLessonContentStatus(lesson.status),
    version: getLessonVersion(lesson),
  });

  return applyRemoteAudioAssetToLesson(applyLessonAudioAssetToLesson(enriched));
}
