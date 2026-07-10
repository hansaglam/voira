import { LessonCategory, LessonDifficultyLabel, LessonLevel } from './lesson';

/** Flat lesson shape used by legacy lessonContent.ts — migrated to segment-based Lesson on load. */
export interface LegacyLessonFlat {
  id: string;
  title: string;
  category: LessonCategory;
  level: LessonLevel;
  estimatedMinutes: 3 | 5 | 7;
  focusSkill: string;
  targetSentence: string;
  naturalSpeedNote: string;
  slowPracticeSentence: string;
  TurkishTranslation: string;
  usageExplanationTr: string;
  pronunciationTipTr: string;
  commonMistakeTr: string;
  shadowingInstructionTr: string;
  aiCoachExampleFeedbackTr: string;
  keywords: string[];
  difficulty: LessonDifficultyLabel;
  isPremium: boolean;
}
