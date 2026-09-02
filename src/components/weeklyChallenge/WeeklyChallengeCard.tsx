import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { WeeklyChallenge } from '../../services/weeklyChallenge';
import { trackWeeklyChallengeCompletedOnce, trackWeeklyChallengeEvent } from '../../services/analytics/weeklyChallengeAnalytics';
import { AppCard } from '../AppCard';
import { colors, spacing, borderRadius } from '../../theme';

export function WeeklyChallengeCard({ challenge, onPress, source, compact = false }: { challenge: WeeklyChallenge; onPress: () => void; source: 'home' | 'progress' | 'weekly_report'; compact?: boolean }) {
  const { t } = useTranslation();
  useEffect(() => {
    trackWeeklyChallengeEvent('weekly_challenge_viewed', { challengeType: challenge.type, weekKey: challenge.weekKey, status: challenge.status, source });
    trackWeeklyChallengeCompletedOnce(challenge, source);
  }, [challenge, source]);
  const progress = challenge.target > 0 ? challenge.displayCurrent / challenge.target : 0;
  return (
    <AppCard style={compact ? { ...styles.card, ...styles.compact } : styles.card}>
      <View style={styles.header}><View><Text style={styles.eyebrow}>{t('weeklyChallenge.label')}</Text><Text style={styles.title}>{t(`weeklyChallenge.${challenge.titleId}`)}</Text></View><Ionicons name={challenge.status === 'completed' ? 'checkmark-circle' : 'flag-outline'} size={24} color={challenge.status === 'completed' ? colors.success : colors.secondary} /></View>
      {!compact ? <Text style={styles.description}>{t(`weeklyChallenge.${challenge.descriptionId}`)}</Text> : null}
      <View style={styles.progressRow}><Text style={styles.progressText}>{challenge.displayCurrent} / {challenge.target}</Text><Text style={styles.status}>{challenge.status === 'completed' ? t('weeklyChallenge.completed') : t('weeklyChallenge.inProgress')}</Text></View>
      <View
        style={styles.track}
        accessibilityRole="progressbar"
        accessibilityLabel={t(`weeklyChallenge.${challenge.titleId}`)}
        accessibilityValue={{ min: 0, max: challenge.target, now: challenge.displayCurrent }}
      ><View style={[styles.fill, { width: `${Math.min(1, progress) * 100}%` }]} /></View>
      <Pressable accessibilityRole="button" onPress={() => { trackWeeklyChallengeEvent('weekly_challenge_cta_tapped', { challengeType: challenge.type, weekKey: challenge.weekKey, status: challenge.status, source }); onPress(); }} style={styles.cta}><Text style={styles.ctaText}>{challenge.status === 'completed' ? t('weeklyChallenge.completedThisWeek') : t('weeklyChallenge.continue')}</Text></Pressable>
    </AppCard>
  );
}

const styles = StyleSheet.create({ card: { marginBottom: spacing.md }, compact: { paddingVertical: spacing.md }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm }, eyebrow: { color: colors.secondary, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: .7 }, title: { color: colors.textPrimary, fontSize: 17, fontWeight: '800', marginTop: 4 }, description: { color: colors.textSecondary, lineHeight: 20, marginTop: spacing.sm }, progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md }, progressText: { color: colors.textPrimary, fontWeight: '800' }, status: { color: colors.textMuted, fontSize: 12 }, track: { height: 7, borderRadius: borderRadius.full, backgroundColor: colors.borderLight, overflow: 'hidden', marginTop: spacing.xs }, fill: { height: '100%', backgroundColor: colors.secondary }, cta: { alignSelf: 'flex-start', paddingTop: spacing.md }, ctaText: { color: colors.secondary, fontWeight: '800' } });
