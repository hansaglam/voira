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

export type PremiumPackagePeriod = 'monthly' | 'yearly';

export interface PremiumPackageOption {
  period: PremiumPackagePeriod;
  labelTr: string;
  package: PurchasesPackage;
  priceString: string;
  subscriptionPeriodLabel: string;
}

export const OFFERINGS_SAFE_ERROR_MESSAGE =
  'SpeakPlus seçenekleri şu anda alınamıyor. Lütfen bağlantını kontrol edip tekrar dene.';

export interface FetchOfferingsResult {
  offerings: PurchasesOfferings | null;
  errorMessage: string | null;
}
