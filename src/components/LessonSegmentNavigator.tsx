import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../theme';
import { useTranslation } from 'react-i18next';

interface LessonSegmentNavigatorProps {
  segmentIndex: number;
  segmentTotal: number;
  onPrevious: () => void;
  onNext: () => void;
  onSelectSegment: (index: number) => void;
}

export function LessonSegmentNavigator({
  segmentIndex,
  segmentTotal,
  onPrevious,
  onNext,
  onSelectSegment,
}: LessonSegmentNavigatorProps) {
  const { t } = useTranslation();
  if (segmentTotal <= 1) return null;

  const isFirst = segmentIndex === 0;
  const isLast = segmentIndex === segmentTotal - 1;

  return (
    <View style={styles.wrapper}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionLabel}>{t('lesson.segmentProgress', { current: segmentIndex + 1, total: segmentTotal })}</Text>
      </View>

      <View style={styles.chipRow}>
        {Array.from({ length: segmentTotal }, (_, i) => {
          const active = i === segmentIndex;
          return (
            <Pressable
              key={i}
              onPress={() => onSelectSegment(i)}
              style={[styles.chip, active && styles.chipActive]}
              accessibilityRole="button"
              accessibilityLabel={t('lesson.segmentLabel', { number: i + 1 })}
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{i + 1}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.navRow}>
        <TouchableOpacity
          style={[styles.navButton, isFirst && styles.navButtonDisabled]}
          onPress={onPrevious}
          disabled={isFirst}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={t('lesson.previousSegment')}
          accessibilityState={{ disabled: isFirst }}
        >
          <Ionicons
            name="chevron-back"
            size={14}
            color={isFirst ? colors.textMuted : colors.textSecondary}
          />
          <Text style={[styles.navButtonText, isFirst && styles.navButtonTextDisabled]}>
            {t('lesson.previousSegment')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navButton, isLast && styles.navButtonFinish]}
          onPress={onNext}
          disabled={isLast}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={isLast ? t('lesson.finishLesson') : t('lesson.nextSegment')}
          accessibilityState={{ disabled: isLast }}
        >
          <Text style={[styles.navButtonText, isLast && styles.navButtonTextFinish]}>
            {isLast ? t('lesson.finishLesson') : t('lesson.nextSegment')}
          </Text>
          {!isLast ? (
            <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} />
          ) : null}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  finalHint: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.secondary,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  chip: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: 'rgba(91, 95, 239, 0.18)',
    borderColor: 'rgba(91, 95, 239, 0.45)',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  chipTextActive: {
    color: colors.primary,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 96,
    justifyContent: 'center',
  },
  navButtonDisabled: {
    opacity: 0.45,
  },
  navButtonFinish: {
    opacity: 0.55,
  },
  navButtonTextFinish: {
    color: colors.textMuted,
  },
  navButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  navButtonTextDisabled: {
    color: colors.textMuted,
  },
});
