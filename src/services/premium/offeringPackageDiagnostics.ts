import { Platform } from 'react-native';
import type { PurchasesOffering, PurchasesPackage } from 'react-native-purchases';
import { getRevenueCatApiKey } from './premiumConfig';
import { resolveWeeklyMonthlyYearlyPackages } from './offeringPackageResolve';

const LOG_PREFIX = '[EchoSpeak Premium]';

function packagePriceDiagnostics(pkg: PurchasesPackage) {
  return {
    packageIdentifier: pkg.identifier,
    productIdentifier: pkg.product.identifier,
    priceString: pkg.product.priceString,
    currencyCode: pkg.product.currencyCode ?? null,
  };
}

/** __DEV__ only — never logs API key values. */
export function logOfferingsDiagnostics(
  offering: PurchasesOffering | null,
  monthly: PurchasesPackage | null,
  yearly: PurchasesPackage | null,
): void {
  if (!__DEV__) return;

  const packages = offering?.availablePackages ?? [];
  const { weekly } = resolveWeeklyMonthlyYearlyPackages(offering);

  console.log(`${LOG_PREFIX} offerings diagnostics`, {
    platform: Platform.OS,
    apiKeyPresent: getRevenueCatApiKey().length > 0,
    offeringIdentifier: offering?.identifier ?? null,
    packageIdentifiers: packages.map((pkg) => pkg.identifier),
    productIdentifiers: packages.map((pkg) => pkg.product.identifier),
    packageTypes: packages.map((pkg) => pkg.packageType),
    packagePrices: packages.map((pkg) => packagePriceDiagnostics(pkg)),
    selectedWeekly: weekly ? packagePriceDiagnostics(weekly) : null,
    selectedMonthly: monthly ? packagePriceDiagnostics(monthly) : null,
    selectedYearly: yearly ? packagePriceDiagnostics(yearly) : null,
  });
}
