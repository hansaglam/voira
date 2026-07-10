import React, { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
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
import { useUser } from '../../context/UserContext';
import { EnglishLevel } from '../../types';
import { spacing } from '../../theme';

type Props = LegacyOnboardingScreenProps<'Personalization'>;

export function PersonalizationScreen({ navigation }: Props) {
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
          ctaLabel="Pratiğimi hazırla"
          onContinue={handleContinue}
          disabled={!isReady}
          summaryText={isReady ? 'Seçimlerin hazır' : undefined}
        />
      }
    >
      <OnboardingHeader
        title="Pratiğini kişiselleştirelim"
        subtitle="Sana uygun dersleri ve AI koç önerilerini hazırlayalım."
        step={2}
        totalSteps={ONBOARDING_TOTAL_STEPS}
        onBack={() => navigation.goBack()}
      />

      <PersonalizationSection
        sectionTitle="SEVİYE"
        question="İngilizce seviyen nedir?"
      >
        <SingleSelectChipGroup
          options={LEVEL_OPTIONS}
          selectedId={level}
          onSelect={(id) => setLevelLocal(id as EnglishLevel)}
        />
      </PersonalizationSection>

      <PersonalizationSection sectionTitle="HEDEF" question="Hedefin ne?">
        <View style={styles.chipWrap}>
          {GOAL_CONVERSATION_OPTIONS.map((option) => (
            <SelectableChip
              key={option.id}
              label={option.label}
              icon={option.icon}
              selected={goals.includes(option.id)}
              onPress={() => toggleMulti(option.id, setGoalsLocal)}
            />
          ))}
        </View>
      </PersonalizationSection>

      <PersonalizationSection
        sectionTitle="ZORLANDIĞIM ALANLAR"
        question="En çok nerede zorlanıyorsun?"
      >
        <View style={styles.chipWrap}>
          {PERSONALIZATION_CHALLENGE_OPTIONS.map((option) => (
            <SelectableChip
              key={option.id}
              label={option.label}
              icon={option.icon}
              selected={challenges.includes(option.id)}
              onPress={() => toggleMulti(option.id, setChallengesLocal)}
            />
          ))}
        </View>
      </PersonalizationSection>

      <PersonalizationSection
        sectionTitle="GÜNLÜK HEDEF"
        question="Günde kaç dakika pratik yapmak istersin?"
      >
        <SingleSelectChipGroup
          options={PRACTICE_DURATION_OPTIONS.map((o) => ({
            id: String(o.minutes),
            label: o.label,
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
