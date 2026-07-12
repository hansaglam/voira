import type { AuthUser } from '../services/auth/authTypes';

/** True when the user has a real Supabase email/password (or equivalent) account. */
export function isRegisteredUser(user: AuthUser | null | undefined): boolean {
  return Boolean(user?.id && user.email?.trim());
}

export function isGuestUser(user: AuthUser | null | undefined): boolean {
  return !isRegisteredUser(user);
}
