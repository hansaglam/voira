import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TabScreenProps } from '../navigation/types';
import {
  ScreenContainer,
  AppCard,
  ProgressBar,
  EmptyState,
} from '../components';
import { useLearning } from '../context/LearningContext';
import { useUser } from '../context/UserContext';
import { usePremium } from '../context/PremiumContext';
import { lessons, getLessonById } from '../data/lessons';
import { getAllPracticeResults } from '../data/learningSessionStore';
import { buildProgressSummary } from '../services/progress';
import { getRecommendedLessonsFromAnalysis } from '../services/recommendations';
import { isLessonLocked } from '../utils/premiumAccess';
import { CATEGORY_LABELS, LEVEL_TO_DIFFICULTY } from '../types/lesson';
import { colors, spacing, typography, borderRadius } from '../theme';

type Props = TabScreenProps<'Progress'>;

const SEVERITY_LABELS: Record<'low' | 'medium' | 'high', string> = {
  low: 'hafif',
  medium: 'orta',
  high: 'yüksek',
};

export function ProgressScreen({ navigation }: Props) {
  const { learningProfile, getDailySession } = useLearning();
  const { profile } = useUser();
  const { isPremium } = usePremium();
  const allResults = getAllPracticeResults();
  const resultCount = allResults.length;
  const isEmpty = resultCount === 0;
  const showEarlyDataNote = resultCount > 0 && resultCount < 3;
  const showDayReport = resultCount >= 3;

  const summary = useMemo(
    () => buildProgressSummary(learningProfile, allResults, lessons),
    [allResults, learningProfile],
  );

  const recommendedLessons = useMemo(
    () =>
      getRecommendedLessonsFromAnalysis(
        {
          weakAreasDetected: summary.weakAreas.map((item) => item.labelTr),
          isPremiumUser: isPremium,
          userLevel: profile.level,
        },
        lessons,
      ).slice(0, isPremium ? 2 : 1),
    [isPremium, profile.level, summary.weakAreas],
  );

  const trendAverageNative = summary.scoreTrend.length
    ? Math.round(
        summary.scoreTrend.reduce((sum, point) => sum + point.nativeScore, 0) / summary.scoreTrend.length,
      )
    : 0;
  const trendAveragePron = summary.scoreTrend.length
    ? Math.round(
        summary.scoreTrend.reduce((sum, point) => sum + point.pronunciationScore, 0) /
          summary.scoreTrend.length,
      )
    : 0;
  const trendAverageFlu = summary.scoreTrend.length
    ? Math.round(
        summary.scoreTrend.reduce((sum, point) => sum + point.fluencyScore, 0) / summary.scoreTrend.length,
      )
    : 0;
  const trendAverageRhy = summary.scoreTrend.length
    ? Math.round(
        summary.scoreTrend.reduce((sum, point) => sum + point.rhythmScore, 0) / summary.scoreTrend.length,
      )
    : 0;

  const day1 = showDayReport ? summary.scoreTrend[0]?.nativeScore ?? 0 : 0;
  const day7 = showDayReport
    ? summary.scoreTrend[summary.scoreTrend.length - 1]?.nativeScore ?? 0
    : 0;
  const dayDiff = day7 - day1;

  const handleStartPractice = () => {
    const session = getDailySession();
    navigation.navigate('DailyPracticeSession', { sessionId: session.sessionId });
  };

  const handleGoToCategories = () => {
    navigation.navigate('MainTabs', { screen: 'Categories' });
  };

  const handleRecommendationPress = (lessonId: string) => {
    const lesson = getLessonById(lessonId);
    if (!lesson) return;
    const locked = isLessonLocked(lesson, isPremium);
    if (locked) {
      navigation.navigate('Premium');
      return;
    }
    navigation.navigate('Lesson', {
      lessonId: lesson.id,
      source: 'library',
      categoryId: lesson.category,
    });
  };

  return (
    <ScreenContainer withTabBar contentStyle={styles.content}>
      <View style={styles.header}>
        <Text style={typography.h1}>Gelişim</Text>
        <Text style={typography.screenSubtitle}>
          Konuşma pratiğindeki ilerlemeyi takip et.
        </Text>
      </View>

      {showEarlyDataNote ? (
        <View style={styles.earlyDataNote}>
          <Ionicons name="information-circle-outline" size={14} color={colors.textMuted} />
          <Text style={styles.earlyDataText}>
            Birkaç pratikten sonra gelişim verilerin daha anlamlı hale gelecek.
          </Text>
        </View>
      ) : null}

      {isEmpty ? (
        <AppCard style={styles.emptyCard}>
          <EmptyState
            title="Henüz gelişim verisi yok"
            message="İlk pratiğini tamamladığında gelişim verilerin burada görünecek."
            icon="stats-chart-outline"
            actionLabel="İlk pratiğe başla"
            onAction={handleStartPractice}
          />
          <Pressable style={styles.secondaryCta} onPress={handleGoToCategories}>
            <Text style={styles.secondaryCtaText}>Derslere git</Text>
          </Pressable>
        </AppCard>
      ) : (
        <>
      <AppCard style={styles.weekCard}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTitle}>Bu hafta konuşma pratiğin</Text>
          <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
        </View>
        <View style={styles.statsGrid}>
          {[
            { label: 'Süre', value: `${summary.totalPracticeMinutes} dk`, icon: 'time-outline' as const },
            { label: 'Ders', value: `${summary.completedLessons} ders`, icon: 'book-outline' as const },
            { label: 'Ortalama', value: `${summary.averageNativeScore} Native`, icon: 'stats-chart-outline' as const },
            { label: 'Seri', value: `${summary.currentStreak} gün`, icon: 'flame-outline' as const },
          ].map((stat) => (
            <View key={stat.label} style={styles.statTile}>
              <Ionicons name={stat.icon} size={14} color={colors.secondary} />
              <Text style={styles.statTileValue}>{stat.value}</Text>
              <Text style={styles.statTileLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>
      </AppCard>

      <AppCard style={styles.trendCard}>
        <Text style={styles.cardTitle}>Skor gelişimin</Text>
        <View style={styles.trendMetric}>
          <Text style={styles.trendLabel}>Native Score</Text>
          <Text style={styles.trendValue}>{trendAverageNative}</Text>
          <ProgressBar progress={trendAverageNative} color={colors.primary} height={5} />
        </View>
        <View style={styles.trendMetric}>
          <Text style={styles.trendLabel}>Telaffuz</Text>
          <Text style={styles.trendValue}>{trendAveragePron}</Text>
          <ProgressBar progress={trendAveragePron} color={colors.secondary} height={5} />
        </View>
        <View style={styles.trendMetric}>
          <Text style={styles.trendLabel}>Akıcılık</Text>
          <Text style={styles.trendValue}>{trendAverageFlu}</Text>
          <ProgressBar progress={trendAverageFlu} color={colors.warning} height={5} />
        </View>
        <View style={styles.trendMetric}>
          <Text style={styles.trendLabel}>Ritim</Text>
          <Text style={styles.trendValue}>{trendAverageRhy}</Text>
          <ProgressBar progress={trendAverageRhy} color={colors.premium} height={5} />
        </View>
      </AppCard>

      <AppCard style={styles.weakCard}>
        <Text style={styles.cardTitle}>Zayıf alanların</Text>
        {summary.weakAreas.length > 0 ? (
          <View style={styles.weakAreas}>
            {summary.weakAreas.slice(0, 5).map((area) => (
              <View
                key={area.id}
                style={[
                  styles.weakTag,
                  area.severity === 'high'
                    ? styles.weakHigh
                    : area.severity === 'medium'
                      ? styles.weakMedium
                      : styles.weakLow,
                ]}
              >
                <Text style={styles.weakText}>{area.labelTr}</Text>
                <Text style={styles.weakSeverity}>{SEVERITY_LABELS[area.severity]}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyWeakText}>
            Şu an belirgin bir zayıf alan yok. Pratiğe devam et.
          </Text>
        )}
      </AppCard>

      <AppCard style={styles.recommendCard}>
        <Text style={styles.cardTitle}>Sıradaki önerilen çalışma</Text>
        {recommendedLessons.length > 0 ? (
          recommendedLessons.map((item) => {
            const lesson = getLessonById(item.lessonId);
            const locked = item.isPremium && !isPremium;
            return (
              <Pressable
                key={item.lessonId}
                style={({ pressed }) => [
                  styles.recommendItem,
                  locked && styles.recommendItemLocked,
                  pressed && styles.recommendPressed,
                ]}
                onPress={() => handleRecommendationPress(item.lessonId)}
              >
                <View style={styles.recommendRow}>
                  <Text style={styles.recommendTitle}>{item.title}</Text>
                  <Text style={[styles.recommendBadge, locked && styles.recommendBadgePremium]}>
                    {locked ? 'SpeakPlus' : 'Ücretsiz'}
                  </Text>
                </View>
                <Text style={styles.recommendReason}>{item.reasonTr}</Text>
                <Text style={styles.recommendMeta}>
                  {CATEGORY_LABELS[lesson?.category ?? 'daily']} • {lesson?.estimatedMinutes ?? 3} dk •{' '}
                  {LEVEL_TO_DIFFICULTY[lesson?.level ?? 'beginner']}
                </Text>
                <Text style={[styles.recommendCta, locked && styles.recommendCtaPremium]}>
                  {locked ? 'SpeakPlus ile aç' : 'Çalış'}
                </Text>
              </Pressable>
            );
          })
        ) : (
          <Text style={styles.emptyWeakText}>Şimdilik net bir öneri bulunamadı. Pratiğe devam et.</Text>
        )}
      </AppCard>

      <AppCard style={styles.recentCard}>
        <Text style={styles.cardTitle}>Son çalışmalar</Text>
        {summary.recentPractice.length > 0 ? (
          summary.recentPractice.slice(0, 3).map((item) => (
            <View key={item.resultId} style={styles.recentItem}>
              <View style={styles.recentMain}>
                <Text style={styles.recentLesson} numberOfLines={1}>
                  {item.lessonTitle}
                </Text>
                <Text style={styles.recentMeta}>
                  {item.date} • {item.mode}
                </Text>
              </View>
              <View style={styles.recentScoreWrap}>
                <Text style={styles.recentScore}>{item.nativeScore}</Text>
                <Text style={styles.recentWeak} numberOfLines={1}>
                  {item.weakAreasDetected[0] ?? 'akış'}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.emptyWeakText}>Henüz kayıtlı çalışma görünmüyor.</Text>
        )}
      </AppCard>

      {showDayReport ? (
      <AppCard style={styles.dayCard}>
        <Text style={styles.cardTitle}>Day 1 vs Day 7 gelişim raporu</Text>
        {!isPremium ? (
          <View style={styles.lockedWrap}>
            <Text style={styles.lockedText}>
              İlk kaydınla 7. gün kaydını karşılaştırarak gelişimini gör.
            </Text>
            <Pressable style={styles.lockedCta} onPress={() => navigation.navigate('Premium')}>
              <Text style={styles.lockedCtaText}>SpeakPlus ile aç</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.dayReport}>
            <View style={styles.dayColumn}>
              <Text style={styles.dayLabel}>Day 1</Text>
              <Text style={styles.dayScore}>{day1}</Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color={colors.secondary} />
            <View style={styles.dayColumn}>
              <Text style={styles.dayLabel}>Day 7</Text>
              <Text style={[styles.dayScore, dayDiff >= 0 && styles.dayScoreUp]}>{day7}</Text>
            </View>
            <Text style={[styles.dayGain, dayDiff < 0 && styles.dayGainDown]}>
              {dayDiff >= 0 ? `+${dayDiff}` : `${dayDiff}`} gelişim
            </Text>
          </View>
        )}
      </AppCard>
      ) : null}
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
  earlyDataNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    marginBottom: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.12)',
    backgroundColor: 'rgba(26, 27, 46, 0.55)',
  },
  earlyDataText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
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
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  weekCard: {
    marginBottom: spacing.sm,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statTile: {
    width: '48.5%',
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(26, 27, 46, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(58, 59, 82, 0.72)',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    flexGrow: 1,
    gap: 2,
  },
  statTileValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statTileLabel: {
    fontSize: 10,
    color: colors.textMuted,
  },
  trendCard: {
    marginBottom: spacing.sm,
  },
  trendMetric: {
    marginTop: spacing.sm,
    gap: 4,
  },
  trendLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  trendValue: {
    position: 'absolute',
    right: 0,
    top: 0,
    fontSize: 11,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  weakCard: {
    marginBottom: spacing.sm,
  },
  weakAreas: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: spacing.sm,
  },
  weakTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardElevated,
  },
  weakLow: {
    backgroundColor: 'rgba(91, 95, 239, 0.07)',
    borderColor: 'rgba(91, 95, 239, 0.2)',
  },
  weakMedium: {
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    borderColor: 'rgba(139, 92, 246, 0.22)',
  },
  weakHigh: {
    backgroundColor: 'rgba(167, 139, 250, 0.1)',
    borderColor: 'rgba(167, 139, 250, 0.26)',
  },
  weakText: {
    fontSize: 11,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  weakSeverity: {
    marginTop: 2,
    fontSize: 9,
    color: colors.textMuted,
  },
  emptyWeakText: {
    marginTop: spacing.sm,
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
  },
  recommendCard: {
    marginBottom: spacing.sm,
  },
  recommendItem: {
    marginTop: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(58, 59, 82, 0.75)',
    backgroundColor: 'rgba(26, 27, 46, 0.72)',
    padding: spacing.sm,
  },
  recommendItemLocked: {
    borderColor: 'rgba(196, 181, 253, 0.22)',
    backgroundColor: 'rgba(139, 92, 246, 0.06)',
  },
  recommendPressed: {
    opacity: 0.9,
  },
  recommendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  recommendTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  recommendBadge: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.success,
    borderColor: 'rgba(34, 197, 94, 0.25)',
    borderWidth: 1,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  recommendBadgePremium: {
    color: colors.premium,
    borderColor: 'rgba(196, 181, 253, 0.28)',
    backgroundColor: 'rgba(196, 181, 253, 0.12)',
  },
  recommendReason: {
    marginTop: 5,
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  recommendMeta: {
    marginTop: 3,
    fontSize: 10,
    color: colors.textMuted,
  },
  recommendCta: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  recommendCtaPremium: {
    color: colors.premium,
  },
  recentCard: {
    marginBottom: spacing.sm,
  },
  recentItem: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(58, 59, 82, 0.7)',
    paddingBottom: spacing.sm,
  },
  recentMain: {
    flex: 1,
    minWidth: 0,
  },
  recentLesson: {
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  recentMeta: {
    marginTop: 2,
    fontSize: 10,
    color: colors.textMuted,
  },
  recentScoreWrap: {
    alignItems: 'flex-end',
    marginLeft: spacing.sm,
  },
  recentScore: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.secondary,
  },
  recentWeak: {
    fontSize: 9,
    color: colors.textMuted,
    maxWidth: 90,
  },
  dayCard: {
    marginBottom: spacing.md,
  },
  lockedWrap: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  lockedText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  lockedCta: {
    alignSelf: 'flex-start',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(196, 181, 253, 0.28)',
    backgroundColor: 'rgba(196, 181, 253, 0.1)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  lockedCtaText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.premium,
  },
  dayReport: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dayColumn: {
    alignItems: 'center',
    minWidth: 70,
  },
  dayLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },
  dayScore: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  dayScoreUp: {
    color: colors.success,
  },
  dayGain: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.success,
  },
  dayGainDown: {
    color: colors.textMuted,
  },
});
