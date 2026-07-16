import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { LogBox } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { UserProvider } from './src/context/UserContext';
import { AuthProvider } from './src/context/AuthContext';
import { LearningProvider } from './src/context/LearningContext';
import { PremiumProvider } from './src/context/PremiumContext';
import { DialogProvider } from './src/components/dialog';
import { RootNavigator } from './src/navigation/RootNavigator';
import { navigationRef } from './src/navigation/navigationRef';
import { colors } from './src/theme';
import {
  getAllLessons,
  initializeContentRepository,
} from './src/services/contentRepository';
import { printContentQualitySummary, validateCatalog } from './src/services/contentQuality';
import { initializeServicesConfig } from './src/config/servicesConfig';
import { logMobileCatalogSummary } from './src/utils/catalogDiagnostics';

const EchoSpeakTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.card,
    text: colors.textPrimary,
    border: colors.border,
  },
};

if (__DEV__) {
  LogBox.ignoreLogs([
    'Error fetching offerings',
    'There is an issue with your configuration',
    'no store products registered in the RevenueCat dashboard',
  ]);

  void getAllLessons().then((publishedLessons) => {
    const report = validateCatalog(publishedLessons);
    console.log('[EchoSpeak Content Quality]', report);
    printContentQualitySummary(report);
  });

  logMobileCatalogSummary();
}

export default function App() {
  useEffect(() => {
    void initializeContentRepository();
    void initializeServicesConfig();
  }, []);

  return (
    <SafeAreaProvider>
      <DialogProvider>
        <LearningProvider>
          <AuthProvider>
            <PremiumProvider>
              <UserProvider>
                <NavigationContainer
                  ref={navigationRef}
                  theme={EchoSpeakTheme}
                  onReady={() => {
                    if (__DEV__) {
                      console.log('[Navigation] ready');
                    }
                  }}
                >
                  <StatusBar style="light" />
                  <RootNavigator />
                </NavigationContainer>
              </UserProvider>
            </PremiumProvider>
          </AuthProvider>
        </LearningProvider>
      </DialogProvider>
    </SafeAreaProvider>
  );
}
