import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppCard } from '../../AppCard';
import { colors, spacing } from '../../../theme';

interface AnalysisSentenceComparisonCardProps {
  targetText: string;
  transcript: string;
}

export function AnalysisSentenceComparisonCard({
  targetText,
  transcript,
}: AnalysisSentenceComparisonCardProps) {
  const { t } = useTranslation();

  return (
    <AppCard style={styles.card}>
      <Text style={styles.title}>{t('analysis.sentenceCompareTitle')}</Text>
      <View style={styles.block}>
        <Text style={styles.label}>{t('analysis.sentenceTarget')}</Text>
        <Text style={styles.text}>{targetText}</Text>
      </View>
      <View style={styles.block}>
        <Text style={styles.label}>{t('analysis.sentenceHeard')}</Text>
        <Text style={styles.text}>{transcript}</Text>
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  block: {
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  text: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
  },
});
