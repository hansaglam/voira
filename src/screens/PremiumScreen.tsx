import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { PremiumDebugPanel } from '../components/PremiumDebugPanel';
import { PremiumFeatureItem } from '../components/PremiumFeatureItem';
import { usePremium } from '../context/PremiumContext';
import type { PremiumPackageOption } from '../services/premium';
import { colors, spacing, borderRadius, layout } from '../theme';

type Props = RootScreenProps<'Premium'>;

const CTA_RADIUS = 17;
const CTA_HEIGHT = 49;

const PREMIUM_UNLOCKS = [
  'Sınırsız pratik',
  'Tüm ders paketleri',
  'Gelişmiş geri bildirimler',
  'Azure telaffuz analizi ve kelime bazlı geri bildirim',
  'Kişisel gelişim raporu',
  'Detaylı telaffuz, akıcılık ve tamamlama skorları',
];

const BENEFIT_PILLS = [
  { icon: 'infinite-outline' as const, label: 'Sınırsız Pratik' },
  { icon: 'analytics-outline' as const, label: 'Gelişmiş Geri Bildirim' },
  { icon: 'library-outline' as const, label: 'Tüm Dersler' },
];

function BenefitPill({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.benefitPill}>
      <View style={styles.benefitIcon}>
        <Ionicons name={icon} size={16} color={colors.secondary} />
      </View>
      <Text style={styles.benefitLabel} numberOfLines={2}>
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
          <ActivityIndicator color={colors.textPrimary} />
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
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onSelect}
      style={[styles.packageCard, selected && styles.packageCardSelected]}
    >
      <View style={styles.packageHeader}>
        <Text style={styles.packageLabel}>{option.labelTr}</Text>
        {option.period === 'yearly' ? (
          <View style={styles.popularBadge}>
            <Text style={styles.popularText}>En avantajlı</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.packagePrice}>{option.priceString}</Text>
      <Text style={styles.packagePeriod}>{option.subscriptionPeriodLabel}</Text>
    </TouchableOpacity>
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
              <Text style={styles.legalDivider}>•</Text>
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

  const handlePurchase = async () => {
    if (!selectedPackage) return;

    const result = await purchasePackage(selectedPackage);
    if (result === 'unlocked') {
      Alert.alert('SpeakPlus aktif', 'Premium içeriklere erişimin açıldı.', [
        { text: 'Tamam', onPress: handleClose },
      ]);
      return;
    }
    if (result === 'already_subscribed') {
      Alert.alert(
        'Aktif abonelik var',
        'Bu Google Play hesabında aktif abonelik görünüyor. Satın alımları geri yüklemeyi dene.',
        [
          { text: 'İptal', style: 'cancel' },
          { text: 'Satın alımları geri yükle', onPress: () => void handleRestore() },
        ],
      );
    }
  };

  const handleRestore = async () => {
    const result = await restorePurchases();
    if (result === 'restored') {
      Alert.alert('Satın alımın geri yüklendi.', 'SpeakPlus aboneliğin aktif.', [
        { text: 'Devam et', onPress: handleClose },
      ]);
      return;
    }
    if (result === 'not_found') {
      Alert.alert(
        'Abonelik bulunamadı',
        'Bu Google Play hesabında abonelik bulunamadı veya mevcut uygulama hesabına bağlanamadı.',
      );
    }
    if (result === 'error') {
      Alert.alert('Geri yükleme başarısız', 'Satın alımlar geri yüklenemedi. Lütfen tekrar dene.');
    }
  };

  const ctaTitle = isPremium ? 'Devam et' : "SpeakPlus'u Başlat";
  const isPackagesLoading = isLoadingPremium || isOfferingsLoading;
  const showOfferingsFallback =
    !isPackagesLoading && !isPremium && packageOptions.length === 0;
  const footerClearance = 49 + 10 + 14 + 12 + 34 + insets.bottom + spacing.md + 40;

  const footer = (
    <PremiumFooter
      ctaTitle={ctaTitle}
      onPrimary={isPremium ? handleClose : handlePurchase}
      onRestore={handleRestore}
      onSkip={handleClose}
      onPrivacy={() => navigation.navigate('PrivacyPolicy')}
      onTerms={() => navigation.navigate('TermsOfUse')}
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
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.logoBadge}
        >
          <Ionicons name="diamond" size={26} color={colors.textPrimary} />
        </LinearGradient>
        <Text style={styles.brand}>SpeakPlus</Text>
        {isPremium ? (
          <>
            <Text style={styles.title}>SpeakPlus aktif</Text>
            <Text style={styles.subtitle}>
              Premium derslere ve gelişmiş geri bildirimlere erişimin var.
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.title}>SpeakPlus ile sınırsız konuşma pratiği</Text>
            <Text style={styles.subtitle}>
              Gelişmiş geri bildirim, tüm ders paketleri ve kişisel gelişim raporu.
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
      ) : (
        <>
          <View style={styles.benefitRow}>
            {BENEFIT_PILLS.map((pill) => (
              <BenefitPill key={pill.label} icon={pill.icon} label={pill.label} />
            ))}
          </View>

          <AppCard style={styles.featuresCard}>
            <Text style={styles.sectionTitle}>Neler açılır?</Text>
            {PREMIUM_UNLOCKS.map((feature, index) => (
              <PremiumFeatureItem
                key={feature}
                text={feature}
                compact
                isLast={index === PREMIUM_UNLOCKS.length - 1}
              />
            ))}
          </AppCard>
        </>
      )}

      <PremiumDebugPanel />

      {!isPremium && isPackagesLoading ? (
        <View style={styles.loadingBlock}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>Abonelik seçenekleri yükleniyor…</Text>
        </View>
      ) : null}

      {!isPremium && showOfferingsFallback ? (
        <AppCard style={styles.fallbackCard}>
          <Text style={styles.fallbackTitle}>Paketler yüklenemedi</Text>
          <Text style={styles.fallbackBody}>
            SpeakPlus seçenekleri şu anda alınamıyor. Mağaza ürünleri yapılandırıldığında burada
            görünecek.
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

      {!isPremium && !isPackagesLoading && errorMessage ? (
        <AppCard style={styles.errorCard}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </AppCard>
      ) : null}

      {!isPremium && !isPackagesLoading && packageOptions.length > 0 ? (
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
      ) : null}

      {!isPremium && !isPackagesLoading && selectedPackage ? (
        <AppCard style={styles.priceCard}>
          <Text style={styles.priceAmount}>{selectedPackage.product.priceString}</Text>
          <Text style={styles.pricePeriod}>
            {packageOptions.find((option) => option.package.identifier === selectedPackage.identifier)
              ?.subscriptionPeriodLabel ?? 'Abonelik'}
          </Text>
          <Text style={styles.cancelNote}>
            Abonelik mağaza hesabın üzerinden yönetilir ve otomatik yenilenir.
          </Text>
        </AppCard>
      ) : null}

      <View style={styles.scrollEndSpacer} />
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
    marginBottom: spacing.md,
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
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 28,
    paddingHorizontal: spacing.sm,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    lineHeight: 21,
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
  benefitRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  benefitPill: {
    flex: 1,
    backgroundColor: 'rgba(91, 95, 239, 0.06)',
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(91, 95, 239, 0.14)',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    gap: spacing.xs,
  },
  benefitIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(139, 92, 246, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 13,
  },
  featuresCard: {
    marginBottom: spacing.sm,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.md,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  loadingBlock: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  loadingText: {
    fontSize: 13,
    color: colors.textSecondary,
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
    marginBottom: spacing.sm,
  },
  packageCard: {
    flex: 1,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.18)',
    backgroundColor: 'rgba(26, 27, 46, 0.55)',
    padding: spacing.md,
  },
  packageCardSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(91, 95, 239, 0.12)',
  },
  packageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
    gap: spacing.xs,
  },
  packageLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  packagePrice: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  packagePeriod: {
    fontSize: 12,
    color: colors.textMuted,
  },
  priceCard: {
    marginBottom: spacing.xs,
    paddingVertical: spacing.md - 2,
    paddingHorizontal: spacing.md,
    borderColor: 'rgba(139, 92, 246, 0.22)',
    borderWidth: 1,
    backgroundColor: 'rgba(139, 92, 246, 0.04)',
  },
  priceAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  pricePeriod: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  cancelNote: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 17,
  },
  popularBadge: {
    backgroundColor: 'rgba(91, 95, 239, 0.12)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(91, 95, 239, 0.22)',
  },
  popularText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.2,
  },
  scrollEndSpacer: {
    height: spacing.xs,
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
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  legalLink: {
    fontSize: 12,
    color: colors.textMuted,
    textDecorationLine: 'underline',
  },
  legalDivider: {
    fontSize: 12,
    color: colors.textMuted,
  },
  skipTouchable: {
    alignSelf: 'center',
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(156, 163, 175, 0.88)',
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
