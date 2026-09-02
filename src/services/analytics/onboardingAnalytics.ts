type AnalyticsPayload = Record<string, string | number | boolean | null | undefined>;

export type OnboardingAnalyticsEvent =
  | 'onboarding_started'
  | 'onboarding_goal_selected'
  | 'onboarding_level_selected'
  | 'onboarding_daily_minutes_selected'
  | 'onboarding_priorities_selected'
  | 'onboarding_plan_created'
  | 'onboarding_plan_viewed'
  | 'onboarding_paywall_viewed'
  | 'onboarding_paywall_subscribe_tapped'
  | 'onboarding_paywall_free_continue'
  | 'onboarding_paywall_purchase_success'
  | 'onboarding_completed'
  | 'onboarding_first_practice_started';

/**
 * Lightweight analytics abstraction — no external SDK in this phase.
 * Safe no-op in production; logs in development.
 */
export function trackOnboardingEvent(
  event: OnboardingAnalyticsEvent,
  payload: AnalyticsPayload = {},
): void {
  if (__DEV__) {
    console.log('[Voira Analytics]', event, payload);
  }
}
