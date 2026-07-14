import { Platform } from 'react-native';
import {
  PACKAGE_TYPE,
  type PurchasesOffering,
  type PurchasesOfferings,
  type PurchasesPackage,
} from 'react-native-purchases';
import { getRevenueCatApiKey } from './premiumConfig';
import type { PremiumPackageOption, PremiumPackagePeriod } from './premiumTypes';

const LOG_PREFIX = '[EchoSpeak Premium]';

function normalizeId(value: string | undefined | null): string {
  return (value ?? '').trim().toLowerCase();
}

export function isMonthlyPackage(pkg: PurchasesPackage): boolean {
  const packageId = normalizeId(pkg.identifier);
  const productId = normalizeId(pkg.product?.identifier);

  if (pkg.packageType === PACKAGE_TYPE.MONTHLY) return true;
  if (packageId === '$rc_monthly' || packageId === 'monthly') return true;
  if (packageId.includes('monthly')) return true;
  if (productId.includes('speakplus_monthly') || productId.includes('monthly')) return true;
  return false;
}

export function isYearlyPackage(pkg: PurchasesPackage): boolean {
  const packageId = normalizeId(pkg.identifier);
  const productId = normalizeId(pkg.product?.identifier);

  if (pkg.packageType === PACKAGE_TYPE.ANNUAL) return true;
  if (
    packageId === '$rc_annual' ||
    packageId === 'annual' ||
    packageId === 'yearly'
  ) {
    return true;
  }
  if (packageId.includes('yearly') || packageId.includes('annual')) return true;
  if (
    productId.includes('speakplus_yearly') ||
    productId.includes('yearly') ||
    productId.includes('annual')
  ) {
    return true;
  }
  return false;
}

export function findMonthlyPackage(
  packages: PurchasesPackage[],
): PurchasesPackage | null {
  return packages.find((pkg) => isMonthlyPackage(pkg)) ?? null;
}

export function findYearlyPackage(
  packages: PurchasesPackage[],
): PurchasesPackage | null {
  return packages.find((pkg) => isYearlyPackage(pkg)) ?? null;
}

/**
 * Prefer RevenueCat current offering; fall back to "default", then first available.
 */
export function resolveCurrentOffering(
  offerings: PurchasesOfferings | null,
): PurchasesOffering | null {
  if (!offerings) return null;
  if (offerings.current) return offerings.current;

  const all = offerings.all ?? {};
  if (all.default) return all.default;

  const first = Object.values(all)[0];
  return first ?? null;
}

function subscriptionPeriodLabelTr(period: PremiumPackagePeriod): string {
  return period === 'yearly' ? 'Yıllık abonelik' : 'Aylık abonelik';
}

function toOption(
  pkg: PurchasesPackage,
  period: PremiumPackagePeriod,
): PremiumPackageOption {
  return {
    period,
    labelTr: period === 'yearly' ? 'Yıllık' : 'Aylık',
    package: pkg,
    priceString: pkg.product.priceString,
    subscriptionPeriodLabel: subscriptionPeriodLabelTr(period),
  };
}

export function resolveMonthlyAndYearlyPackages(offering: PurchasesOffering | null): {
  monthly: PurchasesPackage | null;
  yearly: PurchasesPackage | null;
} {
  if (!offering) {
    return { monthly: null, yearly: null };
  }

  const packages = offering.availablePackages ?? [];

  const monthlyFromShortcut =
    offering.monthly && isMonthlyPackage(offering.monthly) ? offering.monthly : null;
  const yearlyFromShortcut =
    offering.annual && isYearlyPackage(offering.annual) ? offering.annual : null;

  const monthly = monthlyFromShortcut ?? findMonthlyPackage(packages);
  let yearly = yearlyFromShortcut ?? findYearlyPackage(packages);

  // Avoid using the same package for both periods.
  if (monthly && yearly && monthly.identifier === yearly.identifier) {
    yearly =
      packages.find(
        (pkg) => pkg.identifier !== monthly.identifier && isYearlyPackage(pkg),
      ) ?? null;
  }

  return { monthly, yearly };
}

export function buildPackageOptions(
  offering: PurchasesOffering | null,
): PremiumPackageOption[] {
  if (!offering) return [];

  const { monthly, yearly } = resolveMonthlyAndYearlyPackages(offering);
  const options: PremiumPackageOption[] = [];

  if (monthly) {
    options.push(toOption(monthly, 'monthly'));
  }
  if (yearly) {
    options.push(toOption(yearly, 'yearly'));
  }

  if (options.length > 0) {
    return options;
  }

  // Last resort: unknown custom packages that did not match helpers.
  const packages = offering.availablePackages ?? [];
  return packages.map((pkg) => {
    const period: PremiumPackagePeriod =
      pkg.packageType === PACKAGE_TYPE.ANNUAL || isYearlyPackage(pkg)
        ? 'yearly'
        : 'monthly';
    return toOption(pkg, period);
  });
}

/** __DEV__ only — never logs API key values. */
export function logOfferingsDiagnostics(
  offering: PurchasesOffering | null,
  monthly: PurchasesPackage | null,
  yearly: PurchasesPackage | null,
): void {
  if (!__DEV__) return;

  const packages = offering?.availablePackages ?? [];

  console.log(`${LOG_PREFIX} offerings diagnostics`, {
    platform: Platform.OS,
    apiKeyPresent: getRevenueCatApiKey().length > 0,
    offeringIdentifier: offering?.identifier ?? null,
    packageIdentifiers: packages.map((pkg) => pkg.identifier),
    productIdentifiers: packages.map((pkg) => pkg.product.identifier),
    packageTypes: packages.map((pkg) => pkg.packageType),
    selectedMonthly: monthly
      ? {
          packageIdentifier: monthly.identifier,
          productIdentifier: monthly.product.identifier,
        }
      : null,
    selectedYearly: yearly
      ? {
          packageIdentifier: yearly.identifier,
          productIdentifier: yearly.product.identifier,
        }
      : null,
  });
}
