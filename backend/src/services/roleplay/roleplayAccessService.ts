import type { AnalysisRequestIdentity } from '../../middleware/analysisRequestIdentity.js';
import type { RoleplayPersonalizationContext } from '../../types/roleplay.js';

export type RoleplayAccessTier = 'guest' | 'free' | 'premium';

export type RoleplayAccessState =
  | { allowed: true; tier: RoleplayAccessTier; maxSessionsPerDay?: number }
  | { allowed: false; tier: RoleplayAccessTier; reason: 'guest_limit' | 'premium_required' };

/**
 * Product-configurable access gate — does not hardcode permanent monetization.
 * Phase 7A: guests may start limited starter scenarios; premium unlock is a future product rule.
 */
export function resolveRoleplayAccess(input: {
  identity: AnalysisRequestIdentity;
  isPremium?: boolean;
  scenarioPremium?: boolean;
}): RoleplayAccessState {
  if (input.identity.type === 'legacy') {
    return { allowed: false, tier: 'guest', reason: 'guest_limit' };
  }

  if (input.identity.type === 'authenticated') {
    if (input.scenarioPremium && !input.isPremium) {
      return { allowed: false, tier: input.isPremium ? 'premium' : 'free', reason: 'premium_required' };
    }
    return { allowed: true, tier: input.isPremium ? 'premium' : 'free' };
  }

  if (input.scenarioPremium) {
    return { allowed: false, tier: 'guest', reason: 'premium_required' };
  }

  return { allowed: true, tier: 'guest', maxSessionsPerDay: 3 };
}

export function sanitizeRoleplayPersonalization(
  input: Partial<RoleplayPersonalizationContext> | undefined,
): RoleplayPersonalizationContext {
  const allowedLevels = new Set(['beginner', 'intermediate', 'advanced', 'unsure']);
  const allowedGoals = new Set([
    'daily_conversation',
    'travel',
    'work',
    'job_interview',
    'pronunciation',
    'fluency',
  ]);
  const allowedFocus = new Set([
    'pronunciation',
    'fluency',
    'completeness',
    'prosody',
    'weak_words',
  ]);

  const level =
    input?.level && allowedLevels.has(input.level) ? input.level : 'intermediate';
  const goal =
    input?.goal && allowedGoals.has(input.goal) ? input.goal : undefined;
  const focusAreas = Array.isArray(input?.focusAreas)
    ? input.focusAreas.filter((area): area is RoleplayPersonalizationContext['focusAreas'][number] =>
        typeof area === 'string' && allowedFocus.has(area),
      )
    : [];

  return { level, goal, focusAreas: focusAreas.slice(0, 3) };
}
