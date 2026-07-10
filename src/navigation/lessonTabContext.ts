import type { MainTabParamList } from './types';
import type { LessonCategory } from '../types/lesson';

type LessonTabSource = {
  source?: 'dailySession' | 'library';
  categoryId?: LessonCategory;
};

export function resolveLessonActiveTab(params: LessonTabSource): keyof MainTabParamList | undefined {
  if (params.source === 'dailySession') {
    return 'Home';
  }
  if (params.source === 'library' || params.categoryId) {
    return 'Categories';
  }
  return undefined;
}

export function resolveAnalysisActiveTab(params: LessonTabSource): keyof MainTabParamList | undefined {
  if (params.source === 'dailySession') {
    return 'Home';
  }
  if (params.categoryId) {
    return 'Categories';
  }
  return undefined;
}
