import { Alert } from 'react-native';
import type { RootStackParamList } from '../navigation/types';

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
  Alert.alert(PREMIUM_LOCKED_COPY.title, PREMIUM_LOCKED_COPY.body, [
    {
      text: 'Vazgeç',
      style: 'cancel',
      onPress: options?.onDismiss,
    },
    {
      text: 'Giriş yap',
      onPress: () => navigateToProfileAuth(navigation),
    },
    {
      text: 'Hesap oluştur',
      onPress: () => navigateToProfileAuth(navigation),
    },
  ]);
}

export function showRestoreRequiresSignInAlert(navigation: PremiumGateNavigation): void {
  Alert.alert(RESTORE_REQUIRES_SIGN_IN_COPY.title, RESTORE_REQUIRES_SIGN_IN_COPY.body, [
    { text: 'Vazgeç', style: 'cancel' },
    {
      text: 'Giriş yap',
      onPress: () => navigateToProfileAuth(navigation),
    },
  ]);
}
