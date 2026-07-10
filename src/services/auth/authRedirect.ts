import * as Linking from 'expo-linking';
import { AUTH_REDIRECT_PATH } from './authConfig';

/** Redirect URL sent to Supabase — uses app scheme in dev builds, exp:// in Expo Go. */
export function getAuthRedirectUrl(): string {
  return Linking.createURL(AUTH_REDIRECT_PATH);
}

export function isAuthCallbackUrl(url: string): boolean {
  const normalized = url.toLowerCase();
  return (
    normalized.includes(AUTH_REDIRECT_PATH) ||
    normalized.includes('access_token=') ||
    normalized.includes('refresh_token=') ||
    normalized.includes('code=') ||
    normalized.includes('token_hash=')
  );
}
