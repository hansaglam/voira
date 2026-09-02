import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  ScrollView,
  Pressable,
  LayoutAnimation,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { TabScreenProps } from '../navigation/types';
import { ScreenContainer, AppCard, SectionHeader, AppButton } from '../components';
import { VoiraDialog } from '../components/dialog';
import { showAppConfirm, showAppFeedback } from '../components/dialog';
import { VoiraFeedbackModal, type VoiraFeedbackType } from '../components/VoiraFeedbackModal';
import { PremiumDebugPanel } from '../components/PremiumDebugPanel';
import { useUser } from '../context/UserContext';
import { useAuth } from '../context/AuthContext';
import { usePremium } from '../context/PremiumContext';
import { useLearning } from '../context/LearningContext';
import { useVocabulary } from '../hooks/useVocabulary';
import { tLevelLabel, tUserGoalLabel } from '../i18n/optionLabels';
import { getAllPracticeResults } from '../data/learningSessionStore';
import { buildProgressSummary } from '../services/progress';
import { lessons } from '../data/lessons';
import { colors, spacing, typography, borderRadius } from '../theme';
import {
  DATA_DELETION_URL,
  PRIVACY_POLICY_URL,
  TERMS_OF_USE_URL,
} from '../constants/legalLinks';
import { openExternalLink } from '../utils/openExternalLink';
import { getAccountDeletionConfirmBody } from '../utils/billingCopy';
import { getStoreAccountLabel, openManageSubscriptions } from '../utils/storeSubscriptions';
import {
  DEFAULT_SIGNED_IN_DISPLAY_NAME,
  getEditableDisplayName,
  getUserDisplayName,
  validateDisplayName,
} from '../utils/userDisplayName';
import {
  getUiLanguage,
  setUiLanguage,
  SUPPORTED_UI_LANGUAGES,
  type UiLanguage,
} from '../i18n';

const APP_VERSION = '1.0.12';

type Props = TabScreenProps<'Profile'>;

type ProfileInfoRoute = 'Support' | 'About' | 'Vocabulary';

type SettingsItem = {
  icon: keyof typeof Ionicons.glyphMap;
  labelKey:
    | 'settingsVocabulary'
    | 'settingsSupport'
    | 'settingsPrivacy'
    | 'settingsTerms'
    | 'settingsAbout'
    | 'settingsManageSub';
  route?: ProfileInfoRoute;
  externalUrl?: string;
  comingSoon?: boolean;
  subtitleKey?: 'settingsVocabularySub';
  manageSubscription?: boolean;
};

const SETTINGS_ITEMS: SettingsItem[] = [
  {
    icon: 'bookmark-outline',
    labelKey: 'settingsVocabulary',
    route: 'Vocabulary',
    subtitleKey: 'settingsVocabularySub',
  },
  { icon: 'mail-outline', labelKey: 'settingsSupport', route: 'Support' },
  {
    icon: 'document-text-outline',
    labelKey: 'settingsPrivacy',
    externalUrl: PRIVACY_POLICY_URL,
  },
  {
    icon: 'newspaper-outline',
    labelKey: 'settingsTerms',
    externalUrl: TERMS_OF_USE_URL,
  },
  { icon: 'information-circle-outline', labelKey: 'settingsAbout', route: 'About' },
  { icon: 'settings-outline', labelKey: 'settingsManageSub', manageSubscription: true },
];

function shortenUserId(userId: string): string {
  if (userId.length <= 12) return userId;
  return `${userId.slice(0, 8)}…${userId.slice(-4)}`;
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
            numberOfLines={2}
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
      <TouchableOpacity
        style={styles.accountRow}
        onPress={onPress}
        activeOpacity={0.7}
        disabled={loading}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={styles.accountRow}>{content}</View>;
}

export function ProfileScreen({ navigation, route }: Props) {
  const { t, i18n } = useTranslation();
  const scrollRef = useRef<ScrollView>(null);
  const authCardOffsetY = useRef(0);
  const { profile, resetOnboardingForDev } = useUser();
  const { learningProfile } = useLearning();
  const {
    user,
    isGuest,
    isLoadingAuth,
    isAuthAvailable,
    errorMessage,
    signInWithEmailPassword,
    signUpWithEmailPassword,
    updateDisplayName,
    signOut,
    deleteAccount,
    clearError,
  } = useAuth();
  const { restorePurchases, isRevenueCatConfigured, isPremium, isRestoring } = usePremium();
  const [selectedLanguage, setSelectedLanguage] = useState<UiLanguage>(getUiLanguage());
  const [isLanguagePickerVisible, setIsLanguagePickerVisible] = useState(false);

  useEffect(() => {
    const sync = (lng: string) => {
      const code = lng.split(/[-_]/)[0]?.toLowerCase();
      if (SUPPORTED_UI_LANGUAGES.includes(code as UiLanguage)) {
        setSelectedLanguage(code as UiLanguage);
      }
    };
    sync(i18n.language);
    i18n.on('languageChanged', sync);
    return () => {
      i18n.off('languageChanged', sync);
    };
  }, [i18n]);
  const { count: vocabularyCount, limit: vocabularyLimit, isPremium: isVocabPremium, refresh: refreshVocabulary } =
    useVocabulary();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isAuthCardExpanded, setIsAuthCardExpanded] = useState(false);
  const [isNameEditorVisible, setIsNameEditorVisible] = useState(false);
  const [draftDisplayName, setDraftDisplayName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState<{
    visible: boolean;
    type: VoiraFeedbackType;
    title: string;
    message: string;
    primaryText: string;
  }>({
    visible: false,
    type: 'success',
    title: '',
    message: '',
    primaryText: 'Tamam',
  });

  const showFeedback = (
    type: VoiraFeedbackType,
    title: string,
    message: string,
    primaryText = 'Tamam',
  ) => {
    setFeedbackModal({
      visible: true,
      type,
      title,
      message,
      primaryText,
    });
  };

  const closeFeedbackModal = () => {
    setFeedbackModal((prev) => ({ ...prev, visible: false }));
  };

  const isAuthFormValid = email.trim().length > 0 && password.length >= 6;
  const isSubmitting = isSigningIn || isSigningUp;

  useEffect(() => {
    if (!route.params?.focusAuth || !isGuest) return;

    setIsAuthCardExpanded(true);

    const timer = setTimeout(() => {
      scrollRef.current?.scrollTo({
        y: Math.max(authCardOffsetY.current - spacing.md, 0),
        animated: true,
      });
      navigation.setParams({ focusAuth: undefined });
    }, 350);

    return () => clearTimeout(timer);
  }, [isGuest, navigation, route.params?.focusAuth]);

  const toggleAuthCard = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsAuthCardExpanded((prev) => !prev);
  };

  const progressSummary = useMemo(() => {
    const results = getAllPracticeResults();
    return buildProgressSummary(learningProfile, results, lessons);
  }, [learningProfile]);

  const practiceResultCount = useMemo(() => getAllPracticeResults().length, [learningProfile]);

  const displayName =
    getUserDisplayName({
      user,
      localName: learningProfile.name,
      isGuest,
    }) ?? (isGuest ? 'Misafir' : DEFAULT_SIGNED_IN_DISPLAY_NAME);
  const avatarLetter = displayName.charAt(0).toUpperCase();
  const levelGoalLabel = `${tLevelLabel(t, profile.level)} • ${tUserGoalLabel(t, profile.goal)}`;

  const openNameEditor = () => {
    // Only prefill a real saved name — never the email local-part.
    setDraftDisplayName(
      getEditableDisplayName({
        user,
        localName: learningProfile.name,
        isGuest: false,
      }),
    );
    setIsNameEditorVisible(true);
  };

  const closeNameEditor = () => {
    if (isSavingName) return;
    setIsNameEditorVisible(false);
  };

  const handleSaveDisplayName = async () => {
    const validated = validateDisplayName(draftDisplayName, user?.email);
    if (!validated.ok) {
      showFeedback(
        'error',
        'Geçersiz isim',
        'Lütfen geçerli bir isim gir. E-posta adresi veya kullanıcı adı kullanma.',
      );
      return;
    }

    setIsSavingName(true);
    try {
      const result = await updateDisplayName(validated.value);
      if (result.ok) {
        setIsNameEditorVisible(false);
        showFeedback(
          'success',
          'Kaydedildi',
          result.successMessage ?? 'İsmin güncellendi.',
        );
      } else {
        showFeedback(
          'error',
          'Kaydedilemedi',
          result.errorMessage ?? 'İsim güncellenemedi. Lütfen tekrar dene.',
        );
      }
    } finally {
      setIsSavingName(false);
    }
  };

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
      showAppFeedback({
        title: 'Yapılandırılmamış',
        message: 'RevenueCat yapılandırılmamış.',
        variant: 'warning',
      });
      return;
    }

    const result = await restorePurchases();
    if (result === 'restored') {
      showFeedback(
        'success',
        'Satın almalar geri yüklendi',
        'SpeakPlus erişimin hesabınla eşleştirildi.',
      );
      return;
    }
    if (result === 'not_found') {
      showAppFeedback({
        title: 'Abonelik bulunamadı',
        message: `Bu ${getStoreAccountLabel()} hesabında abonelik bulunamadı veya mevcut uygulama hesabına bağlanamadı.`,
        variant: 'warning',
      });
    }
  };

  const handleSettingsPress = (item: SettingsItem) => {
    if (item.manageSubscription) {
      void openManageSubscriptions();
      return;
    }

    if (item.externalUrl) {
      void openExternalLink(item.externalUrl);
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
        showFeedback(
          'success',
          'Giriş başarılı',
          'Tekrar hoş geldin. Pratiklerine kaldığın yerden devam edebilirsin.',
          'Devam et',
        );
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
        showFeedback(
          'success',
          'Hesap oluşturuldu',
          'Hesabın başarıyla oluşturuldu. Gelişimin, kelimelerin ve SpeakPlus erişimin artık güvenle saklanacak.',
          'Devam et',
        );
      }
    } finally {
      setIsSigningUp(false);
    }
  };

  const handleSignOut = () => {
    showAppConfirm({
      title: 'Çıkış yap',
      message: 'Hesabından çıkış yapmak istediğine emin misin?',
      destructive: true,
      confirmLabel: 'Çıkış yap',
      cancelLabel: 'Vazgeç',
      onConfirm: () => {
        setIsSigningOut(true);
        void (async () => {
          try {
            const ok = await signOut();
            if (!ok) {
              showAppFeedback({
                title: 'Çıkış yapılamadı',
                message: errorMessage ?? 'Lütfen tekrar dene.',
                variant: 'error',
              });
            }
          } finally {
            setIsSigningOut(false);
          }
        })();
      },
    });
  };

  /**
   * App Review Guideline 5.1.1(v) evidence path:
   * Profile → sign in → Hesabı Sil → confirm → final confirm → success.
   */
  const runAccountDeletion = async () => {
    setIsDeletingAccount(true);
    try {
      const result = await deleteAccount();
      if (!result.ok) {
        showAppFeedback({
          title: t('profile.deleteFailTitle'),
          message: result.messageTr,
          variant: 'error',
        });
        return;
      }

      void refreshVocabulary();
      showAppFeedback({
        title: t('profile.deleteSuccessTitle'),
        message: t('profile.deleteSuccessBody'),
        variant: 'success',
      });
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const handleDeleteAccount = () => {
    showAppConfirm({
      title: t('profile.deleteConfirmTitle'),
      message: getAccountDeletionConfirmBody(),
      destructive: true,
      confirmLabel: t('profile.deleteConfirmLabel'),
      cancelLabel: t('common.cancel'),
      onConfirm: () => {
        showAppConfirm({
          title: t('profile.deleteFinalTitle'),
          message: t('profile.deleteFinalMessage'),
          destructive: true,
          confirmLabel: t('profile.deleteFinalLabel'),
          cancelLabel: t('common.cancel'),
          onConfirm: () => {
            void runAccountDeletion();
          },
        });
      },
    });
  };

  return (
    <ScreenContainer withTabBar scrollRef={scrollRef}>
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

      {__DEV__ ? (
        <View style={styles.devSection}>
          <Text style={styles.devSectionTitle}>Development</Text>
          <AppButton
            title="Reset Onboarding"
            variant="outline"
            size="compact"
            onPress={() => {
              showAppConfirm({
                title: 'Reset onboarding?',
                message:
                  'Clears onboarding completion and personalization only. Practice history, weak words, vocabulary, and cloud data are kept.',
                confirmLabel: 'Reset',
                cancelLabel: 'Cancel',
                destructive: true,
                onConfirm: () => {
                  void resetOnboardingForDev();
                },
              });
            }}
          />
        </View>
      ) : null}

      <SectionHeader title="İstatistikler" />
      <View style={styles.statsGrid}>
        {stats.map((stat) => (
          <StatCard key={stat.label} label={stat.label} value={stat.value} icon={stat.icon} />
        ))}
      </View>

      {isGuest ? (
        <>
          <SectionHeader title="Hesap" />
          <View
            onLayout={(event) => {
              authCardOffsetY.current = event.nativeEvent.layout.y;
            }}
          >
            <AppCard style={styles.authCard}>
              <Pressable
                onPress={toggleAuthCard}
                accessibilityRole="button"
                accessibilityState={{ expanded: isAuthCardExpanded }}
                accessibilityLabel="Hesabını güvene al"
                style={({ pressed }) => [
                  styles.authHeaderRow,
                  pressed && styles.authHeaderPressed,
                ]}
              >
                <View style={styles.authIconWrap}>
                  <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
                </View>
                <View style={styles.authCopy}>
                  <Text style={styles.authTitle}>Hesabını güvene al</Text>
                  <Text style={styles.authSubtitle}>
                    Gelişimini, kelimelerini ve SpeakPlus erişimini kaybetmemek için hesap oluştur
                    veya giriş yap.
                  </Text>
                  {!isAuthCardExpanded ? (
                    <Text style={styles.authCollapsedNote}>Misafir olarak devam edebilirsin.</Text>
                  ) : (
                    <Text style={styles.authPremiumNote}>
                      SpeakPlus satın almak için hesap gereklidir.
                    </Text>
                  )}
                </View>
                <Ionicons
                  name={isAuthCardExpanded ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={colors.textMuted}
                />
              </Pressable>

              {isAuthCardExpanded ? (
                isLoadingAuth ? (
                  <ActivityIndicator color={colors.primary} style={styles.authLoading} />
                ) : !isAuthAvailable ? (
                  <Text style={styles.authUnavailable}>
                    Hesap girişi şu an yapılandırılmamış. Uygulamayı misafir olarak kullanmaya devam
                    edebilirsin.
                  </Text>
                ) : (
                  <View style={styles.authForm}>
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
                      title="Hesap oluştur"
                      onPress={() => void handleSignUp()}
                      loading={isSigningUp}
                      disabled={!isAuthFormValid || isSubmitting}
                      style={styles.authButton}
                    />
                    <AppButton
                      title="Giriş yap"
                      variant="outline"
                      onPress={() => void handleSignIn()}
                      loading={isSigningIn}
                      disabled={!isAuthFormValid || isSubmitting}
                      style={styles.authButton}
                    />

                    {errorMessage ? <Text style={styles.authError}>{errorMessage}</Text> : null}

                    <Text style={styles.guestHint}>
                      İstersen uygulamayı misafir olarak kullanmaya devam edebilirsin.
                    </Text>
                  </View>
                )
              ) : null}
            </AppCard>
          </View>
        </>
      ) : (
        <>
          <SectionHeader title="Hesap" />
          <AppCard style={styles.accountCard}>
            <AccountRow
              icon="person-outline"
              label="İsim"
              value={displayName}
              onPress={openNameEditor}
              showChevron
            />
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
              onPress={() => void openExternalLink(DATA_DELETION_URL)}
              showChevron
            />
            <AccountRow
              icon="warning-outline"
              label="Hesabı Sil"
              value="Hesabını ve uygulama verilerini kalıcı olarak sil."
              onPress={handleDeleteAccount}
              showChevron
              destructive
              loading={isDeletingAccount}
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

      <SectionHeader title={t('profile.sectionSettings')} />
      <AppCard style={styles.settingsCard}>
        <TouchableOpacity
          style={[styles.settingRow, styles.rowBorder]}
          onPress={() => setIsLanguagePickerVisible(true)}
          activeOpacity={0.7}
        >
          <View style={styles.settingIconWrap}>
            <Ionicons name="language-outline" size={18} color={colors.textSecondary} />
          </View>
          <View style={styles.settingTextWrap}>
            <Text style={styles.settingLabel}>{t('profile.language')}</Text>
            <Text style={styles.settingSubtitle}>
              {t(`language.options.${selectedLanguage}`)}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </TouchableOpacity>
        {SETTINGS_ITEMS.map((item, index) => (
          <TouchableOpacity
            key={item.labelKey}
            style={[styles.settingRow, index < SETTINGS_ITEMS.length - 1 && styles.rowBorder]}
            onPress={() => handleSettingsPress(item)}
            activeOpacity={0.7}
          >
            <View style={styles.settingIconWrap}>
              <Ionicons name={item.icon} size={18} color={colors.textSecondary} />
            </View>
            <View style={styles.settingTextWrap}>
              <Text style={styles.settingLabel}>{t(`profile.${item.labelKey}`)}</Text>
              {item.route === 'Vocabulary' ? (
                <Text style={styles.settingSubtitle}>
                  {vocabularyCount > 0
                    ? isVocabPremium
                      ? t('home.vocabCountPremium', { n: vocabularyCount })
                      : t('home.vocabCountFree', {
                          n: vocabularyCount,
                          limit: vocabularyLimit,
                        })
                    : t('profile.settingsVocabularySub')}
                </Text>
              ) : item.subtitleKey ? (
                <Text style={styles.settingSubtitle}>{t(`profile.${item.subtitleKey}`)}</Text>
              ) : null}
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        ))}
      </AppCard>

      <Text style={styles.versionText}>Voira v{APP_VERSION}</Text>

      <VoiraDialog
        visible={isLanguagePickerVisible}
        variant="neutral"
        icon="language-outline"
        title={t('language.title')}
        dismissible
        onDismiss={() => setIsLanguagePickerVisible(false)}
        tertiaryButton={{
          label: t('common.cancel'),
          variant: 'tertiary',
          onPress: () => setIsLanguagePickerVisible(false),
        }}
      >
        <Text style={styles.settingSubtitle}>{t('language.subtitle')}</Text>
        {SUPPORTED_UI_LANGUAGES.map((code) => {
          const active = selectedLanguage === code;
          return (
            <TouchableOpacity
              key={code}
              style={[styles.settingRow, active && styles.languageRowActive]}
              onPress={() => {
                void (async () => {
                  await setUiLanguage(code);
                  setSelectedLanguage(code);
                  setIsLanguagePickerVisible(false);
                })();
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.settingLabel}>{t(`language.options.${code}`)}</Text>
              {active ? (
                <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
              ) : null}
            </TouchableOpacity>
          );
        })}
      </VoiraDialog>

      <VoiraDialog
        visible={isNameEditorVisible}
        variant="neutral"
        icon="create-outline"
        title="İsmini düzenle"
        dismissible={!isSavingName}
        onDismiss={closeNameEditor}
        primaryButton={{
          label: 'Kaydet',
          variant: 'primary',
          loading: isSavingName,
          onPress: () => void handleSaveDisplayName(),
        }}
        tertiaryButton={{
          label: 'Vazgeç',
          variant: 'tertiary',
          disabled: isSavingName,
          onPress: closeNameEditor,
        }}
      >
        <TextInput
          value={draftDisplayName}
          onChangeText={setDraftDisplayName}
          placeholder="Adını yaz"
          placeholderTextColor={colors.textMuted}
          style={styles.nameModalInput}
          autoCapitalize="words"
          autoCorrect={false}
          maxLength={30}
          editable={!isSavingName}
          returnKeyType="done"
          onSubmitEditing={() => void handleSaveDisplayName()}
        />
      </VoiraDialog>

      <VoiraFeedbackModal
        visible={feedbackModal.visible}
        type={feedbackModal.type}
        title={feedbackModal.title}
        message={feedbackModal.message}
        primaryText={feedbackModal.primaryText}
        onPrimaryPress={closeFeedbackModal}
      />
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
  devSection: {
    marginBottom: spacing.md,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.25)',
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    gap: spacing.sm,
  },
  devSectionTitle: {
    ...typography.meta,
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
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
    gap: spacing.md,
  },
  authHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  authHeaderPressed: {
    opacity: 0.82,
  },
  authIconWrap: {
    width: 34,
    height: 34,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(91, 95, 239, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  authCopy: {
    flex: 1,
    gap: 6,
    minWidth: 0,
  },
  authTitle: {
    ...typography.h3,
    fontSize: 16,
  },
  authSubtitle: {
    ...typography.body,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  authPremiumNote: {
    ...typography.caption,
    color: colors.textMuted,
    lineHeight: 17,
  },
  authCollapsedNote: {
    ...typography.caption,
    color: colors.textMuted,
    lineHeight: 16,
    fontSize: 12,
  },
  authForm: {
    gap: spacing.sm,
  },
  authLoading: {
    marginVertical: spacing.sm,
  },
  authUnavailable: {
    ...typography.body,
    color: colors.textSecondary,
  },
  textInput: {
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
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  settingTextWrap: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  settingSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
  },
  languageRowActive: {
    backgroundColor: 'rgba(91, 95, 239, 0.08)',
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
  nameModalInput: {
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.22)',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? spacing.sm + 4 : spacing.sm + 2,
    color: colors.textPrimary,
    fontSize: 15,
    backgroundColor: 'rgba(22, 24, 42, 0.96)',
  },
});
