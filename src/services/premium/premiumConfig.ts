import { Platform } from 'react-native';

export const PREMIUM_ENTITLEMENT_ID =
  process.env.EXPO_PUBLIC_PREMIUM_ENTITLEMENT_ID?.trim() || 'speakplus';

const REVENUECAT_IOS_API_KEY =
  process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY?.trim() ?? '';

const REVENUECAT_ANDROID_API_KEY =
  process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY?.trim() ?? '';

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

/** RevenueCat requires a native dev build — Expo Go does not support real purchases. */
export function isPremiumNativePlatform(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

export function resolveStableAppUserId(userId: string | undefined): string | undefined {
  const trimmed = userId?.trim();
  if (!trimmed || trimmed === 'local-user') return undefined;
  return trimmed;
}
