import { createHash } from 'node:crypto';
import type { AnalysisRequestIdentity } from '../../middleware/analysisRequestIdentity.js';

export type RoleplayOwnerKind = 'authenticated' | 'guest';

export interface RoleplayOwnerRef {
  kind: RoleplayOwnerKind;
  /** Stable lookup key — UUID string for authenticated, hashed guest key for guests. */
  key: string;
  authUserId: string | null;
  guestOwnerKey: string | null;
}

const GUEST_KEY_PREFIX = 'g_';

/**
 * Derives a server-stable guest owner key from the canonical guest header id.
 * Raw guest id is not persisted when this hash is used.
 */
export function deriveGuestOwnerKey(guestId: string, pepper = ''): string {
  const digest = createHash('sha256')
    .update(`${pepper}|${guestId}`)
    .digest('hex');
  return `${GUEST_KEY_PREFIX}${digest}`;
}

export function resolveRoleplayOwnerRef(
  identity: AnalysisRequestIdentity,
  options?: { guestPepper?: string },
): RoleplayOwnerRef | null {
  if (identity.type === 'authenticated') {
    return {
      kind: 'authenticated',
      key: identity.userId,
      authUserId: identity.userId,
      guestOwnerKey: null,
    };
  }
  if (identity.type === 'guest') {
    const guestOwnerKey = deriveGuestOwnerKey(identity.guestId, options?.guestPepper ?? '');
    return {
      kind: 'guest',
      key: guestOwnerKey,
      authUserId: null,
      guestOwnerKey,
    };
  }
  return null;
}

export function buildRoleplayOwnerKey(identity: {
  type: 'user' | 'guest';
  id: string;
}): string {
  if (identity.type === 'user') return `authenticated:${identity.id}`;
  return deriveGuestOwnerKey(identity.id);
}

export function ownerRefMatchesSession(
  owner: RoleplayOwnerRef,
  session: { ownerKind: RoleplayOwnerKind; authUserId: string | null; guestOwnerKey: string | null },
): boolean {
  if (owner.kind !== session.ownerKind) return false;
  if (owner.kind === 'authenticated') {
    return owner.authUserId === session.authUserId;
  }
  return owner.guestOwnerKey === session.guestOwnerKey;
}
