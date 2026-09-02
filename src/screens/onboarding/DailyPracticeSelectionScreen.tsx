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
import { PRACTICE_DURATION_OPTIONS, ONBOARDING_TOTAL_STEPS } from '../../constants/options';
import { tPracticeMinutesLabel } from '../../i18n/optionLabels';
import { useUser } from '../../context/UserContext';
import { spacing } from '../../theme';

type Props = OnboardingScreenProps<'DailyPracticeSelection'>;

export function DailyPracticeSelectionScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { profile, setDailyPracticeMinutes } = useUser();
  const [selected, setSelected] = useState<number | null>(
    profile.dailyPracticeMinutes === 5 ||
      profile.dailyPracticeMinutes === 10 ||
      profile.dailyPracticeMinutes === 15
      ? profile.dailyPracticeMinutes
      : null,
  );

  return (
    <ScreenContainer
      contentStyle={styles.content}
      footer={
        <OnboardingBottomBar
          ctaLabel={t('common.continue')}
          onContinue={() => {
            if (selected === null) return;
            setDailyPracticeMinutes(selected);
            navigation.navigate('SpeakingPrioritySelection');
          }}
          disabled={selected === null}
        />
      }
    >
      <OnboardingHeader
        title={t('onboarding.dailyTitle')}
        subtitle={t('onboarding.dailySubtitle')}
        step={4}
        totalSteps={ONBOARDING_TOTAL_STEPS}
        onBack={() => navigation.goBack()}
      />

      <SingleSelectChipGroup
        options={PRACTICE_DURATION_OPTIONS.map((option) => ({
          id: String(option.minutes),
          label: tPracticeMinutesLabel(t, option.minutes),
          icon: option.icon,
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
    paddingBottom: spacing.sm,
  },
});
