import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { CategoryWithMeta } from '../types';
import { colors, spacing, borderRadius, typography, shadows } from '../theme';

interface CategoryCardProps {
  category: CategoryWithMeta;
  onPress: () => void;
}

export function CategoryCard({ category, onPress }: CategoryCardProps) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.wrapper}>
      <LinearGradient
        colors={[category.gradient[0], '#252640', colors.cardElevated]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        locations={[0, 0.45, 1]}
        style={styles.gradient}
      >
        <View style={styles.topRow}>
          <View style={styles.iconContainer}>
            <Ionicons
              name={category.icon as keyof typeof Ionicons.glyphMap}
              size={18}
              color={colors.textPrimary}
            />
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{category.difficulty}</Text>
          </View>
        </View>
        <Text style={styles.title}>{category.title}</Text>
        <Text style={styles.description} numberOfLines={2}>
          {category.description}
        </Text>
        <View style={styles.footer}>
          <View style={styles.metaPill}>
            <Ionicons name="book-outline" size={11} color={colors.textMuted} />
            <Text style={styles.meta}>{category.lessonCount} ders</Text>
          </View>
          <Text style={styles.ctaHint}>Paketi aç</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  gradient: {
    padding: spacing.sm + 6,
    minHeight: 98,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.h3,
    fontSize: 16,
    marginBottom: 2,
  },
  description: {
    ...typography.captionBright,
    fontSize: 11,
    lineHeight: 16,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: borderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  meta: {
    ...typography.meta,
    fontSize: 10,
    color: colors.textMuted,
  },
  ctaHint: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.2,
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  badgeText: {
    ...typography.meta,
    fontSize: 10,
    color: colors.textPrimary,
    fontWeight: '600',
  },
});
