import { NavigatorScreenParams } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';
import { LessonCategory } from '../types/lesson';
import type { RecordingValidationResult } from '../services/audio/recordingValidation';

export type OnboardingStackParamList = {
  OnboardingWelcome: undefined;
  GoalSelection: undefined;
  FirstPracticePreview: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Categories: undefined;
  Progress: undefined;
  Profile: { focusAuth?: boolean } | undefined;
};

export type RootStackParamList = {
  Onboarding: NavigatorScreenParams<OnboardingStackParamList>;
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  DailyPracticeSession: { sessionId?: string } | undefined;
  DailyPracticeSummary: { sessionId: string };
  CategoryLessons: { categoryId: LessonCategory };
  Lesson: {
    lessonId: string;
    source?: 'dailySession' | 'library';
    sessionId?: string;
    practiceIndex?: number;
    totalLessons?: number;
    categoryId?: LessonCategory;
    /** Resume a specific segment after analysis retry */
    segmentId?: string;
    segmentIndex?: number;
  };
  AnalysisResult: {
    lessonId: string;
    source?: 'dailySession' | 'library';
    sessionId?: string;
    practiceIndex?: number;
    totalLessons?: number;
    categoryId?: LessonCategory;
    audioUri?: string;
    durationMillis?: number;
    recordedAt?: string;
    hasSpeech?: boolean;
    recordingValidation?: RecordingValidationResult;
    segmentId?: string;
    segmentIndex?: number;
    practiceStep?: import('../types/practiceMethodology').PracticeStep;
    shadowingMode?: import('../types/practiceMethodology').ShadowingPracticeMode;
  };
  Premium: undefined;
  Vocabulary: undefined;
  PrivacyPolicy: undefined;
  TermsOfUse: undefined;
  Support: undefined;
  DataDeletion: undefined;
  About: undefined;
};

export type OnboardingScreenProps<T extends keyof OnboardingStackParamList> =
  NativeStackScreenProps<OnboardingStackParamList, T>;

export type RootScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

export type TabScreenProps<T extends keyof MainTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
