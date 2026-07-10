import { EnglishLevel } from './index';

export type DailyMinutes = 5 | 10 | 15;

export type PracticeMode = 'daily' | 'library';

/** Unified learning profile — source of truth for coach logic. */
export interface UserLearningProfile {
  userId: string;
  name: string;
  level: EnglishLevel;
  goals: string[];
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
  lessonId: string;
  segmentId?: string;
  sessionId?: string;
  mode: PracticeMode;
  pronunciationScore: number;
  fluencyScore: number;
  rhythmScore: number;
  confidenceScore: number;
  nativeScore: number;
  correctWords: string[];
  wordsToImprove: string[];
  weakAreasDetected: string[];
  aiCoachCommentTr: string;
  nextFocusTr: string;
  createdAt: string;
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
  return {
    userId: 'local-user',
    name: 'Ethem',
    level: 'intermediate',
    goals: ['daily_conversation'],
    weakAreas: [],
    dailyMinutes: 5,
    premium: false,
    currentStreak: 0,
    lastPracticeDate: null,
    completedLessonIds: [],
    completedDailySessionIds: [],
    averageScore: 0,
    bestScore: 0,
    ...partial,
  };
}

export function toDailyMinutes(minutes: number): DailyMinutes {
  if (minutes >= 15) return 15;
  if (minutes >= 10) return 10;
  return 5;
}
