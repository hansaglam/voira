import type { AuthFeatures } from './authTypes';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '';

export const AUTH_REDIRECT_SCHEME = 'echospeak';
export const AUTH_REDIRECT_PATH = 'auth/callback';
export const AUTH_MOBILE_REDIRECT_URL = 'echospeak://auth/callback';

export const GUEST_USER_ID_PREFIX = 'guest-';
export const LEGACY_LOCAL_USER_ID = 'local-user';

/** Google / Apple native sign-in — not implemented in MVP. */
export const GOOGLE_SIGN_IN_ENABLED = false;
export const APPLE_SIGN_IN_ENABLED = false;

export function getSupabaseUrl(): string {
  return SUPABASE_URL;
}

export function getSupabaseAnonKey(): string {
  return SUPABASE_ANON_KEY;
}

export function hasSupabaseUrl(): boolean {
  return SUPABASE_URL.length > 0;
}

export function hasSupabaseAnonKey(): boolean {
  return SUPABASE_ANON_KEY.length > 0;
}

/** Accepts legacy JWT anon keys and new publishable keys (sb_publishable_...). */
export function isValidSupabaseAnonKeyFormat(): boolean {
  if (!hasSupabaseAnonKey()) return false;
  return SUPABASE_ANON_KEY.startsWith('eyJ') || SUPABASE_ANON_KEY.startsWith('sb_publishable_');
}

export function isSupabaseConfigured(): boolean {
  return (
    hasSupabaseUrl() &&
    hasSupabaseAnonKey() &&
    isValidSupabaseAnonKeyFormat() &&
    getSupabaseUrl().startsWith('https://')
  );
}

export function getAuthFeatures(): AuthFeatures {
  const isConfigured = isSupabaseConfigured();
  return {
    isConfigured,
    emailPassword: isConfigured,
    emailMagicLink: false,
    googleSignIn: isConfigured && GOOGLE_SIGN_IN_ENABLED,
    appleSignIn: isConfigured && APPLE_SIGN_IN_ENABLED,
  };
}

export function resolveStableAppUserId(userId: string | undefined): string | undefined {
  const trimmed = userId?.trim();
  if (!trimmed || trimmed === LEGACY_LOCAL_USER_ID) return undefined;
  return trimmed;
}

export function isGuestUserId(userId: string | undefined): boolean {
  const trimmed = userId?.trim();
  if (!trimmed || trimmed === LEGACY_LOCAL_USER_ID) return true;
  return trimmed.startsWith(GUEST_USER_ID_PREFIX);
}
