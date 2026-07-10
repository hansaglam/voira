import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from './types';
import { OnboardingWelcomeScreen } from '../screens/onboarding/OnboardingWelcomeScreen';
import { GoalSelectionScreen } from '../screens/onboarding/GoalSelectionScreen';
import { FirstPracticePreviewScreen } from '../screens/onboarding/FirstPracticePreviewScreen';
import { colors } from '../theme';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export function OnboardingNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="OnboardingWelcome" component={OnboardingWelcomeScreen} />
      <Stack.Screen name="GoalSelection" component={GoalSelectionScreen} />
      <Stack.Screen name="FirstPracticePreview" component={FirstPracticePreviewScreen} />
    </Stack.Navigator>
  );
}
