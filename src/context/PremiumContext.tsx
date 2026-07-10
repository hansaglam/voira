import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';
import type {
  CustomerInfo,
  PurchasesOfferings,
  PurchasesOffering,
  PurchasesPackage,
} from 'react-native-purchases';
import { useAuth } from './AuthContext';
import { useLearning } from './LearningContext';
import {
  addCustomerInfoListener,
  buildPackageOptions,
  configureRevenueCat,
  fetchCustomerInfo,
  fetchOfferings,
  getActiveEntitlementIds,
  getHasSpeakPlus,
  getRevenueCatAppUserID,
  hasActivePremiumEntitlement,
  identifyRevenueCatUser,
  isRevenueCatConfigured,
  logPremiumIdentityState,
  OFFERINGS_SAFE_ERROR_MESSAGE,
  purchaseRevenueCatPackage,
  removeCustomerInfoListener,
  resolveCurrentOffering,
  resolveStableAppUserId,
  restoreRevenueCatPurchases,
  shortenAppUserId,
  type PremiumPackageOption,
} from '../services/premium';

export interface PremiumDebugStatus {
  revenueCatAppUserIdShort: string;
  activeEntitlements: string[];
  hasSpeakPlus: boolean;
}

interface PremiumContextType {
  isPremium: boolean;
  isLoadingPremium: boolean;
  isOfferingsLoading: boolean;
  isPurchasing: boolean;
  isRestoring: boolean;
  isRevenueCatReady: boolean;
  isRevenueCatConfigured: boolean;
  offerings: PurchasesOfferings | null;
  currentOffering: PurchasesOffering | null;
  packageOptions: PremiumPackageOption[];
  customerInfo: CustomerInfo | null;
  errorMessage: string | null;
  offeringsError: string | null;
  debugPremiumStatus: PremiumDebugStatus | null;
  refreshPremiumStatus: () => Promise<void>;
  refreshCustomerInfo: () => Promise<void>;
  refreshOfferings: () => Promise<void>;
  purchasePackage: (
    selectedPackage: PurchasesPackage,
  ) => Promise<'unlocked' | 'cancelled' | 'already_subscribed' | 'failed'>;
  restorePurchases: () => Promise<'restored' | 'not_found' | 'error'>;
}

const PremiumContext = createContext<PremiumContextType | undefined>(undefined);

export function PremiumProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { learningProfile, setPremium } = useLearning();
  const revenueCatConfigured = isRevenueCatConfigured();
  const stableUserId = useMemo(
    () => resolveStableAppUserId(learningProfile.userId),
    [learningProfile.userId],
  );
  const authUserId = user?.id ?? null;

  const [isLoadingPremium, setIsLoadingPremium] = useState(revenueCatConfigured);
  const [isOfferingsLoading, setIsOfferingsLoading] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isRevenueCatReady, setIsRevenueCatReady] = useState(false);
  const [offerings, setOfferings] = useState<PurchasesOfferings | null>(null);
  const [currentOffering, setCurrentOffering] = useState<PurchasesOffering | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [revenueCatAppUserID, setRevenueCatAppUserID] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [offeringsError, setOfferingsError] = useState<string | null>(null);

  const configuredRef = useRef(false);
  const identifiedUserRef = useRef<string | null>(null);
  const foregroundRefreshRef = useRef(false);

  const isPremium = useMemo(
    () => hasActivePremiumEntitlement(customerInfo),
    [customerInfo],
  );

  const packageOptions = useMemo(
    () => buildPackageOptions(currentOffering),
    [currentOffering],
  );

  const debugPremiumStatus = useMemo((): PremiumDebugStatus | null => {
    if (!__DEV__) return null;
    return {
      revenueCatAppUserIdShort: shortenAppUserId(revenueCatAppUserID),
      activeEntitlements: getActiveEntitlementIds(customerInfo),
      hasSpeakPlus: getHasSpeakPlus(customerInfo),
    };
  }, [customerInfo, revenueCatAppUserID]);

  const syncRevenueCatAppUserID = useCallback(async (): Promise<string | null> => {
    const appUserID = await getRevenueCatAppUserID();
    setRevenueCatAppUserID(appUserID);
    return appUserID;
  }, []);

  const applyCustomerInfo = useCallback(
    async (info: CustomerInfo | null, phase: string) => {
      if (info) {
        setCustomerInfo(info);
      }
      const rcUserId = await syncRevenueCatAppUserID();
      logPremiumIdentityState(phase, {
        revenueCatAppUserID: rcUserId,
        learningProfileUserId: learningProfile.userId,
        authUserId,
        customerInfo: info,
      });
    },
    [authUserId, learningProfile.userId, syncRevenueCatAppUserID],
  );

  useEffect(() => {
    setPremium(isPremium);
  }, [isPremium, setPremium]);

  const refreshOfferings = useCallback(async () => {
    if (!revenueCatConfigured || !isRevenueCatReady) {
      setOfferings(null);
      setCurrentOffering(null);
      setOfferingsError(null);
      setIsOfferingsLoading(false);
      return;
    }

    setIsOfferingsLoading(true);
    setOfferingsError(null);

    try {
      const { offerings: nextOfferings, errorMessage: nextOfferingsError } =
        await fetchOfferings();

      setOfferings(nextOfferings);

      if (nextOfferingsError) {
        setCurrentOffering(null);
        setOfferingsError(nextOfferingsError);
        return;
      }

      const offering = resolveCurrentOffering(nextOfferings);
      const options = buildPackageOptions(offering);

      if (!offering || options.length === 0) {
        setCurrentOffering(null);
        setOfferingsError(OFFERINGS_SAFE_ERROR_MESSAGE);
        return;
      }

      setCurrentOffering(offering);
      setOfferingsError(null);
    } finally {
      setIsOfferingsLoading(false);
    }
  }, [isRevenueCatReady, revenueCatConfigured]);

  const refreshCustomerInfo = useCallback(async () => {
    if (!revenueCatConfigured || !isRevenueCatReady) {
      return;
    }

    const info = await fetchCustomerInfo();
    await applyCustomerInfo(info, 'foreground-refresh');
  }, [applyCustomerInfo, isRevenueCatReady, revenueCatConfigured]);

  const refreshPremiumStatus = useCallback(async () => {
    if (!revenueCatConfigured) {
      setIsLoadingPremium(false);
      setIsRevenueCatReady(false);
      return;
    }

    setIsLoadingPremium(true);
    setErrorMessage(null);

    try {
      const info = await fetchCustomerInfo();
      await applyCustomerInfo(info, 'app-start-sync');
      await refreshOfferings();
    } catch {
      setErrorMessage('Abonelik seçenekleri şu anda yüklenemedi. Lütfen tekrar dene.');
    } finally {
      setIsLoadingPremium(false);
    }
  }, [applyCustomerInfo, refreshOfferings, revenueCatConfigured]);

  const syncEntitlementForUser = useCallback(
    async (nextUserId: string, phase: string) => {
      const loginInfo = await identifyRevenueCatUser(nextUserId);
      const latestInfo = (await fetchCustomerInfo()) ?? loginInfo;
      await applyCustomerInfo(latestInfo, phase);
      return latestInfo;
    },
    [applyCustomerInfo],
  );

  useEffect(() => {
    if (!revenueCatConfigured) {
      setIsLoadingPremium(false);
      return;
    }

    if (!stableUserId || configuredRef.current) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const configured = await configureRevenueCat(stableUserId);
      if (cancelled) return;

      if (!configured) {
        setIsRevenueCatReady(false);
        setIsLoadingPremium(false);
        return;
      }

      configuredRef.current = true;
      identifiedUserRef.current = stableUserId;
      setIsRevenueCatReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [revenueCatConfigured, stableUserId]);

  useEffect(() => {
    if (!revenueCatConfigured || !isRevenueCatReady || !stableUserId) {
      return;
    }

    if (identifiedUserRef.current === stableUserId) {
      return;
    }

    let cancelled = false;

    void (async () => {
      await syncEntitlementForUser(stableUserId, 'auth-identity-sync');
      if (cancelled) return;
      identifiedUserRef.current = stableUserId;
    })();

    return () => {
      cancelled = true;
    };
  }, [isRevenueCatReady, revenueCatConfigured, stableUserId, syncEntitlementForUser]);

  useEffect(() => {
    if (!revenueCatConfigured || !isRevenueCatReady) {
      return;
    }

    let cancelled = false;

    const onCustomerInfoUpdated = (info: CustomerInfo) => {
      void applyCustomerInfo(info, 'customer-info-listener');
    };

    addCustomerInfoListener(onCustomerInfoUpdated);

    void (async () => {
      if (cancelled) return;
      await refreshPremiumStatus();
    })();

    return () => {
      cancelled = true;
      removeCustomerInfoListener(onCustomerInfoUpdated);
    };
  }, [applyCustomerInfo, isRevenueCatReady, refreshPremiumStatus, revenueCatConfigured]);

  useEffect(() => {
    if (!revenueCatConfigured || !isRevenueCatReady) {
      return;
    }

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active' || foregroundRefreshRef.current) {
        return;
      }

      foregroundRefreshRef.current = true;
      void (async () => {
        try {
          await refreshCustomerInfo();
        } finally {
          foregroundRefreshRef.current = false;
        }
      })();
    });

    return () => {
      subscription.remove();
    };
  }, [isRevenueCatReady, refreshCustomerInfo, revenueCatConfigured]);

  const purchasePackage = useCallback(
    async (
      selectedPackage: PurchasesPackage,
    ): Promise<'unlocked' | 'cancelled' | 'already_subscribed' | 'failed'> => {
      if (!isRevenueCatReady) return 'failed';

      setIsPurchasing(true);
      setErrorMessage(null);

      try {
        const result = await purchaseRevenueCatPackage(selectedPackage);
        await applyCustomerInfo(result.customerInfo, 'purchasePackage-context');
        return hasActivePremiumEntitlement(result.customerInfo) ? 'unlocked' : 'failed';
      } catch (error) {
        if (
          typeof error === 'object' &&
          error !== null &&
          'cancelled' in error &&
          (error as { cancelled?: boolean }).cancelled
        ) {
          return 'cancelled';
        }

        if (
          typeof error === 'object' &&
          error !== null &&
          'alreadySubscribed' in error &&
          (error as { alreadySubscribed?: boolean }).alreadySubscribed
        ) {
          return 'already_subscribed';
        }

        setErrorMessage('Satın alma tamamlanamadı. Lütfen tekrar dene.');
        return 'failed';
      } finally {
        setIsPurchasing(false);
      }
    },
    [applyCustomerInfo, isRevenueCatReady],
  );

  const restorePurchases = useCallback(async (): Promise<
    'restored' | 'not_found' | 'error'
  > => {
    if (!isRevenueCatReady) return 'error';

    setIsRestoring(true);
    setErrorMessage(null);

    try {
      await restoreRevenueCatPurchases();
      const latestInfo = await fetchCustomerInfo();
      await applyCustomerInfo(latestInfo, 'restorePurchases-context');
      return hasActivePremiumEntitlement(latestInfo) ? 'restored' : 'not_found';
    } catch {
      setErrorMessage('Satın alımlar geri yüklenemedi. Lütfen tekrar dene.');
      return 'error';
    } finally {
      setIsRestoring(false);
    }
  }, [applyCustomerInfo, isRevenueCatReady]);

  const value = useMemo(
    (): PremiumContextType => ({
      isPremium,
      isLoadingPremium,
      isOfferingsLoading,
      isPurchasing,
      isRestoring,
      isRevenueCatReady,
      isRevenueCatConfigured: revenueCatConfigured,
      offerings,
      currentOffering,
      packageOptions,
      customerInfo,
      errorMessage,
      offeringsError,
      debugPremiumStatus,
      refreshPremiumStatus,
      refreshCustomerInfo,
      refreshOfferings,
      purchasePackage,
      restorePurchases,
    }),
    [
      isPremium,
      isLoadingPremium,
      isOfferingsLoading,
      isPurchasing,
      isRestoring,
      isRevenueCatReady,
      revenueCatConfigured,
      offerings,
      currentOffering,
      packageOptions,
      customerInfo,
      errorMessage,
      offeringsError,
      debugPremiumStatus,
      refreshPremiumStatus,
      refreshCustomerInfo,
      refreshOfferings,
      purchasePackage,
      restorePurchases,
    ],
  );

  return <PremiumContext.Provider value={value}>{children}</PremiumContext.Provider>;
}

export function usePremium() {
  const context = useContext(PremiumContext);
  if (!context) {
    throw new Error('usePremium must be used within PremiumProvider');
  }
  return context;
}
