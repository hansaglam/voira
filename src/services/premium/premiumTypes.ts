import type {
  CustomerInfo,
  PurchasesOfferings,
  PurchasesOffering,
  PurchasesPackage,
} from 'react-native-purchases';

export type { CustomerInfo, PurchasesOfferings, PurchasesOffering, PurchasesPackage };

export interface PremiumPurchaseResult {
  customerInfo: CustomerInfo;
  cancelled: boolean;
}

export interface PremiumRestoreResult {
  customerInfo: CustomerInfo;
  hasEntitlement: boolean;
}

export type PremiumPackagePeriod = 'weekly' | 'monthly' | 'yearly';

export interface PremiumPackageOption {
  period: PremiumPackagePeriod;
  package: PurchasesPackage;
  /** Store-localized full period price — never hardcode. */
  priceString: string;
  currencyCode: string | null;
  /** Numeric store price when RevenueCat exposes it. */
  price: number | null;
  /** True only when store intro offer is a zero-price trial. */
  hasFreeTrial: boolean;
  /** Trial length in days when hasFreeTrial is true. */
  freeTrialDays: number | null;
  /** Annual savings vs 12× monthly — yearly option only. */
  savingsPercent: number | null;
  /** Annual price / 12 formatted — yearly option only. */
  monthlyEquivalentPriceString: string | null;
}

export const OFFERINGS_SAFE_ERROR_MESSAGE =
  'SpeakPlus seçenekleri şu anda alınamıyor. Lütfen bağlantını kontrol edip tekrar dene.';

export interface FetchOfferingsResult {
  offerings: PurchasesOfferings | null;
  errorMessage: string | null;
}
