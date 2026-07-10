import Purchases, {
  LOG_LEVEL,
  PACKAGE_TYPE,
  type CustomerInfo,
  type PurchasesOfferings,
  type PurchasesOffering,
  type PurchasesPackage,
} from 'react-native-purchases';
import {
  getRevenueCatApiKey,
  isPremiumNativePlatform,
  isRevenueCatConfigured,
  PREMIUM_ENTITLEMENT_ID,
  resolveStableAppUserId,
} from './premiumConfig';
import { hasActivePremiumEntitlement } from './premiumEntitlementService';
import type {
  PremiumPackageOption,
  PremiumPurchaseResult,
  PremiumRestoreResult,
  FetchOfferingsResult,
} from './premiumTypes';
import { OFFERINGS_SAFE_ERROR_MESSAGE } from './premiumTypes';

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
  if (!isRevenueCatConfigured() || !isPremiumNativePlatform()) {
    if (__DEV__) {
      console.log(`${LOG_PREFIX} RevenueCat not configured for this platform`);
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
      console.log(`${LOG_PREFIX} RevenueCat configured`);
    }

    return true;
  } catch (error) {
    if (__DEV__) {
      console.warn(`${LOG_PREFIX} configure failed`);
    }
    return false;
  }
}

export async function logoutRevenueCatUser(): Promise<void> {
  if (!isRevenueCatConfigured()) return;

  try {
    await Purchases.logOut();
    if (__DEV__) {
      console.log(`${LOG_PREFIX} RevenueCat logged out`);
    }
  } catch {
    if (__DEV__) {
      console.warn(`${LOG_PREFIX} logOut failed`);
    }
  }
}

export async function identifyRevenueCatUser(appUserId: string): Promise<void> {
  const stableUserId = resolveStableAppUserId(appUserId);
  if (!stableUserId || !isRevenueCatConfigured()) return;

  try {
    await Purchases.logIn(stableUserId);
    if (__DEV__) {
      console.log(`${LOG_PREFIX} RevenueCat identified user`);
    }
  } catch {
    if (__DEV__) {
      console.warn(`${LOG_PREFIX} logIn failed`);
    }
  }
}

export async function fetchCustomerInfo(): Promise<CustomerInfo | null> {
  if (!isRevenueCatConfigured()) return null;

  try {
    const customerInfo = await Purchases.getCustomerInfo();
    if (__DEV__) {
      console.log(`${LOG_PREFIX} customer info fetched`);
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
    return { offerings: null, errorMessage: OFFERINGS_SAFE_ERROR_MESSAGE };
  }

  try {
    const offerings = await Purchases.getOfferings();
    const currentOffering = resolveCurrentOffering(offerings);
    const packageCount = buildPackageOptions(currentOffering).length;

    if (__DEV__) {
      console.log(`${LOG_PREFIX} offerings fetched`, {
        hasCurrent: Boolean(offerings.current),
        packageCount,
        entitlementId: PREMIUM_ENTITLEMENT_ID,
      });
    }

    if (!currentOffering || packageCount === 0) {
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

export function resolveCurrentOffering(
  offerings: PurchasesOfferings | null,
): PurchasesOffering | null {
  return offerings?.current ?? null;
}

function subscriptionPeriodLabelTr(packageType: string): string {
  if (packageType === PACKAGE_TYPE.ANNUAL) return 'Yıllık abonelik';
  if (packageType === PACKAGE_TYPE.MONTHLY) return 'Aylık abonelik';
  if (packageType === PACKAGE_TYPE.WEEKLY) return 'Haftalık abonelik';
  return 'Abonelik';
}

function packagePeriodLabelTr(packageType: string): string {
  if (packageType === PACKAGE_TYPE.ANNUAL) return 'Yıllık';
  if (packageType === PACKAGE_TYPE.MONTHLY) return 'Aylık';
  if (packageType === PACKAGE_TYPE.WEEKLY) return 'Haftalık';
  return 'Abonelik';
}

export function buildPackageOptions(offering: PurchasesOffering | null): PremiumPackageOption[] {
  if (!offering) return [];

  const options: PremiumPackageOption[] = [];
  const monthly = offering.monthly ?? offering.availablePackages.find(
    (pkg) => pkg.packageType === PACKAGE_TYPE.MONTHLY,
  );
  const yearly = offering.annual ?? offering.availablePackages.find(
    (pkg) => pkg.packageType === PACKAGE_TYPE.ANNUAL,
  );

  if (monthly) {
    options.push({
      period: 'monthly',
      labelTr: 'Aylık',
      package: monthly,
      priceString: monthly.product.priceString,
      subscriptionPeriodLabel: subscriptionPeriodLabelTr(monthly.packageType),
    });
  }

  if (yearly) {
    options.push({
      period: 'yearly',
      labelTr: 'Yıllık',
      package: yearly,
      priceString: yearly.product.priceString,
      subscriptionPeriodLabel: subscriptionPeriodLabelTr(yearly.packageType),
    });
  }

  if (options.length === 0) {
    return offering.availablePackages.map((pkg) => ({
      period: pkg.packageType === PACKAGE_TYPE.ANNUAL ? 'yearly' : 'monthly',
      labelTr: packagePeriodLabelTr(pkg.packageType),
      package: pkg,
      priceString: pkg.product.priceString,
      subscriptionPeriodLabel: subscriptionPeriodLabelTr(pkg.packageType),
    }));
  }

  return options;
}

export async function purchaseRevenueCatPackage(
  selectedPackage: PurchasesPackage,
): Promise<PremiumPurchaseResult> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(selectedPackage);
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
  const customerInfo = await Purchases.restorePurchases();
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
