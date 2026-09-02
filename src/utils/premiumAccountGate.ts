import type { RootStackParamList } from '../navigation/types';
import { showAppDialog } from '../components/dialog';
import i18n from '../i18n';

export function getAccountRequiredCopy() {
  return {
    title: i18n.t('premiumGate.accountRequiredTitle'),
    body: i18n.t('premiumGate.accountRequiredBody'),
  };
}

export function getPremiumLockedCopy() {
  return {
    title: i18n.t('premiumGate.premiumLockedTitle'),
    body: i18n.t('premiumGate.premiumLockedBody'),
  };
}

export function getRestoreRequiresSignInCopy() {
  return {
    title: i18n.t('premiumGate.restoreSignInTitle'),
    body: i18n.t('premiumGate.restoreSignInBody'),
  };
}

export function getGuestPremiumWarningCopy() {
  return {
    title: i18n.t('premiumGate.guestWarningTitle'),
    body: i18n.t('premiumGate.guestWarningBody'),
  };
}

/** @deprecated Prefer getters so language changes apply. */
export const ACCOUNT_REQUIRED_COPY = {
  get title() {
    return getAccountRequiredCopy().title;
  },
  get body() {
    return getAccountRequiredCopy().body;
  },
};

/** @deprecated Prefer getters so language changes apply. */
export const PREMIUM_LOCKED_COPY = {
  get title() {
    return getPremiumLockedCopy().title;
  },
  get body() {
    return getPremiumLockedCopy().body;
  },
};

/** @deprecated Prefer getters so language changes apply. */
export const RESTORE_REQUIRES_SIGN_IN_COPY = {
  get title() {
    return getRestoreRequiresSignInCopy().title;
  },
  get body() {
    return getRestoreRequiresSignInCopy().body;
  },
};

/** @deprecated Prefer getters so language changes apply. */
export const GUEST_PREMIUM_WARNING_COPY = {
  get title() {
    return getGuestPremiumWarningCopy().title;
  },
  get body() {
    return getGuestPremiumWarningCopy().body;
  },
};

type PremiumGateNavigation = {
  navigate: (
    ...args:
      | [screen: 'MainTabs', params: { screen: 'Profile'; params?: { focusAuth?: boolean } }]
      | [screen: keyof RootStackParamList, params?: RootStackParamList[keyof RootStackParamList]]
  ) => void;
};

export function navigateToProfileAuth(navigation: PremiumGateNavigation): void {
  navigation.navigate('MainTabs', { screen: 'Profile', params: { focusAuth: true } });
}

export function showPremiumLockedAccountAlert(
  navigation: PremiumGateNavigation,
  options?: { onDismiss?: () => void },
): void {
  const copy = getPremiumLockedCopy();
  showAppDialog({
    title: copy.title,
    message: copy.body,
    variant: 'info',
    icon: 'person-circle',
    dismissible: true,
    primaryButton: {
      id: 'sign_in',
      label: i18n.t('premiumGate.signIn'),
      variant: 'primary',
    },
    secondaryButton: {
      id: 'sign_up',
      label: i18n.t('premiumGate.createAccount'),
      variant: 'secondary',
    },
    tertiaryButton: {
      id: 'cancel',
      label: i18n.t('premiumGate.cancel'),
      variant: 'tertiary',
    },
    onAction: (id) => {
      if (id === 'sign_in' || id === 'sign_up') {
        navigateToProfileAuth(navigation);
        return;
      }
      options?.onDismiss?.();
    },
  });
}

export function showRestoreRequiresSignInAlert(navigation: PremiumGateNavigation): void {
  const copy = getRestoreRequiresSignInCopy();
  showAppDialog({
    title: copy.title,
    message: copy.body,
    variant: 'info',
    icon: 'log-in-outline',
    dismissible: true,
    primaryButton: {
      id: 'sign_in',
      label: i18n.t('premiumGate.signIn'),
      variant: 'primary',
    },
    tertiaryButton: {
      id: 'cancel',
      label: i18n.t('premiumGate.cancel'),
      variant: 'tertiary',
    },
    onAction: (id) => {
      if (id === 'sign_in') {
        navigateToProfileAuth(navigation);
      }
    },
  });
}
