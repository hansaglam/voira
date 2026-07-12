import type { Lesson } from '../types/lesson';
import type { RootStackParamList } from '../navigation/types';
import { showPremiumLockedAccountAlert } from './premiumAccountGate';

type PremiumGateNavigation = {
  navigate: (
    ...args:
      | [screen: 'MainTabs', params: { screen: 'Profile'; params?: { focusAuth?: boolean } }]
      | [screen: keyof RootStackParamList, params?: RootStackParamList[keyof RootStackParamList]]
  ) => void;
};

export type LessonProgressState = 'not_started' | 'in_progress' | 'completed';

export type LessonCtaLabel =
  | 'Başla'
  | 'Devam et'
  | 'Tekrar çalış'
  | 'Kilidi Aç'
  | 'Derse Gir';

export function canAccessLesson(lesson: Lesson, isPremium: boolean): boolean {
  return !lesson.isPremium || isPremium;
}

export function getLessonActionLabel(
  lesson: Lesson,
  isPremium: boolean,
  progressState: LessonProgressState = 'not_started',
): LessonCtaLabel {
  if (progressState === 'completed') return 'Tekrar çalış';
  if (progressState === 'in_progress') return 'Devam et';
  if (lesson.isPremium && !isPremium) return 'Kilidi Aç';
  return 'Başla';
}

export function isLessonLocked(lesson: Lesson, isPremium: boolean): boolean {
  return lesson.isPremium && !isPremium;
}

/** Registered users without premium go to paywall; guests see account-required alert. */
export function requirePremiumAccess(
  isPremiumUser: boolean,
  isRegistered: boolean,
  navigation: PremiumGateNavigation,
  onAccessGranted: () => void,
): void {
  if (isPremiumUser) {
    onAccessGranted();
    return;
  }

  if (!isRegistered) {
    showPremiumLockedAccountAlert(navigation);
    return;
  }

  navigation.navigate('Premium');
}

/** Guest users must create an account before purchase / premium lesson unlock flow. */
export function handlePremiumLessonAccess(
  lesson: Lesson,
  isPremiumUser: boolean,
  isRegistered: boolean,
  navigation: PremiumGateNavigation,
  onAccessGranted: () => void,
): void {
  if (canAccessLesson(lesson, isPremiumUser)) {
    onAccessGranted();
    return;
  }

  if (!isRegistered) {
    showPremiumLockedAccountAlert(navigation);
    return;
  }

  navigation.navigate('Premium');
}
