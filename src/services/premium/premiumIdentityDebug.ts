import type { CustomerInfo } from 'react-native-purchases';
import { PREMIUM_ENTITLEMENT_ID } from './premiumConfig';

export function shortenAppUserId(userId: string | null | undefined): string {
  if (!userId) return '—';
  if (userId.length <= 14) return userId;
  return `${userId.slice(0, 10)}…${userId.slice(-4)}`;
}

export function getActiveEntitlementIds(customerInfo: CustomerInfo | null | undefined): string[] {
  return Object.keys(customerInfo?.entitlements?.active ?? {});
}

export function getHasSpeakPlus(customerInfo: CustomerInfo | null | undefined): boolean {
  return Boolean(customerInfo?.entitlements?.active?.[PREMIUM_ENTITLEMENT_ID]);
}

export function logPremiumIdentityState(
  phase: string,
  params: {
    revenueCatAppUserID?: string | null;
    learningProfileUserId?: string | null;
    authUserId?: string | null;
    customerInfo?: CustomerInfo | null;
  },
): void {
  if (!__DEV__) return;

  console.log('[EchoSpeak Premium] identity state', {
    phase,
    revenueCatAppUserID: params.revenueCatAppUserID ?? null,
    learningProfileUserId: params.learningProfileUserId ?? null,
    authUserId: params.authUserId ?? null,
    activeEntitlements: getActiveEntitlementIds(params.customerInfo),
    hasSpeakPlus: getHasSpeakPlus(params.customerInfo),
  });
}
