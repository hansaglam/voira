import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from './types';
import { OnboardingWelcomeScreen } from '../screens/onboarding/OnboardingWelcomeScreen';
import { GoalSelectionScreen } from '../screens/onboarding/GoalSelectionScreen';
import { LevelSelectionScreen } from '../screens/onboarding/LevelSelectionScreen';
import { DailyPracticeSelectionScreen } from '../screens/onboarding/DailyPracticeSelectionScreen';
import { SpeakingPrioritySelectionScreen } from '../screens/onboarding/SpeakingPrioritySelectionScreen';
import { FirstPracticePreviewScreen } from '../screens/onboarding/FirstPracticePreviewScreen';
import { OnboardingSpeakPlusScreen } from '../screens/onboarding/OnboardingSpeakPlusScreen';
import { colors } from '../theme';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export function OnboardingNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
        gestureEnabled: true,
      }}
    >
      <Stack.Screen name="OnboardingWelcome" component={OnboardingWelcomeScreen} />
      <Stack.Screen name="GoalSelection" component={GoalSelectionScreen} />
      <Stack.Screen name="LevelSelection" component={LevelSelectionScreen} />
      <Stack.Screen name="DailyPracticeSelection" component={DailyPracticeSelectionScreen} />
      <Stack.Screen name="SpeakingPrioritySelection" component={SpeakingPrioritySelectionScreen} />
      <Stack.Screen name="FirstPracticePreview" component={FirstPracticePreviewScreen} />
      <Stack.Screen
        name="OnboardingSpeakPlus"
        component={OnboardingSpeakPlusScreen}
        options={{ animation: 'slide_from_bottom', gestureEnabled: true }}
      />
    </Stack.Navigator>
  );
}
