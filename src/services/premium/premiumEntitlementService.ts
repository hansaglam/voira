import type { CustomerInfo } from 'react-native-purchases';
import { PREMIUM_ENTITLEMENT_ID } from './premiumConfig';

export function hasActivePremiumEntitlement(customerInfo: CustomerInfo | null): boolean {
  if (!customerInfo) return false;
  return Boolean(customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID]);
}
