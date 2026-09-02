import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { TabScreenProps } from '../navigation/types';
import { ScreenContainer, AppCard, EmptyState } from '../components';
import {
  ProfileStatusHeader,
  resolveInsightTranslationKey,
  RecentSpeakingTrendCard,
  MetricProfileCard,
  GoalAlignmentCard,
  WeakWordsProfileSection,
  ProgressEvidenceSection,
  ConsistencySection,
  NextFocusSection,
} from '../components/progress';
import { useLearning } from '../context/LearningContext';
import { useUser } from '../context/UserContext';
import { getAllPracticeResults } from '../data/learningSessionStore';
import { useWeakWordsCatalog } from '../hooks/useWeakWordsCatalog';
import {
  buildProfileConsistencySnapshot,
  buildSpeakingProgressEvidence,
  resolvePrimaryCurrentFocus,
} from '../services/profile';
import { recommendTodayPractice } from '../services/home';
import { lessons } from '../data/lessons';
import { trackSpeakingProfileEvent } from '../services/analytics/speakingProfileAnalytics';
import type { SpeakingFocusArea, SpeakingMetric, NextFocusId } from '../types/speakingProfile';
import type { SpeakingPriority } from '../services/personalization/personalSpeakingPlanTypes';
import { colors, spacing, typography } from '../theme';
import { useWeeklyChallenge } from '../hooks/useWeeklyChallenge';
import { WeeklyChallengeCard } from '../components/weeklyChallenge/WeeklyChallengeCard';

type Props = TabScreenProps<'Progress'>;

function attemptCountBucket(count: number): string {
  if (count === 0) return '0';
  if (count <= 2) return '1-2';
  if (count <= 5) return '3-5';
  if (count <= 10) return '6-10';
  return '10+';
}

function resolveNextFocusKey(nextFocusId: NextFocusId): string {
  switch (nextFocusId) {
    case 'next_weak_words_practice':
      return 'nextFocus_weak_words_practice';
    case 'next_metric_pronunciation':
      return 'nextFocus_metric_pronunciation';
    case 'next_metric_fluency':
      return 'nextFocus_metric_fluency';
    case 'next_metric_prosody':
      return 'nextFocus_metric_prosody';
    case 'next_metric_completeness':
      return 'nextFocus_metric_completeness';
    case 'next_today_plan':
      return 'nextFocus_today_plan';
    default:
      return 'nextFocus_consistency';
  }
}

export function ProgressScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { learningProfile, getDailySession, lastLessonState } = useLearning();
  const { speakingPriorities } = useUser();
  const viewedRef = useRef(false);
  const { profile: speakingProfile, catalog } = useWeakWordsCatalog();
  const { challenge: weeklyChallenge } = useWeeklyChallenge();
  const practiceResults = useMemo(() => getAllPracticeResults(), [
    learningProfile.averageScore,
    learningProfile.completedLessonIds.length,
    learningProfile.lastPracticeDate,
  ]);

  const isEmpty = speakingProfile.totalAnalyzedAttempts === 0;
  const isForming = speakingProfile.totalAnalyzedAttempts < 3;

  const consistency = useMemo(
    () =>
      buildProfileConsistencySnapshot({
        profile: learningProfile,
        practiceResults,
      }),
    [learningProfile, practiceResults],
  );

  const evidence = useMemo(
    () =>
      buildSpeakingProgressEvidence({
        practiceResults,
        weakWordCatalog: catalog,
        recentTrend: speakingProfile.recentTrend,
        recentTrendDelta: speakingProfile.recentTrendDelta,
      }),
    [practiceResults, catalog, speakingProfile.recentTrend, speakingProfile.recentTrendDelta],
  );

  const todayRecommendation = useMemo(
    () =>
      recommendTodayPractice({
        profile: {
          ...learningProfile,
          speakingPriorities:
            learningProfile.speakingPriorities?.length
              ? learningProfile.speakingPriorities
              : speakingPriorities,
        },
        lessons,
        practiceResults,
        lastLessonState,
      }),
    [lastLessonState, learningProfile, practiceResults, speakingPriorities],
  );

  const currentFocus = useMemo(
    () => resolvePrimaryCurrentFocus(speakingProfile),
    [speakingProfile],
  );

  useEffect(() => {
    if (viewedRef.current) return;
    viewedRef.current = true;
    trackSpeakingProfileEvent('speaking_profile_viewed', {
      trend: speakingProfile.recentTrend,
      strongestMetric: speakingProfile.strongestMetric?.metric ?? null,
      focusMetric: speakingProfile.weakestMetric?.metric ?? null,
      attemptBucket: attemptCountBucket(speakingProfile.totalAnalyzedAttempts),
      activeWeakWords: speakingProfile.activeWeakWordCount,
    });
  }, [speakingProfile]);

  const insightText = t(resolveInsightTranslationKey(speakingProfile.primaryInsightId));

  const trendLabel = useMemo(() => {
    switch (speakingProfile.recentTrend) {
      case 'improving':
        return t('progress.trendImproving');
      case 'stable':
        return t('progress.trendStable');
      case 'declining':
        return t('progress.trendDeclining');
      default:
        return t('progress.trendInsufficient');
    }
  }, [speakingProfile.recentTrend, t]);

  const deltaLabel = useMemo(() => {
    if (
      speakingProfile.recentTrend === 'insufficient_data' ||
      speakingProfile.recentTrendDelta == null
    ) {
      return null;
    }
    const delta = speakingProfile.recentTrendDelta;
    if (delta > 0) return t('progress.trendDelta', { delta });
    if (delta < 0) return t('progress.trendDeltaNegative', { delta });
    return null;
  }, [speakingProfile.recentTrend, speakingProfile.recentTrendDelta, t]);

  const metricLabel = useCallback(
    (metric: SpeakingMetric) => t(`progress.metric_${metric}`),
    [t],
  );

  const metricDescription = useCallback(
    (metric: SpeakingMetric) => t(`progress.metricDesc_${metric}`),
    [t],
  );

  const priorityLabel = useCallback(
    (priority: SpeakingPriority) => t(`home.priority_${priority}`),
    [t],
  );

  const focusAreaLabel = useCallback(
    (area: SpeakingFocusArea) => t(`progress.focusArea_${area}`),
    [t],
  );

  const resolveEvidenceMessage = useCallback(
    (item: (typeof evidence)[number]) => {
      const key = `progress.evidence_${item.messageKey}`;
      if (item.messageKey === 'weakWordMastered' && Number(item.params?.count) !== 1) {
        return t('progress.evidence_weakWordMastered_plural', item.params);
      }
      return t(key, item.params);
    },
    [t],
  );

  const nextFocusLabel = currentFocus
    ? focusAreaLabel(currentFocus)
    : speakingProfile.weakestMetric
      ? metricLabel(speakingProfile.weakestMetric.metric)
      : t('progress.nextFocus_consistency');

  const nextFocusBody = t(`progress.${resolveNextFocusKey(speakingProfile.nextFocusId)}`, {
    count: Math.min(speakingProfile.activeWeakWordCount, 3) || 3,
  });

  const nextFocusCta =
    speakingProfile.nextFocusId === 'next_weak_words_practice'
      ? t('progress.nextFocusWeakWordsCta')
      : t('progress.nextFocusCta');

  const handleStartPractice = () => {
    trackSpeakingProfileEvent('speaking_profile_next_focus_tapped', {
      nextFocusId: speakingProfile.nextFocusId,
    });
    if (speakingProfile.nextFocusId === 'next_weak_words_practice') {
      navigation.navigate('WeakWords');
      return;
    }
    const session = getDailySession();
    navigation.navigate('DailyPracticeSession', { sessionId: session.sessionId });
  };

  const handleWeakWords = () => {
    trackSpeakingProfileEvent('speaking_profile_weak_words_tapped', {
      activeWeakWords: speakingProfile.activeWeakWordCount,
    });
    navigation.navigate('WeakWords');
  };

  const handleMetricOpened = (metric: SpeakingMetric) => {
    trackSpeakingProfileEvent('speaking_profile_metric_opened', { metric });
  };

  const handleGoalAlignmentViewed = () => {
    trackSpeakingProfileEvent('speaking_profile_goal_alignment_viewed', {
      userPriorityCount: speakingProfile.userPriorities.length,
      detectedFocusCount: speakingProfile.detectedFocusAreas.length,
    });
  };

  const handleGoToCategories = () => {
    navigation.navigate('MainTabs', { screen: 'Categories' });
  };

  return (
    <ScreenContainer withTabBar contentStyle={styles.content}>
      <View style={styles.header}>
        <Text style={typography.h1}>{t('progress.title')}</Text>
        <Text style={typography.screenSubtitle}>{t('progress.subtitle')}</Text>
      </View>

      <Pressable style={styles.weeklyReportCta} onPress={() => navigation.navigate('WeeklyReport')}>
        <View>
          <Text style={styles.weeklyReportTitle}>{t('weeklyReport.title')}</Text>
          <Text style={styles.weeklyReportBody}>{t('home.weeklyCta')}</Text>
        </View>
        <Text style={styles.weeklyReportArrow}>›</Text>
      </Pressable>

      {weeklyChallenge ? (
        <WeeklyChallengeCard compact challenge={weeklyChallenge} source="progress" onPress={() => {
          if (weeklyChallenge.status === 'completed') { navigation.navigate('WeeklyReport'); return; }
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
        }} />
      ) : null}

      {isEmpty ? (
        <AppCard style={styles.emptyCard}>
          <EmptyState
            title={t('progress.emptyTitle')}
            message={t('progress.emptyMessage')}
            icon="stats-chart-outline"
            actionLabel={t('progress.emptyCta')}
            onAction={handleStartPractice}
          />
          <Pressable style={styles.secondaryCta} onPress={handleGoToCategories}>
            <Text style={styles.secondaryCtaText}>{t('progress.goToLessons')}</Text>
          </Pressable>
        </AppCard>
      ) : (
        <>
          <ProfileStatusHeader
            isForming={isForming}
            formingTitle={t('progress.profileFormingTitle')}
            formingBody={t('progress.profileFormingBody')}
            profileTitle={t('progress.profileTitle')}
            insightText={insightText}
          />

          <RecentSpeakingTrendCard
            title={t('progress.recentSpeakingTitle')}
            score={speakingProfile.recentAverageScore}
            scoreLabel={t('progress.scoreUnavailable')}
            trend={speakingProfile.recentTrend}
            trendLabel={trendLabel}
            deltaLabel={deltaLabel}
          />

          <MetricProfileCard
            strongestTitle={t('progress.strongestTitle')}
            focusTitle={t('progress.focusTitle')}
            seeAllLabel={t('progress.seeAllMetrics')}
            strongest={speakingProfile.strongestMetric}
            focus={speakingProfile.weakestMetric}
            metricLabel={metricLabel}
            metricDescription={metricDescription}
            scoreUnavailable={t('progress.scoreUnavailable')}
            onMetricOpened={handleMetricOpened}
          />

          <GoalAlignmentCard
            title={t('progress.goalAlignmentTitle')}
            youChoseLabel={t('progress.goalYouChose')}
            noticingLabel={t('progress.goalVoiraNoticing')}
            note={t('progress.goalAlignmentNote')}
            userPriorities={speakingProfile.userPriorities}
            detectedFocus={speakingProfile.detectedFocusAreas}
            priorityLabel={priorityLabel}
            focusLabel={focusAreaLabel}
            onViewed={handleGoalAlignmentViewed}
          />

          <WeakWordsProfileSection
            title={t('progress.weakWordsProfileTitle')}
            activeLabel={t('progress.weakWordsActive', {
              count: speakingProfile.activeWeakWordCount,
            })}
            improvingLabel={t('progress.weakWordsImproving', {
              count: speakingProfile.improvingWeakWordCount,
            })}
            masteredLabel={t('progress.weakWordsMastered', {
              count: speakingProfile.masteredWeakWordCount,
            })}
            ctaLabel={t('progress.weakWordsPracticeCta')}
            activeCount={speakingProfile.activeWeakWordCount}
            improvingCount={speakingProfile.improvingWeakWordCount}
            masteredCount={speakingProfile.masteredWeakWordCount}
            topWords={speakingProfile.topWeakWords}
            onPractice={handleWeakWords}
          />

          <ProgressEvidenceSection
            title={t('progress.evidenceTitle')}
            items={evidence}
            resolveMessage={resolveEvidenceMessage}
          />

          <ConsistencySection
            title={t('progress.consistencyTitle')}
            practicesLabel={t('progress.consistencyPractices', {
              count: consistency.practicesThisWeek,
            })}
            daysLabel={t('progress.consistencyDays', {
              count: consistency.daysPracticedThisWeek,
            })}
            streakLabel={
              consistency.currentStreak != null && consistency.currentStreak > 0
                ? t('progress.consistencyStreak', { count: consistency.currentStreak })
                : null
            }
            snapshot={consistency}
          />

          <NextFocusSection
            title={t('progress.nextFocusTitle')}
            focusLabel={nextFocusLabel}
            body={
              speakingProfile.nextFocusId === 'next_today_plan' && todayRecommendation.lesson
                ? nextFocusBody
                : nextFocusBody
            }
            ctaLabel={nextFocusCta}
            nextFocusId={speakingProfile.nextFocusId}
            onPress={handleStartPractice}
          />
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.xl + spacing.lg,
  },
  header: {
    marginBottom: spacing.md,
  },
  emptyCard: {
    marginBottom: spacing.md,
  },
  secondaryCta: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  secondaryCtaText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondary,
  },
  weeklyReportCta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.card, borderRadius: 18, padding: spacing.md, marginBottom: spacing.md },
  weeklyReportTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '800' },
  weeklyReportBody: { color: colors.textMuted, fontSize: 13, marginTop: 3 },
  weeklyReportArrow: { color: colors.secondary, fontSize: 28 },
});
