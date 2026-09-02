import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { OnboardingNavigator } from './OnboardingNavigator';
import { TabNavigator } from './TabNavigator';
import { LessonScreen } from '../screens/LessonScreen';
import { AnalysisResultScreen } from '../screens/AnalysisResultScreen';
import { DailyPracticeSessionScreen } from '../screens/DailyPracticeSessionScreen';
import { CategoryLessonsScreen } from '../screens/CategoryLessonsScreen';
import { DailyPracticeSummaryScreen } from '../screens/DailyPracticeSummaryScreen';
import { PremiumScreen } from '../screens/PremiumScreen';
import { VocabularyScreen } from '../screens/VocabularyScreen';
import { PrivacyPolicyScreen } from '../screens/PrivacyPolicyScreen';
import { TermsOfUseScreen } from '../screens/TermsOfUseScreen';
import { SupportScreen } from '../screens/SupportScreen';
import { DataDeletionScreen } from '../screens/DataDeletionScreen';
import { AboutScreen } from '../screens/AboutScreen';
import { WeakWordsScreen } from '../screens/WeakWordsScreen';
import { WeakWordPracticeScreen } from '../screens/WeakWordPracticeScreen';
import { WeakWordPracticeResultScreen } from '../screens/WeakWordPracticeResultScreen';
import { RoleplayDiscoverScreen } from '../screens/RoleplayDiscoverScreen';
import { RoleplaySessionScreen } from '../screens/RoleplaySessionScreen';
import { RoleplayResultScreen } from '../screens/RoleplayResultScreen';
import { WeeklyReportScreen } from '../screens/WeeklyReportScreen';
import { VoiraLogo } from '../components/VoiraLogo';
import { useUser } from '../context/UserContext';
import { useLearning } from '../context/LearningContext';
import { lessons } from '../data/lessons';
import { colors } from '../theme';

const Stack = createNativeStackNavigator<RootStackParamList>();
const DEFAULT_LESSON_ID = lessons[0]?.id ?? 'daily-neighbor-greeting';

function MainNavigator() {
  const { postOnboardingRoute, postOnboardingAnalysisParams } = useUser();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
      initialRouteName={postOnboardingRoute === 'AnalysisResult' ? 'AnalysisResult' : 'MainTabs'}
    >
      <Stack.Screen name="MainTabs" component={TabNavigator} />
      <Stack.Screen
        name="DailyPracticeSession"
        component={DailyPracticeSessionScreen}
        options={{ animation: 'fade' }}
      />
      <Stack.Screen
        name="CategoryLessons"
        component={CategoryLessonsScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="DailyPracticeSummary"
        component={DailyPracticeSummaryScreen}
        options={{ animation: 'fade' }}
      />
      <Stack.Screen
        name="Lesson"
        component={LessonScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="AnalysisResult"
        component={AnalysisResultScreen}
        initialParams={{
          lessonId: DEFAULT_LESSON_ID,
          ...postOnboardingAnalysisParams,
        }}
        options={{ animation: 'fade' }}
      />
      <Stack.Screen
        name="Premium"
        component={PremiumScreen}
        options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
      />
      <Stack.Screen
        name="Vocabulary"
        component={VocabularyScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
      <Stack.Screen name="TermsOfUse" component={TermsOfUseScreen} />
      <Stack.Screen name="Support" component={SupportScreen} />
      <Stack.Screen name="DataDeletion" component={DataDeletionScreen} />
      <Stack.Screen name="About" component={AboutScreen} />
      <Stack.Screen
        name="WeakWords"
        component={WeakWordsScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="WeakWordPractice"
        component={WeakWordPracticeScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="WeakWordPracticeResult"
        component={WeakWordPracticeResultScreen}
        options={{ animation: 'fade' }}
      />
      <Stack.Screen
        name="RoleplayDiscover"
        component={RoleplayDiscoverScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="RoleplaySession"
        component={RoleplaySessionScreen}
        options={{ animation: 'slide_from_bottom', gestureEnabled: false }}
      />
      <Stack.Screen
        name="RoleplayResult"
        component={RoleplayResultScreen}
        options={{ animation: 'fade', gestureEnabled: false }}
      />
      <Stack.Screen name="WeeklyReport" component={WeeklyReportScreen} options={{ animation: 'slide_from_right' }} />
    </Stack.Navigator>
  );
}

export function RootNavigator() {
  const { onboardingComplete, isOnboardingHydrated } = useUser();
  const { isLearningHydrated } = useLearning();

  if (!isOnboardingHydrated || !isLearningHydrated) {
    return (
      <View style={styles.bootSplash}>
        <VoiraLogo size={160} />
      </View>
    );
  }

  if (!onboardingComplete) {
    return <OnboardingNavigator />;
  }

  return <MainNavigator />;
}

const styles = StyleSheet.create({
  bootSplash: {
    flex: 1,
    backgroundColor: '#0D1334',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
