import safeAsyncStorage from '../storage/safeAsyncStorage';
import { DailyPracticeSession } from '../types/dailyPractice';
import { PracticeResult, UserLearningProfile } from '../types/learning';
import { withStableAttemptId } from '../services/sync/attemptId';
import {
  getAllPracticeResults,
  getLearningSessionSnapshot,
} from './learningSessionStore';

export const LEARNING_PROGRESS_STORAGE_KEY = '@echospeak/learning-progress/v1';

export interface LastLessonState {
  lessonId: string;
  categoryId?: string;
  source?: 'library' | 'dailySession';
  sessionId?: string;
  practiceIndex?: number;
  segmentId?: string;
  segmentIndex?: number;
  updatedAt: string;
}

export interface LearningProgressPersistedState {
  /** v1 legacy + v2 adds stable attemptId on practice results. */
  storageVersion: 1 | 2;
  completedLessonIds: string[];
  completedDailySessionIds: string[];
  inProgressLessonIds: string[];
  lastLessonState: LastLessonState | null;
  currentStreak: number;
  lastPracticeDate: string | null;
  averageScore: number;
  bestScore: number;
  weakAreas: string[];
  totalPracticeCount: number;
  sessions: Record<string, DailyPracticeSession>;
  results: Record<string, PracticeResult[]>;
  todaySessionKey: string | null;
}

export function createEmptyPersistedState(): LearningProgressPersistedState {
  return {
    storageVersion: 2,
    completedLessonIds: [],
    completedDailySessionIds: [],
    inProgressLessonIds: [],
    lastLessonState: null,
    currentStreak: 0,
    lastPracticeDate: null,
    averageScore: 0,
    bestScore: 0,
    weakAreas: [],
    totalPracticeCount: 0,
    sessions: {},
    results: {},
    todaySessionKey: null,
  };
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function migratePracticeResult(raw: unknown): PracticeResult | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Partial<PracticeResult>;
  if (typeof data.lessonId !== 'string' || typeof data.createdAt !== 'string') {
    return null;
  }
  if (typeof data.mode !== 'string') return null;
  if (typeof data.nativeScore !== 'number') return null;

  try {
    return withStableAttemptId({
      resultId: typeof data.resultId === 'string' ? data.resultId : '',
      attemptId: typeof data.attemptId === 'string' ? data.attemptId : undefined,
      lessonId: data.lessonId,
      segmentId: typeof data.segmentId === 'string' ? data.segmentId : undefined,
      sessionId: typeof data.sessionId === 'string' ? data.sessionId : undefined,
      mode: data.mode === 'daily' ? 'daily' : 'library',
      pronunciationScore: Number(data.pronunciationScore ?? 0),
      fluencyScore: Number(data.fluencyScore ?? 0),
      rhythmScore: Number(data.rhythmScore ?? 0),
      confidenceScore: Number(data.confidenceScore ?? 0),
      nativeScore: data.nativeScore,
      correctWords: Array.isArray(data.correctWords) ? data.correctWords.filter((w) => typeof w === 'string') : [],
      wordsToImprove: Array.isArray(data.wordsToImprove)
        ? data.wordsToImprove.filter((w) => typeof w === 'string')
        : [],
      weakAreasDetected: Array.isArray(data.weakAreasDetected)
        ? data.weakAreasDetected.filter((w) => typeof w === 'string')
        : [],
      aiCoachCommentTr: typeof data.aiCoachCommentTr === 'string' ? data.aiCoachCommentTr : '',
      nextFocusTr: typeof data.nextFocusTr === 'string' ? data.nextFocusTr : '',
      createdAt: data.createdAt,
      updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : data.createdAt,
      syncStatus: data.syncStatus === 'synced' ? 'synced' : 'pending',
    });
  } catch {
    return null;
  }
}

function migrateResultsMap(
  raw: unknown,
): Record<string, PracticeResult[]> {
  if (!raw || typeof raw !== 'object') return {};
  const next: Record<string, PracticeResult[]> = {};

  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!Array.isArray(value)) continue;
    const migrated = value
      .map((item) => migratePracticeResult(item))
      .filter((item): item is PracticeResult => item != null);
    next[key] = migrated;
  }

  return next;
}

function parsePersistedState(raw: unknown): {
  state: LearningProgressPersistedState;
  migratedFromV1: boolean;
} | null {
  if (!raw || typeof raw !== 'object') return null;

  const data = raw as Partial<LearningProgressPersistedState>;
  if (data.storageVersion !== 1 && data.storageVersion !== 2) return null;

  if (
    !isStringArray(data.completedLessonIds) ||
    !isStringArray(data.completedDailySessionIds) ||
    !isStringArray(data.inProgressLessonIds) ||
    !isStringArray(data.weakAreas)
  ) {
    return null;
  }

  if (
    typeof data.currentStreak !== 'number' ||
    typeof data.averageScore !== 'number' ||
    typeof data.bestScore !== 'number' ||
    typeof data.totalPracticeCount !== 'number'
  ) {
    return null;
  }

  if (data.lastPracticeDate !== null && typeof data.lastPracticeDate !== 'string') {
    return null;
  }

  if (data.lastLessonState !== null && typeof data.lastLessonState !== 'object') {
    return null;
  }

  if (data.sessions !== null && typeof data.sessions !== 'object') return null;
  if (data.results !== null && typeof data.results !== 'object') return null;
  if (data.todaySessionKey !== null && typeof data.todaySessionKey !== 'string') {
    return null;
  }

  const migratedFromV1 = data.storageVersion === 1;
  const results = migrateResultsMap(data.results ?? {});
  const totalPracticeCount = Object.values(results).reduce(
    (sum, list) => sum + list.length,
    0,
  );

  return {
    migratedFromV1,
    state: {
      storageVersion: 2,
      completedLessonIds: data.completedLessonIds,
      completedDailySessionIds: data.completedDailySessionIds,
      inProgressLessonIds: data.inProgressLessonIds,
      lastLessonState: data.lastLessonState ?? null,
      currentStreak: data.currentStreak,
      lastPracticeDate: data.lastPracticeDate ?? null,
      averageScore: data.averageScore,
      bestScore: data.bestScore,
      weakAreas: data.weakAreas,
      totalPracticeCount,
      sessions: data.sessions ?? {},
      results,
      todaySessionKey: data.todaySessionKey ?? null,
    },
  };
}

function deriveInProgressLessonIds(
  profile: UserLearningProfile,
  sessions: Record<string, DailyPracticeSession>,
  lastLessonState: LastLessonState | null,
): string[] {
  const ids = new Set<string>();

  for (const session of Object.values(sessions)) {
    const currentLessonId = session.lessonIds[session.currentIndex];
    if (currentLessonId && !profile.completedLessonIds.includes(currentLessonId)) {
      ids.add(currentLessonId);
    }

    for (const lessonId of session.lessonIds) {
      if (
        session.completedLessonIds.includes(lessonId) &&
        !profile.completedLessonIds.includes(lessonId)
      ) {
        ids.add(lessonId);
      }
    }
  }

  if (lastLessonState && !profile.completedLessonIds.includes(lastLessonState.lessonId)) {
    ids.add(lastLessonState.lessonId);
  }

  return Array.from(ids);
}

export function buildLearningProgressSnapshot(
  profile: UserLearningProfile,
  lastLessonState: LastLessonState | null,
): LearningProgressPersistedState {
  const { sessions, results, todaySessionKey } = getLearningSessionSnapshot();
  const practiceResults = getAllPracticeResults();

  return {
    storageVersion: 2,
    completedLessonIds: profile.completedLessonIds,
    completedDailySessionIds: profile.completedDailySessionIds,
    inProgressLessonIds: deriveInProgressLessonIds(profile, sessions, lastLessonState),
    lastLessonState,
    currentStreak: profile.currentStreak,
    lastPracticeDate: profile.lastPracticeDate,
    averageScore: profile.averageScore,
    bestScore: profile.bestScore,
    weakAreas: profile.weakAreas,
    totalPracticeCount: practiceResults.length,
    sessions,
    results,
    todaySessionKey,
  };
}

export async function loadLearningProgress(): Promise<LearningProgressPersistedState | null> {
  try {
    const raw = await safeAsyncStorage.getItem(LEARNING_PROGRESS_STORAGE_KEY);
    if (!raw) return null;

    const parsed = parsePersistedState(JSON.parse(raw));
    if (!parsed) return null;

    if (parsed.migratedFromV1) {
      await saveLearningProgress(parsed.state);
    }

    return parsed.state;
  } catch {
    return null;
  }
}

export async function saveLearningProgress(state: LearningProgressPersistedState): Promise<void> {
  try {
    await safeAsyncStorage.setItem(
      LEARNING_PROGRESS_STORAGE_KEY,
      JSON.stringify({ ...state, storageVersion: 2 }),
    );
  } catch {
    // Ignore persist failures — in-memory progress remains for the session.
  }
}

export async function clearLearningProgress(): Promise<void> {
  try {
    await safeAsyncStorage.removeItem(LEARNING_PROGRESS_STORAGE_KEY);
  } catch {
    // Ignore delete failures — caller handles UX.
  }
}
