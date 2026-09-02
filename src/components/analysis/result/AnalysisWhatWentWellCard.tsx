import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppCard } from '../../AppCard';
import type { WhatWentWellItem } from '../../../services/analysis/result';
import { colors, spacing } from '../../../theme';

interface AnalysisWhatWentWellCardProps {
  items: WhatWentWellItem[];
}

export function AnalysisWhatWentWellCard({ items }: AnalysisWhatWentWellCardProps) {
  const { t } = useTranslation();
  if (items.length === 0) return null;

  return (
    <AppCard style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="checkmark-circle-outline" size={16} color={colors.success} />
        <Text style={styles.title}>{t('analysis.whatWentWellTitle')}</Text>
      </View>
      {items.map((item) => (
        <Text key={item.messageKey} style={styles.item}>
          {t(item.messageKey, item.messageParams)}
        </Text>
      ))}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.sm,
    borderColor: 'rgba(52, 211, 153, 0.22)',
    backgroundColor: 'rgba(52, 211, 153, 0.05)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  item: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textSecondary,
    marginTop: 4,
  },
});
