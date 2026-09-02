import React, { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LegacyOnboardingScreenProps } from './legacyNavigation';
import {
  ScreenContainer,
  OnboardingHeader,
  OnboardingBottomBar,
  SingleSelectChipGroup,
  SelectableChip,
  PersonalizationSection,
} from '../../components';
import {
  LEVEL_OPTIONS,
  GOAL_CONVERSATION_OPTIONS,
  PERSONALIZATION_CHALLENGE_OPTIONS,
  PRACTICE_DURATION_OPTIONS,
  ONBOARDING_TOTAL_STEPS,
} from '../../constants/options';
import {
  tChallengeLabel,
  tConversationGoalLabel,
  tLevelLabel,
  tPracticeMinutesLabel,
} from '../../i18n/optionLabels';
import { useUser } from '../../context/UserContext';
import { EnglishLevel } from '../../types';
import { spacing } from '../../theme';

type Props = LegacyOnboardingScreenProps<'Personalization'>;

export function PersonalizationScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { setLevel, setGoals, setSpeakingChallenges, setDailyPracticeMinutes } = useUser();

  const [level, setLevelLocal] = useState<EnglishLevel | null>(null);
  const [goals, setGoalsLocal] = useState<string[]>([]);
  const [challenges, setChallengesLocal] = useState<string[]>([]);
  const [dailyMinutes, setDailyMinutesLocal] = useState<number | null>(null);

  const toggleMulti = useCallback(
    (id: string, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
      setter((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      );
    },
    []
  );

  const isReady = level !== null && dailyMinutes !== null;

  const handleContinue = () => {
    if (!isReady) return;
    setLevel(level);
    setGoals(goals);
    setSpeakingChallenges(challenges);
    setDailyPracticeMinutes(dailyMinutes);
    navigation.navigate('FirstSpeakingTest');
  };

  return (
    <ScreenContainer
      contentStyle={styles.content}
      footer={
        <OnboardingBottomBar
          ctaLabel={t('onboarding.personalizationCta')}
          onContinue={handleContinue}
          disabled={!isReady}
          summaryText={isReady ? t('onboarding.personalizationReady') : undefined}
        />
      }
    >
      <OnboardingHeader
        title={t('onboarding.personalizationTitle')}
        subtitle={t('onboarding.personalizationSubtitle')}
        step={2}
        totalSteps={ONBOARDING_TOTAL_STEPS}
        onBack={() => navigation.goBack()}
      />

      <PersonalizationSection
        sectionTitle={t('onboarding.sectionLevel')}
        question={t('onboarding.sectionLevelQ')}
      >
        <SingleSelectChipGroup
          options={LEVEL_OPTIONS.map((option) => ({
            id: option.id,
            label: tLevelLabel(t, option.id),
            icon: option.icon,
          }))}
          selectedId={level}
          onSelect={(id) => setLevelLocal(id as EnglishLevel)}
        />
      </PersonalizationSection>

      <PersonalizationSection
        sectionTitle={t('onboarding.sectionGoal')}
        question={t('onboarding.sectionGoalQ')}
      >
        <View style={styles.chipWrap}>
          {GOAL_CONVERSATION_OPTIONS.map((option) => (
            <SelectableChip
              key={option.id}
              label={tConversationGoalLabel(t, option.id)}
              icon={option.icon}
              selected={goals.includes(option.id)}
              onPress={() => toggleMulti(option.id, setGoalsLocal)}
            />
          ))}
        </View>
      </PersonalizationSection>

      <PersonalizationSection
        sectionTitle={t('onboarding.sectionChallenges')}
        question={t('onboarding.sectionChallengesQ')}
      >
        <View style={styles.chipWrap}>
          {PERSONALIZATION_CHALLENGE_OPTIONS.map((option) => (
            <SelectableChip
              key={option.id}
              label={tChallengeLabel(t, option.id)}
              icon={option.icon}
              selected={challenges.includes(option.id)}
              onPress={() => toggleMulti(option.id, setChallengesLocal)}
            />
          ))}
        </View>
      </PersonalizationSection>

      <PersonalizationSection
        sectionTitle={t('onboarding.sectionDaily')}
        question={t('onboarding.sectionDailyQ')}
      >
        <SingleSelectChipGroup
          options={PRACTICE_DURATION_OPTIONS.map((o) => ({
            id: String(o.minutes),
            label: tPracticeMinutesLabel(t, o.minutes),
            icon: o.icon,
          }))}
          selectedId={dailyMinutes !== null ? String(dailyMinutes) : null}
          onSelect={(id) => setDailyMinutesLocal(Number(id))}
          size="large"
        />
      </PersonalizationSection>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
