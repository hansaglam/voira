import { PracticeResult } from '../types/learning';
import { Lesson } from '../types/lesson';
import { getSegmentCount } from '../utils/lessonUtils';
import type { LessonProgressState } from '../utils/premiumAccess';

export interface LessonSegmentProgress {
  completedSegmentIds: string[];
  highestCompletedSegmentIndex: number;
  nextSegmentIndex: number;
  isFullyCompleted: boolean;
  isInProgress: boolean;
}

function getSortedSegments(lesson: Lesson) {
  return [...lesson.segments].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export function getCompletedSegmentIdsForLesson(
  lessonId: string,
  results: PracticeResult[],
): string[] {
  const ids = new Set<string>();
  for (const result of results) {
    if (result.lessonId === lessonId && result.segmentId) {
      ids.add(result.segmentId);
    }
  }
  return Array.from(ids);
}

export function buildLessonSegmentProgress(
  lesson: Lesson,
  completedLessonIds: string[],
  results: PracticeResult[],
): LessonSegmentProgress {
  const sortedSegments = getSortedSegments(lesson);
  const total = getSegmentCount(lesson);
  const completedSet = new Set(getCompletedSegmentIdsForLesson(lesson.id, results));

  let highestCompletedSegmentIndex = -1;
  sortedSegments.forEach((segment, index) => {
    if (completedSet.has(segment.id)) {
      highestCompletedSegmentIndex = index;
    }
  });

  const isFullyCompleted = completedLessonIds.includes(lesson.id);
  const hasSegmentResults = completedSet.size > 0;
  const isInProgress = !isFullyCompleted && hasSegmentResults;

  let nextSegmentIndex = 0;
  if (!isFullyCompleted && hasSegmentResults) {
    if (highestCompletedSegmentIndex < total - 1) {
      nextSegmentIndex = highestCompletedSegmentIndex + 1;
    } else {
      nextSegmentIndex = Math.max(0, total - 1);
    }
  }

  return {
    completedSegmentIds: sortedSegments
      .map((segment) => segment.id)
      .filter((id) => completedSet.has(id)),
    highestCompletedSegmentIndex,
    nextSegmentIndex: Math.min(Math.max(0, nextSegmentIndex), Math.max(0, total - 1)),
    isFullyCompleted,
    isInProgress,
  };
}

export function resolveLessonProgressState(
  lesson: Lesson,
  completedLessonIds: string[],
  results: PracticeResult[],
): LessonProgressState {
  if (completedLessonIds.includes(lesson.id)) {
    return 'completed';
  }

  const progress = buildLessonSegmentProgress(lesson, completedLessonIds, results);
  if (progress.isInProgress) {
    return 'in_progress';
  }

  return 'not_started';
}

export function resolveResumeSegmentIndex(
  lesson: Lesson,
  completedLessonIds: string[],
  results: PracticeResult[],
  options?: {
    explicitSegmentIndex?: number;
    explicitSegmentId?: string;
    repeatFromStart?: boolean;
  },
): number {
  const total = getSegmentCount(lesson);
  if (total <= 1) return 0;

  if (options?.repeatFromStart || completedLessonIds.includes(lesson.id)) {
    return 0;
  }

  if (
    typeof options?.explicitSegmentIndex === 'number' &&
    Number.isFinite(options.explicitSegmentIndex)
  ) {
    return Math.min(Math.max(0, options.explicitSegmentIndex), total - 1);
  }

  if (options?.explicitSegmentId) {
    const sortedSegments = getSortedSegments(lesson);
    const index = sortedSegments.findIndex((segment) => segment.id === options.explicitSegmentId);
    if (index >= 0) return index;
  }

  return buildLessonSegmentProgress(lesson, completedLessonIds, results).nextSegmentIndex;
}

export function resolveCurrentSegmentIndex(
  lesson: Lesson,
  segmentId?: string,
  segmentIndex?: number,
): number {
  const total = getSegmentCount(lesson);
  if (total <= 1) return 0;

  if (typeof segmentIndex === 'number' && Number.isFinite(segmentIndex)) {
    return Math.min(Math.max(0, segmentIndex), total - 1);
  }

  if (segmentId) {
    const sortedSegments = getSortedSegments(lesson);
    const index = sortedSegments.findIndex((segment) => segment.id === segmentId);
    if (index >= 0) return index;
  }

  return 0;
}

export function isFinalLessonSegment(lesson: Lesson, segmentIndex: number): boolean {
  const total = getSegmentCount(lesson);
  return total <= 1 || segmentIndex >= total - 1;
}
