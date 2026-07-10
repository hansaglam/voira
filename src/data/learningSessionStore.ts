import { DailyPracticeSession } from '../types/dailyPractice';
import { PracticeResult, UserLearningProfile } from '../types/learning';
import { Lesson } from '../types/lesson';
import {
  aggregateSessionResults,
  selectDailyPracticeSession,
  updateProgressFromResult,
} from './learningAlgorithm';

interface SessionStoreState {
  sessions: Map<string, DailyPracticeSession>;
  results: Map<string, PracticeResult[]>;
  todaySessionKey: string | null;
}

const store: SessionStoreState = {
  sessions: new Map(),
  results: new Map(),
  todaySessionKey: null,
};

function todayDateKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function getSessionById(sessionId: string): DailyPracticeSession | undefined {
  return store.sessions.get(sessionId);
}

export function getSessionResults(sessionId: string): PracticeResult[] {
  return store.results.get(sessionId) ?? [];
}

export function getAllPracticeResults(): PracticeResult[] {
  return Array.from(store.results.values()).flat();
}

export function getOrCreateDailySession(
  profile: UserLearningProfile,
  allLessons: Lesson[],
): DailyPracticeSession {
  const dateKey = todayDateKey();
  const sessionId = `daily-${dateKey.replace(/-/g, '')}`;

  if (store.todaySessionKey === dateKey && store.sessions.has(sessionId)) {
    return store.sessions.get(sessionId)!;
  }

  const session = selectDailyPracticeSession(profile, allLessons, dateKey);
  store.sessions.set(sessionId, session);
  store.todaySessionKey = dateKey;

  if (!store.results.has(sessionId)) {
    store.results.set(sessionId, []);
  }

  return session;
}

export function recordPracticeResult(
  profile: UserLearningProfile,
  result: PracticeResult,
): { profile: UserLearningProfile; session?: DailyPracticeSession } {
  const sessionId = result.sessionId;
  let updatedSession: DailyPracticeSession | undefined;

  if (sessionId) {
    const existing = store.sessions.get(sessionId);
    const prior = store.results.get(sessionId) ?? [];
    const results = [...prior.filter((r) => r.lessonId !== result.lessonId), result];
    store.results.set(sessionId, results);

    if (existing) {
      const completedLessonIds = existing.completedLessonIds.includes(result.lessonId)
        ? existing.completedLessonIds
        : [...existing.completedLessonIds, result.lessonId];

      const { averageScore } = aggregateSessionResults(results);
      const isCompleted = completedLessonIds.length >= existing.totalLessons;

      updatedSession = {
        ...existing,
        completedLessonIds,
        currentIndex: Math.min(completedLessonIds.length, existing.totalLessons - 1),
        averageScore,
        isCompleted,
      };
      store.sessions.set(sessionId, updatedSession);
    }
  }

  const updatedProfile = updateProgressFromResult(profile, result);
  return { profile: updatedProfile, session: updatedSession };
}

export function completeDailySession(
  profile: UserLearningProfile,
  sessionId: string,
): UserLearningProfile {
  const session = store.sessions.get(sessionId);
  if (session) {
    store.sessions.set(sessionId, { ...session, isCompleted: true });
  }

  if (profile.completedDailySessionIds.includes(sessionId)) {
    return profile;
  }

  return {
    ...profile,
    completedDailySessionIds: [...profile.completedDailySessionIds, sessionId],
  };
}

export function getLearningSessionSnapshot(): {
  sessions: Record<string, DailyPracticeSession>;
  results: Record<string, PracticeResult[]>;
  todaySessionKey: string | null;
} {
  return {
    sessions: Object.fromEntries(store.sessions.entries()),
    results: Object.fromEntries(store.results.entries()),
    todaySessionKey: store.todaySessionKey,
  };
}

export function hydrateLearningSessionStore(snapshot: {
  sessions: Record<string, DailyPracticeSession>;
  results: Record<string, PracticeResult[]>;
  todaySessionKey: string | null;
}): void {
  store.sessions.clear();
  store.results.clear();

  for (const [sessionId, session] of Object.entries(snapshot.sessions)) {
    store.sessions.set(sessionId, session);
  }

  for (const [sessionId, sessionResults] of Object.entries(snapshot.results)) {
    store.results.set(sessionId, sessionResults);
  }

  store.todaySessionKey = snapshot.todaySessionKey;
}

/** Test helper — reset in-memory session state. */
export function resetLearningSessionStore(): void {
  store.sessions.clear();
  store.results.clear();
  store.todaySessionKey = null;
}
