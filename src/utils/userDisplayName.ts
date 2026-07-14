import type { AuthUser } from '../services/auth/authTypes';

const LEGACY_DEFAULT_NAMES = new Set(['ethem']);

export const DEFAULT_SIGNED_IN_DISPLAY_NAME = 'Voira kullanıcısı';

export function formatEmailPrefix(email: string): string {
  const prefix = email.split('@')[0]?.trim() ?? '';
  if (!prefix) return '';
  return prefix.charAt(0).toUpperCase() + prefix.slice(1);
}

/** True when a name is an email address or equals the email local-part (case-insensitive). */
export function isEmailDerivedDisplayName(
  name?: string | null,
  email?: string | null,
): boolean {
  const trimmed = name?.trim();
  if (!trimmed) return false;
  if (trimmed.includes('@')) return true;

  const prefix = email?.split('@')[0]?.trim() ?? '';
  if (!prefix) return false;
  return trimmed.toLocaleLowerCase('en-US') === prefix.toLocaleLowerCase('en-US');
}

export function sanitizeDisplayName(
  name?: string | null,
  email?: string | null,
): string | undefined {
  const trimmed = name?.trim();
  if (!trimmed) return undefined;
  if (LEGACY_DEFAULT_NAMES.has(trimmed.toLowerCase())) return undefined;
  if (isEmailDerivedDisplayName(trimmed, email)) return undefined;
  return trimmed;
}

export function validateDisplayName(
  name: string,
  email?: string | null,
): { ok: true; value: string } | { ok: false } {
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 30) {
    return { ok: false };
  }
  if (isEmailDerivedDisplayName(trimmed, email)) {
    return { ok: false };
  }
  return { ok: true, value: trimmed };
}

/**
 * Shared display-name resolution for Home and Profile.
 *
 * Priority for signed-in users:
 * 1. auth metadata display name (display_name / name) — ignoring email-derived values
 * 2. local profile name — ignoring email-derived values
 * 3. undefined → callers use "Voira kullanıcısı" / greeting without a name
 *
 * Email prefix is never shown and never treated as a saved display name.
 */
export function getUserDisplayName(options: {
  user?: AuthUser | null;
  localName?: string | null;
  isGuest?: boolean;
}): string | undefined {
  if (options.isGuest || !options.user) {
    return undefined;
  }

  const email = options.user.email;

  const fromAuth = sanitizeDisplayName(options.user.displayName, email);
  if (fromAuth) return fromAuth;

  const fromLocal = sanitizeDisplayName(options.localName, email);
  if (fromLocal) return fromLocal;

  return undefined;
}

/** Only a user-chosen saved name — empty when none (do not prefill email prefix). */
export function getEditableDisplayName(options: {
  user?: AuthUser | null;
  localName?: string | null;
  isGuest?: boolean;
}): string {
  return getUserDisplayName(options) ?? '';
}

export function getHomeGreeting(displayName?: string | null): string {
  const name = sanitizeDisplayName(displayName);
  return name ? `Merhaba, ${name}` : 'Merhaba';
}
