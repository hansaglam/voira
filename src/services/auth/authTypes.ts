export interface AuthUser {
  id: string;
  email?: string;
  displayName?: string;
  provider?: string;
  createdAt?: string;
}

export interface AuthState {
  user: AuthUser | null;
  isGuest: boolean;
  isLoadingAuth: boolean;
  errorMessage?: string;
}

export interface AuthActionResult {
  ok: boolean;
  errorMessage?: string;
  successMessage?: string;
  requiresEmailConfirmation?: boolean;
  /** Present after successful mutations that return a fresh auth user. */
  user?: AuthUser;
}

export interface AuthFeatures {
  isConfigured: boolean;
  emailPassword: boolean;
  /** @deprecated Magic link retained in service only — not used in Profile UI. */
  emailMagicLink: boolean;
  googleSignIn: boolean;
  appleSignIn: boolean;
}
