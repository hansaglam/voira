import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, LogBox, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { I18nextProvider } from 'react-i18next';
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
import i18n, { initI18n } from './src/i18n';

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
  const [i18nReady, setI18nReady] = useState(i18n.isInitialized);

  useEffect(() => {
    let mounted = true;
    void initI18n().then(() => {
      if (mounted) setI18nReady(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!i18nReady) return;
    void initializeContentRepository();
    void initializeServicesConfig();
  }, [i18nReady]);

  if (!i18nReady) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <I18nextProvider i18n={i18n}>
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
    </I18nextProvider>
  );
}
