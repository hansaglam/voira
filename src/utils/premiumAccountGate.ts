import type { RootStackParamList } from '../navigation/types';
import { showAppDialog } from '../components/dialog';

export const ACCOUNT_REQUIRED_COPY = {
  title: 'SpeakPlus için hesap gerekli',
  body: 'SpeakPlus erişimini, gelişimini ve aboneliğini güvenle saklamak için önce ücretsiz bir hesap oluştur.',
} as const;

export const PREMIUM_LOCKED_COPY = {
  title: 'Hesap oluşturman gerekiyor',
  body: 'SpeakPlus derslerini satın almadan önce hesabını oluştur. Böylece aboneliğin ve gelişimin güvenle saklanır.',
} as const;

export const RESTORE_REQUIRES_SIGN_IN_COPY = {
  title: 'Önce giriş yap',
  body: 'SpeakPlus erişimini geri yüklemek için hesabına giriş yapman gerekir.',
} as const;

export const GUEST_PREMIUM_WARNING_COPY = {
  title: 'Erişimini kaybetmemek için hesap oluştur',
  body: 'SpeakPlus erişimini güvenle saklamak için hesabını oluştur veya giriş yap.',
} as const;

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
  showAppDialog({
    title: PREMIUM_LOCKED_COPY.title,
    message: PREMIUM_LOCKED_COPY.body,
    variant: 'info',
    icon: 'person-circle',
    dismissible: true,
    primaryButton: {
      id: 'sign_in',
      label: 'Giriş yap',
      variant: 'primary',
    },
    secondaryButton: {
      id: 'sign_up',
      label: 'Hesap oluştur',
      variant: 'secondary',
    },
    tertiaryButton: {
      id: 'cancel',
      label: 'Vazgeç',
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
  showAppDialog({
    title: RESTORE_REQUIRES_SIGN_IN_COPY.title,
    message: RESTORE_REQUIRES_SIGN_IN_COPY.body,
    variant: 'info',
    icon: 'log-in-outline',
    dismissible: true,
    primaryButton: {
      id: 'sign_in',
      label: 'Giriş yap',
      variant: 'primary',
    },
    tertiaryButton: {
      id: 'cancel',
      label: 'Vazgeç',
      variant: 'tertiary',
    },
    onAction: (id) => {
      if (id === 'sign_in') {
        navigateToProfileAuth(navigation);
      }
    },
  });
}
