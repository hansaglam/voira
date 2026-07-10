export interface ProgressMetric {
  label: string;
  value: number | string;
  helperText?: string;
  trend?: 'up' | 'down' | 'stable';
}

export interface ScoreTrendPoint {
  date: string;
  nativeScore: number;
  pronunciationScore: number;
  fluencyScore: number;
  rhythmScore: number;
}

export interface WeakAreaProgress {
  id: string;
  labelTr: string;
  count: number;
  severity: 'low' | 'medium' | 'high';
  lastDetectedAt?: string;
  recommendedLessonId?: string;
}

export interface RecentPracticeItem {
  resultId: string;
  lessonId: string;
  lessonTitle: string;
  date: string;
  nativeScore: number;
  weakAreasDetected: string[];
  mode: 'daily' | 'library' | 'onboarding' | 'custom';
}

export interface ProgressSummary {
  totalPracticeMinutes: number;
  completedLessons: number;
  currentStreak: number;
  averageNativeScore: number;
  bestNativeScore: number;
  scoreTrend: ScoreTrendPoint[];
  weakAreas: WeakAreaProgress[];
  recentPractice: RecentPracticeItem[];
  recommendedLessonIds: string[];
}
