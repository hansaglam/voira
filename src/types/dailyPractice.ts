export interface DailyPracticeSession {
  sessionId: string;
  date: string;
  title: string;
  subtitle: string;
  estimatedMinutes: number;
  focusSkill: string;
  lessonIds: string[];
  currentIndex: number;
  totalLessons: number;
  completedLessonIds: string[];
  isCompleted: boolean;
  averageScore: number;
}
