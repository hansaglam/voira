import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type {
  CustomerInfo,
  PurchasesOfferings,
  PurchasesOffering,
  PurchasesPackage,
} from 'react-native-purchases';
import { useLearning } from './LearningContext';
import {
  addCustomerInfoListener,
  buildPackageOptions,
  configureRevenueCat,
  fetchCustomerInfo,
  fetchOfferings,
  hasActivePremiumEntitlement,
  identifyRevenueCatUser,
  isRevenueCatConfigured,
  OFFERINGS_SAFE_ERROR_MESSAGE,
  purchaseRevenueCatPackage,
  removeCustomerInfoListener,
  resolveCurrentOffering,
  restoreRevenueCatPurchases,
  type PremiumPackageOption,
} from '../services/premium';

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
  refreshPremiumStatus: () => Promise<void>;
  refreshOfferings: () => Promise<void>;
  purchasePackage: (selectedPackage: PurchasesPackage) => Promise<boolean>;
  restorePurchases: () => Promise<'restored' | 'not_found' | 'error'>;
}

const PremiumContext = createContext<PremiumContextType | undefined>(undefined);

export function PremiumProvider({ children }: { children: ReactNode }) {
  const { learningProfile, setPremium } = useLearning();
  const revenueCatConfigured = isRevenueCatConfigured();

  const [isLoadingPremium, setIsLoadingPremium] = useState(revenueCatConfigured);
  const [isOfferingsLoading, setIsOfferingsLoading] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isRevenueCatReady, setIsRevenueCatReady] = useState(false);
  const [offerings, setOfferings] = useState<PurchasesOfferings | null>(null);
  const [currentOffering, setCurrentOffering] = useState<PurchasesOffering | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [offeringsError, setOfferingsError] = useState<string | null>(null);

  const isPremium = useMemo(
    () => hasActivePremiumEntitlement(customerInfo),
    [customerInfo],
  );

  const packageOptions = useMemo(
    () => buildPackageOptions(currentOffering),
    [currentOffering],
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
      setCustomerInfo(info);
      await refreshOfferings();
    } catch {
      setErrorMessage('Abonelik seçenekleri şu anda yüklenemedi. Lütfen tekrar dene.');
    } finally {
      setIsLoadingPremium(false);
    }
  }, [refreshOfferings, revenueCatConfigured]);

  useEffect(() => {
    if (!revenueCatConfigured) {
      setIsLoadingPremium(false);
      return;
    }

    let cancelled = false;

    void (async () => {
      const configured = await configureRevenueCat();
      if (cancelled) return;

      if (!configured) {
        setIsRevenueCatReady(false);
        setIsLoadingPremium(false);
        return;
      }

      setIsRevenueCatReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [revenueCatConfigured]);

  useEffect(() => {
    if (!revenueCatConfigured || !isRevenueCatReady) {
      return;
    }

    let cancelled = false;

    const onCustomerInfoUpdated = (info: CustomerInfo) => {
      setCustomerInfo(info);
    };

    addCustomerInfoListener(onCustomerInfoUpdated);

    void (async () => {
      const stableUserId = learningProfile.userId?.trim();
      if (stableUserId && stableUserId !== 'local-user') {
        await identifyRevenueCatUser(stableUserId);
        if (__DEV__) {
          console.log('[EchoSpeak Premium] RevenueCat identified user');
        }
      }

      if (cancelled) return;
      await refreshPremiumStatus();
    })();

    return () => {
      cancelled = true;
      removeCustomerInfoListener(onCustomerInfoUpdated);
    };
  }, [isRevenueCatReady, learningProfile.userId, refreshPremiumStatus, revenueCatConfigured]);

  const purchasePackage = useCallback(
    async (selectedPackage: PurchasesPackage): Promise<boolean> => {
      if (!isRevenueCatReady) return false;

      setIsPurchasing(true);
      setErrorMessage(null);

      try {
        const result = await purchaseRevenueCatPackage(selectedPackage);
        setCustomerInfo(result.customerInfo);
        return hasActivePremiumEntitlement(result.customerInfo);
      } catch (error) {
        if (
          typeof error === 'object' &&
          error !== null &&
          'cancelled' in error &&
          (error as { cancelled?: boolean }).cancelled
        ) {
          return false;
        }

        setErrorMessage('Satın alma tamamlanamadı. Lütfen tekrar dene.');
        return false;
      } finally {
        setIsPurchasing(false);
      }
    },
    [isRevenueCatReady],
  );

  const restorePurchases = useCallback(async (): Promise<
    'restored' | 'not_found' | 'error'
  > => {
    if (!isRevenueCatReady) return 'error';

    setIsRestoring(true);
    setErrorMessage(null);

    try {
      const result = await restoreRevenueCatPurchases();
      setCustomerInfo(result.customerInfo);
      return result.hasEntitlement ? 'restored' : 'not_found';
    } catch {
      setErrorMessage('Satın alımlar geri yüklenemedi. Lütfen tekrar dene.');
      return 'error';
    } finally {
      setIsRestoring(false);
    }
  }, [isRevenueCatReady]);

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
      refreshPremiumStatus,
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
      refreshPremiumStatus,
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
