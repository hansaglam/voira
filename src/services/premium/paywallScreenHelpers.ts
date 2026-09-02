/**
 * Paywall screen behavior helpers — unit-testable UI rules.
 */

export function shouldShowPaywallFreeContinue(isOnboardingFlow: boolean): boolean {
  return isOnboardingFlow;
}

export function resolvePaywallCtaKey(
  isPremium: boolean,
  hasFreeTrial: boolean,
): 'ctaContinue' | 'ctaStartTrialDays' | 'ctaStart' {
  if (isPremium) return 'ctaContinue';
  if (hasFreeTrial) return 'ctaStartTrialDays';
  return 'ctaStart';
}
