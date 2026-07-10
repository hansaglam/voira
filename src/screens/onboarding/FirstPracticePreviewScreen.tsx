import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OnboardingScreenProps } from '../../navigation/types';
import {
  ScreenContainer,
  OnboardingHeader,
  OnboardingBottomBar,
  AppCard,
} from '../../components';
import { GOAL_LABELS, ONBOARDING_TOTAL_STEPS } from '../../constants/options';
import { useUser } from '../../context/UserContext';
import { resolveStarterLesson } from '../../data/onboardingStarterLessons';
import { CATEGORY_LABELS } from '../../types/lesson';
import { colors, spacing, typography, borderRadius } from '../../theme';

type Props = OnboardingScreenProps<'FirstPracticePreview'>;

export function FirstPracticePreviewScreen({ navigation }: Props) {
  const { primaryGoal, profile, completeOnboarding } = useUser();
  const goalId = primaryGoal ?? profile.goals[0] ?? 'daily_conversation';

  const preview = useMemo(() => resolveStarterLesson(goalId), [goalId]);
  const { lesson, benefitTr } = preview;

  const handleStartPractice = () => {
    void completeOnboarding('Home', {
      primaryGoal: goalId,
      lessonParams: {
        lessonId: lesson.id,
        source: 'library',
        categoryId: lesson.category,
      },
    });
  };

  return (
    <ScreenContainer
      contentStyle={styles.content}
      footer={
        <OnboardingBottomBar
          ctaLabel="İlk pratiğe başla"
          onContinue={handleStartPractice}
        />
      }
    >
      <OnboardingHeader
        title="İlk pratiğin hazır"
        subtitle="Seçtiğin hedefe uygun bir başlangıç dersi."
        step={3}
        totalSteps={ONBOARDING_TOTAL_STEPS}
        onBack={() => navigation.goBack()}
      />

      <AppCard style={styles.previewCard}>
        <View style={styles.categoryPill}>
          <Text style={styles.categoryText}>
            {GOAL_LABELS[goalId as keyof typeof GOAL_LABELS] ??
              CATEGORY_LABELS[lesson.category]}
          </Text>
        </View>

        <Text style={styles.lessonTitle}>{lesson.title}</Text>
        <Text style={styles.benefitText}>{benefitTr}</Text>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={14} color={colors.textMuted} />
            <Text style={styles.metaText}>{lesson.estimatedMinutes} dk</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="layers-outline" size={14} color={colors.textMuted} />
            <Text style={styles.metaText}>{CATEGORY_LABELS[lesson.category]}</Text>
          </View>
        </View>
      </AppCard>

      <View style={styles.hintCard}>
        <Ionicons name="headset-outline" size={18} color={colors.secondary} />
        <Text style={styles.hintText}>
          Önce örnek sesi dinle, sonra aynı ritimde kaydet.
        </Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  previewCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  categoryPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(91, 95, 239, 0.12)',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    marginBottom: spacing.sm,
  },
  categoryText: {
    ...typography.captionBright,
    color: colors.secondary,
    fontWeight: '600',
  },
  lessonTitle: {
    ...typography.h2,
    marginBottom: spacing.sm,
  },
  benefitText: {
    ...typography.bodyLarge,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  hintCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  hintText: {
    ...typography.body,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 22,
  },
});
