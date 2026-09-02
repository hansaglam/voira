import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { RootScreenProps } from '../navigation/types';
import { ScreenContainer, LibraryLessonCard, SectionHeader, EmptyState } from '../components';
import {
  getCategoryLessonStats,
  openLessonFromLibrary,
  resolveLessonProgressState,
} from '../data/lessonLibrary';
import { getAllPracticeResults } from '../data/learningSessionStore';
import { resolveResumeSegmentIndex } from '../data/lessonSegmentProgress';
import { usePremium } from '../context/PremiumContext';
import { useAuth } from '../context/AuthContext';
import { isRegisteredUser } from '../utils/authAccess';
import { useLearning } from '../context/LearningContext';
import { resolveLessonPremium } from '../utils/lessonUtils';
import { Lesson, LessonLevel } from '../types/lesson';
import { colors, spacing, typography } from '../theme';
import { trackWeeklyChallengeEvent } from '../services/analytics/weeklyChallengeAnalytics';

type Props = RootScreenProps<'CategoryLessons'>;

function levelSortOrder(level: LessonLevel): number {
  if (level === 'beginner') return 0;
  if (level === 'intermediate') return 1;
  return 2;
}

function sortActiveLessons(lessons: Lesson[]): Lesson[] {
  return [...lessons].sort((a, b) => {
    const aPremium = resolveLessonPremium(a);
    const bPremium = resolveLessonPremium(b);
    if (aPremium !== bPremium) return aPremium ? 1 : -1;

    const levelDiff = levelSortOrder(a.level) - levelSortOrder(b.level);
    if (levelDiff !== 0) return levelDiff;

    return a.title.localeCompare(b.title, 'tr');
  });
}

function sortCompletedLessons(lessons: Lesson[]): Lesson[] {
  return [...lessons].sort((a, b) => a.title.localeCompare(b.title, 'tr'));
}

export function CategoryLessonsScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { isPremium } = usePremium();
  const { user } = useAuth();
  const registered = isRegisteredUser(user);
  const { learningProfile } = useLearning();
  const { categoryId } = route.params;
  const stats = useMemo(() => getCategoryLessonStats(categoryId), [categoryId]);
  const practiceResults = useMemo(
    () => getAllPracticeResults(),
    [
      learningProfile.completedLessonIds,
      learningProfile.lastPracticeDate,
      learningProfile.averageScore,
      learningProfile.bestScore,
    ],
  );

  const category = stats.category;

  const { activeLessons, completedLessons } = useMemo(() => {
    const active: Lesson[] = [];
    const completed: Lesson[] = [];

    for (const lesson of stats.lessons) {
      const progressState = resolveLessonProgressState(
        lesson,
        learningProfile.completedLessonIds,
        practiceResults,
      );
      if (progressState === 'completed') {
        completed.push(lesson);
      } else {
        active.push(lesson);
      }
    }

    return {
      activeLessons: sortActiveLessons(active),
      completedLessons: sortCompletedLessons(completed),
    };
  }, [learningProfile.completedLessonIds, practiceResults, stats.lessons]);

  const showDailyGoal = categoryId === 'daily';

  const handleLessonPress = (lesson: Lesson) => {
    if (resolveLessonPremium(lesson) && !isPremium) {
      trackWeeklyChallengeEvent('premium_content_opened', { lessonId: lesson.id, categoryId: lesson.category, level: lesson.level });
    }
    const progressState = resolveLessonProgressState(
      lesson,
      learningProfile.completedLessonIds,
      practiceResults,
    );
    const segmentIndex =
      progressState === 'completed'
        ? 0
        : resolveResumeSegmentIndex(lesson, learningProfile.completedLessonIds, practiceResults);

    openLessonFromLibrary(navigation, lesson, isPremium, registered, categoryId, segmentIndex);
  };

  if (!category) {
    return (
      <ScreenContainer withPersistentTabBar activeTab="Categories" contentStyle={styles.content}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <EmptyState
          title={t('categories.emptyTitle')}
          message={t('categories.emptyMessage')}
          icon="book-outline"
          actionLabel={t('categories.emptyAction')}
          onAction={() => navigation.goBack()}
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer withPersistentTabBar activeTab="Categories" contentStyle={styles.content}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={typography.h1}>{category.title}</Text>
        <Text style={styles.description}>{category.description}</Text>
        <View style={styles.statsRow}>
          <View style={styles.statPill}>
            <Ionicons name="book-outline" size={13} color={colors.primary} />
            <Text style={styles.statText}>
              {t('categories.lessonsCount', { count: stats.total })}
            </Text>
          </View>
          <View style={styles.statPill}>
            <Ionicons name="checkmark-circle-outline" size={13} color={colors.success} />
            <Text style={styles.statText}>
              {t('categories.freeCount', { count: stats.freeCount })}
            </Text>
          </View>
          <View style={styles.statPill}>
            <Ionicons name="diamond-outline" size={13} color={colors.premium} />
            <Text style={styles.statText}>
              {t('categories.premiumCount', { count: stats.premiumCount })}
            </Text>
          </View>
        </View>
      </View>

      {showDailyGoal ? (
        <LinearGradient
          colors={['rgba(91, 95, 239, 0.13)', 'rgba(26, 27, 46, 0.94)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.goalCard}
        >
          <View style={styles.goalHeader}>
            <Ionicons name="sparkles-outline" size={14} color={colors.secondary} />
            <Text style={styles.goalTitle}>{t('categories.goalDailyTitle')}</Text>
          </View>
          <Text style={styles.goalText}>{t('categories.goalDailyText')}</Text>
        </LinearGradient>
      ) : null}

      <View style={styles.sectionBlock}>
        <SectionHeader
          title={t('categories.activeTitle')}
          subtitle={t('categories.activeSubtitle', { count: activeLessons.length })}
        />
        {activeLessons.length > 0 ? (
          activeLessons.map((lesson) => (
            <LibraryLessonCard
              key={lesson.id}
              lesson={lesson}
              isPremiumUser={isPremium}
              dense
              progressState={resolveLessonProgressState(
                lesson,
                learningProfile.completedLessonIds,
                practiceResults,
              )}
              onPress={() => handleLessonPress(lesson)}
            />
          ))
        ) : (
          <Text style={styles.emptySectionText}>{t('categories.activeAllDone')}</Text>
        )}
      </View>

      {completedLessons.length > 0 ? (
        <View style={styles.sectionBlock}>
          <SectionHeader
            title={t('categories.completedTitle')}
            subtitle={t('categories.completedSubtitle')}
          />
          {completedLessons.map((lesson) => (
            <LibraryLessonCard
              key={`completed-${lesson.id}`}
              lesson={lesson}
              isPremiumUser={isPremium}
              dense
              sectionTone="completed"
              progressState="completed"
              onPress={() => handleLessonPress(lesson)}
            />
          ))}
        </View>
      ) : null}

      <View style={styles.bottomSpacer} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.xl + spacing.xl,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  header: {
    marginBottom: spacing.sm,
  },
  goalCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(91, 95, 239, 0.2)',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 5,
  },
  goalTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  goalText: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  description: {
    ...typography.body,
    marginTop: spacing.xs,
    lineHeight: 20,
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.card,
    borderRadius: 999,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  sectionBlock: {
    marginBottom: spacing.sm,
  },
  emptySectionText: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.sm,
  },
  bottomSpacer: {
    height: spacing.xl,
  },
});
