import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { PurchasesPackage } from 'react-native-purchases';
import { RootScreenProps } from '../navigation/types';
import { ScreenContainer } from '../components/ScreenContainer';
import { AppCard } from '../components/AppCard';
import { VoiraLogo } from '../components/VoiraLogo';
import { PremiumDebugPanel } from '../components/PremiumDebugPanel';
import { PremiumFeatureItem } from '../components/PremiumFeatureItem';
import { usePremium } from '../context/PremiumContext';
import { useAuth } from '../context/AuthContext';
import { isRegisteredUser } from '../utils/authAccess';
import {
  ACCOUNT_REQUIRED_COPY,
  GUEST_PREMIUM_WARNING_COPY,
  navigateToProfileAuth,
  showRestoreRequiresSignInAlert,
} from '../utils/premiumAccountGate';
import type { PremiumPackageOption } from '../services/premium';
import { PRIVACY_POLICY_URL, TERMS_OF_USE_URL } from '../constants/legalLinks';
import { openExternalLink } from '../utils/openExternalLink';
import { showAppDialog, showAppFeedback } from '../components/dialog';
import { VoiraFeedbackModal, type VoiraFeedbackType } from '../components/VoiraFeedbackModal';
import { getStoreAccountLabel } from '../utils/storeSubscriptions';
import { colors, spacing, borderRadius, layout } from '../theme';

type Props = RootScreenProps<'Premium'>;

const CTA_RADIUS = 18;
const CTA_HEIGHT = 52;

const BENEFIT_CHIPS = [
  { icon: 'library-outline' as const, label: 'Tüm premium dersler' },
  { icon: 'analytics-outline' as const, label: 'Gelişmiş analiz' },
  { icon: 'bookmark-outline' as const, label: 'Kelime Defterini genişlet' },
];

const SPEAKPLUS_VALUE_ITEMS = [
  'Premium ders paketlerine eriş',
  'Telaffuz, doğruluk ve akıcılık skorlarını detaylı gör',
  'Kelime Defterini genişlet',
  'Zayıf kelimelerini daha düzenli takip et',
  'Gelişimini haftalık olarak izle',
];

function BenefitChip({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.benefitChip}>
      <Ionicons name={icon} size={13} color={colors.secondary} />
      <Text style={styles.benefitChipLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function PremiumCtaButton({
  title,
  onPress,
  disabled,
  loading,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.88}
      style={[styles.ctaTouchable, disabled && styles.ctaDisabled]}
      disabled={disabled || loading}
    >
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.ctaGradient}
      >
        {loading ? (
          <Text style={styles.ctaText}>İşleniyor...</Text>
        ) : (
          <Text style={styles.ctaText}>{title}</Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

function PackageCard({
  option,
  selected,
  onSelect,
}: {
  option: PremiumPackageOption;
  selected: boolean;
  onSelect: () => void;
}) {
  const periodSuffix = option.period === 'yearly' ? '/ yıl' : '/ ay';

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onSelect}
      style={[styles.packageCard, selected && styles.packageCardSelected]}
    >
      <View style={styles.packageHeader}>
        <Text style={[styles.packageLabel, selected && styles.packageLabelSelected]}>
          {option.labelTr}
        </Text>
        {option.period === 'yearly' ? (
          <View style={styles.popularBadge}>
            <Text style={styles.popularText}>En avantajlı</Text>
          </View>
        ) : null}
      </View>
      <Text style={[styles.packagePrice, selected && styles.packagePriceSelected]}>
        {option.priceString || 'Yükleniyor...'}
      </Text>
      <Text style={styles.packagePeriod}>{periodSuffix}</Text>
    </TouchableOpacity>
  );
}

function AccountRequiredFooter({
  onCreateAccount,
  onSignIn,
  onContinueAsGuest,
}: {
  onCreateAccount: () => void;
  onSignIn: () => void;
  onContinueAsGuest: () => void;
}) {
  return (
    <View style={styles.footerShell}>
      <LinearGradient
        colors={[
          'rgba(15, 16, 32, 0)',
          'rgba(15, 16, 32, 0.72)',
          'rgba(15, 16, 32, 0.94)',
        ]}
        locations={[0, 0.45, 1]}
        style={styles.footerFade}
        pointerEvents="none"
      />
      <View style={styles.footerPanel}>
        <PremiumCtaButton title="Hesap oluştur" onPress={onCreateAccount} />
        <TouchableOpacity
          onPress={onSignIn}
          activeOpacity={0.65}
          style={styles.secondaryAuthTouchable}
          hitSlop={{ top: 6, bottom: 6, left: 12, right: 12 }}
        >
          <Text style={styles.secondaryAuthText}>Giriş yap</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onContinueAsGuest}
          activeOpacity={0.65}
          style={styles.skipTouchable}
          hitSlop={{ top: 6, bottom: 6, left: 12, right: 12 }}
        >
          <Text style={styles.skipText}>Misafir olarak devam et</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function PremiumFooter({
  ctaTitle,
  onPrimary,
  onRestore,
  onSkip,
  onPrivacy,
  onTerms,
  disabled,
  loading,
  restoring,
  activeSubscriber = false,
}: {
  ctaTitle: string;
  onPrimary: () => void;
  onRestore: () => void;
  onSkip: () => void;
  onPrivacy: () => void;
  onTerms: () => void;
  disabled?: boolean;
  loading?: boolean;
  restoring?: boolean;
  activeSubscriber?: boolean;
}) {
  return (
    <View style={styles.footerShell}>
      <LinearGradient
        colors={[
          'rgba(15, 16, 32, 0)',
          'rgba(15, 16, 32, 0.72)',
          'rgba(15, 16, 32, 0.94)',
        ]}
        locations={[0, 0.45, 1]}
        style={styles.footerFade}
        pointerEvents="none"
      />
      <View style={styles.footerPanel}>
        <PremiumCtaButton
          title={ctaTitle}
          onPress={onPrimary}
          disabled={disabled}
          loading={loading}
        />
        {!activeSubscriber ? (
          <>
            <TouchableOpacity
              onPress={onRestore}
              activeOpacity={0.65}
              style={styles.restoreTouchable}
              disabled={restoring}
              hitSlop={{ top: 6, bottom: 6, left: 12, right: 12 }}
            >
              {restoring ? (
                <ActivityIndicator size="small" color={colors.textMuted} />
              ) : (
                <Text style={styles.restoreText}>Satın alımları geri yükle</Text>
              )}
            </TouchableOpacity>
            <View style={styles.legalRow}>
              <TouchableOpacity onPress={onPrivacy} hitSlop={8}>
                <Text style={styles.legalLink}>Gizlilik Politikası</Text>
              </TouchableOpacity>
              <Text style={styles.legalDivider}>·</Text>
              <TouchableOpacity onPress={onTerms} hitSlop={8}>
                <Text style={styles.legalLink}>Kullanım Şartları</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={onSkip}
              activeOpacity={0.65}
              style={styles.skipTouchable}
              hitSlop={{ top: 6, bottom: 6, left: 12, right: 12 }}
            >
              <Text style={styles.skipText}>Şimdilik devam et</Text>
            </TouchableOpacity>
          </>
        ) : null}
      </View>
    </View>
  );
}

function defaultSelectedPackage(
  options: PremiumPackageOption[],
): PurchasesPackage | null {
  if (options.length === 0) return null;
  const yearly = options.find((option) => option.period === 'yearly');
  return (yearly ?? options[0]).package;
}

export function PremiumScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const registered = isRegisteredUser(user);
  const {
    isPremium,
    isLoadingPremium,
    isOfferingsLoading,
    isPurchasing,
    isRestoring,
    isRevenueCatConfigured,
    packageOptions,
    errorMessage,
    purchasePackage,
    restorePurchases,
    refreshOfferings,
    refreshCustomerInfo,
  } = usePremium();

  const [selectedPackage, setSelectedPackage] = useState<PurchasesPackage | null>(null);
  const [feedbackModal, setFeedbackModal] = useState<{
    visible: boolean;
    type: VoiraFeedbackType;
    title: string;
    message: string;
    primaryText: string;
    onClose?: () => void;
  }>({
    visible: false,
    type: 'success',
    title: '',
    message: '',
    primaryText: 'Tamam',
  });

  const showSuccessFeedback = (
    title: string,
    message: string,
    primaryText = 'Tamam',
    onClose?: () => void,
  ) => {
    setFeedbackModal({
      visible: true,
      type: 'success',
      title,
      message,
      primaryText,
      onClose,
    });
  };

  const closeFeedbackModal = () => {
    const onClose = feedbackModal.onClose;
    setFeedbackModal((prev) => ({ ...prev, visible: false, onClose: undefined }));
    onClose?.();
  };

  useEffect(() => {
    void refreshCustomerInfo();
  }, [refreshCustomerInfo]);

  useEffect(() => {
    setSelectedPackage(defaultSelectedPackage(packageOptions));
  }, [packageOptions]);

  const selectedPeriod = useMemo(
    () => packageOptions.find((option) => option.package.identifier === selectedPackage?.identifier)
      ?.period,
    [packageOptions, selectedPackage?.identifier],
  );

  const handleClose = () => navigation.goBack();

  const handleGoToAuth = () => navigateToProfileAuth(navigation);

  const handlePurchase = async () => {
    if (!registered) return;
    if (!selectedPackage) return;

    const result = await purchasePackage(selectedPackage);
    if (result === 'unlocked') {
      showSuccessFeedback(
        'SpeakPlus aktif',
        'Premium derslere ve gelişmiş geri bildirimlere erişimin açıldı.',
        'Devam et',
        handleClose,
      );
      return;
    }
    if (result === 'already_subscribed') {
      showAppDialog({
        title: 'Aktif abonelik var',
        message: `Bu ${getStoreAccountLabel()} hesabında aktif abonelik görünüyor. Satın alımları geri yüklemeyi dene.`,
        variant: 'info',
        primaryButton: {
          id: 'restore',
          label: 'Satın alımları geri yükle',
          variant: 'primary',
        },
        tertiaryButton: {
          id: 'cancel',
          label: 'Vazgeç',
          variant: 'tertiary',
        },
        onAction: (id) => {
          if (id === 'restore') {
            void handleRestore();
          }
        },
      });
    }
  };

  const handleRestore = async () => {
    if (!registered) {
      showRestoreRequiresSignInAlert(navigation);
      return;
    }

    const result = await restorePurchases();
    if (result === 'restored') {
      showSuccessFeedback(
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
    if (result === 'error') {
      showAppFeedback({
        title: 'Geri yükleme başarısız',
        message: 'Satın alımlar geri yüklenemedi. Lütfen tekrar dene.',
        variant: 'error',
      });
    }
  };

  const ctaTitle = isPremium
    ? 'Devam et'
    : selectedPeriod === 'yearly'
      ? "Yıllık SpeakPlus'u Başlat"
      : "SpeakPlus'u Başlat";
  const isPackagesLoading = isLoadingPremium || isOfferingsLoading;
  const showOfferingsFallback =
    registered && !isPackagesLoading && !isPremium && packageOptions.length === 0;
  const hasMonthlyOption = packageOptions.some((option) => option.period === 'monthly');
  const hasYearlyOption = packageOptions.some((option) => option.period === 'yearly');
  const showPartialYearlyHint =
    registered &&
    !isPackagesLoading &&
    !isPremium &&
    hasMonthlyOption &&
    !hasYearlyOption;
  const showGuestAccountGate = !registered && !isPremium;
  const footerClearance = showGuestAccountGate
    ? CTA_HEIGHT + 10 + 22 + 34 + insets.bottom + spacing.lg + 48
    : CTA_HEIGHT + 10 + 18 + 12 + 34 + insets.bottom + spacing.lg + 52;

  const footer = showGuestAccountGate ? (
    <AccountRequiredFooter
      onCreateAccount={handleGoToAuth}
      onSignIn={handleGoToAuth}
      onContinueAsGuest={handleClose}
    />
  ) : (
    <PremiumFooter
      ctaTitle={ctaTitle}
      onPrimary={isPremium ? handleClose : handlePurchase}
      onRestore={handleRestore}
      onSkip={handleClose}
      onPrivacy={() => void openExternalLink(PRIVACY_POLICY_URL)}
      onTerms={() => void openExternalLink(TERMS_OF_USE_URL)}
      disabled={!isPremium && (!selectedPackage || packageOptions.length === 0)}
      loading={isPurchasing}
      restoring={isRestoring}
      activeSubscriber={isPremium}
    />
  );

  if (!isRevenueCatConfigured) {
    return (
      <ScreenContainer contentStyle={styles.content}>
        <TouchableOpacity style={styles.closeButton} onPress={handleClose} hitSlop={8}>
          <Ionicons name="close" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <View style={styles.centerState}>
          <Text style={styles.unconfiguredTitle}>RevenueCat yapılandırılmamış.</Text>
          <Text style={styles.unconfiguredBody}>
            Gerçek abonelik akışı için EXPO_PUBLIC_REVENUECAT_IOS_API_KEY ve
            EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY değerlerini ayarlayın. Expo Go yerine
            native dev build kullanın (npx expo run:android / run:ios).
          </Text>
          <TouchableOpacity onPress={handleClose} style={styles.backLink}>
            <Text style={styles.backLinkText}>Geri dön</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer
      contentStyle={styles.content}
      footerCompact
      footerBorderless
      footerClearance={footerClearance}
      footerStyle={styles.footerContainer}
      footer={footer}
    >
      <TouchableOpacity style={styles.closeButton} onPress={handleClose} hitSlop={8}>
        <Ionicons name="close" size={20} color={colors.textSecondary} />
      </TouchableOpacity>

      <View style={styles.hero}>
        <VoiraLogo size={48} style={styles.heroLogo} />
        <Text style={styles.brand}>VOIRA SPEAKPLUS</Text>
        {isPremium ? (
          <>
            <Text style={styles.title}>SpeakPlus aktif</Text>
            <Text style={styles.subtitle}>
              Premium derslere ve gelişmiş geri bildirimlere erişimin var.
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.title}>İngilizce konuşmanı bir üst seviyeye taşı</Text>
            <Text style={styles.subtitle}>
              Premium dersler, gelişmiş telaffuz analizi ve kelime bazlı geri bildirimlerle daha
              düzenli pratik yap.
            </Text>
          </>
        )}
      </View>

      {isPremium ? (
        <AppCard style={styles.activeCard}>
          <Text style={styles.activeTitle}>SpeakPlus aktif</Text>
          <Text style={styles.activeBody}>
            Premium derslere ve gelişmiş geri bildirimlere erişimin var.
          </Text>
        </AppCard>
      ) : showGuestAccountGate ? (
        <AppCard style={styles.accountRequiredCard}>
          <View style={styles.accountRequiredIcon}>
            <Ionicons name="person-circle-outline" size={28} color={colors.primary} />
          </View>
          <Text style={styles.accountRequiredTitle}>{ACCOUNT_REQUIRED_COPY.title}</Text>
          <Text style={styles.accountRequiredBody}>{ACCOUNT_REQUIRED_COPY.body}</Text>
        </AppCard>
      ) : (
        <>
          <View style={styles.benefitChipRow}>
            {BENEFIT_CHIPS.map((chip) => (
              <BenefitChip key={chip.label} icon={chip.icon} label={chip.label} />
            ))}
          </View>

          {isPackagesLoading ? (
            <AppCard style={styles.loadingCard}>
              <ActivityIndicator color={colors.primary} style={styles.loadingSpinner} />
              <Text style={styles.loadingTitle}>SpeakPlus seçenekleri hazırlanıyor...</Text>
              <Text style={styles.loadingBody}>
                Aylık ve yıllık paketler mağazadan alınıyor.
              </Text>
            </AppCard>
          ) : null}

          {!isPackagesLoading && packageOptions.length > 0 ? (
            <>
              <View style={styles.packageRow}>
                {packageOptions.map((option) => (
                  <PackageCard
                    key={option.package.identifier}
                    option={option}
                    selected={selectedPeriod === option.period}
                    onSelect={() => setSelectedPackage(option.package)}
                  />
                ))}
              </View>
              {showPartialYearlyHint ? (
                <Text style={styles.partialHint}>
                  Yıllık paket şu anda kullanılamıyor. Aylık SpeakPlus ile devam edebilirsin.
                </Text>
              ) : null}
            </>
          ) : null}

          {showOfferingsFallback ? (
            <AppCard style={styles.fallbackCard}>
              <Text style={styles.fallbackTitle}>Paketler yüklenemedi</Text>
              <Text style={styles.fallbackBody}>
                SpeakPlus seçenekleri şu anda alınamıyor. Lütfen bağlantını kontrol edip tekrar
                dene.
              </Text>
              <TouchableOpacity
                onPress={() => void refreshOfferings()}
                style={styles.retryButton}
                disabled={isOfferingsLoading}
              >
                {isOfferingsLoading ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={styles.retryText}>Tekrar dene</Text>
                )}
              </TouchableOpacity>
            </AppCard>
          ) : null}

          {errorMessage ? (
            <AppCard style={styles.errorCard}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </AppCard>
          ) : null}

          <AppCard style={styles.featuresCard}>
            <Text style={styles.sectionTitle}>SpeakPlus ile</Text>
            {SPEAKPLUS_VALUE_ITEMS.map((feature, index) => (
              <PremiumFeatureItem
                key={feature}
                text={feature}
                compact
                isLast={index === SPEAKPLUS_VALUE_ITEMS.length - 1}
              />
            ))}
          </AppCard>

          {selectedPackage ? (
            <Text style={styles.cancelNote}>
              Aboneliğini App Store veya Google Play hesap ayarlarından yönetebilir ya da iptal
              edebilirsin. Abonelik otomatik yenilenir.
            </Text>
          ) : null}
        </>
      )}

      {!registered && isPremium ? (
        <AppCard style={styles.guestWarningCard}>
          <Text style={styles.guestWarningTitle}>{GUEST_PREMIUM_WARNING_COPY.title}</Text>
          <Text style={styles.guestWarningBody}>{GUEST_PREMIUM_WARNING_COPY.body}</Text>
          <TouchableOpacity onPress={handleGoToAuth} style={styles.guestWarningCta} activeOpacity={0.7}>
            <Text style={styles.guestWarningCtaText}>Hesap oluştur veya giriş yap</Text>
            <Ionicons name="arrow-forward" size={14} color={colors.primary} />
          </TouchableOpacity>
        </AppCard>
      ) : null}

      <PremiumDebugPanel />

      <View style={styles.scrollEndSpacer} />

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
  content: {
    paddingTop: spacing.xs,
  },
  closeButton: {
    alignSelf: 'flex-end',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(26, 27, 46, 0.65)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(139, 92, 246, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  hero: {
    alignItems: 'center',
    marginBottom: spacing.sm + 2,
  },
  heroLogo: {
    marginBottom: spacing.xs + 2,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
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
  brand: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.premium,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 26,
    paddingHorizontal: spacing.sm,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs + 2,
    paddingHorizontal: spacing.sm,
    lineHeight: 19,
  },
  activeCard: {
    marginBottom: spacing.md,
    borderColor: 'rgba(229, 184, 74, 0.35)',
    borderWidth: 1,
    backgroundColor: 'rgba(229, 184, 74, 0.08)',
  },
  activeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.premium,
    marginBottom: spacing.xs,
  },
  activeBody: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  accountRequiredCard: {
    marginBottom: spacing.md,
    borderColor: 'rgba(91, 95, 239, 0.28)',
    borderWidth: 1,
    backgroundColor: 'rgba(91, 95, 239, 0.08)',
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  accountRequiredIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(139, 92, 246, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  accountRequiredTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  accountRequiredBody: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    paddingHorizontal: spacing.sm,
  },
  guestWarningCard: {
    marginBottom: spacing.md,
    borderColor: 'rgba(229, 184, 74, 0.35)',
    borderWidth: 1,
    backgroundColor: 'rgba(229, 184, 74, 0.08)',
  },
  guestWarningTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.premium,
    marginBottom: spacing.xs,
  },
  guestWarningBody: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  guestWarningCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  guestWarningCtaText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  secondaryAuthTouchable: {
    alignSelf: 'center',
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
    minHeight: 20,
    justifyContent: 'center',
  },
  secondaryAuthText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  benefitChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.xs + 2,
    marginBottom: spacing.md,
  },
  benefitChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(91, 95, 239, 0.08)',
    borderRadius: borderRadius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(91, 95, 239, 0.18)',
    paddingVertical: 7,
    paddingHorizontal: spacing.sm + 2,
  },
  benefitChipLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  featuresCard: {
    marginBottom: spacing.sm,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  fallbackCard: {
    marginBottom: spacing.sm,
    borderColor: 'rgba(139, 92, 246, 0.22)',
    backgroundColor: 'rgba(139, 92, 246, 0.06)',
  },
  fallbackTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  fallbackBody: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  loadingCard: {
    marginBottom: spacing.sm,
    alignItems: 'center',
    borderColor: 'rgba(139, 92, 246, 0.2)',
    backgroundColor: 'rgba(139, 92, 246, 0.06)',
    paddingVertical: spacing.md,
  },
  loadingSpinner: {
    marginBottom: spacing.sm,
  },
  loadingTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  loadingBody: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
    textAlign: 'center',
  },
  partialHint: {
    marginTop: -spacing.xs,
    marginBottom: spacing.sm,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textMuted,
    textAlign: 'center',
  },
  errorCard: {
    marginBottom: spacing.sm,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
  },
  errorText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  retryButton: {
    alignSelf: 'flex-start',
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  packageRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  packageCard: {
    flex: 1,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(139, 92, 246, 0.16)',
    backgroundColor: 'rgba(26, 27, 46, 0.55)',
    paddingVertical: spacing.md - 2,
    paddingHorizontal: spacing.sm + 2,
    minHeight: 108,
  },
  packageCardPlaceholder: {
    opacity: 0.85,
  },
  packageCardSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(91, 95, 239, 0.16)',
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
      },
      android: { elevation: 3 },
    }),
  },
  packageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
    gap: spacing.xs,
  },
  packageLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  packageLabelSelected: {
    color: colors.textPrimary,
  },
  packagePrice: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  packagePriceSelected: {
    color: colors.textPrimary,
  },
  packagePeriod: {
    fontSize: 12,
    color: colors.textMuted,
  },
  cancelNote: {
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 16,
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm,
  },
  popularBadge: {
    backgroundColor: 'rgba(91, 95, 239, 0.18)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(91, 95, 239, 0.35)',
  },
  popularText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.2,
  },
  scrollEndSpacer: {
    height: spacing.md,
  },
  footerContainer: {
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    paddingTop: 0,
    paddingHorizontal: 0,
  },
  footerShell: {
    position: 'relative',
  },
  footerFade: {
    position: 'absolute',
    top: -28,
    left: -layout.screenPadding,
    right: -layout.screenPadding,
    height: 32,
  },
  footerPanel: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.sm,
  },
  ctaTouchable: {
    borderRadius: CTA_RADIUS,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.22,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  ctaDisabled: {
    opacity: 0.55,
  },
  ctaGradient: {
    minHeight: CTA_HEIGHT,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    letterSpacing: 0.15,
  },
  restoreTouchable: {
    alignSelf: 'center',
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
    minHeight: 20,
    justifyContent: 'center',
  },
  restoreText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textMuted,
  },
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.sm,
  },
  legalLink: {
    fontSize: 11,
    color: colors.textMuted,
  },
  legalDivider: {
    fontSize: 11,
    color: colors.textMuted,
  },
  skipTouchable: {
    alignSelf: 'center',
    marginTop: spacing.xs + 2,
    paddingVertical: spacing.xs,
  },
  skipText: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(156, 163, 175, 0.78)',
    letterSpacing: 0.1,
  },
  centerState: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  unconfiguredTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  unconfiguredBody: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
  },
  backLink: {
    alignSelf: 'center',
    marginTop: spacing.sm,
  },
  backLinkText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
});
