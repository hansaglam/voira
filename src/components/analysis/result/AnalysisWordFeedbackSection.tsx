import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppCard } from '../../AppCard';
import {
  splitWordIssuePreview,
  wordQualifiesForProfileMessage,
  type RankedWordIssue,
} from '../../../services/analysis/result';
import { colors, spacing, borderRadius } from '../../../theme';

interface AnalysisWordFeedbackSectionProps {
  issues: RankedWordIssue[];
  onSeeAll?: () => void;
}

function severityLabelKey(issue: RankedWordIssue): string {
  if (issue.category === 'missing') return 'analysis.wordIssueMissing';
  if (issue.category === 'uncertain') return 'analysis.wordIssueUncertain';
  if (issue.severity === 'severe') return 'analysis.wordIssueSevere';
  return 'analysis.wordIssuePronunciation';
}

function WordIssueRow({ issue }: { issue: RankedWordIssue }) {
  const { t } = useTranslation();

  return (
    <View style={styles.row}>
      <View style={styles.rowHeader}>
        <Text style={styles.word}>{issue.word}</Text>
        {issue.category === 'pronunciation' && typeof issue.accuracyScore === 'number' ? (
          <Text style={styles.score}>{Math.round(issue.accuracyScore)}</Text>
        ) : null}
      </View>
      <Text style={styles.issueLabel}>{t(severityLabelKey(issue))}</Text>
      {issue.weakestPhoneme ? (
        <Text style={styles.phonemeHint}>
          {t('analysis.weakestPhoneme', { phoneme: issue.weakestPhoneme })}
        </Text>
      ) : null}
      {wordQualifiesForProfileMessage(issue) ? (
        <Text style={styles.profileHint}>{t('analysis.addedToProfile')}</Text>
      ) : null}
    </View>
  );
}

export function AnalysisWordFeedbackSection({
  issues,
  onSeeAll,
}: AnalysisWordFeedbackSectionProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  if (issues.length === 0) return null;

  const { preview, remainder } = splitWordIssuePreview(issues);
  const visible = expanded ? issues : preview;

  const handleSeeAll = () => {
    setExpanded(true);
    onSeeAll?.();
  };

  return (
    <AppCard style={styles.card}>
      <Text style={styles.title}>{t('analysis.wordFeedbackTitle')}</Text>
      <View style={styles.list}>
        {visible.map((issue, index) => (
          <WordIssueRow key={`${issue.word}-${issue.category}-${index}`} issue={issue} />
        ))}
      </View>
      {!expanded && remainder.length > 0 ? (
        <Pressable onPress={handleSeeAll} style={styles.seeAll} hitSlop={8}>
          <Text style={styles.seeAllText}>
            {t('analysis.seeAllWords', { count: issues.length })}
          </Text>
          <Ionicons name="chevron-down" size={14} color={colors.primary} />
        </Pressable>
      ) : null}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  list: {
    gap: spacing.sm,
  },
  row: {
    borderRadius: borderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(139, 92, 246, 0.18)',
    backgroundColor: 'rgba(26, 27, 46, 0.45)',
    padding: spacing.sm,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: 4,
  },
  word: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  score: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.warning,
    fontVariant: ['tabular-nums'],
  },
  issueLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  phonemeHint: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
  profileHint: {
    fontSize: 11,
    color: colors.secondary,
    marginTop: 6,
    fontWeight: '600',
  },
  seeAll: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
});
