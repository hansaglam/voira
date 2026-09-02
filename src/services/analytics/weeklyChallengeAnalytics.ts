import type { WeeklyChallenge } from '../weeklyChallenge';
type Payload = Record<string, string | number | boolean | null | undefined>;
export type WeeklyChallengeAnalyticsEvent = 'weekly_challenge_viewed' | 'weekly_challenge_cta_tapped' | 'weekly_challenge_completed' | 'premium_content_opened';
const completedTracked = new Set<string>();
export function trackWeeklyChallengeEvent(event: WeeklyChallengeAnalyticsEvent, payload: Payload = {}): void {
  if (__DEV__) console.log('[Voira Analytics]', event, payload);
}
export function trackWeeklyChallengeCompletedOnce(challenge: WeeklyChallenge, source: string): void {
  if (challenge.status !== 'completed' || completedTracked.has(challenge.id)) return;
  completedTracked.add(challenge.id);
  trackWeeklyChallengeEvent('weekly_challenge_completed', { challengeType: challenge.type, weekKey: challenge.weekKey, target: challenge.target, source });
}
