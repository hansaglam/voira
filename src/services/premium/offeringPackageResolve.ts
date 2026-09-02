import type {
  PurchasesOffering,
  PurchasesOfferings,
  PurchasesPackage,
} from 'react-native-purchases';
import {
  calculateAnnualSavingsPercent,
  detectFreeTrial,
  formatMonthlyEquivalentPrice,
  readProductPriceSnapshot,
  sortPackagesByPeriod,
} from './paywallPricing';
import type { PremiumPackageOption, PremiumPackagePeriod } from './premiumTypes';

/** Mirrors react-native-purchases PACKAGE_TYPE without importing the native module in Node tests. */
const RC_PACKAGE_TYPE = {
  ANNUAL: 2,
  MONTHLY: 6,
  WEEKLY: 7,
} as const;

function normalizeId(value: string | undefined | null): string {
  return (value ?? '').trim().toLowerCase();
}

function packageTypeMatches(pkg: PurchasesPackage, expected: number): boolean {
  return Number(pkg.packageType) === expected;
}

export function isWeeklyPackage(pkg: PurchasesPackage): boolean {
  const packageId = normalizeId(pkg.identifier);
  const productId = normalizeId(pkg.product?.identifier);

  if (packageTypeMatches(pkg, RC_PACKAGE_TYPE.WEEKLY)) return true;
  if (packageId === '$rc_weekly' || packageId === 'weekly') return true;
  if (packageId.includes('weekly')) return true;
  if (productId.includes('speakplus_weekly') || productId.includes('weekly')) return true;
  return false;
}

export function isMonthlyPackage(pkg: PurchasesPackage): boolean {
  const packageId = normalizeId(pkg.identifier);
  const productId = normalizeId(pkg.product?.identifier);

  if (isWeeklyPackage(pkg)) return false;
  if (packageTypeMatches(pkg, RC_PACKAGE_TYPE.MONTHLY)) return true;
  if (packageId === '$rc_monthly' || packageId === 'monthly') return true;
  if (packageId.includes('monthly')) return true;
  if (productId.includes('speakplus_monthly') || productId.includes('monthly')) return true;
  return false;
}

export function isYearlyPackage(pkg: PurchasesPackage): boolean {
  const packageId = normalizeId(pkg.identifier);
  const productId = normalizeId(pkg.product?.identifier);

  if (packageTypeMatches(pkg, RC_PACKAGE_TYPE.ANNUAL)) return true;
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

export function resolvePackagePeriod(pkg: PurchasesPackage): PremiumPackagePeriod | null {
  if (isWeeklyPackage(pkg)) return 'weekly';
  if (isYearlyPackage(pkg)) return 'yearly';
  if (isMonthlyPackage(pkg)) return 'monthly';
  if (packageTypeMatches(pkg, RC_PACKAGE_TYPE.ANNUAL)) return 'yearly';
  if (packageTypeMatches(pkg, RC_PACKAGE_TYPE.MONTHLY)) return 'monthly';
  if (packageTypeMatches(pkg, RC_PACKAGE_TYPE.WEEKLY)) return 'weekly';
  return null;
}

export function findWeeklyPackage(packages: PurchasesPackage[]): PurchasesPackage | null {
  return packages.find((pkg) => isWeeklyPackage(pkg)) ?? null;
}

export function findMonthlyPackage(packages: PurchasesPackage[]): PurchasesPackage | null {
  return packages.find((pkg) => isMonthlyPackage(pkg)) ?? null;
}

export function findYearlyPackage(packages: PurchasesPackage[]): PurchasesPackage | null {
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

function toOption(
  pkg: PurchasesPackage,
  period: PremiumPackagePeriod,
  extras?: {
    savingsPercent?: number | null;
    monthlyEquivalentPriceString?: string | null;
  },
): PremiumPackageOption {
  const priceSnapshot = readProductPriceSnapshot(pkg.product);
  const trial = detectFreeTrial(pkg.product);

  return {
    period,
    package: pkg,
    priceString: pkg.product.priceString,
    currencyCode: priceSnapshot?.currencyCode ?? pkg.product.currencyCode ?? null,
    price: priceSnapshot?.price ?? null,
    hasFreeTrial: trial.hasFreeTrial,
    freeTrialDays: trial.trialDays,
    savingsPercent: extras?.savingsPercent ?? null,
    monthlyEquivalentPriceString: extras?.monthlyEquivalentPriceString ?? null,
  };
}

export function resolveWeeklyMonthlyYearlyPackages(offering: PurchasesOffering | null): {
  weekly: PurchasesPackage | null;
  monthly: PurchasesPackage | null;
  yearly: PurchasesPackage | null;
} {
  if (!offering) {
    return { weekly: null, monthly: null, yearly: null };
  }

  const packages = offering.availablePackages ?? [];

  const weeklyFromShortcut =
    offering.weekly && isWeeklyPackage(offering.weekly) ? offering.weekly : null;
  const monthlyFromShortcut =
    offering.monthly && isMonthlyPackage(offering.monthly) ? offering.monthly : null;
  const yearlyFromShortcut =
    offering.annual && isYearlyPackage(offering.annual) ? offering.annual : null;

  const weekly = weeklyFromShortcut ?? findWeeklyPackage(packages);
  const monthly = monthlyFromShortcut ?? findMonthlyPackage(packages);
  let yearly = yearlyFromShortcut ?? findYearlyPackage(packages);

  const usedIds = new Set(
    [weekly, monthly].filter(Boolean).map((pkg) => pkg!.identifier),
  );
  if (yearly && usedIds.has(yearly.identifier)) {
    yearly =
      packages.find(
        (pkg) => !usedIds.has(pkg.identifier) && isYearlyPackage(pkg),
      ) ?? null;
  }

  return { weekly, monthly, yearly };
}

/** @deprecated use resolveWeeklyMonthlyYearlyPackages */
export function resolveMonthlyAndYearlyPackages(offering: PurchasesOffering | null): {
  monthly: PurchasesPackage | null;
  yearly: PurchasesPackage | null;
} {
  const { monthly, yearly } = resolveWeeklyMonthlyYearlyPackages(offering);
  return { monthly, yearly };
}

export function buildPackageOptions(
  offering: PurchasesOffering | null,
): PremiumPackageOption[] {
  if (!offering) return [];

  const { weekly, monthly, yearly } = resolveWeeklyMonthlyYearlyPackages(offering);
  const monthlySnapshot = monthly ? readProductPriceSnapshot(monthly.product) : null;
  const yearlySnapshot = yearly ? readProductPriceSnapshot(yearly.product) : null;
  const savingsPercent = calculateAnnualSavingsPercent(monthlySnapshot, yearlySnapshot);
  const monthlyEquivalentPriceString = formatMonthlyEquivalentPrice(yearlySnapshot);

  const options: PremiumPackageOption[] = [];

  if (weekly) {
    options.push(toOption(weekly, 'weekly'));
  }
  if (monthly) {
    options.push(toOption(monthly, 'monthly'));
  }
  if (yearly) {
    options.push(
      toOption(yearly, 'yearly', {
        savingsPercent,
        monthlyEquivalentPriceString,
      }),
    );
  }

  if (options.length > 0) {
    return sortPackagesByPeriod(options);
  }

  const packages = offering.availablePackages ?? [];
  const fallback = packages
    .map((pkg) => {
      const period = resolvePackagePeriod(pkg);
      return period ? toOption(pkg, period) : null;
    })
    .filter((item): item is PremiumPackageOption => item != null);

  return sortPackagesByPeriod(fallback);
}
