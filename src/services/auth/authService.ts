import type { Session, User } from '@supabase/supabase-js';
import {
  AUTH_MOBILE_REDIRECT_URL,
  getAuthFeatures,
  hasSupabaseAnonKey,
  hasSupabaseUrl,
  isSupabaseConfigured,
} from './authConfig';
import { isAuthCallbackUrl } from './authRedirect';
import type { AuthActionResult, AuthUser } from './authTypes';
import { getSupabaseClient } from './supabaseClient';

const LOG_PREFIX = '[EchoSpeak Auth]';

function mapSupabaseUser(user: User): AuthUser {
  const metadata = user.user_metadata as Record<string, unknown> | undefined;
  const displayName =
    (typeof metadata?.full_name === 'string' && metadata.full_name) ||
    (typeof metadata?.name === 'string' && metadata.name) ||
    undefined;

  return {
    id: user.id,
    email: user.email ?? undefined,
    displayName,
    provider: user.app_metadata?.provider ?? undefined,
    createdAt: user.created_at ?? undefined,
  };
}

function parseAuthParamsFromUrl(url: string): Record<string, string> {
  const hashIndex = url.indexOf('#');
  const queryIndex = url.indexOf('?');
  const paramString =
    hashIndex >= 0
      ? url.slice(hashIndex + 1)
      : queryIndex >= 0
        ? url.slice(queryIndex + 1)
        : '';

  if (!paramString) return {};

  const params = new URLSearchParams(paramString);
  const result: Record<string, string> = {};
  params.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

export async function getCurrentSession(): Promise<Session | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  const { data, error } = await client.auth.getSession();
  if (error) {
    if (__DEV__) {
      console.warn(`${LOG_PREFIX} getSession failed`);
    }
    return null;
  }

  return data.session;
}

export async function getCurrentAuthUser(): Promise<AuthUser | null> {
  const session = await getCurrentSession();
  if (!session?.user) return null;
  return mapSupabaseUser(session.user);
}

export async function createSessionFromAuthUrl(url: string): Promise<AuthActionResult> {
  if (!isAuthCallbackUrl(url)) {
    return { ok: false, errorMessage: 'Geçersiz giriş bağlantısı.' };
  }

  const client = getSupabaseClient();
  if (!client) {
    return { ok: false, errorMessage: 'Kimlik doğrulama şu an kullanılamıyor.' };
  }

  if (__DEV__) {
    console.log(`${LOG_PREFIX} processing auth callback`);
  }

  const params = parseAuthParamsFromUrl(url);
  const accessToken = params.access_token;
  const refreshToken = params.refresh_token;

  if (accessToken && refreshToken) {
    const { error } = await client.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error) {
      if (__DEV__) {
        console.warn(`${LOG_PREFIX} setSession failed`);
      }
      return { ok: false, errorMessage: 'Giriş bağlantısı doğrulanamadı.' };
    }

    if (__DEV__) {
      console.log(`${LOG_PREFIX} session established from tokens`);
    }
    return { ok: true };
  }

  const code = params.code;
  if (code) {
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (error) {
      if (__DEV__) {
        console.warn(`${LOG_PREFIX} exchangeCodeForSession failed`);
      }
      return { ok: false, errorMessage: 'Giriş bağlantısı doğrulanamadı.' };
    }

    if (__DEV__) {
      console.log(`${LOG_PREFIX} session established from code`);
    }
    return { ok: true };
  }

  const tokenHash = params.token_hash;
  const type = params.type;
  if (tokenHash && type) {
    const { error } = await client.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as 'magiclink' | 'email',
    });

    if (error) {
      if (__DEV__) {
        console.warn(`${LOG_PREFIX} verifyOtp failed`);
      }
      return { ok: false, errorMessage: 'Giriş bağlantısı doğrulanamadı.' };
    }

    if (__DEV__) {
      console.log(`${LOG_PREFIX} session established from token_hash`);
    }
    return { ok: true };
  }

  return { ok: false, errorMessage: 'Geçersiz giriş bağlantısı.' };
}

function mapMagicLinkErrorMessage(error: { message?: string }): string {
  const message = (error.message ?? '').toLowerCase();

  if (message.includes('redirect')) {
    return 'Giriş yönlendirme adresi kabul edilmedi.';
  }

  if (message.includes('rate') || message.includes('limit')) {
    return 'Çok fazla deneme yapıldı. Biraz sonra tekrar dene.';
  }

  if (message.includes('email')) {
    return 'E-posta adresini kontrol edip tekrar dene.';
  }

  return 'Giriş bağlantısı gönderilemedi. Lütfen tekrar dene.';
}

function logMagicLinkAuthConfig(redirectTo: string): void {
  if (!__DEV__) return;

  console.log(`${LOG_PREFIX} auth config`, {
    isSupabaseConfigured: isSupabaseConfigured(),
    hasSupabaseUrl: hasSupabaseUrl(),
    hasSupabaseAnonKey: hasSupabaseAnonKey(),
    redirectTo,
  });
}

function mapAuthErrorMessage(error: {
  message?: string;
  code?: string;
  status?: number;
}): string {
  const message = (error.message ?? '').toLowerCase();
  const code = (error.code ?? '').toLowerCase();

  if (
    code.includes('over_email_send_rate_limit') ||
    message.includes('rate limit') ||
    error.status === 429
  ) {
    return 'Çok fazla deneme yapıldı. Birkaç dakika sonra tekrar dene.';
  }

  if (
    code === 'invalid_credentials' ||
    message.includes('invalid login') ||
    message.includes('invalid credentials') ||
    message.includes('wrong password')
  ) {
    return 'E-posta veya şifre hatalı.';
  }

  if (
    code === 'user_already_exists' ||
    message.includes('already registered') ||
    message.includes('already exists') ||
    message.includes('user already registered')
  ) {
    return 'Bu e-posta ile zaten bir hesap var. Giriş yapmayı dene.';
  }

  return 'İşlem tamamlanamadı. Lütfen tekrar dene.';
}

function validateEmailPasswordInput(
  email: string,
  password: string,
): AuthActionResult | null {
  const trimmedEmail = email.trim().toLowerCase();
  if (!trimmedEmail || !trimmedEmail.includes('@')) {
    return { ok: false, errorMessage: 'Geçerli bir e-posta adresi gir.' };
  }

  if (!password) {
    return { ok: false, errorMessage: 'Şifre gerekli.' };
  }

  if (password.length < 6) {
    return { ok: false, errorMessage: 'Şifre en az 6 karakter olmalı.' };
  }

  return null;
}

function logAuthError(event: string, error: { message?: string; code?: string; status?: number }): void {
  if (!__DEV__) return;
  console.warn(`${LOG_PREFIX} ${event}`, {
    message: error.message,
    code: 'code' in error ? error.code : undefined,
    status: 'status' in error ? error.status : undefined,
  });
}

export async function signInWithEmailPassword(
  email: string,
  password: string,
): Promise<AuthActionResult> {
  const validationError = validateEmailPasswordInput(email, password);
  if (validationError) return validationError;

  const client = getSupabaseClient();
  if (!client) {
    return { ok: false, errorMessage: 'Kimlik doğrulama şu an kullanılamıyor.' };
  }

  const { error } = await client.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) {
    logAuthError('sign in failed', error);
    return { ok: false, errorMessage: mapAuthErrorMessage(error) };
  }

  if (__DEV__) {
    console.log(`${LOG_PREFIX} signed in with email/password`);
  }

  return { ok: true, successMessage: 'Giriş yapıldı.' };
}

export async function signUpWithEmailPassword(
  email: string,
  password: string,
): Promise<AuthActionResult> {
  const validationError = validateEmailPasswordInput(email, password);
  if (validationError) return validationError;

  const client = getSupabaseClient();
  if (!client) {
    return { ok: false, errorMessage: 'Kimlik doğrulama şu an kullanılamıyor.' };
  }

  const { data, error } = await client.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) {
    logAuthError('sign up failed', error);
    return { ok: false, errorMessage: mapAuthErrorMessage(error) };
  }

  if (data.session?.user) {
    if (__DEV__) {
      console.log(`${LOG_PREFIX} signed up with immediate session`);
    }
    return { ok: true, successMessage: 'Hesabın oluşturuldu.' };
  }

  if (data.user) {
    return {
      ok: true,
      requiresEmailConfirmation: true,
      successMessage:
        'Hesabın oluşturuldu. E-postanı onayladıktan sonra giriş yapabilirsin.',
    };
  }

  return {
    ok: true,
    successMessage:
      'Hesabın oluşturuldu. Giriş yapmadan önce e-postanı onaylaman gerekebilir.',
  };
}

/** Optional — not used by Profile UI. Kept for future magic link support. */
export async function signInWithEmailMagicLink(email: string): Promise<AuthActionResult> {
  const trimmedEmail = email.trim().toLowerCase();
  if (!trimmedEmail || !trimmedEmail.includes('@')) {
    return { ok: false, errorMessage: 'Geçerli bir e-posta adresi gir.' };
  }

  const client = getSupabaseClient();
  if (!client) {
    return { ok: false, errorMessage: 'Kimlik doğrulama şu an kullanılamıyor.' };
  }

  const redirectTo = AUTH_MOBILE_REDIRECT_URL;

  logMagicLinkAuthConfig(redirectTo);

  if (__DEV__) {
    console.log(`${LOG_PREFIX} emailRedirectTo`, redirectTo);
  }

  const { error } = await client.auth.signInWithOtp({
    email: trimmedEmail,
    options: {
      emailRedirectTo: redirectTo,
    },
  });

  if (error) {
    if (__DEV__) {
      console.warn(`${LOG_PREFIX} magic link failed`, {
        message: error.message,
        name: error.name,
        status: 'status' in error ? (error as { status?: number }).status : undefined,
        code: 'code' in error ? (error as { code?: string }).code : undefined,
      });
    }
    return { ok: false, errorMessage: mapMagicLinkErrorMessage(error) };
  }

  return { ok: true };
}

/** TODO: Google sign-in will be added later with Supabase Google provider. */
export async function signInWithGoogle(): Promise<AuthActionResult> {
  if (!getAuthFeatures().googleSignIn) {
    return { ok: false, errorMessage: 'Google ile giriş yakında eklenecek.' };
  }
  return { ok: false, errorMessage: 'Google ile giriş henüz hazır değil.' };
}

/** TODO: Apple sign-in will be added later for iOS/App Store compliance if Google login is enabled. */
export async function signInWithApple(): Promise<AuthActionResult> {
  if (!getAuthFeatures().appleSignIn) {
    return { ok: false, errorMessage: 'Apple ile giriş yakında eklenecek.' };
  }
  return { ok: false, errorMessage: 'Apple ile giriş henüz hazır değil.' };
}

export async function signOut(): Promise<AuthActionResult> {
  const client = getSupabaseClient();
  if (!client) {
    return { ok: true };
  }

  const { error } = await client.auth.signOut();
  if (error) {
    if (__DEV__) {
      console.warn(`${LOG_PREFIX} signOut failed`);
    }
    return { ok: false, errorMessage: 'Çıkış yapılamadı. Lütfen tekrar dene.' };
  }

  if (__DEV__) {
    console.log(`${LOG_PREFIX} signed out`);
  }

  return { ok: true };
}

export async function refreshSession(): Promise<AuthUser | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  const { data, error } = await client.auth.refreshSession();
  if (error || !data.session?.user) {
    return null;
  }

  return mapSupabaseUser(data.session.user);
}

export function subscribeToAuthChanges(
  listener: (user: AuthUser | null) => void,
): (() => void) | null {
  const client = getSupabaseClient();
  if (!client) return null;

  const { data } = client.auth.onAuthStateChange((_event, session) => {
    listener(session?.user ? mapSupabaseUser(session.user) : null);
  });

  return () => {
    data.subscription.unsubscribe();
  };
}

export function isAuthServiceAvailable(): boolean {
  return isSupabaseConfigured();
}

/** Dev helper — log the redirect URL Supabase must allowlist. */
export function logAuthRedirectUrlForDev(): void {
  if (!__DEV__) return;
  console.log(`${LOG_PREFIX} emailRedirectTo`, AUTH_MOBILE_REDIRECT_URL);
}
