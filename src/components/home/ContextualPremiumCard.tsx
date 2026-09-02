import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius } from '../../theme';

interface ContextualPremiumCardProps {
  title: string;
  subtitle: string;
  bullets: string[];
  ctaLabel: string;
  onPress: () => void;
}

export function ContextualPremiumCard({
  title,
  subtitle,
  bullets,
  ctaLabel,
  onPress,
}: ContextualPremiumCardProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={ctaLabel}
    >
      <LinearGradient
        colors={['rgba(229, 184, 74, 0.12)', 'rgba(26, 27, 46, 0.95)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.row}>
          <View style={styles.icon}>
            <Ionicons name="diamond" size={16} color={colors.premium} />
          </View>
          <View style={styles.textWrap}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
            {bullets.map((bullet) => (
              <View key={bullet} style={styles.bulletRow}>
                <Ionicons name="ellipse" size={5} color={colors.premium} />
                <Text style={styles.bullet}>{bullet}</Text>
              </View>
            ))}
            <Text style={styles.cta}>{ctaLabel}</Text>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.sm + 4,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(229, 184, 74, 0.24)',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(229, 184, 74, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 6,
    lineHeight: 16,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  bullet: {
    fontSize: 11,
    color: colors.textMuted,
    flex: 1,
  },
  cta: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '700',
    color: colors.premium,
  },
});
