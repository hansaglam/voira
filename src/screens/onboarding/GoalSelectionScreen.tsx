import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { OnboardingScreenProps } from '../../navigation/types';
import {
  ScreenContainer,
  OnboardingHeader,
  OnboardingBottomBar,
  SingleSelectChipGroup,
} from '../../components';
import { ONBOARDING_TOTAL_STEPS, PRIMARY_GOAL_OPTIONS } from '../../constants/options';
import { useUser } from '../../context/UserContext';
import { spacing } from '../../theme';

type Props = OnboardingScreenProps<'GoalSelection'>;

export function GoalSelectionScreen({ navigation }: Props) {
  const { setPrimaryGoal } = useUser();
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);

  return (
    <ScreenContainer
      contentStyle={styles.content}
      footer={
        <OnboardingBottomBar
          ctaLabel="İlk pratiği hazırla"
          onContinue={() => {
            if (!selectedGoal) return;
            setPrimaryGoal(selectedGoal);
            navigation.navigate('FirstPracticePreview');
          }}
          disabled={!selectedGoal}
        />
      }
    >
      <OnboardingHeader
        title="Hedefini seç"
        subtitle="Sana uygun ilk pratiği hazırlayalım."
        step={2}
        totalSteps={ONBOARDING_TOTAL_STEPS}
        onBack={() => navigation.goBack()}
      />

      <SingleSelectChipGroup
        options={PRIMARY_GOAL_OPTIONS.map((option) => ({
          id: option.id,
          label: option.label,
          icon: option.icon,
        }))}
        selectedId={selectedGoal}
        onSelect={setSelectedGoal}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
});
