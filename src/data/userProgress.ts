import { UserProgress } from '../types';

export const mockUserProgress: UserProgress = {
  currentStreak: 3,
  totalPracticeMinutes: 45,
  completedLessons: 8,
  averageScore: 71,
  bestScore: 84,
  weakAreas: ['th sesi', 'kelime bağlama', 'ritim'],
  day1Score: 58,
  day7Score: 72,
  todayFocus: 'Günlük konuşma akıcılığı',
};

export const dailyPracticeCard = {
  title: 'Bugünün Shadowing Görevi',
  duration: '5 dakika • 6 kısa cümle',
  goal: 'Hedef: Daha doğal ve akıcı konuşmak',
};
