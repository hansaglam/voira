import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { WeakWordItem } from '../../types/weakWords';
import { colors, spacing, borderRadius } from '../../theme';

interface WeakWordCardProps {
  item: WeakWordItem;
  onPractice: () => void;
}

function statusLabelKey(status: WeakWordItem['status']): string {
  return `weakWords.status_${status}`;
}

export function WeakWordCard({ item, onPractice }: WeakWordCardProps) {
  const { t } = useTranslation();
  const previous = item.previousWeakAccuracy;
  const current = item.lastAccuracy;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.word}>{item.displayWord}</Text>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{t(statusLabelKey(item.status))}</Text>
        </View>
      </View>

      {typeof current === 'number' ? (
        <Text style={styles.scoreLine}>
          {previous != null ? `${Math.round(previous)} → ${Math.round(current)}` : Math.round(current)}
        </Text>
      ) : null}

      <Text style={styles.evidence}>
        {t('weakWords.needsWorkEvidence', {
          weak: item.weakCount,
          attempts: item.attemptCount,
        })}
      </Text>

      <TouchableOpacity style={styles.cta} onPress={onPractice} activeOpacity={0.85}>
        <Text style={styles.ctaText}>{t('weakWords.practice')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  word: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
  },
  statusBadge: {
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: 'rgba(91, 95, 239, 0.12)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(91, 95, 239, 0.25)',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.secondary,
  },
  scoreLine: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.warning,
    marginBottom: 4,
    fontVariant: ['tabular-nums'],
  },
  evidence: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  cta: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(91, 95, 239, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(91, 95, 239, 0.28)',
  },
  ctaText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
});
