import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius, typography } from '../theme';

interface FuturePracticeCardProps {
  title: string;
  subtitle: string;
  badge?: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}

export function FuturePracticeCard({
  title,
  subtitle,
  badge = 'SpeakPlus',
  icon,
  onPress,
}: FuturePracticeCardProps) {
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={styles.wrap}>
      <LinearGradient
        colors={['rgba(139, 92, 246, 0.12)', 'rgba(26, 27, 46, 0.96)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.iconWrap}>
          <Ionicons name={icon} size={16} color={colors.premium} />
        </View>
        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            <View style={styles.badge}>
              <Ionicons name="lock-closed" size={9} color={colors.premium} />
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          </View>
          <Text style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.sm,
  },
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.sm + 4,
    borderWidth: 1,
    borderColor: 'rgba(196, 181, 253, 0.18)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(196, 181, 253, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: 2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(196, 181, 253, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(196, 181, 253, 0.2)',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.premium,
  },
  title: {
    ...typography.h3,
    fontSize: 13,
    flex: 1,
  },
  subtitle: {
    fontSize: 11,
    lineHeight: 15,
    color: colors.textSecondary,
  },
});
