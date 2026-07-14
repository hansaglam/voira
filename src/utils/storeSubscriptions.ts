import { Platform } from 'react-native';
import { openExternalLink } from './openExternalLink';

export const IOS_SUBSCRIPTIONS_URL = 'https://apps.apple.com/account/subscriptions';
export const ANDROID_SUBSCRIPTIONS_URL =
  'https://play.google.com/store/account/subscriptions';

/** Store subscription management page for the current platform. */
export function getManageSubscriptionsUrl(): string {
  return Platform.OS === 'ios' ? IOS_SUBSCRIPTIONS_URL : ANDROID_SUBSCRIPTIONS_URL;
}

export function openManageSubscriptions(): Promise<void> {
  return openExternalLink(getManageSubscriptionsUrl());
}

/** Short label for user-facing restore / billing messages. */
export function getStoreAccountLabel(): string {
  return Platform.OS === 'ios' ? 'App Store' : 'Google Play';
}
