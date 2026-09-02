/**
 * Internal paywall analytics — no external SDK.
 * Events are logged in __DEV__; production can wire to backend later.
 */

export type PaywallSource = 'onboarding' | 'home' | 'profile' | 'default';

export type PaywallPackageType = 'weekly' | 'monthly' | 'yearly';

export type PaywallAnalyticsEvent =
  | 'paywall_viewed'
  | 'paywall_plan_selected'
  | 'paywall_purchase_tapped'
  | 'paywall_purchase_success'
  | 'paywall_purchase_cancelled'
  | 'paywall_purchase_failed'
  | 'paywall_restore_tapped'
  | 'paywall_restore_success'
  | 'paywall_free_continue';

export interface PaywallAnalyticsPayload {
  source?: PaywallSource | string | null;
  packageType?: PaywallPackageType | string | null;
  restored?: boolean;
  errorCode?: string | null;
}

export function trackPaywallEvent(
  event: PaywallAnalyticsEvent,
  payload?: PaywallAnalyticsPayload,
): void {
  if (__DEV__) {
    console.log('[Voira Analytics]', event, payload ?? {});
  }
}
