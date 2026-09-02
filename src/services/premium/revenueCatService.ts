import Purchases, {
  LOG_LEVEL,
  type CustomerInfo,
  type PurchasesPackage,
} from 'react-native-purchases';
import {
  getRevenueCatApiKey,
  isRevenueCatConfigured,
  isRevenueCatNativeAvailable,
  isRunningInExpoGo,
  resolveStableAppUserId,
  warnIfRevenueCatKeyMissingForPlatform,
} from './premiumConfig';
import { hasActivePremiumEntitlement } from './premiumEntitlementService';
import {
  buildPackageOptions,
  resolveCurrentOffering,
  resolveMonthlyAndYearlyPackages,
} from './offeringPackageResolve';
import { logOfferingsDiagnostics } from './offeringPackageDiagnostics';
import type {
  PremiumPurchaseResult,
  PremiumRestoreResult,
  FetchOfferingsResult,
} from './premiumTypes';
import { OFFERINGS_SAFE_ERROR_MESSAGE } from './premiumTypes';
import { logPremiumIdentityState } from './premiumIdentityDebug';

const LOG_PREFIX = '[EchoSpeak Premium]';

function getPurchasesErrorDetails(error: unknown): { code?: string; message?: string } {
  if (typeof error === 'object' && error !== null) {
    return {
      code: 'code' in error ? String((error as { code?: unknown }).code) : undefined,
      message: 'message' in error ? String((error as { message?: unknown }).message) : undefined,
    };
  }

  return { message: String(error) };
}

function isUserCancelledPurchase(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'userCancelled' in error &&
    Boolean((error as { userCancelled?: boolean }).userCancelled)
  );
}

export function isAlreadySubscribedPurchaseError(error: unknown): boolean {
  const { code, message } = getPurchasesErrorDetails(error);
  const normalized = (message ?? '').toLowerCase();

  return (
    code === '6' ||
    code === 'PRODUCT_ALREADY_PURCHASED_ERROR' ||
    normalized.includes('already subscribed') ||
    normalized.includes('subscription already exists') ||
    normalized.includes('already own') ||
    normalized.includes('item already owned') ||
    normalized.includes('already purchased')
  );
}

export async function configureRevenueCat(appUserId?: string): Promise<boolean> {
  warnIfRevenueCatKeyMissingForPlatform();

  if (!isRevenueCatConfigured() || !isRevenueCatNativeAvailable()) {
    if (__DEV__) {
      console.log(
        `${LOG_PREFIX} RevenueCat skipped`,
        isRunningInExpoGo()
          ? '(Expo Go — use a development/TestFlight build for purchases)'
          : '(not available on this platform)',
      );
    }
    return false;
  }

  try {
    if (__DEV__) {
      Purchases.setLogLevel(LOG_LEVEL.WARN);
    }

    const apiKey = getRevenueCatApiKey();
    const stableUserId = resolveStableAppUserId(appUserId);

    if (stableUserId) {
      await Purchases.configure({ apiKey, appUserID: stableUserId });
    } else {
      await Purchases.configure({ apiKey });
    }

    if (__DEV__) {
      const appUserID = await getRevenueCatAppUserID();
      logPremiumIdentityState('configure', {
        revenueCatAppUserID: appUserID,
        learningProfileUserId: stableUserId ?? null,
      });
    }

    return true;
  } catch (error) {
    if (__DEV__) {
      const details = getPurchasesErrorDetails(error);
      console.warn(`${LOG_PREFIX} configure failed`, details.message ?? 'unknown');
    }
    return false;
  }
}

export async function getRevenueCatAppUserID(): Promise<string | null> {
  if (!isRevenueCatConfigured()) return null;

  try {
    const appUserID = await Purchases.getAppUserID();
    if (__DEV__) {
      console.log(`${LOG_PREFIX} app user id fetched`);
    }
    return appUserID;
  } catch {
    if (__DEV__) {
      console.warn(`${LOG_PREFIX} getAppUserID failed`);
    }
    return null;
  }
}

export async function logoutRevenueCatUser(): Promise<CustomerInfo | null> {
  if (!isRevenueCatConfigured()) return null;

  try {
    await Purchases.logOut();
    const customerInfo = await fetchCustomerInfo();
    if (__DEV__) {
      const appUserID = await getRevenueCatAppUserID();
      logPremiumIdentityState('logOut', {
        revenueCatAppUserID: appUserID,
        customerInfo,
      });
    }
    return customerInfo;
  } catch {
    if (__DEV__) {
      console.warn(`${LOG_PREFIX} logOut failed`);
    }
    return null;
  }
}

export async function identifyRevenueCatUser(
  appUserId: string,
): Promise<CustomerInfo | null> {
  const stableUserId = resolveStableAppUserId(appUserId);
  if (!stableUserId || !isRevenueCatConfigured()) return null;

  try {
    const { customerInfo } = await Purchases.logIn(stableUserId);
    const latestInfo = (await fetchCustomerInfo()) ?? customerInfo;
    if (__DEV__) {
      const appUserID = await getRevenueCatAppUserID();
      logPremiumIdentityState('logIn', {
        revenueCatAppUserID: appUserID,
        learningProfileUserId: stableUserId,
        customerInfo: latestInfo,
      });
    }
    return latestInfo;
  } catch {
    if (__DEV__) {
      console.warn(`${LOG_PREFIX} logIn failed`);
    }
    return null;
  }
}

export async function fetchCustomerInfo(): Promise<CustomerInfo | null> {
  if (!isRevenueCatConfigured()) return null;

  try {
    const customerInfo = await Purchases.getCustomerInfo();
    if (__DEV__) {
      const appUserID = await getRevenueCatAppUserID();
      logPremiumIdentityState('getCustomerInfo', {
        revenueCatAppUserID: appUserID,
        customerInfo,
      });
    }
    return customerInfo;
  } catch {
    if (__DEV__) {
      console.warn(`${LOG_PREFIX} getCustomerInfo failed`);
    }
    return null;
  }
}

export async function fetchOfferings(): Promise<FetchOfferingsResult> {
  if (!isRevenueCatConfigured()) {
    if (__DEV__) {
      console.warn(`${LOG_PREFIX} fetchOfferings skipped — API key missing for platform`);
    }
    return { offerings: null, errorMessage: OFFERINGS_SAFE_ERROR_MESSAGE };
  }

  try {
    const offerings = await Purchases.getOfferings();
    const currentOffering = resolveCurrentOffering(offerings);
    const { monthly, yearly } = resolveMonthlyAndYearlyPackages(currentOffering);
    const packageOptions = buildPackageOptions(currentOffering);

    logOfferingsDiagnostics(currentOffering, monthly, yearly);

    if (__DEV__) {
      console.log(`${LOG_PREFIX} offerings fetched`, {
        hasCurrentShortcut: Boolean(offerings.current),
        resolvedOfferingId: currentOffering?.identifier ?? null,
        packageCount: packageOptions.length,
        hasMonthly: Boolean(monthly),
        hasYearly: Boolean(yearly),
      });
    }

    if (!currentOffering || packageOptions.length === 0) {
      return { offerings, errorMessage: OFFERINGS_SAFE_ERROR_MESSAGE };
    }

    return { offerings, errorMessage: null };
  } catch (error) {
    const details = getPurchasesErrorDetails(error);
    if (__DEV__) {
      console.warn(`${LOG_PREFIX} getOfferings failed`, details);
    }
    return { offerings: null, errorMessage: OFFERINGS_SAFE_ERROR_MESSAGE };
  }
}

export async function purchaseRevenueCatPackage(
  selectedPackage: PurchasesPackage,
): Promise<PremiumPurchaseResult> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(selectedPackage);
    if (__DEV__) {
      const appUserID = await getRevenueCatAppUserID();
      logPremiumIdentityState('purchasePackage', {
        revenueCatAppUserID: appUserID,
        customerInfo,
      });
    }
    return { customerInfo, cancelled: false };
  } catch (error) {
    if (isUserCancelledPurchase(error)) {
      throw Object.assign(new Error('purchase_cancelled'), { cancelled: true });
    }
    if (isAlreadySubscribedPurchaseError(error)) {
      throw Object.assign(new Error('already_subscribed'), { alreadySubscribed: true });
    }
    throw error;
  }
}

export async function restoreRevenueCatPurchases(): Promise<PremiumRestoreResult> {
  await Purchases.restorePurchases();
  const customerInfo = await Purchases.getCustomerInfo();
  if (__DEV__) {
    const appUserID = await getRevenueCatAppUserID();
    logPremiumIdentityState('restorePurchases', {
      revenueCatAppUserID: appUserID,
      customerInfo,
    });
  }
  return {
    customerInfo,
    hasEntitlement: hasActivePremiumEntitlement(customerInfo),
  };
}

export function addCustomerInfoListener(
  listener: (info: CustomerInfo) => void,
): (info: CustomerInfo) => void {
  Purchases.addCustomerInfoUpdateListener(listener);
  return listener;
}

export function removeCustomerInfoListener(listener: (info: CustomerInfo) => void): void {
  Purchases.removeCustomerInfoUpdateListener(listener);
}
