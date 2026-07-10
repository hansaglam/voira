import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { RootScreenProps } from '../navigation/types';
import { ScreenContainer, LibraryLessonCard, SectionHeader, EmptyState } from '../components';
import { getContinueLesson, openLessonFromLibrary } from '../data/lessonLibrary';
import { getCategoryById } from '../data/lessons';
import { getLessonsByCategory } from '../services/contentRepository';
import { useUser } from '../context/UserContext';
import { useLearning } from '../context/LearningContext';
import { resolveLessonPremium } from '../utils/lessonUtils';
import { Lesson, LessonCategory } from '../types/lesson';
import { colors, spacing, typography } from '../theme';

type Props = RootScreenProps<'CategoryLessons'>;
type LessonProgressState = 'not_started' | 'in_progress' | 'completed';

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

export function CategoryLessonsScreen({ navigation, route }: Props) {
  const { profile } = useUser();
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

  if (!stats || !category) {
    return (
      <ScreenContainer withTabBar contentStyle={styles.content}>
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

  const continueInCategory =
    continueLesson.category === categoryId ? continueLesson : null;

  const sortedLessons = [...stats.lessons].sort((a, b) => {
    const aPremium = resolveLessonPremium(a);
    const bPremium = resolveLessonPremium(b);
    if (aPremium !== bPremium) return aPremium ? 1 : -1;
    const aCompleted = learningProfile.completedLessonIds.includes(a.id);
    const bCompleted = learningProfile.completedLessonIds.includes(b.id);
    if (aCompleted !== bCompleted) return aCompleted ? -1 : 1;
    if (continueInCategory) {
      if (a.id === continueInCategory.id) return -1;
      if (b.id === continueInCategory.id) return 1;
    }
    return a.title.localeCompare(b.title);
  });

  const freeLessons = sortedLessons.filter((l) => !resolveLessonPremium(l));
  const premiumLessons = sortedLessons.filter((l) => resolveLessonPremium(l));

  const firstFreeId = freeLessons[0]?.id;
  const secondFreeId = freeLessons[1]?.id;

  const getLessonProgressState = (lessonId: string): LessonProgressState => {
    if (learningProfile.completedLessonIds.includes(lessonId)) return 'completed';
    if (continueInCategory?.id === lessonId) return 'in_progress';
    if (lessonId === secondFreeId) return 'in_progress';
    if (lessonId === firstFreeId) return 'completed';
    return 'not_started';
  };

  const inProgressLessons = freeLessons.filter(
    (lesson) => getLessonProgressState(lesson.id) === 'in_progress',
  );
  const completedFreeLessons = freeLessons.filter(
    (lesson) => getLessonProgressState(lesson.id) === 'completed',
  );
  const remainingFreeLessons = freeLessons.filter(
    (lesson) => getLessonProgressState(lesson.id) === 'not_started',
  );

  const beginnerLessons = remainingFreeLessons.filter((lesson) => lesson.level === 'beginner');
  const nonBeginnerFreeLessons = remainingFreeLessons.filter((lesson) => lesson.level !== 'beginner');
  const categoryGoal = CATEGORY_GOAL_COPY[categoryId];

  const handleLessonPress = (lessonId: string) => {
    const lesson = stats.lessons.find((l) => l.id === lessonId);
    if (!lesson) return;
    openLessonFromLibrary(navigation, lesson, profile.isPremium, categoryId);
  };

  return (
    <ScreenContainer withTabBar contentStyle={styles.content}>
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

      {inProgressLessons.length > 0 ? (
        <View style={styles.sectionBlock}>
          <SectionHeader title="Kaldığın dersler" subtitle={`${inProgressLessons.length} ders`} />
          {inProgressLessons.map((lesson) => (
            <LibraryLessonCard
              key={lesson.id}
              lesson={lesson}
              isPremiumUser={profile.isPremium}
              dense
              progressState="in_progress"
              ctaLabelOverride="Devam et"
              onPress={() => handleLessonPress(lesson.id)}
            />
          ))}
        </View>
      ) : null}

      {beginnerLessons.length > 0 ? (
        <View style={styles.sectionBlock}>
          <SectionHeader title="Başlangıç dersleri" subtitle={`${beginnerLessons.length} ders`} />
          {beginnerLessons.map((lesson) => (
            <LibraryLessonCard
              key={lesson.id}
              lesson={lesson}
              isPremiumUser={profile.isPremium}
              dense
              progressState={getLessonProgressState(lesson.id)}
              ctaLabelOverride="Başla"
              onPress={() => handleLessonPress(lesson.id)}
            />
          ))}
        </View>
      ) : null}

      {completedFreeLessons.length > 0 || nonBeginnerFreeLessons.length > 0 ? (
        <View style={styles.sectionBlockSoft}>
          <SectionHeader
            title="Tüm ücretsiz dersler"
            subtitle={`${completedFreeLessons.length + nonBeginnerFreeLessons.length} ders`}
          />
          {completedFreeLessons.map((lesson) => (
            <LibraryLessonCard
              key={lesson.id}
              lesson={lesson}
              isPremiumUser={profile.isPremium}
              dense
              progressState="completed"
              ctaLabelOverride="Tekrar çalış"
              onPress={() => handleLessonPress(lesson.id)}
            />
          ))}
          {nonBeginnerFreeLessons.map((lesson) => (
            <LibraryLessonCard
              key={lesson.id}
              lesson={lesson}
              isPremiumUser={profile.isPremium}
              dense
              progressState="not_started"
              ctaLabelOverride="Başla"
              onPress={() => handleLessonPress(lesson.id)}
            />
          ))}
        </View>
      ) : null}

      {premiumLessons.length > 0 ? (
        <View style={styles.sectionBlockPremium}>
          <SectionHeader title="SpeakPlus dersleri" subtitle="Premium içerik" />
          {premiumLessons.map((lesson) => (
            <LibraryLessonCard
              key={lesson.id}
              lesson={lesson}
              isPremiumUser={profile.isPremium}
              dense
              progressState="not_started"
              ctaLabelOverride="Kilidi Aç"
              onPress={() => handleLessonPress(lesson.id)}
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
    marginBottom: spacing.xs,
  },
  sectionBlockSoft: {
    marginBottom: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(91, 95, 239, 0.12)',
    paddingTop: spacing.sm,
  },
  sectionBlockPremium: {
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(196, 181, 253, 0.2)',
  },
  bottomSpacer: {
    height: spacing.xl,
  },
});
