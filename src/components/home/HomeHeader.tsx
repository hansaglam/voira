import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../../theme';

interface HomeHeaderProps {
  greeting: string;
  subtitle: string;
  showPremiumBadge: boolean;
  onPressPremium?: () => void;
  premiumBadgeLabel: string;
}

export function HomeHeader({
  greeting,
  subtitle,
  showPremiumBadge,
  onPressPremium,
  premiumBadgeLabel,
}: HomeHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={styles.textWrap}>
        <Text style={styles.brand}>VOIRA</Text>
        <Text style={styles.greeting} accessibilityRole="header">
          {greeting}
        </Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      {showPremiumBadge ? (
        <TouchableOpacity
          style={styles.premiumBadge}
          onPress={onPressPremium}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={premiumBadgeLabel}
        >
          <Ionicons name="diamond-outline" size={14} color={colors.premium} />
          <Text style={styles.premiumText}>{premiumBadgeLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  textWrap: {
    flex: 1,
    paddingRight: spacing.md,
  },
  brand: {
    ...typography.label,
    color: colors.primary,
    marginBottom: 4,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
  },
  greeting: {
    ...typography.h2,
    marginBottom: 4,
  },
  subtitle: {
    ...typography.captionBright,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(196, 181, 253, 0.25)',
  },
  premiumText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.premium,
  },
});
