import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { OnboardingScreenProps } from '../../navigation/types';
import {
  ScreenContainer,
  OnboardingHeader,
  OnboardingBottomBar,
  AppCard,
} from '../../components';
import { ONBOARDING_TOTAL_STEPS } from '../../constants/options';
import {
  tCoachSummary,
  tLevelLabel,
  tPlanChipMinutes,
  tPrimaryGoalLabel,
  tSpeakingPriorityLabel,
  tWeekDayFocus,
  tWeekDayTitle,
} from '../../i18n/optionLabels';
import { useUser } from '../../context/UserContext';
import { usePremium } from '../../context/PremiumContext';
import { getLessonById, getLessonsByCategory } from '../../data/lessons';
import {
  buildPersonalSpeakingPlan,
  resolvePlanLessonOrFallback,
} from '../../services/personalization/personalSpeakingPlanService';
import { trackOnboardingEvent } from '../../services/analytics/onboardingAnalytics';
import { shouldShowOnboardingSpeakPlus } from '../../services/onboarding/onboardingSpeakPlusFlow';
import { sanitizeDailyMinutes } from '../../services/personalization/personalSpeakingPlanTypes';
import { colors, spacing, typography, borderRadius } from '../../theme';

type Props = OnboardingScreenProps<'FirstPracticePreview'>;

export function FirstPracticePreviewScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { isPremium } = usePremium();
  const {
    primaryGoal,
    profile,
    speakingPriorities,
    completeOnboarding,
  } = useUser();
  const planViewedRef = useRef(false);

  const goalId = primaryGoal ?? profile.goals[0] ?? 'daily_conversation';
  const dailyMinutes = sanitizeDailyMinutes(profile.dailyPracticeMinutes);

  const plan = useMemo(
    () =>
      buildPersonalSpeakingPlan({
        primaryGoal: goalId,
        level: profile.level,
        dailyMinutes,
        priorities: speakingPriorities,
        hasWeakWordHistory: false,
        resolveLessonById: getLessonById,
        listLessonsByCategory: getLessonsByCategory,
      }),
    [dailyMinutes, goalId, profile.level, speakingPriorities],
  );

  const lesson = useMemo(
    () => resolvePlanLessonOrFallback(plan, getLessonById),
    [plan],
  );

  const day1 = plan.firstWeekDays[0];

  useEffect(() => {
    if (planViewedRef.current) return;
    planViewedRef.current = true;
    trackOnboardingEvent('onboarding_plan_viewed', {
      goal: plan.primaryGoal,
      level: plan.level,
      minutes: plan.dailyMinutes,
      summary: plan.coachSummaryId,
    });
  }, [plan.coachSummaryId, plan.dailyMinutes, plan.level, plan.primaryGoal]);

  const finishPayload = {
    primaryGoal: plan.primaryGoal,
    level: plan.level,
    dailyMinutes: plan.dailyMinutes,
    speakingPriorities: plan.priorities,
    lessonId: lesson.id,
    categoryId: lesson.category,
    coachSummaryId: plan.coachSummaryId,
    topPriority: plan.priorities[0],
  };

  const handleStartPractice = () => {
    trackOnboardingEvent('onboarding_plan_created', {
      goal: plan.primaryGoal,
      level: plan.level,
      minutes: plan.dailyMinutes,
      lessonId: lesson.id,
    });

    if (shouldShowOnboardingSpeakPlus(isPremium)) {
      navigation.navigate('OnboardingSpeakPlus', finishPayload);
      return;
    }

    void completeOnboarding('Home', {
      primaryGoal: plan.primaryGoal,
      level: plan.level,
      dailyMinutes: plan.dailyMinutes,
      speakingPriorities: plan.priorities,
      lessonParams: {
        lessonId: lesson.id,
        source: 'library',
        categoryId: lesson.category,
      },
    });
  };

  const preferenceChips = [
    tPrimaryGoalLabel(t, plan.primaryGoal),
    tLevelLabel(t, plan.level),
    tPlanChipMinutes(t, plan.dailyMinutes),
    ...(plan.priorities.length
      ? plan.priorities.map((id) => tSpeakingPriorityLabel(t, id))
      : []),
  ];

  return (
    <ScreenContainer
      contentStyle={styles.content}
      footer={
        <OnboardingBottomBar
          ctaLabel={t('onboarding.previewCta')}
          onContinue={handleStartPractice}
        />
      }
    >
      <OnboardingHeader
        title={t('onboarding.previewTitle')}
        subtitle={t('onboarding.previewSubtitle')}
        step={6}
        totalSteps={ONBOARDING_TOTAL_STEPS}
        onBack={() => navigation.goBack()}
      />

      <AppCard style={styles.coachCard}>
        <Text style={styles.coachLabel}>{t('onboarding.coachSummaryLabel')}</Text>
        <Text style={styles.coachBody}>{tCoachSummary(t, plan.coachSummaryId)}</Text>
      </AppCard>

      <View style={styles.chipRow} accessibilityRole="summary">
        {preferenceChips.map((label) => (
          <View key={label} style={styles.chip} accessibilityLabel={label}>
            <Text style={styles.chipText}>{label}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.weekTitle}>{t('onboarding.planWeekTitle')}</Text>
      <AppCard style={styles.weekCard}>
        {plan.firstWeekDays.map((item) => (
          <View key={`${item.day}-${item.titleId}`} style={styles.weekRow}>
            <View style={styles.dayBadge}>
              <Text style={styles.dayBadgeText}>
                {t('onboarding.planDay', { day: item.day })}
              </Text>
            </View>
            <View style={styles.weekTextCol}>
              <Text style={styles.weekTitleText}>{tWeekDayTitle(t, item.titleId)}</Text>
              <Text style={styles.weekFocus}>{tWeekDayFocus(t, item.focusId)}</Text>
            </View>
          </View>
        ))}
      </AppCard>

      <View style={styles.hintCard}>
        <Ionicons name="headset-outline" size={18} color={colors.secondary} />
        <Text style={styles.hintText}>
          {t('onboarding.previewHintLesson', {
            title: day1 ? tWeekDayTitle(t, day1.titleId) : lesson.title,
          })}
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
  coachCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
    borderColor: 'rgba(139, 92, 246, 0.22)',
    borderWidth: 1,
  },
  coachLabel: {
    ...typography.label,
    color: colors.secondary,
    marginBottom: spacing.xs,
    letterSpacing: 0.8,
  },
  coachBody: {
    ...typography.bodyEmphasis,
    color: colors.textPrimary,
    lineHeight: 24,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  chip: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  weekTitle: {
    ...typography.label,
    color: colors.textMuted,
    letterSpacing: 1.1,
    marginBottom: spacing.sm,
  },
  weekCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  dayBadge: {
    backgroundColor: 'rgba(91, 95, 239, 0.14)',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    minWidth: 58,
    alignItems: 'center',
    marginTop: 2,
  },
  dayBadgeText: {
    ...typography.captionBright,
    color: colors.secondary,
    fontWeight: '600',
  },
  weekTextCol: {
    flex: 1,
    gap: 2,
  },
  weekTitleText: {
    ...typography.bodyEmphasis,
    color: colors.textPrimary,
  },
  weekFocus: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
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
