import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { OnboardingScreenProps } from '../../navigation/types';
import {
  ScreenContainer,
  OnboardingHeader,
  OnboardingBottomBar,
  SingleSelectChipGroup,
} from '../../components';
import { ONBOARDING_TOTAL_STEPS, PRIMARY_GOAL_OPTIONS } from '../../constants/options';
import { tPrimaryGoalLabel } from '../../i18n/optionLabels';
import { useUser } from '../../context/UserContext';
import { spacing } from '../../theme';

type Props = OnboardingScreenProps<'GoalSelection'>;

export function GoalSelectionScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { primaryGoal, setPrimaryGoal } = useUser();
  const [selectedGoal, setSelectedGoal] = useState<string | null>(primaryGoal);

  return (
    <ScreenContainer
      contentStyle={styles.content}
      footer={
        <OnboardingBottomBar
          ctaLabel={t('onboarding.goalCta')}
          onContinue={() => {
            if (!selectedGoal) return;
            setPrimaryGoal(selectedGoal);
            navigation.navigate('LevelSelection');
          }}
          disabled={!selectedGoal}
        />
      }
    >
      <OnboardingHeader
        title={t('onboarding.goalTitle')}
        subtitle={t('onboarding.goalSubtitle')}
        step={2}
        totalSteps={ONBOARDING_TOTAL_STEPS}
        onBack={() => navigation.goBack()}
      />

      <SingleSelectChipGroup
        options={PRIMARY_GOAL_OPTIONS.map((option) => ({
          id: option.id,
          label: tPrimaryGoalLabel(t, option.id),
          icon: option.icon,
        }))}
        selectedId={selectedGoal}
        onSelect={setSelectedGoal}
        size="large"
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
