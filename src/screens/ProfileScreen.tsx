import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { TabScreenProps } from '../navigation/types';
import { ScreenContainer, AppCard, SectionHeader, AppButton } from '../components';
import { useUser } from '../context/UserContext';
import { useAuth } from '../context/AuthContext';
import { usePremium } from '../context/PremiumContext';
import { LEVEL_LABELS, GOAL_LABELS } from '../constants/options';
import { colors, spacing, typography, borderRadius } from '../theme';

const APP_VERSION = '1.0.0';

type Props = TabScreenProps<'Profile'>;

type ProfileInfoRoute = 'Support' | 'PrivacyPolicy' | 'TermsOfUse' | 'DataDeletion' | 'About';

type SettingsItem = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  route?: ProfileInfoRoute;
  comingSoon?: boolean;
  action?: 'restore';
};

const SETTINGS_ITEMS: SettingsItem[] = [
  { icon: 'notifications-outline', label: 'Bildirimler', comingSoon: true },
  { icon: 'language-outline', label: 'Dil ayarı', comingSoon: true },
  { icon: 'mail-outline', label: 'Destek', route: 'Support' },
  { icon: 'document-text-outline', label: 'Gizlilik Politikası', route: 'PrivacyPolicy' },
  { icon: 'newspaper-outline', label: 'Kullanım Şartları', route: 'TermsOfUse' },
  { icon: 'trash-outline', label: 'Veri silme bilgisi', route: 'DataDeletion' },
  { icon: 'information-circle-outline', label: 'Uygulama hakkında', route: 'About' },
  { icon: 'refresh-outline', label: 'Satın alımları geri yükle', action: 'restore' },
  { icon: 'settings-outline', label: 'Aboneliği yönet (yakında)', comingSoon: true },
];

function shortenUserId(userId: string): string {
  if (userId.length <= 12) return userId;
  return `${userId.slice(0, 8)}…${userId.slice(-4)}`;
}

export function ProfileScreen({ navigation }: Props) {
  const { profile } = useUser();
  const {
    user,
    isGuest,
    isLoadingAuth,
    isAuthAvailable,
    errorMessage,
    signInWithEmailPassword,
    signUpWithEmailPassword,
    signOut,
    clearError,
  } = useAuth();
  const { restorePurchases, isRevenueCatConfigured } = usePremium();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const isAuthFormValid = email.trim().length > 0 && password.length >= 6;
  const isSubmitting = isSigningIn || isSigningUp;

  const handleRestorePurchases = async () => {
    if (!isRevenueCatConfigured) {
      Alert.alert('RevenueCat yapılandırılmamış.');
      return;
    }

    const result = await restorePurchases();
    if (result === 'restored') {
      Alert.alert('Satın alımın geri yüklendi.');
      return;
    }
    if (result === 'not_found') {
      Alert.alert('Aktif SpeakPlus aboneliği bulunamadı.');
    }
  };

  const handleSettingsPress = (item: SettingsItem) => {
    if (item.action === 'restore') {
      void handleRestorePurchases();
      return;
    }

    if (item.route) {
      navigation.navigate(item.route);
      return;
    }

    if (item.comingSoon) {
      Alert.alert('Yakında', 'Bu özellik yakında eklenecek.');
    }
  };

  const handleSignIn = async () => {
    clearError();
    setIsSigningIn(true);
    try {
      const result = await signInWithEmailPassword(email, password);
      if (result.ok) {
        Alert.alert('Giriş yapıldı', result.successMessage ?? 'Giriş yapıldı.');
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignUp = async () => {
    clearError();
    setIsSigningUp(true);
    try {
      const result = await signUpWithEmailPassword(email, password);
      if (result.ok) {
        Alert.alert('Hesap oluşturuldu', result.successMessage ?? 'Hesabın oluşturuldu.');
      }
    } finally {
      setIsSigningUp(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Çıkış yap', 'Hesabından çıkış yapmak istediğine emin misin?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Çıkış yap',
        style: 'destructive',
        onPress: () => {
          setIsSigningOut(true);
          void (async () => {
            try {
              const ok = await signOut();
              if (!ok && errorMessage) {
                Alert.alert('Çıkış yapılamadı', errorMessage);
              }
            } finally {
              setIsSigningOut(false);
            }
          })();
        },
      },
    ]);
  };

  const displayName = user?.displayName || user?.email || profile.name;
  const avatarLetter = displayName.charAt(0).toUpperCase();

  return (
    <ScreenContainer withTabBar>
      <View style={styles.header}>
        <View style={styles.avatarRing}>
          <LinearGradient
            colors={[colors.gradientStart, colors.gradientEnd]}
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>{avatarLetter}</Text>
          </LinearGradient>
        </View>
        <Text style={typography.h1}>{displayName}</Text>
        <Text style={styles.subtitle}>
          {LEVEL_LABELS[profile.level]} • {GOAL_LABELS[profile.goal]}
        </Text>
        {!isGuest && user ? (
          <Text style={styles.accountMeta}>
            {user.email ?? 'Hesap'} • {shortenUserId(user.id)}
          </Text>
        ) : null}
      </View>

      {isGuest ? (
        <AppCard style={styles.authCard}>
          <Text style={styles.authTitle}>Hesabını oluştur</Text>
          <Text style={styles.authSubtitle}>
            Gelişimini, SpeakPlus erişimini ve ayarlarını güvenle sakla.
          </Text>

          {isLoadingAuth ? (
            <ActivityIndicator color={colors.primary} style={styles.authLoading} />
          ) : !isAuthAvailable ? (
            <Text style={styles.authUnavailable}>
              Hesap girişi şu an yapılandırılmamış. Uygulamayı misafir olarak kullanmaya devam
              edebilirsin.
            </Text>
          ) : (
            <>
              {/* Google and Apple sign-in will be added after email/password auth is stable. */}
              {/* TODO: Google sign-in will be added later with Supabase Google provider. */}
              {/* TODO: Apple sign-in will be added later for iOS/App Store compliance if Google login is enabled. */}

              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="E-posta adresin"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="emailAddress"
                style={styles.textInput}
              />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Şifren"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="password"
                style={styles.textInput}
              />
              <AppButton
                title="Giriş yap"
                onPress={() => void handleSignIn()}
                loading={isSigningIn}
                disabled={!isAuthFormValid || isSubmitting}
                style={styles.authButton}
              />
              <AppButton
                title="Hesap oluştur"
                variant="outline"
                onPress={() => void handleSignUp()}
                loading={isSigningUp}
                disabled={!isAuthFormValid || isSubmitting}
                style={styles.authButton}
              />

              {errorMessage ? <Text style={styles.authError}>{errorMessage}</Text> : null}

              <Text style={styles.guestHint}>
                İstersen uygulamayı misafir olarak kullanmaya devam edebilirsin.
              </Text>
            </>
          )}
        </AppCard>
      ) : (
        <AppCard style={styles.authCard}>
          <Text style={styles.authTitle}>Hesabın bağlı</Text>
          <Text style={styles.authSubtitle}>
            {user?.email ?? 'Giriş yapılmış hesap'} • {user ? shortenUserId(user.id) : ''}
          </Text>
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOut}
            disabled={isSigningOut}
            activeOpacity={0.7}
          >
            {isSigningOut ? (
              <ActivityIndicator color={colors.error} />
            ) : (
              <>
                <Ionicons name="log-out-outline" size={18} color={colors.error} />
                <Text style={styles.signOutText}>Çıkış yap</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dataDeletionLink}
            onPress={() => navigation.navigate('DataDeletion')}
            activeOpacity={0.7}
          >
            <Text style={styles.dataDeletionLinkText}>Veri silme bilgisi</Text>
          </TouchableOpacity>
        </AppCard>
      )}

      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => navigation.navigate('Premium')}
      >
        <LinearGradient
          colors={['#4F46E5', '#7C3AED']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.premiumBanner}
        >
          <View style={styles.premiumIconWrap}>
            <Ionicons name="diamond" size={22} color={colors.textPrimary} />
          </View>
          <View style={styles.premiumInfo}>
            <Text style={styles.premiumTitle}>SpeakPlus</Text>
            <Text style={styles.premiumSubtitle}>
              {profile.isPremium
                ? 'SpeakPlus aboneliğin aktif'
                : 'Sınırsız pratik ve tüm ders paketleri'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.8)" />
        </LinearGradient>
      </TouchableOpacity>

      <SectionHeader title="Profil bilgileri" />
      <AppCard style={styles.infoCard}>
        {[
          { label: 'Seviye', value: LEVEL_LABELS[profile.level] },
          { label: 'Hedef', value: GOAL_LABELS[profile.goal] },
          { label: 'Günlük hedef', value: `${profile.dailyPracticeMinutes} dakika` },
          { label: 'Premium', value: profile.isPremium ? 'SpeakPlus' : 'Ücretsiz' },
          { label: 'Hesap', value: isGuest ? 'Misafir' : 'Bağlı hesap' },
        ].map((item, index, arr) => (
          <View
            key={item.label}
            style={[styles.infoRow, index < arr.length - 1 && styles.infoBorder]}
          >
            <Text style={typography.meta}>{item.label}</Text>
            <Text style={styles.infoValue}>{item.value}</Text>
          </View>
        ))}
      </AppCard>

      <SectionHeader title="Ayarlar" />
      <AppCard style={styles.settingsCard}>
        {SETTINGS_ITEMS.map((item, index) => (
          <TouchableOpacity
            key={item.label}
            style={[styles.settingRow, index < SETTINGS_ITEMS.length - 1 && styles.infoBorder]}
            onPress={() => handleSettingsPress(item)}
            activeOpacity={0.7}
          >
            <View style={styles.settingIconWrap}>
              <Ionicons name={item.icon} size={20} color={colors.textSecondary} />
            </View>
            <Text style={styles.settingLabel}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        ))}
      </AppCard>

      <Text style={styles.versionText}>EchoSpeak v{APP_VERSION}</Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  avatarRing: {
    padding: 3,
    borderRadius: 44,
    borderWidth: 2,
    borderColor: 'rgba(91, 95, 239, 0.4)',
    marginBottom: spacing.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.body,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  accountMeta: {
    ...typography.caption,
    marginTop: spacing.xs,
    textAlign: 'center',
    color: colors.textMuted,
  },
  authCard: {
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  authTitle: {
    ...typography.h3,
  },
  authSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  authLoading: {
    marginVertical: spacing.sm,
  },
  authUnavailable: {
    ...typography.body,
    color: colors.textSecondary,
  },
  textInput: {
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    color: colors.textPrimary,
    backgroundColor: colors.cardElevated,
  },
  authButton: {
    marginTop: spacing.xs,
  },
  authError: {
    ...typography.caption,
    color: colors.error,
  },
  guestHint: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
  },
  signOutText: {
    ...typography.button,
    color: colors.error,
  },
  dataDeletionLink: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  dataDeletionLinkText: {
    ...typography.captionBright,
    color: colors.primary,
  },
  premiumBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  premiumIconWrap: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumInfo: {
    flex: 1,
  },
  premiumTitle: {
    ...typography.h3,
  },
  premiumSubtitle: {
    ...typography.captionBright,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  infoCard: {
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm + 4,
  },
  infoBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoValue: {
    ...typography.bodyEmphasis,
    fontWeight: '500',
  },
  settingsCard: {
    marginBottom: spacing.md,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 4,
    gap: spacing.sm,
  },
  settingIconWrap: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabel: {
    ...typography.bodyEmphasis,
    flex: 1,
    fontWeight: '400',
  },
  versionText: {
    ...typography.caption,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
});
