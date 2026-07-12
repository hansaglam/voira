import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { TabScreenProps } from '../navigation/types';
import { ScreenContainer, AppCard, SectionHeader, AppButton } from '../components';
import { PremiumDebugPanel } from '../components/PremiumDebugPanel';
import { useUser } from '../context/UserContext';
import { useAuth } from '../context/AuthContext';
import { usePremium } from '../context/PremiumContext';
import { useLearning } from '../context/LearningContext';
import { LEVEL_LABELS, GOAL_LABELS } from '../constants/options';
import { getAllPracticeResults } from '../data/learningSessionStore';
import { buildProgressSummary } from '../services/progress';
import { lessons } from '../data/lessons';
import { colors, spacing, typography, borderRadius } from '../theme';

const APP_VERSION = '1.0.5';

type Props = TabScreenProps<'Profile'>;

type ProfileInfoRoute = 'Support' | 'PrivacyPolicy' | 'TermsOfUse' | 'About';

type SettingsItem = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  route?: ProfileInfoRoute;
  comingSoon?: boolean;
};

const SETTINGS_ITEMS: SettingsItem[] = [
  { icon: 'mail-outline', label: 'Destek', route: 'Support' },
  { icon: 'document-text-outline', label: 'Gizlilik Politikası', route: 'PrivacyPolicy' },
  { icon: 'newspaper-outline', label: 'Kullanım Şartları', route: 'TermsOfUse' },
  { icon: 'information-circle-outline', label: 'Uygulama hakkında', route: 'About' },
  { icon: 'settings-outline', label: 'Aboneliği yönet' },
];

function shortenUserId(userId: string): string {
  if (userId.length <= 12) return userId;
  return `${userId.slice(0, 8)}…${userId.slice(-4)}`;
}

function formatEmailPrefix(email: string): string {
  const prefix = email.split('@')[0]?.trim() ?? '';
  if (!prefix) return 'Kullanıcı';
  return prefix.charAt(0).toUpperCase() + prefix.slice(1);
}

function resolveProfileDisplayName(
  displayName?: string,
  email?: string,
  fallbackName?: string,
): string {
  if (displayName?.trim()) return displayName.trim();
  if (email?.trim()) return formatEmailPrefix(email.trim());
  return fallbackName?.trim() || 'EchoSpeak Kullanıcısı';
}

type StatCardProps = {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
};

function StatCard({ label, value, icon }: StatCardProps) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statIconWrap}>
        <Ionicons name={icon} size={16} color={colors.secondary} />
      </View>
      <Text style={styles.statValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.statLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

type AccountRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
  showChevron?: boolean;
  loading?: boolean;
};

function AccountRow({
  icon,
  label,
  value,
  onPress,
  destructive = false,
  showChevron = false,
  loading = false,
}: AccountRowProps) {
  const content = (
    <>
      <View style={[styles.accountIconWrap, destructive && styles.accountIconWrapDestructive]}>
        <Ionicons
          name={icon}
          size={18}
          color={destructive ? colors.error : colors.textSecondary}
        />
      </View>
      <View style={styles.accountRowText}>
        <Text style={[styles.accountRowLabel, destructive && styles.accountRowLabelDestructive]}>
          {label}
        </Text>
        {value ? (
          <Text
            style={styles.accountRowValue}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {value}
          </Text>
        ) : null}
      </View>
      {loading ? (
        <ActivityIndicator size="small" color={destructive ? colors.error : colors.textMuted} />
      ) : showChevron ? (
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      ) : null}
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity style={styles.accountRow} onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={styles.accountRow}>{content}</View>;
}

export function ProfileScreen({ navigation }: Props) {
  const { profile } = useUser();
  const { learningProfile } = useLearning();
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
  const { restorePurchases, isRevenueCatConfigured, isPremium, isRestoring } = usePremium();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const isAuthFormValid = email.trim().length > 0 && password.length >= 6;
  const isSubmitting = isSigningIn || isSigningUp;

  const progressSummary = useMemo(() => {
    const results = getAllPracticeResults();
    return buildProgressSummary(learningProfile, results, lessons);
  }, [learningProfile]);

  const practiceResultCount = useMemo(() => getAllPracticeResults().length, [learningProfile]);

  const displayName = resolveProfileDisplayName(
    user?.displayName,
    user?.email,
    profile.name,
  );
  const avatarLetter = displayName.charAt(0).toUpperCase();
  const levelGoalLabel = `${LEVEL_LABELS[profile.level]} • ${GOAL_LABELS[profile.goal]}`;

  const stats = useMemo(
    () => [
      {
        label: 'Seri',
        value: progressSummary.currentStreak > 0 ? `${progressSummary.currentStreak} gün` : '0',
        icon: 'flame-outline' as const,
      },
      {
        label: 'Ortalama skor',
        value:
          progressSummary.averageNativeScore > 0
            ? `${progressSummary.averageNativeScore}`
            : learningProfile.averageScore > 0
              ? `${learningProfile.averageScore}`
              : 'Başla',
        icon: 'stats-chart-outline' as const,
      },
      {
        label: 'Tamamlanan ders',
        value: `${learningProfile.completedLessonIds.length || progressSummary.completedLessons || 0}`,
        icon: 'checkmark-circle-outline' as const,
      },
      {
        label: 'Toplam pratik',
        value:
          progressSummary.totalPracticeMinutes > 0
            ? `${progressSummary.totalPracticeMinutes} dk`
            : practiceResultCount > 0
              ? `${practiceResultCount}`
              : '0',
        icon: 'mic-outline' as const,
      },
    ],
    [learningProfile.averageScore, learningProfile.completedLessonIds.length, practiceResultCount, progressSummary],
  );

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
      Alert.alert(
        'Abonelik bulunamadı',
        'Bu Google Play hesabında abonelik bulunamadı veya mevcut uygulama hesabına bağlanamadı.',
      );
    }
  };

  const handleSettingsPress = (item: SettingsItem) => {
    if (item.label === 'Aboneliği yönet') {
      Alert.alert(
        'Aboneliği yönet',
        Platform.OS === 'android'
          ? 'Aboneliğini Google Play üzerinden yönetebilirsin.'
          : 'Aboneliğini App Store üzerinden yönetebilirsin.',
      );
      return;
    }

    if (item.route) {
      navigation.navigate(item.route);
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

  return (
    <ScreenContainer withTabBar>
      <View style={styles.hero}>
        <View style={styles.avatarOuter}>
          <View style={styles.avatarGlow} />
          <LinearGradient
            colors={[colors.gradientStart, colors.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>{avatarLetter}</Text>
          </LinearGradient>
        </View>

        <Text style={styles.displayName} numberOfLines={1} ellipsizeMode="tail">
          {displayName}
        </Text>

        <View style={styles.subtitleRow}>
          <View style={styles.subtitlePill}>
            <Ionicons name="school-outline" size={12} color={colors.secondary} />
            <Text style={styles.subtitleText} numberOfLines={1} ellipsizeMode="tail">
              {levelGoalLabel}
            </Text>
          </View>
        </View>

        {!isGuest && user?.email ? (
          <Text style={styles.emailText} numberOfLines={1} ellipsizeMode="tail">
            {user.email}
          </Text>
        ) : isGuest ? (
          <Text style={styles.emailText} numberOfLines={1} ellipsizeMode="tail">
            Misafir olarak kullanıyorsun
          </Text>
        ) : null}
      </View>

      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => navigation.navigate('Premium')}
        style={styles.premiumTouchable}
      >
        <LinearGradient
          colors={isPremium ? ['#4F46E5', '#7C3AED', '#6D28D9'] : ['#312E81', '#4338CA', '#5B21B6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.premiumCard}
        >
          <View style={styles.premiumTopRow}>
            <View style={styles.premiumIconWrap}>
              <Ionicons name="diamond" size={20} color={colors.textPrimary} />
            </View>
            {isPremium ? (
              <View style={styles.premiumActiveBadge}>
                <View style={styles.premiumActiveDot} />
                <Text style={styles.premiumActiveText}>Aktif</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.premiumTitle}>
            {isPremium ? 'SpeakPlus aktif' : "SpeakPlus'a geç"}
          </Text>
          <Text style={styles.premiumSubtitle} numberOfLines={2}>
            {isPremium
              ? 'Premium derslere ve gelişmiş geri bildirimlere erişimin var.'
              : 'Premium dersler ve gelişmiş geri bildirimleri aç.'}
          </Text>

          <View style={styles.premiumCtaRow}>
            <Text style={styles.premiumCtaText}>
              {isPremium ? 'Planı görüntüle' : 'Yükselt'}
            </Text>
            <Ionicons name="arrow-forward" size={16} color="rgba(255,255,255,0.9)" />
          </View>
        </LinearGradient>
      </TouchableOpacity>

      <PremiumDebugPanel />

      <SectionHeader title="İstatistikler" />
      <View style={styles.statsGrid}>
        {stats.map((stat) => (
          <StatCard key={stat.label} label={stat.label} value={stat.value} icon={stat.icon} />
        ))}
      </View>

      {isGuest ? (
        <>
          <SectionHeader title="Hesap" />
          <AppCard style={styles.authCard}>
            <Text style={styles.authTitle}>Hesabını oluştur</Text>
            <Text style={styles.authSubtitle}>
              Hesap oluşturarak gelişimini ve SpeakPlus erişimini güvenle sakla.
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
        </>
      ) : (
        <>
          <SectionHeader title="Hesap" />
          <AppCard style={styles.accountCard}>
            <AccountRow
              icon="mail-outline"
              label="E-posta"
              value={user?.email ?? 'Bağlı hesap'}
            />
            {user?.id ? (
              <AccountRow
                icon="finger-print-outline"
                label="Kullanıcı ID"
                value={shortenUserId(user.id)}
              />
            ) : null}
            <AccountRow
              icon="refresh-outline"
              label="Satın alımları geri yükle"
              onPress={() => void handleRestorePurchases()}
              showChevron
              loading={isRestoring}
            />
            <AccountRow
              icon="trash-outline"
              label="Veri silme bilgisi"
              onPress={() => navigation.navigate('DataDeletion')}
              showChevron
            />
            <AccountRow
              icon="log-out-outline"
              label="Çıkış yap"
              onPress={handleSignOut}
              destructive
              loading={isSigningOut}
            />
          </AppCard>
        </>
      )}

      <SectionHeader title="Ayarlar" />
      <AppCard style={styles.settingsCard}>
        {SETTINGS_ITEMS.map((item, index) => (
          <TouchableOpacity
            key={item.label}
            style={[styles.settingRow, index < SETTINGS_ITEMS.length - 1 && styles.rowBorder]}
            onPress={() => handleSettingsPress(item)}
            activeOpacity={0.7}
          >
            <View style={styles.settingIconWrap}>
              <Ionicons name={item.icon} size={18} color={colors.textSecondary} />
            </View>
            <Text style={styles.settingLabel}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        ))}
      </AppCard>

      <Text style={styles.versionText}>EchoSpeak v{APP_VERSION}</Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingTop: spacing.xs,
  },
  avatarOuter: {
    width: 76,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  avatarGlow: {
    position: 'absolute',
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.glow,
    opacity: 0.45,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.18)',
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
      },
      android: { elevation: 6 },
    }),
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  displayName: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.3,
    maxWidth: '100%',
    paddingHorizontal: spacing.sm,
    textAlign: 'center',
  },
  subtitleRow: {
    marginTop: spacing.sm,
    maxWidth: '100%',
    paddingHorizontal: spacing.xs,
  },
  subtitlePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(91, 95, 239, 0.1)',
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(91, 95, 239, 0.18)',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    maxWidth: '100%',
  },
  subtitleText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    flexShrink: 1,
  },
  emailText: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.sm,
    maxWidth: '100%',
    paddingHorizontal: spacing.md,
    textAlign: 'center',
  },
  premiumTouchable: {
    marginBottom: spacing.md,
  },
  premiumCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.28,
        shadowRadius: 14,
      },
      android: { elevation: 8 },
    }),
  },
  premiumTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  premiumIconWrap: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumActiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  premiumActiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  premiumActiveText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  premiumTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  premiumSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.82)',
    marginBottom: spacing.sm,
  },
  premiumCtaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 7,
  },
  premiumCtaText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statCard: {
    width: '48%',
    flexGrow: 1,
    flexBasis: '46%',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm + 2,
    minHeight: 88,
  },
  statIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  authCard: {
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  authTitle: {
    ...typography.h3,
    fontSize: 17,
  },
  authSubtitle: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 20,
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
    fontSize: 15,
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
    lineHeight: 18,
  },
  accountCard: {
    marginBottom: spacing.md,
    overflow: 'hidden',
    padding: 0,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    minHeight: 52,
  },
  accountIconWrap: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountIconWrapDestructive: {
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
  },
  accountRowText: {
    flex: 1,
    minWidth: 0,
  },
  accountRowLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  accountRowLabelDestructive: {
    color: colors.error,
  },
  accountRowValue: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  settingsCard: {
    marginBottom: spacing.md,
    overflow: 'hidden',
    padding: 0,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    gap: spacing.sm,
    minHeight: 48,
  },
  settingIconWrap: {
    width: 30,
    height: 30,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  versionText: {
    ...typography.caption,
    textAlign: 'center',
    marginBottom: spacing.lg,
    color: colors.textMuted,
  },
});
