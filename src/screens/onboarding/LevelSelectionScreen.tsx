import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { LegacyOnboardingScreenProps } from './legacyNavigation';
import {
  ScreenContainer,
  OnboardingHeader,
  OnboardingBottomBar,
  SingleSelectChipGroup,
} from '../../components';
import { LEVEL_OPTIONS, ONBOARDING_TOTAL_STEPS } from '../../constants/options';
import { useUser } from '../../context/UserContext';
import { EnglishLevel } from '../../types';
import { spacing } from '../../theme';

type Props = LegacyOnboardingScreenProps<'LevelSelection'>;

export function LevelSelectionScreen({ navigation }: Props) {
  const { setLevel } = useUser();
  const [selected, setSelected] = useState<EnglishLevel | null>(null);

  return (
    <ScreenContainer
      contentStyle={styles.content}
      footer={
        <OnboardingBottomBar
          onContinue={() => {
            if (selected) {
              setLevel(selected);
              navigation.navigate('GoalSelection');
            }
          }}
          disabled={!selected}
        />
      }
    >
      <OnboardingHeader
        title="İngilizce seviyen nedir?"
        subtitle="Sana uygun hızda pratikler hazırlayalım."
        step={1}
        totalSteps={ONBOARDING_TOTAL_STEPS}
        onBack={() => navigation.goBack()}
      />

      <SingleSelectChipGroup
        options={LEVEL_OPTIONS}
        selectedId={selected}
        onSelect={(id) => setSelected(id as EnglishLevel)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing.sm,
  },
});
