import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Lesson } from '../types';
import { AppCard } from './AppCard';
import { LockedBadge } from './ui/LockedBadge';
import {
  getLessonActionLabel,
  getPremiumValueLabels,
  getLessonTypeBadge,
  type LessonProgressState,
} from '../data/lessonLibrary';
import { isLessonCompleted as checkLessonCompleted } from '../data/lessonProgress';
import { getLessonDifficulty } from '../utils/lessonUtils';
import { isLessonLocked } from '../utils/premiumAccess';
import { colors, spacing, typography, borderRadius } from '../theme';

interface LibraryLessonCardProps {
  lesson: Lesson;
  isPremiumUser: boolean;
  onPress: () => void;
  variant?: 'list' | 'compact';
  completed?: boolean;
  completedLessonIds?: string[];
  /** Slimmer list layout for category screens */
  dense?: boolean;
  progressState?: LessonProgressState;
  ctaLabelOverride?: ReturnType<typeof getLessonActionLabel>;
  /** Lower emphasis for completed section grouping */
  sectionTone?: 'default' | 'completed';
}

export function LibraryLessonCard({
  lesson,
  isPremiumUser,
  onPress,
  variant = 'list',
  completed,
  completedLessonIds,
  dense = false,
  progressState,
  ctaLabelOverride,
  sectionTone = 'default',
}: LibraryLessonCardProps) {
  const locked = isLessonLocked(lesson, isPremiumUser);
  const isCompleted =
    completed ??
    (completedLessonIds
      ? checkLessonCompleted(lesson.id, completedLessonIds)
      : false);
  const effectiveState: LessonProgressState =
    progressState ?? (isCompleted ? 'completed' : 'not_started');
  const cta =
    ctaLabelOverride ?? getLessonActionLabel(lesson, isPremiumUser, effectiveState);
  const premiumLabel = lesson.isPremium ? getPremiumValueLabels(lesson)[0] : undefined;
  const isPremiumLesson = lesson.isPremium;
  const typeBadge = getLessonTypeBadge(lesson);
  const difficulty = getLessonDifficulty(lesson);
  const focusTag = lesson.focusSkill?.trim();

  if (variant === 'compact') {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.88} style={styles.compactWrap}>
        <AppCard style={locked ? styles.compactLockedCard : styles.compactCard}>
          <View style={styles.compactTop}>
            {locked ? (
              <LockedBadge compact />
            ) : isCompleted ? (
              <View style={styles.doneBadge}>
                <Ionicons name="checkmark" size={11} color={colors.success} />
              </View>
            ) : (
              <View style={styles.typePill}>
                <Text style={styles.typePillText}>{typeBadge}</Text>
              </View>
            )}
          </View>
          <Text style={styles.compactTitle} numberOfLines={2}>
            {lesson.title}
          </Text>
          <Text style={styles.compactFocus} numberOfLines={1}>
            {lesson.focusSkill}
          </Text>
          <Text style={styles.compactMeta}>
            {lesson.estimatedMinutes} dk • {difficulty}
          </Text>
        </AppCard>
      </TouchableOpacity>
    );
  }

  return (
    <AppCard
      style={
        locked
          ? styles.listLockedCard
          : sectionTone === 'completed'
            ? styles.completedSectionCard
            : styles.listCard
      }
    >
      <View style={styles.listRow}>
        <View style={styles.listContent}>
          <View style={styles.titleRow}>
            <Text style={styles.listTitle} numberOfLines={1}>
              {lesson.title}
            </Text>
            {locked ? <LockedBadge compact /> : null}
          </View>
          <Text style={styles.listFocus} numberOfLines={1}>
            {lesson.subtitle || lesson.focusSkill}
          </Text>
          {focusTag ? (
            <View style={styles.focusTag}>
              <Text style={styles.focusTagText} numberOfLines={1}>
                {focusTag}
              </Text>
            </View>
          ) : null}
          <View style={styles.metaRow}>
            {isPremiumLesson ? (
              <>
                <View style={styles.speakPlusBadge}>
                  <Ionicons name="diamond-outline" size={9} color={colors.premium} />
                  <Text style={styles.speakPlusText}>SpeakPlus</Text>
                </View>
                <Text style={styles.metaDot}>•</Text>
              </>
            ) : null}
            <Text style={styles.typePillText}>{typeBadge}</Text>
            <Text style={styles.metaDot}>•</Text>
            <Text style={styles.metaText}>{lesson.estimatedMinutes} dk</Text>
            <Text style={styles.metaDot}>•</Text>
            <Text style={styles.metaText}>{difficulty}</Text>
            {effectiveState === 'in_progress' ? (
              <View style={styles.statusBadge}>
                <Text style={styles.statusBadgeText}>Devam ediyor</Text>
              </View>
            ) : null}
            {effectiveState === 'completed' ? (
              <View style={[styles.statusBadge, styles.completedBadge]}>
                <Text style={[styles.statusBadgeText, styles.completedBadgeText]}>Tamamlandı</Text>
              </View>
            ) : null}
          </View>
          {locked && premiumLabel ? (
            <Text style={styles.premiumHint} numberOfLines={1}>
              {premiumLabel}
            </Text>
          ) : null}
        </View>
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [
            styles.cta,
            locked && styles.ctaPremium,
            pressed && styles.ctaPressed,
          ]}
        >
          <Text style={[styles.ctaText, locked && styles.ctaPremiumText]}>{cta}</Text>
        </Pressable>
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  listCard: {
    marginBottom: spacing.sm,
    padding: spacing.sm,
  },
  completedSectionCard: {
    marginBottom: spacing.sm,
    padding: spacing.sm,
    opacity: 0.92,
    backgroundColor: 'rgba(21, 22, 40, 0.88)',
  },
  listLockedCard: {
    marginBottom: spacing.sm,
    padding: spacing.sm,
    borderColor: 'rgba(229, 184, 74, 0.22)',
    backgroundColor: 'rgba(229, 184, 74, 0.04)',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  listContent: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  listTitle: {
    ...typography.h3,
    fontSize: 14,
    flex: 1,
  },
  listFocus: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 2,
  },
  metaText: {
    ...typography.meta,
    fontSize: 10,
  },
  metaDot: {
    color: colors.textMuted,
    fontSize: 10,
  },
  premiumHint: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.premium,
    marginTop: 5,
  },
  focusTag: {
    alignSelf: 'flex-start',
    marginTop: 1,
    marginBottom: 3,
    backgroundColor: 'rgba(91, 95, 239, 0.1)',
    borderColor: 'rgba(91, 95, 239, 0.2)',
    borderWidth: 1,
    borderRadius: borderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    maxWidth: '100%',
  },
  focusTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  inProgressDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.secondary,
  },
  statusBadge: {
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    borderRadius: borderRadius.full,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.secondary,
  },
  completedBadge: {
    backgroundColor: 'rgba(52, 211, 153, 0.08)',
    borderColor: 'rgba(52, 211, 153, 0.18)',
  },
  completedBadgeText: {
    color: colors.success,
  },
  speakPlusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(196, 181, 253, 0.12)',
    borderRadius: borderRadius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(196, 181, 253, 0.22)',
  },
  speakPlusText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.premium,
  },
  cta: {
    minWidth: 68,
    paddingHorizontal: spacing.sm,
    paddingVertical: 9,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(91, 95, 239, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(91, 95, 239, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaPremium: {
    backgroundColor: colors.premiumMuted,
    borderColor: 'rgba(229, 184, 74, 0.28)',
  },
  ctaPressed: {
    opacity: 0.85,
  },
  ctaText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  ctaPremiumText: {
    color: colors.premium,
  },
  compactWrap: {
    width: 142,
  },
  compactCard: {
    padding: spacing.sm + 2,
    minHeight: 118,
  },
  compactLockedCard: {
    padding: spacing.sm + 2,
    minHeight: 118,
    borderColor: 'rgba(229, 184, 74, 0.22)',
    backgroundColor: 'rgba(229, 184, 74, 0.04)',
  },
  compactTop: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: spacing.xs,
    minHeight: 20,
  },
  doneBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 17,
    marginBottom: 3,
  },
  compactFocus: {
    fontSize: 10,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  compactMeta: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
  },
  typePill: {
    backgroundColor: 'rgba(91, 95, 239, 0.1)',
    borderRadius: borderRadius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  typePillText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.2,
  },
});
