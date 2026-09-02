import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppCard } from '../../AppCard';
import type { PrimaryTakeaway } from '../../../services/analysis/result';
import { colors, spacing } from '../../../theme';

interface AnalysisPrimaryTakeawayCardProps {
  takeaway: PrimaryTakeaway;
}

export function AnalysisPrimaryTakeawayCard({ takeaway }: AnalysisPrimaryTakeawayCardProps) {
  const { t } = useTranslation();

  return (
    <AppCard style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="flag" size={16} color={colors.secondary} />
        <Text style={styles.title}>{t('analysis.focusOnThis')}</Text>
      </View>
      <Text style={styles.body}>
        {t(takeaway.messageKey, takeaway.messageParams)}
      </Text>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.sm,
    borderColor: 'rgba(139, 92, 246, 0.28)',
    borderWidth: 1,
    backgroundColor: 'rgba(91, 95, 239, 0.08)',
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
    color: colors.secondary,
    letterSpacing: 0.2,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textPrimary,
    fontWeight: '500',
  },
});
