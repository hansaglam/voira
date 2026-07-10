/** Check if a lesson is completed using the learning profile's completed list. */
export function isLessonCompleted(lessonId: string, completedLessonIds: string[]): boolean {
  return completedLessonIds.includes(lessonId);
}

/** @deprecated Use isLessonCompleted(id, profile.completedLessonIds) */
export const mockCompletedLessonIds: string[] = [
  'daily-weekend-plans',
  'daily-weather-smalltalk',
  'cafe-order-latte',
];
