/**
 * Default / web fallback billing copy.
 * Avoids naming a competing mobile store so shared bundles stay review-safe.
 * UI strings come from i18n with {{storeName}} interpolation.
 */

import i18n from '../i18n';

export function getBillingStoreName(): string {
  return 'app store';
}

export function getManageSubscriptionsUrl(): string {
  return 'https://apps.apple.com/account/subscriptions';
}

function tBilling(key: string): string {
  return i18n.t(`billing.${key}`, { storeName: getBillingStoreName() });
}

export function getManageSubscriptionText(): string {
  return tBilling('manageText');
}

export function getManageSubscriptionCancelText(): string {
  return tBilling('manageCancelText');
}

export function getPremiumCancelNote(): string {
  return tBilling('premiumCancelNote');
}

export function getAboutSpeakPlusBody(): string {
  return tBilling('aboutSpeakPlusBody');
}

export function getTermsSpeakPlusBody(): string {
  return tBilling('termsSpeakPlusBody');
}

export function getPrivacyCollectedBody(): string {
  return tBilling('privacyCollectedBody');
}

export function getPrivacyThirdPartyBody(): string {
  return tBilling('privacyThirdPartyBody');
}

export function getPrivacyPaymentsBody(): string {
  return tBilling('privacyPaymentsBody');
}

export function getPrivacyRetentionBody(): string {
  return tBilling('privacyRetentionBody');
}

export function getDataDeletionLocalResetMessage(): string {
  return tBilling('dataDeletionLocalResetMessage');
}

export function getDataDeletionSubscriptionNote(): string {
  return tBilling('dataDeletionSubscriptionNote');
}

export function getDataDeletionSpeakPlusNote(): string {
  return tBilling('dataDeletionSpeakPlusNote');
}

export function getDataDeletionMayRemainBody(): string {
  return tBilling('dataDeletionMayRemainBody');
}

/** Shown in the in-app account deletion confirmation (Guideline 5.1.1(v)). */
export function getAccountDeletionSubscriptionWarning(): string {
  return tBilling('accountDeletionSubscriptionWarning');
}

export function getAccountDeletionConfirmBody(): string {
  return tBilling('accountDeletionConfirmBody');
}
