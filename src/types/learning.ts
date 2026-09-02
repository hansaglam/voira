import { EnglishLevel } from './index';
import type { SpeakingPriority } from '../services/personalization/personalSpeakingPlanTypes';
import { sanitizeSpeakingPriorities } from '../services/personalization/personalSpeakingPlanTypes';

export type DailyMinutes = 5 | 10 | 15;

export type PracticeMode = 'daily' | 'library';

/** Unified learning profile — source of truth for coach logic. */
export interface UserLearningProfile {
  userId: string;
  name: string;
  level: EnglishLevel;
  goals: string[];
  /**
   * Self-declared onboarding speaking priorities (canonical ids).
   * Never mixed with automatically detected weakAreas.
   */
  speakingPriorities: SpeakingPriority[];
  weakAreas: string[];
  dailyMinutes: DailyMinutes;
  premium: boolean;
  currentStreak: number;
  lastPracticeDate: string | null;
  completedLessonIds: string[];
  completedDailySessionIds: string[];
  averageScore: number;
  bestScore: number;
}

export interface PracticeResult {
  resultId: string;
  /** Stable sync id — equals resultId for new records; migrated for legacy. */
  attemptId?: string;
  lessonId: string;
  segmentId?: string;
  sessionId?: string;
  mode: PracticeMode;
  pronunciationScore: number;
  fluencyScore: number;
  rhythmScore: number;
  confidenceScore: number;
  nativeScore: number;
  /** Azure completeness when available — optional on legacy records. */
  completenessScore?: number;
  correctWords: string[];
  wordsToImprove: string[];
  /**
   * Pronunciation-backed weak-word events for cloud memory.
   * Missing / mismatch tokens must not appear here.
   */
  pronunciationWeakEvents?: Array<{
    word: string;
    severity: 'severe' | 'borderline';
    score?: number;
  }>;
  weakAreasDetected: string[];
  aiCoachCommentTr: string;
  nextFocusTr: string;
  createdAt: string;
  /** Used for conflict resolution during cloud sync. */
  updatedAt?: string;
  /** Local sync queue marker for signed-in users. */
  syncStatus?: 'pending' | 'synced';
}

export interface NativeScoreParts {
  pronunciationScore: number;
  fluencyScore: number;
  rhythmScore: number;
  confidenceScore: number;
}

export function createDefaultLearningProfile(
  partial?: Partial<UserLearningProfile>,
): UserLearningProfile {
  const defaults: UserLearningProfile = {
    userId: 'local-user',
    name: '',
    level: 'intermediate',
    goals: ['daily_conversation'],
    speakingPriorities: [],
    weakAreas: [],
    dailyMinutes: 5,
    premium: false,
    currentStreak: 0,
    lastPracticeDate: null,
    completedLessonIds: [],
    completedDailySessionIds: [],
    averageScore: 0,
    bestScore: 0,
  };

  if (!partial) return defaults;

  return {
    ...defaults,
    ...partial,
    goals: Array.isArray(partial.goals) ? partial.goals : defaults.goals,
    speakingPriorities: sanitizeSpeakingPriorities(partial.speakingPriorities),
    weakAreas: Array.isArray(partial.weakAreas) ? partial.weakAreas : defaults.weakAreas,
    completedLessonIds: Array.isArray(partial.completedLessonIds)
      ? partial.completedLessonIds
      : defaults.completedLessonIds,
    completedDailySessionIds: Array.isArray(partial.completedDailySessionIds)
      ? partial.completedDailySessionIds
      : defaults.completedDailySessionIds,
  };
}

export function toDailyMinutes(minutes: number): DailyMinutes {
  if (minutes >= 15) return 15;
  if (minutes >= 10) return 10;
  return 5;
}
