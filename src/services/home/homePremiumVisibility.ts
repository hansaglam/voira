/**
 * Home SpeakPlus teaser visibility — avoids showing upsell immediately after onboarding paywall.
 */

export interface HomePremiumTeaserInput {
  isPremium: boolean;
  /** Count of completed pronunciation-backed practice results. */
  analyzedPracticeCount: number;
}

export function shouldShowHomePremiumTeaser(input: HomePremiumTeaserInput): boolean {
  if (input.isPremium) return false;
  return input.analyzedPracticeCount > 0;
}
