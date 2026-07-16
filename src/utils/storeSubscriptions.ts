import { openExternalLink } from './openExternalLink';
import {
  getBillingStoreName,
  getManageSubscriptionsUrl as getPlatformManageSubscriptionsUrl,
} from './billingCopy';

/** Store subscription management page for the current platform. */
export function getManageSubscriptionsUrl(): string {
  return getPlatformManageSubscriptionsUrl();
}

export function openManageSubscriptions(): Promise<void> {
  return openExternalLink(getManageSubscriptionsUrl());
}

/** Short label for user-facing restore / billing messages. */
export function getStoreAccountLabel(): string {
  return getBillingStoreName();
}

export { getBillingStoreName } from './billingCopy';
