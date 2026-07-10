import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { LegacyOnboardingScreenProps } from './legacyNavigation';
import {
  ScreenContainer,
  OnboardingHeader,
  OnboardingBottomBar,
  SingleSelectChipGroup,
} from '../../components';
import { PRACTICE_DURATION_OPTIONS, ONBOARDING_TOTAL_STEPS } from '../../constants/options';
import { useUser } from '../../context/UserContext';
import { spacing } from '../../theme';

type Props = LegacyOnboardingScreenProps<'DailyPracticeSelection'>;

export function DailyPracticeSelectionScreen({ navigation }: Props) {
  const { setDailyPracticeMinutes } = useUser();
  const [selected, setSelected] = useState<number | null>(5);

  return (
    <ScreenContainer
      contentStyle={styles.content}
      footer={
        <OnboardingBottomBar
          onContinue={() => {
            if (selected !== null) {
              setDailyPracticeMinutes(selected);
              navigation.navigate('SpeakingChallenges');
            }
          }}
          disabled={selected === null}
        />
      }
    >
      <OnboardingHeader
        title="Günde kaç dakika pratik yapmak istersin?"
        subtitle="Küçük adımlar büyük gelişim getirir. 5 dakika bile yeterli."
        step={3}
        totalSteps={ONBOARDING_TOTAL_STEPS}
        onBack={() => navigation.goBack()}
      />

      <SingleSelectChipGroup
        options={PRACTICE_DURATION_OPTIONS.map((o) => ({
          id: String(o.minutes),
          label: o.label,
          icon: o.icon as keyof typeof import('@expo/vector-icons').Ionicons.glyphMap,
        }))}
        selectedId={selected !== null ? String(selected) : null}
        onSelect={(id) => setSelected(Number(id))}
        size="large"
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing.sm,
  },
});
