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
  'SpeakPlus paketleri şu anda yüklenemedi. Mağaza ürünleri henüz yapılandırılmamış olabilir.';

export interface FetchOfferingsResult {
  offerings: PurchasesOfferings | null;
  errorMessage: string | null;
}
