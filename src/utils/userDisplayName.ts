import type { AuthUser } from '../services/auth/authTypes';

const LEGACY_DEFAULT_NAMES = new Set(['ethem']);

export function formatEmailPrefix(email: string): string {
  const prefix = email.split('@')[0]?.trim() ?? '';
  if (!prefix) return '';
  return prefix.charAt(0).toUpperCase() + prefix.slice(1);
}

export function sanitizeDisplayName(name?: string | null): string | undefined {
  const trimmed = name?.trim();
  if (!trimmed) return undefined;
  if (LEGACY_DEFAULT_NAMES.has(trimmed.toLowerCase())) return undefined;
  return trimmed;
}

export function validateDisplayName(name: string): { ok: true; value: string } | { ok: false } {
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 30) {
    return { ok: false };
  }
  return { ok: true, value: trimmed };
}

/**
 * Shared display-name resolution for Home and Profile.
 * Priority: local profile name → auth metadata → email prefix → undefined.
 */
export function getUserDisplayName(options: {
  user?: AuthUser | null;
  localName?: string | null;
  isGuest?: boolean;
}): string | undefined {
  if (options.isGuest || !options.user) {
    return undefined;
  }

  const fromLocal = sanitizeDisplayName(options.localName);
  if (fromLocal) return fromLocal;

  const fromAuth = sanitizeDisplayName(options.user.displayName);
  if (fromAuth) return fromAuth;

  if (options.user.email?.trim()) {
    const fromEmail = formatEmailPrefix(options.user.email.trim());
    return fromEmail || undefined;
  }

  return undefined;
}

export function getHomeGreeting(displayName?: string | null): string {
  const name = sanitizeDisplayName(displayName);
  return name ? `Merhaba, ${name}` : 'Merhaba';
}
