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
import { LEVEL_OPTIONS, ONBOARDING_TOTAL_STEPS } from '../../constants/options';
import { tLevelDescription, tLevelLabel } from '../../i18n/optionLabels';
import { useUser } from '../../context/UserContext';
import { EnglishLevel } from '../../types';
import { spacing } from '../../theme';

type Props = OnboardingScreenProps<'LevelSelection'>;

export function LevelSelectionScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { profile, setLevel } = useUser();
  const [selected, setSelected] = useState<EnglishLevel | null>(
    profile.level === 'intermediate' ? null : profile.level,
  );

  return (
    <ScreenContainer
      contentStyle={styles.content}
      footer={
        <OnboardingBottomBar
          ctaLabel={t('common.continue')}
          onContinue={() => {
            if (!selected) return;
            setLevel(selected);
            navigation.navigate('DailyPracticeSelection');
          }}
          disabled={!selected}
        />
      }
    >
      <OnboardingHeader
        title={t('onboarding.levelTitle')}
        subtitle={t('onboarding.levelSubtitle')}
        step={3}
        totalSteps={ONBOARDING_TOTAL_STEPS}
        onBack={() => navigation.goBack()}
      />

      <SingleSelectChipGroup
        options={LEVEL_OPTIONS.map((option) => ({
          id: option.id,
          label: tLevelLabel(t, option.id),
          description: tLevelDescription(t, option.id),
          icon: option.icon,
        }))}
        selectedId={selected}
        onSelect={(id) => setSelected(id as EnglishLevel)}
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
