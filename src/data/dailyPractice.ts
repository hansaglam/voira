import { DailyPracticeSession } from '../types/dailyPractice';
import { UserLearningProfile } from '../types/learning';
import { Lesson } from '../types/lesson';
import { getOrCreateDailySession, getSessionById } from './learningSessionStore';
import { lessons } from './lessons';
import { createDefaultLearningProfile } from '../types/learning';

export { selectDailyPracticeSession, getLessonIdForPractice } from './learningAlgorithm';

/** Stable daily session for the current profile — prefer LearningContext.getDailySession(). */
export function getMockDailyPracticeSession(
  profile?: UserLearningProfile,
  allLessons: Lesson[] = lessons,
): DailyPracticeSession {
  const activeProfile = profile ?? createDefaultLearningProfile();
  return getOrCreateDailySession(activeProfile, allLessons);
}

export function getDailySessionById(sessionId: string): DailyPracticeSession | undefined {
  return getSessionById(sessionId);
}
