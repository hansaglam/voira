import React, { useState, useCallback } from 'react';
import { StyleSheet } from 'react-native';
import { LegacyOnboardingScreenProps } from './legacyNavigation';
import {
  ScreenContainer,
  OnboardingHeader,
  OnboardingBottomBar,
  ChipGroup,
} from '../../components';
import { SPEAKING_CHALLENGE_SECTIONS, ONBOARDING_TOTAL_STEPS } from '../../constants/options';
import { useUser } from '../../context/UserContext';
import { spacing } from '../../theme';

type Props = LegacyOnboardingScreenProps<'SpeakingChallenges'>;

export function SpeakingChallengesScreen({ navigation }: Props) {
  const { setSpeakingChallenges } = useUser();
  const [selected, setSelected] = useState<string[]>([]);

  const toggleSelection = useCallback((id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  return (
    <ScreenContainer
      contentStyle={styles.content}
      footer={
        <OnboardingBottomBar
          onContinue={() => {
            if (selected.length > 0) {
              setSpeakingChallenges(selected);
              navigation.navigate('FirstSpeakingTest');
            }
          }}
          disabled={selected.length === 0}
          selectedCount={selected.length}
          showSelectedCount
        />
      }
    >
      <OnboardingHeader
        title="En çok nerede zorlanıyorsun?"
        subtitle="AI koçun pratiklerini buna göre önceliklendirsin."
        step={4}
        totalSteps={ONBOARDING_TOTAL_STEPS}
        onBack={() => navigation.goBack()}
      />

      {SPEAKING_CHALLENGE_SECTIONS.map((section) => (
        <ChipGroup
          key={section.title}
          title={section.title}
          options={section.options}
          selectedIds={selected}
          onToggle={toggleSelection}
        />
      ))}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing.sm,
  },
});
