import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * RevenueCat SpeakPlus configuration.
 *
 * Entitlement (all stores): speakplus
 *
 * App Store product IDs (configure in App Store Connect + RevenueCat iOS):
 *   - voira_speakplus_monthly
 *   - voira_speakplus_yearly
 *
 * Google Play product IDs (configure in Play Console + RevenueCat Android):
 *   - echospeak_speakplus_monthly
 *   - echospeak_speakplus_yearly
 *
 * The app never hardcodes product IDs or prices — it loads the current
 * RevenueCat offering’s monthly/annual packages for the active platform.
 */

export const PREMIUM_ENTITLEMENT_ID =
  process.env.EXPO_PUBLIC_PREMIUM_ENTITLEMENT_ID?.trim() || 'speakplus';

const REVENUECAT_IOS_API_KEY =
  process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY?.trim() ?? '';

const REVENUECAT_ANDROID_API_KEY =
  process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY?.trim() ?? '';

const LOG_PREFIX = '[EchoSpeak Premium]';

/**
 * Expo Go cannot use App Store / Play Billing. Calling Purchases.configure with a
 * production appl_/goog_ key throws a red LogBox error — skip configure instead.
 */
export function isRunningInExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}

export function getRevenueCatApiKey(): string {
  if (Platform.OS === 'ios') return REVENUECAT_IOS_API_KEY;
  if (Platform.OS === 'android') return REVENUECAT_ANDROID_API_KEY;
  return '';
}

export function hasRevenueCatIosKey(): boolean {
  return REVENUECAT_IOS_API_KEY.length > 0;
}

export function hasRevenueCatAndroidKey(): boolean {
  return REVENUECAT_ANDROID_API_KEY.length > 0;
}

export function isRevenueCatConfigured(): boolean {
  return getRevenueCatApiKey().length > 0;
}

/**
 * True when the native RevenueCat SDK can be configured (dev client / TestFlight /
 * store build). False in Expo Go and on web.
 */
export function isRevenueCatNativeAvailable(): boolean {
  return isPremiumNativePlatform() && !isRunningInExpoGo();
}

/**
 * Dev-only warning when the current platform’s public SDK key is missing.
 * Missing iOS key must not affect Android builds (and vice versa).
 */
export function warnIfRevenueCatKeyMissingForPlatform(): void {
  if (!__DEV__ || !isRevenueCatNativeAvailable()) return;

  if (Platform.OS === 'ios' && !hasRevenueCatIosKey()) {
    console.warn(
      `${LOG_PREFIX} EXPO_PUBLIC_REVENUECAT_IOS_API_KEY missing — iOS SpeakPlus offerings will not load. Android is unaffected.`,
    );
  }

  if (Platform.OS === 'android' && !hasRevenueCatAndroidKey()) {
    console.warn(
      `${LOG_PREFIX} EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY missing — Android SpeakPlus offerings will not load. iOS is unaffected.`,
    );
  }
}

/** iOS / Android only — web has no store. Expo Go still reports these platforms. */
export function isPremiumNativePlatform(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

export function resolveStableAppUserId(userId: string | undefined): string | undefined {
  const trimmed = userId?.trim();
  if (!trimmed || trimmed === 'local-user') return undefined;
  return trimmed;
}
