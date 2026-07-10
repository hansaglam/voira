import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { RootScreenProps } from '../navigation/types';
import { ScreenContainer, LibraryLessonCard, SectionHeader, EmptyState } from '../components';
import { getContinueLesson, openLessonFromLibrary, type LessonProgressState } from '../data/lessonLibrary';
import { getCategoryById } from '../data/lessons';
import { getLessonsByCategory } from '../services/contentRepository';
import { usePremium } from '../context/PremiumContext';
import { useLearning } from '../context/LearningContext';
import { resolveLessonPremium } from '../utils/lessonUtils';
import { Lesson, LessonCategory, LessonLevel } from '../types/lesson';
import { colors, spacing, typography } from '../theme';

type Props = RootScreenProps<'CategoryLessons'>;

type CategoryLessonStats = {
  total: number;
  freeCount: number;
  premiumCount: number;
  lessons: Lesson[];
  category: ReturnType<typeof getCategoryById>;
};

async function loadCategoryLessonStats(
  categoryId: LessonCategory,
): Promise<CategoryLessonStats> {
  const lessons = await getLessonsByCategory(categoryId, { includePremium: true });
  const freeCount = lessons.filter((lesson) => !resolveLessonPremium(lesson)).length;
  const premiumCount = lessons.filter((lesson) => resolveLessonPremium(lesson)).length;

  return {
    total: lessons.length,
    freeCount,
    premiumCount,
    lessons,
    category: getCategoryById(categoryId),
  };
}

const CATEGORY_GOAL_COPY: Partial<Record<string, { title: string; text: string }>> = {
  daily: {
    title: 'Bu pakette ne öğreneceksin?',
    text: 'Günlük hayatta selamlaşma, kısa sohbet başlatma ve kibarca cevap verme kalıplarını shadowing ile çalışacaksın.',
  },
};

function levelSortOrder(level: LessonLevel): number {
  if (level === 'beginner') return 0;
  if (level === 'intermediate') return 1;
  return 2;
}

function sortCategoryLessons(lessons: Lesson[], completedLessonIds: string[]): Lesson[] {
  return [...lessons].sort((a, b) => {
    const aPremium = resolveLessonPremium(a);
    const bPremium = resolveLessonPremium(b);
    if (aPremium !== bPremium) return aPremium ? 1 : -1;

    const levelDiff = levelSortOrder(a.level) - levelSortOrder(b.level);
    if (levelDiff !== 0) return levelDiff;

    const aCompleted = completedLessonIds.includes(a.id);
    const bCompleted = completedLessonIds.includes(b.id);
    if (aCompleted !== bCompleted) return aCompleted ? 1 : -1;

    return a.title.localeCompare(b.title, 'tr');
  });
}

export function CategoryLessonsScreen({ navigation, route }: Props) {
  const { isPremium } = usePremium();
  const { learningProfile } = useLearning();
  const { categoryId } = route.params;
  const [stats, setStats] = useState<CategoryLessonStats | null>(null);
  const continueLesson = getContinueLesson(learningProfile);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const nextStats = await loadCategoryLessonStats(categoryId);
      if (!cancelled) {
        setStats(nextStats);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [categoryId]);

  const category = stats?.category;

  const continueInCategory =
    continueLesson.category === categoryId ? continueLesson : null;

  const getLessonProgressState = (lessonId: string): LessonProgressState => {
    if (learningProfile.completedLessonIds.includes(lessonId)) return 'completed';
    if (continueInCategory?.id === lessonId) return 'in_progress';
    return 'not_started';
  };

  const { continueLessons, allLessons } = useMemo(() => {
    if (!stats) {
      return { continueLessons: [] as Lesson[], allLessons: [] as Lesson[] };
    }

    const sorted = sortCategoryLessons(stats.lessons, learningProfile.completedLessonIds);
    const continueLessonId = continueInCategory?.id;
    const inProgress = sorted.filter(
      (lesson) =>
        lesson.id === continueLessonId &&
        !learningProfile.completedLessonIds.includes(lesson.id),
    );
    const inProgressIds = new Set(inProgress.map((lesson) => lesson.id));
    const remaining = sorted.filter((lesson) => !inProgressIds.has(lesson.id));

    return { continueLessons: inProgress, allLessons: remaining };
  }, [stats, learningProfile.completedLessonIds, continueInCategory?.id]);

  const categoryGoal = CATEGORY_GOAL_COPY[categoryId];

  const handleLessonPress = (lessonId: string) => {
    const lesson = stats?.lessons.find((l) => l.id === lessonId);
    if (!lesson) return;
    openLessonFromLibrary(navigation, lesson, isPremium, categoryId);
  };

  if (!stats || !category) {
    return (
      <ScreenContainer withPersistentTabBar activeTab="Categories" contentStyle={styles.content}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <EmptyState
          title="Dersler hazırlanıyor"
          message="Bu paket şu anda yüklenemedi. Birkaç saniye sonra tekrar deneyebilirsin."
          icon="book-outline"
          actionLabel="Geri dön"
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
            <Text style={styles.statText}>{stats.total} ders</Text>
          </View>
          <View style={styles.statPill}>
            <Ionicons name="checkmark-circle-outline" size={13} color={colors.success} />
            <Text style={styles.statText}>{stats.freeCount} ücretsiz</Text>
          </View>
          <View style={styles.statPill}>
            <Ionicons name="diamond-outline" size={13} color={colors.premium} />
            <Text style={styles.statText}>{stats.premiumCount} SpeakPlus</Text>
          </View>
        </View>
      </View>

      {categoryGoal ? (
        <LinearGradient
          colors={['rgba(91, 95, 239, 0.13)', 'rgba(26, 27, 46, 0.94)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.goalCard}
        >
          <View style={styles.goalHeader}>
            <Ionicons name="sparkles-outline" size={14} color={colors.secondary} />
            <Text style={styles.goalTitle}>{categoryGoal.title}</Text>
          </View>
          <Text style={styles.goalText}>{categoryGoal.text}</Text>
        </LinearGradient>
      ) : null}

      {continueLessons.length > 0 ? (
        <View style={styles.sectionBlock}>
          <SectionHeader title="Devam Et" subtitle={`${continueLessons.length} ders`} />
          {continueLessons.map((lesson) => (
            <LibraryLessonCard
              key={`continue-${lesson.id}`}
              lesson={lesson}
              isPremiumUser={isPremium}
              dense
              progressState="in_progress"
              onPress={() => handleLessonPress(lesson.id)}
            />
          ))}
        </View>
      ) : null}

      <View style={styles.sectionBlock}>
        <SectionHeader title="Tüm Dersler" subtitle={`${stats.total} ders`} />
        {allLessons.map((lesson) => (
          <LibraryLessonCard
            key={lesson.id}
            lesson={lesson}
            isPremiumUser={isPremium}
            dense
            progressState={getLessonProgressState(lesson.id)}
            onPress={() => handleLessonPress(lesson.id)}
          />
        ))}
      </View>

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
  bottomSpacer: {
    height: spacing.xl,
  },
});
