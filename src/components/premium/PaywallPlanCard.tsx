import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { PremiumPackageOption } from '../../services/premium';
import { colors, spacing, borderRadius } from '../../theme';

interface PaywallPlanCardProps {
  option: PremiumPackageOption;
  selected: boolean;
  onSelect: () => void;
}

function planLabelKey(period: PremiumPackageOption['period']): string {
  if (period === 'weekly') return 'premium.planWeekly';
  if (period === 'monthly') return 'premium.planMonthly';
  return 'premium.planAnnual';
}

export function PaywallPlanCard({ option, selected, onSelect }: PaywallPlanCardProps) {
  const { t } = useTranslation();
  const label = t(planLabelKey(option.period));
  const hint =
    option.period === 'weekly'
      ? t('premium.planWeeklyHint')
      : option.period === 'yearly' && option.monthlyEquivalentPriceString
        ? t('premium.monthlyEquivalent', { price: option.monthlyEquivalentPriceString })
        : null;

  const badges: string[] = [];
  if (option.period === 'yearly' && option.savingsPercent != null && option.savingsPercent > 0) {
    badges.push(t('premium.savePercent', { percent: option.savingsPercent }));
  }
  if (option.hasFreeTrial && option.freeTrialDays != null) {
    badges.push(t('premium.trialDaysFree', { days: option.freeTrialDays }));
  }

  const accessibilityLabel = [
    label,
    option.priceString,
    hint,
    ...badges,
    selected ? t('premium.planSelectedA11y') : '',
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onSelect}
      style={[styles.card, selected && styles.cardSelected]}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel}
    >
      <View style={styles.headerRow}>
        <View style={styles.titleCol}>
          <Text style={[styles.planLabel, selected && styles.planLabelSelected]}>{label}</Text>
          {hint ? <Text style={styles.hint}>{hint}</Text> : null}
        </View>
        {option.period === 'yearly' ? (
          <View style={styles.bestValueBadge}>
            <Text style={styles.bestValueText}>{t('premium.bestValue')}</Text>
          </View>
        ) : null}
      </View>

      <Text style={[styles.price, selected && styles.priceSelected]}>
        {option.priceString || t('premium.priceLoading')}
      </Text>

      {badges.length > 0 ? (
        <View style={styles.badgeRow}>
          {badges.map((badge) => (
            <View key={badge} style={styles.badge}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(139, 92, 246, 0.18)',
    backgroundColor: 'rgba(26, 27, 46, 0.55)',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(91, 95, 239, 0.12)',
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.28,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  titleCol: {
    flex: 1,
    minWidth: 0,
  },
  planLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  planLabelSelected: {
    color: colors.textPrimary,
  },
  hint: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  price: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  priceSelected: {
    color: colors.textPrimary,
  },
  bestValueBadge: {
    backgroundColor: 'rgba(91, 95, 239, 0.16)',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(91, 95, 239, 0.35)',
  },
  bestValueText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  badge: {
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(139, 92, 246, 0.22)',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.secondary,
  },
});
