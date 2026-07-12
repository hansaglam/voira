export type EnglishLevel = 'beginner' | 'intermediate' | 'advanced' | 'unsure';
export type UserGoal =
  | 'daily_conversation'
  | 'job_interview'
  | 'travel'
  | 'cafe_restaurant'
  | 'series_english'
  | 'media'
  | 'pronunciation';

export type { LessonSegment } from './segment';
export type { VocabularyEntry, VocabularyItem } from './vocabulary';
export type {
  Lesson,
  LessonCategory,
  LessonLevel,
  LessonDifficultyLabel,
  ContentLessonType,
  CefrLevel,
  LessonQuality,
  AiFeedbackRules,
} from './lesson';
export { CATEGORY_LABELS, LEVEL_TO_DIFFICULTY, LESSON_TYPE_LABELS } from './lesson';
export type { AiLessonGenerationInput, AiLessonGenerationOutput } from './aiLessonGeneration';
export type {
  PracticeStep,
  ShadowingPracticeMode,
  PlaybackSpeed,
  DelayOption,
} from './practiceMethodology';

export type { CategoryWithMeta } from './category';
export type { DailyPracticeSession } from './dailyPractice';
export type {
  UserLearningProfile,
  PracticeResult,
  PracticeMode,
  DailyMinutes,
  NativeScoreParts,
} from './learning';
export { createDefaultLearningProfile, toDailyMinutes } from './learning';

export interface Category {
  id: import('./lesson').LessonCategory;
  title: string;
  description: string;
  icon: string;
  gradient: [string, string];
}

export interface UserProfile {
  name: string;
  level: EnglishLevel;
  goal: UserGoal;
  goals: string[];
  speakingChallenges: string[];
  dailyPracticeMinutes: number;
  isPremium: boolean;
}

export interface UserProgress {
  currentStreak: number;
  totalPracticeMinutes: number;
  completedLessons: number;
  averageScore: number;
  bestScore: number;
  weakAreas: string[];
  day1Score: number;
  day7Score: number;
  todayFocus: string;
}

export interface LessonAnalysisResult {
  pronunciationScore: number;
  fluencyScore: number;
  rhythmScore: number;
  overallScore: number;
  feedback: string;
  correctWords: string[];
  wordsToImprove: string[];
  coachTip: string;
  focusSkill: string;
}
