import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, InteractionManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { TabScreenProps } from '../navigation/types';
import {
  ScreenContainer,
  AppButton,
  AppCard,
  SectionHeader,
  LibraryLessonCard,
  FuturePracticeCard,
} from '../components';
import { useUser } from '../context/UserContext';
import { usePremium } from '../context/PremiumContext';
import { useLearning } from '../context/LearningContext';
import {
  getContinueLesson,
  getRecommendedLessons,
  openLessonFromLibrary,
} from '../data/lessonLibrary';
import { colors, spacing, typography, borderRadius, layout, gradients, shadows } from '../theme';

type Props = TabScreenProps<'Home'>;

const VALUE_BULLETS = [
  'Gerçek telaffuz analizi',
  'Zayıf kelimelerini gör',
  'Türkçe AI koç yorumu',
  'Kısa derslerle pratik yap',
] as const;

const SPEAKPLUS_BENEFITS = [
  'İleri seviye dersler',
  'Kelime bazlı geri bildirim',
] as const;

export function HomeScreen({ navigation }: Props) {
  const { profile, pendingFirstLesson, clearPendingFirstLesson } = useUser();
  const { isPremium } = usePremium();
  const openedPendingLessonRef = useRef(false);
  const { learningProfile, getDailySession } = useLearning();
  const session = getDailySession();
  const continueLesson = getContinueLesson(learningProfile);
  const recommended = getRecommendedLessons(learningProfile);

  const dailyGoalLabel = session.focusSkill?.trim() || 'Daha akıcı konuşma';

  useEffect(() => {
    if (!pendingFirstLesson || openedPendingLessonRef.current) {
      return;
    }

    openedPendingLessonRef.current = true;
    const lessonParams = pendingFirstLesson;
    clearPendingFirstLesson();

    const task = InteractionManager.runAfterInteractions(() => {
      navigation.navigate('Lesson', lessonParams);
    });

    return () => {
      task.cancel();
    };
  }, [clearPendingFirstLesson, navigation, pendingFirstLesson]);

  return (
    <ScreenContainer withTabBar>
      <View style={styles.greeting}>
        <View style={styles.greetingText}>
          <Text style={styles.brandLabel}>EchoSpeak</Text>
          <Text style={typography.h1}>Merhaba, {profile.name}</Text>
          <Text style={styles.greetingSub}>
            Bugün kısa bir pratik yap, telaffuzunu analiz et ve zayıf kelimelerini gör.
          </Text>
        </View>
        {!isPremium ? (
          <TouchableOpacity
            style={styles.premiumBadge}
            onPress={() => navigation.navigate('Premium')}
            activeOpacity={0.8}
          >
            <Ionicons name="diamond-outline" size={14} color={colors.premium} />
            <Text style={styles.premiumText}>Plus</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.streakRow}>
        <View style={styles.streakPill}>
          <Ionicons name="flame" size={14} color={colors.streak} />
          <Text style={styles.streakText}>{learningProfile.currentStreak} gün seri</Text>
        </View>
        <View style={styles.streakPill}>
          <Ionicons name="stats-chart-outline" size={14} color={colors.secondary} />
          <Text style={styles.streakText}>Ort. {learningProfile.averageScore} Skor</Text>
        </View>
      </View>

      {/* A. Daily Practice */}
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={() =>
          navigation.navigate('DailyPracticeSession', { sessionId: session.sessionId })
        }
      >
        <LinearGradient
          colors={[...gradients.hero]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.dailyCard}
        >
          <View style={styles.dailyTop}>
            <View style={styles.dailyIconWrap}>
              <Ionicons name="mic" size={22} color={colors.textPrimary} />
            </View>
            <View style={styles.dailyBadge}>
              <Text style={styles.dailyBadgeText}>Günlük görev</Text>
            </View>
          </View>
          <Text style={styles.dailyLabel}>{session.title}</Text>
          <Text style={styles.dailySubtitle}>
            {session.totalLessons} kısa pratik • {session.estimatedMinutes} dakika
          </Text>
          <Text style={styles.dailyGoal}>Hedef: {dailyGoalLabel}</Text>
          <View style={styles.dailyCta}>
            <Text style={styles.dailyCtaText}>Pratiğe başla</Text>
            <View style={styles.dailyCtaIcon}>
              <Ionicons name="arrow-forward" size={18} color={colors.textPrimary} />
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>

      <View style={styles.valueCard}>
        <LinearGradient
          colors={['rgba(91, 95, 239, 0.14)', 'rgba(26, 27, 46, 0.92)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.valueCardInner}
        >
          <View style={styles.valueHeader}>
            <View style={styles.valueIcon}>
              <Ionicons name="sparkles" size={14} color={colors.secondary} />
            </View>
            <Text style={styles.valueTitle}>Neden EchoSpeak?</Text>
          </View>
          <View style={styles.valueBullets}>
            {VALUE_BULLETS.map((bullet) => (
              <View key={bullet} style={styles.valueBulletRow}>
                <Ionicons name="checkmark-circle" size={12} color={colors.primary} />
                <Text style={styles.valueBulletText}>{bullet}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>
      </View>

      {/* B. Continue Learning */}
      <AppCard style={styles.continueCard} elevated>
        <Text style={styles.continueLabel}>Kaldığın yerden devam et</Text>
        <Text style={styles.continueTitle}>{continueLesson.title}</Text>
        <Text style={styles.continueFocus}>{continueLesson.focusSkill}</Text>
        <AppButton
          title="Devam et"
          size="compact"
          onPress={() =>
            openLessonFromLibrary(navigation, continueLesson, isPremium)
          }
          style={styles.continueButton}
        />
      </AppCard>

      {/* C. Recommended Lessons */}
      <SectionHeader
        title="Senin için seçildi"
        subtitle="Kısa shadowing dersleri"
        actionLabel="Tümünü gör"
        onAction={() => navigation.navigate('Categories')}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.recommendedContent}
        style={styles.recommendedScroll}
        decelerationRate="fast"
      >
        {recommended.map((lesson) => (
          <LibraryLessonCard
            key={lesson.id}
            lesson={lesson}
            isPremiumUser={isPremium}
            variant="compact"
            completedLessonIds={learningProfile.completedLessonIds}
            onPress={() => openLessonFromLibrary(navigation, lesson, isPremium)}
          />
        ))}
      </ScrollView>

      <SectionHeader title="SpeakPlus araçları" subtitle="Kişisel pratik ve gelişmiş geri bildirim" />
      <FuturePracticeCard
        title="AI ile kendi dersini oluştur"
        subtitle="Sevdiğin bir cümleyi shadowing dersine çevir."
        icon="sparkles"
        benefits={['Kişisel cümle pratiği', 'Azure telaffuz analizi']}
        onPress={() => navigation.navigate('Premium')}
      />

      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => navigation.navigate('Premium')}
      >
        <LinearGradient
          colors={['rgba(229, 184, 74, 0.14)', 'rgba(139, 92, 246, 0.16)', 'rgba(26, 27, 46, 0.95)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.plusCard}
        >
          <View style={styles.plusRow}>
            <View style={styles.plusIcon}>
              <Ionicons name="diamond" size={16} color={colors.premium} />
            </View>
            <View style={styles.plusTextWrap}>
              <Text style={styles.plusTitle}>SpeakPlus pratikleri</Text>
              <Text style={styles.plusSubtitle} numberOfLines={1}>
                İleri telaffuz, akıcılık ve profesyonel konuşma dersleri
              </Text>
              <View style={styles.plusBenefits}>
                {SPEAKPLUS_BENEFITS.map((benefit) => (
                  <View key={benefit} style={styles.plusBenefitRow}>
                    <Ionicons name="ellipse" size={5} color={colors.premium} />
                    <Text style={styles.plusBenefitText}>{benefit}</Text>
                  </View>
                ))}
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.premium} style={styles.plusChevron} />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  greeting: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  greetingText: {
    flex: 1,
    paddingRight: spacing.md,
  },
  brandLabel: {
    ...typography.label,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  greetingSub: {
    ...typography.body,
    marginTop: spacing.sm,
    lineHeight: 22,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(196, 181, 253, 0.25)',
  },
  premiumText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.premium,
  },
  streakRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.card,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  streakText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  dailyCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.hero,
  },
  dailyTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  dailyIconWrap: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dailyBadge: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  dailyBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 0.3,
  },
  dailyLabel: {
    ...typography.label,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: spacing.xs,
  },
  dailySubtitle: {
    ...typography.body,
    color: 'rgba(255,255,255,0.86)',
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  dailyGoal: {
    ...typography.captionBright,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: spacing.md,
  },
  dailyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderRadius: borderRadius.lg,
  },
  dailyCtaText: {
    ...typography.button,
    fontSize: 15,
  },
  dailyCtaIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueCard: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(91, 95, 239, 0.22)',
  },
  valueCardInner: {
    padding: spacing.sm + 4,
  },
  valueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  valueIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(139, 92, 246, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  valueBullets: {
    gap: 5,
  },
  valueBulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  valueBulletText: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
    flex: 1,
  },
  continueCard: {
    marginBottom: spacing.md,
    padding: spacing.sm + 4,
  },
  continueLabel: {
    ...typography.label,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  continueTitle: {
    ...typography.h3,
    marginBottom: 4,
  },
  continueFocus: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  continueButton: {
    alignSelf: 'flex-start',
    minWidth: 140,
  },
  recommendedScroll: {
    marginHorizontal: -layout.screenPadding,
    marginBottom: spacing.md,
  },
  recommendedContent: {
    paddingHorizontal: layout.screenPadding,
    paddingRight: layout.screenPadding + spacing.xl,
    gap: spacing.sm,
  },
  plusCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.sm + 4,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(229, 184, 74, 0.28)',
  },
  plusRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  plusIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(229, 184, 74, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  plusTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  plusSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  plusBenefits: {
    gap: 2,
    marginTop: 2,
  },
  plusBenefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  plusBenefitText: {
    fontSize: 10,
    color: colors.textMuted,
    lineHeight: 14,
  },
  plusChevron: {
    marginTop: 8,
  },
});
