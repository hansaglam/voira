export type RoleplayAccessTier = 'guest' | 'free' | 'premium';

export type RoleplayAccessState =
  | { allowed: true; tier: RoleplayAccessTier }
  | { allowed: false; tier: RoleplayAccessTier; reason: 'guest_limit' | 'premium_required' };

export function resolveRoleplayAccess(input: {
  isGuest: boolean;
  isPremium: boolean;
  scenarioPremium: boolean;
}): RoleplayAccessState {
  if (input.isGuest && input.scenarioPremium) {
    return { allowed: false, tier: 'guest', reason: 'premium_required' };
  }
  if (!input.isGuest && input.scenarioPremium && !input.isPremium) {
    return { allowed: false, tier: 'free', reason: 'premium_required' };
  }
  if (input.isGuest) {
    return { allowed: true, tier: 'guest' };
  }
  return { allowed: true, tier: input.isPremium ? 'premium' : 'free' };
}
