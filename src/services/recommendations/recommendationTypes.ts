export interface RecommendedLessonReason {
  weakArea: string;
  reasonTr: string;
}

export interface RecommendedLesson {
  lessonId: string;
  title: string;
  subtitle?: string;
  category: string;
  isPremium: boolean;
  reasonTr: string;
  matchScore: number;
  isCurrentLesson?: boolean;
}

export interface RecommendationInput {
  weakAreasDetected: string[];
  wordsToImprove?: string[];
  missingWords?: string[];
  correctWords?: string[];
  matchPercent?: number;
  lessonId?: string;
  segmentId?: string;
  userLevel?: string;
  isPremiumUser: boolean;
}
