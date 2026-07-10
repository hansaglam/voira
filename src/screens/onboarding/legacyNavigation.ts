import { NativeStackNavigationProp } from '@react-navigation/native-stack';

/** Routes for legacy standalone onboarding screens kept for reuse. */
export type LegacyOnboardingStackParamList = {
  LevelSelection: undefined;
  Personalization: undefined;
  GoalSelection: undefined;
  DailyPracticeSelection: undefined;
  SpeakingChallenges: undefined;
  FirstSpeakingTest: undefined;
};

export type LegacyOnboardingScreenProps<T extends keyof LegacyOnboardingStackParamList> = {
  navigation: NativeStackNavigationProp<LegacyOnboardingStackParamList, T>;
};
