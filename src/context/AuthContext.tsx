import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import * as Linking from 'expo-linking';
import { useLearning } from './LearningContext';
import {
  createSessionFromAuthUrl,
  getAuthFeatures,
  getCurrentAuthUser,
  getOrCreateAnonymousUserId,
  isAuthCallbackUrl,
  isAuthServiceAvailable,
  logAuthRedirectUrlForDev,
  refreshSession,
  requestAccountDeletion,
  signInWithEmailPassword,
  signOut as signOutFromSupabase,
  signUpWithEmailPassword,
  subscribeToAuthChanges,
  updateDisplayName as updateDisplayNameRequest,
  type AccountDeletionResult,
  type AuthActionResult,
  type AuthFeatures,
  type AuthUser,
} from '../services/auth';
import { isRevenueCatConfigured, logoutRevenueCatUser } from '../services/premium';
import { clearVocabularyItems } from '../storage/vocabularyStorage';

interface AuthContextType {
  user: AuthUser | null;
  isGuest: boolean;
  isLoadingAuth: boolean;
  isAuthAvailable: boolean;
  authFeatures: AuthFeatures;
  anonymousUserId: string | null;
  errorMessage: string | null;
  signInWithEmailPassword: (email: string, password: string) => Promise<AuthActionResult>;
  signUpWithEmailPassword: (email: string, password: string) => Promise<AuthActionResult>;
  updateDisplayName: (displayName: string) => Promise<AuthActionResult>;
  signOut: () => Promise<boolean>;
  deleteAccount: () => Promise<AccountDeletionResult>;
  refreshSession: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { setUserId, setName, resetLocalPracticeData } = useLearning();
  const authFeatures = useMemo(() => getAuthFeatures(), []);
  const isAuthAvailable = useMemo(() => isAuthServiceAvailable(), []);

  const [user, setUser] = useState<AuthUser | null>(null);
  const [anonymousUserId, setAnonymousUserId] = useState<string | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const applyGuestIdentity = useCallback(
    async (guestId: string) => {
      setUser(null);
      setAnonymousUserId(guestId);
      setUserId(guestId);
      setName('');
    },
    [setName, setUserId],
  );

  const applySignedInIdentity = useCallback(
    async (nextUser: AuthUser) => {
      // mapSupabaseUser already strips email-derived names.
      setUser(nextUser);
      setUserId(nextUser.id);
      if (nextUser.displayName?.trim()) {
        setName(nextUser.displayName.trim());
      }
      // Do not clear local name when metadata is briefly empty — UI also
      // ignores email-prefix local names via sanitizeDisplayName.
      if (__DEV__) {
        console.log('[EchoSpeak Auth] signed in');
      }
    },
    [setName, setUserId],
  );

  const hydrateAuth = useCallback(async () => {
    setIsLoadingAuth(true);
    setErrorMessage(null);

    try {
      const guestId = await getOrCreateAnonymousUserId();
      setAnonymousUserId(guestId);

      if (!isAuthAvailable) {
        setUser(null);
        setUserId(guestId);
        return;
      }

      const currentUser = await getCurrentAuthUser();
      if (currentUser) {
        await applySignedInIdentity(currentUser);
        return;
      }

      await applyGuestIdentity(guestId);
    } finally {
      setIsLoadingAuth(false);
    }
  }, [applyGuestIdentity, applySignedInIdentity, isAuthAvailable, setUserId]);

  useEffect(() => {
    void hydrateAuth();
  }, [hydrateAuth]);

  useEffect(() => {
    if (!isAuthAvailable) return;

    const unsubscribe = subscribeToAuthChanges((nextUser) => {
      void (async () => {
        if (nextUser) {
          await applySignedInIdentity(nextUser);
          return;
        }

        const guestId = anonymousUserId ?? (await getOrCreateAnonymousUserId());
        await applyGuestIdentity(guestId);
      })();
    });

    return () => {
      unsubscribe?.();
    };
  }, [anonymousUserId, applyGuestIdentity, applySignedInIdentity, isAuthAvailable]);

  useEffect(() => {
    if (!isAuthAvailable) return;

    logAuthRedirectUrlForDev();

    const handleAuthCallbackUrl = (url: string) => {
      if (!isAuthCallbackUrl(url)) {
        return;
      }

      if (__DEV__) {
        console.log('[EchoSpeak Auth] deep link received', url);
      }

      void (async () => {
        const result = await createSessionFromAuthUrl(url);
        if (!result.ok) {
          setErrorMessage(result.errorMessage ?? 'Giriş tamamlanamadı.');
          return;
        }

        const nextUser = (await refreshSession()) ?? (await getCurrentAuthUser());
        if (nextUser) {
          await applySignedInIdentity(nextUser);
          if (__DEV__) {
            console.log('[EchoSpeak Auth] signed in via deep link');
          }
        }
      })();
    };

    void Linking.getInitialURL().then((initialUrl) => {
      if (initialUrl) {
        handleAuthCallbackUrl(initialUrl);
      }
    });

    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleAuthCallbackUrl(url);
    });

    return () => {
      subscription.remove();
    };
  }, [applySignedInIdentity, isAuthAvailable]);

  const signInWithEmailPasswordHandler = useCallback(
    async (email: string, password: string): Promise<AuthActionResult> => {
      setErrorMessage(null);
      const result = await signInWithEmailPassword(email, password);
      if (!result.ok) {
        setErrorMessage(result.errorMessage ?? 'İşlem tamamlanamadı. Lütfen tekrar dene.');
        return result;
      }

      const nextUser = await getCurrentAuthUser();
      if (nextUser) {
        await applySignedInIdentity(nextUser);
      }

      return result;
    },
    [applySignedInIdentity],
  );

  const signUpWithEmailPasswordHandler = useCallback(
    async (email: string, password: string): Promise<AuthActionResult> => {
      setErrorMessage(null);
      const result = await signUpWithEmailPassword(email, password);
      if (!result.ok) {
        setErrorMessage(result.errorMessage ?? 'İşlem tamamlanamadı. Lütfen tekrar dene.');
        return result;
      }

      if (!result.requiresEmailConfirmation) {
        const nextUser = await getCurrentAuthUser();
        if (nextUser) {
          await applySignedInIdentity(nextUser);
        }
      }

      return result;
    },
    [applySignedInIdentity],
  );

  const signOutHandler = useCallback(async (): Promise<boolean> => {
    setErrorMessage(null);
    const result = await signOutFromSupabase();
    if (!result.ok) {
      setErrorMessage(result.errorMessage ?? 'Çıkış yapılamadı.');
      return false;
    }

    if (isRevenueCatConfigured()) {
      await logoutRevenueCatUser();
    }

    const guestId = anonymousUserId ?? (await getOrCreateAnonymousUserId());
    await applyGuestIdentity(guestId);

    if (__DEV__) {
      console.log('[EchoSpeak Auth] signed out');
    }

    return true;
  }, [anonymousUserId, applyGuestIdentity]);

  /**
   * In-app account deletion (App Store Guideline 5.1.1(v)).
   * App Review path: Profile → sign in → Hesabı Sil → confirm → success.
   */
  const deleteAccountHandler = useCallback(async (): Promise<AccountDeletionResult> => {
    setErrorMessage(null);

    const result = await requestAccountDeletion();
    if (!result.ok) {
      setErrorMessage(result.messageTr);
      return result;
    }

    try {
      await clearVocabularyItems();
    } catch {
      // Best-effort local wipe.
    }

    try {
      resetLocalPracticeData();
    } catch {
      // Best-effort local wipe.
    }

    if (isRevenueCatConfigured()) {
      try {
        await logoutRevenueCatUser();
      } catch {
        // Account is already deleted server-side; continue local cleanup.
      }
    }

    // Auth user may already be gone — ignore sign-out failures.
    try {
      await signOutFromSupabase();
    } catch {
      // continue
    }

    const guestId = anonymousUserId ?? (await getOrCreateAnonymousUserId());
    await applyGuestIdentity(guestId);

    if (__DEV__) {
      console.log('[EchoSpeak Auth] account deleted');
    }

    return { ok: true };
  }, [anonymousUserId, applyGuestIdentity, resetLocalPracticeData]);

  const refreshSessionHandler = useCallback(async () => {
    setErrorMessage(null);
    const nextUser = await refreshSession();
    if (nextUser) {
      await applySignedInIdentity(nextUser);
      return;
    }

    const guestId = anonymousUserId ?? (await getOrCreateAnonymousUserId());
    await applyGuestIdentity(guestId);
  }, [anonymousUserId, applyGuestIdentity, applySignedInIdentity]);

  const updateDisplayNameHandler = useCallback(
    async (displayName: string): Promise<AuthActionResult> => {
      setErrorMessage(null);
      const result = await updateDisplayNameRequest(displayName);
      if (!result.ok) {
        setErrorMessage(result.errorMessage ?? 'İsim güncellenemedi. Lütfen tekrar dene.');
        return result;
      }

      const trimmed = displayName.trim();
      const nextUser =
        result.user ??
        (await getCurrentAuthUser()) ??
        (user
          ? { ...user, displayName: trimmed }
          : null);

      if (nextUser) {
        // Always apply the saved name so Profile/Home update without restart,
        // even if a cached session briefly omits user_metadata.
        await applySignedInIdentity({
          ...nextUser,
          displayName: nextUser.displayName?.trim() || trimmed,
        });
      } else {
        setUser((prev) => (prev ? { ...prev, displayName: trimmed } : prev));
        setName(trimmed);
      }

      return result;
    },
    [applySignedInIdentity, setName, user],
  );

  const clearError = useCallback(() => {
    setErrorMessage(null);
  }, []);

  const value = useMemo(
    (): AuthContextType => ({
      user,
      isGuest: !user,
      isLoadingAuth,
      isAuthAvailable,
      authFeatures,
      anonymousUserId,
      errorMessage,
      signInWithEmailPassword: signInWithEmailPasswordHandler,
      signUpWithEmailPassword: signUpWithEmailPasswordHandler,
      updateDisplayName: updateDisplayNameHandler,
      signOut: signOutHandler,
      deleteAccount: deleteAccountHandler,
      refreshSession: refreshSessionHandler,
      clearError,
    }),
    [
      user,
      isLoadingAuth,
      isAuthAvailable,
      authFeatures,
      anonymousUserId,
      errorMessage,
      signInWithEmailPasswordHandler,
      signUpWithEmailPasswordHandler,
      updateDisplayNameHandler,
      signOutHandler,
      deleteAccountHandler,
      refreshSessionHandler,
      clearError,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
