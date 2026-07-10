import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Lesson, CATEGORY_LABELS, LEVEL_TO_DIFFICULTY } from '../types/lesson';
import { colors, spacing, borderRadius } from '../theme';

interface LessonHeaderProps {
  lesson: Lesson;
  /** Tighter layout for guided methodology flow */
  variant?: 'default' | 'methodology' | 'quick';
}

export function LessonHeader({ lesson, variant = 'default' }: LessonHeaderProps) {
  const isMethodology = variant === 'methodology';
  const isQuick = variant === 'quick';
  const isCompact = isMethodology || isQuick;
  const levelLabel = LEVEL_TO_DIFFICULTY[lesson.level];
  const metaLine = `${CATEGORY_LABELS[lesson.category]} • ${lesson.estimatedMinutes} dk • ${levelLabel}`;

  return (
    <View style={[styles.container, isCompact && styles.containerMethodology]}>
      <View style={styles.titleRow}>
        <Text style={[styles.title, isCompact && styles.titleMethodology]} numberOfLines={2}>
          {lesson.title}
        </Text>
        {lesson.isPremium ? (
          <View style={styles.premiumBadge}>
            <Ionicons name="diamond-outline" size={9} color={colors.premium} />
          </View>
        ) : null}
      </View>

      {lesson.subtitle ? (
        <Text
          style={[styles.subtitle, isCompact && styles.subtitleMethodology]}
          numberOfLines={isCompact ? 1 : 2}
        >
          {lesson.subtitle}
        </Text>
      ) : null}

      {!isQuick ? (
        isMethodology ? (
          <Text style={styles.objectiveCompact} numberOfLines={2}>
            {lesson.learningObjectiveTr}
          </Text>
        ) : (
          <Text style={styles.objective}>{lesson.learningObjectiveTr}</Text>
        )
      ) : null}

      <View style={styles.metaRow}>
        <Text style={[styles.metaLine, isCompact && styles.metaLineMethodology]}>
          {metaLine}
        </Text>
      </View>

      {isCompact ? (
        <View style={styles.focusPill}>
          <Ionicons name="flag-outline" size={11} color={colors.secondary} />
          <Text style={styles.focusText} numberOfLines={1}>
            {lesson.focusSkill}
          </Text>
        </View>
      ) : (
        <View style={styles.badgeRow}>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{lesson.focusSkill}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xs,
  },
  containerMethodology: {
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    marginBottom: 2,
  },
  title: {
    flex: 1,
    fontSize: 21,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 27,
    letterSpacing: -0.3,
  },
  titleMethodology: {
    fontSize: 19,
    lineHeight: 24,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    lineHeight: 18,
  },
  subtitleMethodology: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 4,
    color: colors.textMuted,
  },
  objective: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 17,
    marginBottom: spacing.xs,
  },
  objectiveCompact: {
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 15,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  metaLine: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textMuted,
    lineHeight: 18,
  },
  metaLineMethodology: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.15,
  },
  premiumBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(196, 181, 253, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(196, 181, 253, 0.22)',
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  typeBadge: {
    backgroundColor: 'rgba(91, 95, 239, 0.12)',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(91, 95, 239, 0.2)',
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  focusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    backgroundColor: 'rgba(139, 92, 246, 0.07)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.14)',
    maxWidth: '100%',
  },
  focusText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    flexShrink: 1,
  },
});
