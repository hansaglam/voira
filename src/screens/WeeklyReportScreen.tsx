import React, { useEffect, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppCard, ScreenContainer } from '../components';
import type { RootScreenProps } from '../navigation/types';
import { useLearning } from '../context/LearningContext';
import { useWeakWordsCatalog } from '../hooks/useWeakWordsCatalog';
import { trackWeeklyReportEvent } from '../services/analytics/weeklyReportAnalytics';
import { colors, spacing, typography, borderRadius } from '../theme';
import { useWeeklyChallenge } from '../hooks/useWeeklyChallenge';
import { WeeklyChallengeCard } from '../components/weeklyChallenge/WeeklyChallengeCard';

type Props = RootScreenProps<'WeeklyReport'>;

function bucket(count: number): string { return count === 0 ? '0' : count <= 2 ? '1-2' : count <= 5 ? '3-5' : '6+'; }

export function WeeklyReportScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation();
  const { getDailySession } = useLearning();
  const { practiceResults } = useWeakWordsCatalog();
  const viewedRef = useRef(false);
  const { challenge: weeklyChallenge, report } = useWeeklyChallenge();

  useEffect(() => {
    if (viewedRef.current) return;
    viewedRef.current = true;
    trackWeeklyReportEvent('weekly_report_viewed', {
      dataQuality: report.dataQuality, practiceCountBucket: bucket(report.practiceCount), trendCategory: report.trendCategory,
      strongestMetricId: report.strongestMetric, focusMetricId: report.focusMetric, roleplaySessionCountBucket: bucket(report.roleplaySessionsCompleted),
    });
  }, [report]);

  const range = useMemo(() => {
    const start = new Date(report.weekStart);
    const end = new Date(new Date(report.weekEnd).getTime() - 1);
    const locale = i18n.language === 'tr' ? 'tr-TR' : 'en-US';
    return `${start.toLocaleDateString(locale, { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString(locale, { day: 'numeric', month: 'short' })}`;
  }, [i18n.language, report.weekEnd, report.weekStart]);

  const metricLabel = (metric?: string | null) => metric ? t(`weeklyReport.metric.${metric}`) : '';
  const priorityLabel = (priority?: string | null) => priority ? t(`weeklyReport.priority.${priority}`) : '';
  const analytics = { dataQuality: report.dataQuality, practiceCountBucket: bucket(report.practiceCount), trendCategory: report.trendCategory, strongestMetricId: report.strongestMetric, focusMetricId: report.focusMetric, roleplaySessionCountBucket: bucket(report.roleplaySessionsCompleted) };

  const startNextFocus = () => {
    trackWeeklyReportEvent('weekly_report_next_focus_tapped', analytics);
    if (report.nextWeekFocusId === 'next_weak_words_practice') navigation.navigate('WeakWords');
    else { const session = getDailySession(); navigation.navigate('DailyPracticeSession', { sessionId: session.sessionId }); }
  };

  return (
    <ScreenContainer contentStyle={styles.content}>
      <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.back}><Ionicons name="arrow-back" size={22} color={colors.textPrimary} /></Pressable>
      <Text style={typography.h1}>{t('weeklyReport.title')}</Text>
      <Text style={styles.range}>{range}</Text>

      <AppCard style={styles.summaryCard}>
        <Ionicons name="sparkles-outline" size={22} color={colors.secondary} />
        <Text style={styles.summary}>{t(`weeklyReport.summary.${report.summaryInsightId}`)}</Text>
        {report.dataQuality === 'insufficient' ? <Text style={styles.muted}>{t('weeklyReport.noDataBody')}</Text> : null}
        {report.dataQuality === 'partial' ? <Text style={styles.muted}>{t('weeklyReport.partialDataBody')}</Text> : null}
      </AppCard>

      {weeklyChallenge ? <WeeklyChallengeCard compact challenge={weeklyChallenge} source="weekly_report" onPress={() => {
        if (weeklyChallenge.status === 'completed') { navigation.navigate('MainTabs', { screen: 'Home' }); return; }
        if (weeklyChallenge.type === 'weak_word_practice') { navigation.navigate('WeakWords'); return; }
        if (weeklyChallenge.type === 'roleplay_sessions') { navigation.navigate('RoleplayDiscover'); return; }
        if (weeklyChallenge.type === 'retry_improvement') {
          const latest = [...practiceResults]
            .filter((result) => result.lessonId && result.segmentId)
            .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0];
          if (latest?.segmentId) {
            navigation.navigate('Lesson', {
              lessonId: latest.lessonId,
              segmentId: latest.segmentId,
              sessionId: latest.sessionId,
              source: latest.mode === 'daily' ? 'dailySession' : 'library',
            });
            return;
          }
        }
        const session = getDailySession(); navigation.navigate('DailyPracticeSession', { sessionId: session.sessionId });
      }} /> : null}

      <View style={styles.stats}>
        {[
          [t('weeklyReport.practiceDays'), report.practiceDays], [t('weeklyReport.speakingPractices'), report.practiceCount],
          [t('weeklyReport.averageScore'), report.averageSpeakingScore ?? '—'], [t('weeklyReport.roleplaySessions'), report.roleplaySessionsCompleted],
        ].map(([label, value]) => <View key={String(label)} style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>)}
      </View>

      {report.speakingScoreDelta != null ? <Text style={styles.trend}>{t(`weeklyReport.${report.trendCategory}`)} · {report.speakingScoreDelta > 0 ? '+' : ''}{report.speakingScoreDelta} {t('weeklyReport.comparedLastWeek')}</Text> : null}

      <Text style={styles.sectionTitle}>{t('weeklyReport.whatImproved')}</Text>
      {report.highlights.length ? report.highlights.map((item, index) => (
        <AppCard key={`${item.id}-${index}`} style={styles.rowCard}><Ionicons name="trending-up-outline" size={19} color={colors.success} /><Text style={styles.rowText}>{t(`weeklyReport.highlight.${item.id}`, { value: item.value, metric: metricLabel(item.metric) })}</Text></AppCard>
      )) : <Text style={styles.muted}>{t('weeklyReport.notEnoughData')}</Text>}

      <Text style={styles.sectionTitle}>{t('weeklyReport.focusNextWeek')}</Text>
      {report.focusItems.map((item, index) => (
        <AppCard key={`${item.id}-${index}`} style={styles.rowCard}><Ionicons name="compass-outline" size={19} color={colors.secondary} /><Text style={styles.rowText}>{t(`weeklyReport.focus.${item.id}`, { value: item.value, metric: metricLabel(item.metric), priority: priorityLabel(item.priority) })}</Text></AppCard>
      ))}

      <Text style={styles.sectionTitle}>{t('weeklyReport.weakWords')}</Text>
      <AppCard style={styles.detailCard}><Text style={styles.detailText}>{t('weeklyReport.active')}: {report.activeWeakWordCount}</Text><Text style={styles.detailText}>{t('weeklyReport.improving')}: {report.improvingWeakWordCount}</Text><Text style={styles.detailText}>{t('weeklyReport.mastered')}: {report.masteredWeakWordCount}</Text></AppCard>
      <Pressable onPress={() => { trackWeeklyReportEvent('weekly_report_weak_words_tapped', analytics); navigation.navigate('WeakWords'); }} style={styles.link}><Text style={styles.linkText}>{t('weeklyReport.viewWeakWords')}</Text></Pressable>

      <Text style={styles.sectionTitle}>{t('weeklyReport.roleplayActivity')}</Text>
      <AppCard style={styles.detailCard}><Text style={styles.detailText}>{report.roleplaySessionsCompleted > 0 ? t('weeklyReport.highlight.roleplay_completed', { value: report.roleplaySessionsCompleted }) : t('weeklyReport.noRoleplay')}</Text></AppCard>
      <Pressable onPress={() => { trackWeeklyReportEvent('weekly_report_roleplay_tapped', analytics); navigation.navigate('RoleplayDiscover'); }} style={styles.link}><Text style={styles.linkText}>{t('weeklyReport.tryRoleplay')}</Text></Pressable>

      <AppCard style={styles.nextCard}><Text style={styles.nextLabel}>{t('weeklyReport.focusNextWeek')}</Text><Text style={styles.nextText}>{t(`weeklyReport.next.${report.nextWeekFocusId}`)}</Text></AppCard>
      <Pressable accessibilityRole="button" onPress={startNextFocus} style={styles.primary}><Text style={styles.primaryText}>{t('weeklyReport.startFocus')}</Text></Pressable>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xl }, back: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', marginLeft: -spacing.sm },
  range: { color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.lg }, summaryCard: { marginBottom: spacing.md, gap: spacing.sm }, summary: { color: colors.textPrimary, fontSize: 17, fontWeight: '700', lineHeight: 24 }, muted: { color: colors.textMuted, lineHeight: 20 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm }, stat: { width: '48%', backgroundColor: colors.card, borderRadius: borderRadius.lg, padding: spacing.md }, statValue: { color: colors.textPrimary, fontSize: 22, fontWeight: '800' }, statLabel: { color: colors.textMuted, fontSize: 12, marginTop: spacing.xs },
  trend: { color: colors.secondary, fontWeight: '700', marginVertical: spacing.sm }, sectionTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '800', marginTop: spacing.lg, marginBottom: spacing.sm }, rowCard: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.sm }, rowText: { color: colors.textSecondary, lineHeight: 21, flex: 1 },
  detailCard: { gap: spacing.xs }, detailText: { color: colors.textSecondary, lineHeight: 21 }, link: { paddingVertical: spacing.md, alignItems: 'flex-start' }, linkText: { color: colors.secondary, fontWeight: '700' }, nextCard: { marginTop: spacing.lg }, nextLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '700' }, nextText: { color: colors.textPrimary, fontSize: 18, fontWeight: '800', marginTop: spacing.xs },
  primary: { height: 52, borderRadius: borderRadius.lg, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: spacing.md }, primaryText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
