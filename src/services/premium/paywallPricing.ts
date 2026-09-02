import type { PurchasesPackage } from 'react-native-purchases';
import type { PremiumPackagePeriod } from './premiumTypes';

/** Minimal RevenueCat intro price shape — read defensively at runtime. */
export interface IntroPriceLike {
  price: number;
  priceString?: string;
  period: string;
  periodUnit: string;
  cycles?: number;
}

export interface ProductPriceSnapshot {
  price: number;
  currencyCode: string;
  priceString: string;
}

export interface FreeTrialInfo {
  hasFreeTrial: boolean;
  trialDays: number | null;
}

export function readProductPriceSnapshot(
  product: PurchasesPackage['product'],
): ProductPriceSnapshot | null {
  const price = typeof product.price === 'number' ? product.price : Number(product.price);
  const currencyCode = product.currencyCode?.trim();
  if (!currencyCode || !Number.isFinite(price)) {
    return null;
  }
  return {
    price,
    currencyCode,
    priceString: product.priceString,
  };
}

export function readIntroPrice(product: PurchasesPackage['product']): IntroPriceLike | null {
  const intro = (product as { introPrice?: IntroPriceLike | null }).introPrice;
  if (!intro || typeof intro.price !== 'number') {
    return null;
  }
  return intro;
}

/**
 * Free trial only when intro price is zero (store-configured introductory offer).
 */
export function detectFreeTrial(product: PurchasesPackage['product']): FreeTrialInfo {
  const intro = readIntroPrice(product);
  if (!intro || intro.price !== 0) {
    return { hasFreeTrial: false, trialDays: null };
  }

  const period = Number(intro.period);
  if (!Number.isFinite(period) || period <= 0) {
    return { hasFreeTrial: false, trialDays: null };
  }

  const unit = intro.periodUnit?.toUpperCase() ?? '';
  if (unit === 'DAY') {
    return { hasFreeTrial: true, trialDays: Math.round(period) };
  }
  if (unit === 'WEEK') {
    return { hasFreeTrial: true, trialDays: Math.round(period * 7) };
  }

  return { hasFreeTrial: false, trialDays: null };
}

/**
 * Annual savings vs 12× monthly — only when currency matches and values are valid.
 */
export function calculateAnnualSavingsPercent(
  monthly: ProductPriceSnapshot | null,
  annual: ProductPriceSnapshot | null,
): number | null {
  if (!monthly || !annual) return null;
  if (monthly.currencyCode !== annual.currencyCode) return null;
  if (monthly.price <= 0 || annual.price <= 0) return null;

  const yearlyFromMonthly = monthly.price * 12;
  const ratio = 1 - annual.price / yearlyFromMonthly;
  if (!Number.isFinite(ratio) || ratio <= 0) return null;

  return Math.round(ratio * 100);
}

/**
 * Annual / 12 — formatted with Intl when currency code is known.
 */
export function formatMonthlyEquivalentPrice(
  annual: ProductPriceSnapshot | null,
  locale?: string,
): string | null {
  if (!annual || annual.price <= 0) return null;
  const monthlyAmount = annual.price / 12;
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: annual.currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(monthlyAmount);
  } catch {
    return null;
  }
}

const PERIOD_SORT_ORDER: Record<PremiumPackagePeriod, number> = {
  weekly: 0,
  monthly: 1,
  yearly: 2,
};

export function sortPackagesByPeriod<T extends { period: PremiumPackagePeriod }>(
  options: T[],
): T[] {
  return [...options].sort(
    (a, b) => PERIOD_SORT_ORDER[a.period] - PERIOD_SORT_ORDER[b.period],
  );
}

export function selectDefaultPackagePeriod(
  options: { period: PremiumPackagePeriod }[],
): PremiumPackagePeriod | null {
  if (options.length === 0) return null;
  if (options.some((o) => o.period === 'yearly')) return 'yearly';
  if (options.some((o) => o.period === 'monthly')) return 'monthly';
  return options[0]?.period ?? null;
}

export function selectDefaultPackage<T extends { period: PremiumPackagePeriod; package: PurchasesPackage }>(
  options: T[],
): PurchasesPackage | null {
  const period = selectDefaultPackagePeriod(options);
  if (!period) return null;
  return options.find((o) => o.period === period)?.package ?? options[0]?.package ?? null;
}
