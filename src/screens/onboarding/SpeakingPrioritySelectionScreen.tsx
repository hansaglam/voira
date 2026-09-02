import React, { useCallback, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { OnboardingScreenProps } from '../../navigation/types';
import {
  ScreenContainer,
  OnboardingHeader,
  OnboardingBottomBar,
  ChipGroup,
} from '../../components';
import {
  MAX_SPEAKING_PRIORITIES,
  ONBOARDING_TOTAL_STEPS,
  SPEAKING_PRIORITY_OPTIONS,
} from '../../constants/options';
import { tSpeakingPriorityLabel } from '../../i18n/optionLabels';
import { useUser } from '../../context/UserContext';
import type { SpeakingPriority } from '../../services/personalization/personalSpeakingPlanTypes';
import { colors, spacing, typography } from '../../theme';

type Props = OnboardingScreenProps<'SpeakingPrioritySelection'>;

export function SpeakingPrioritySelectionScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { speakingPriorities, setSpeakingPriorities } = useUser();
  const [selected, setSelected] = useState<SpeakingPriority[]>(speakingPriorities);

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      if (prev.includes(id as SpeakingPriority)) {
        return prev.filter((item) => item !== id);
      }
      if (prev.length >= MAX_SPEAKING_PRIORITIES) {
        return prev;
      }
      return [...prev, id as SpeakingPriority];
    });
  }, []);

  return (
    <ScreenContainer
      contentStyle={styles.content}
      footer={
        <OnboardingBottomBar
          ctaLabel={t('common.continue')}
          onContinue={() => {
            setSpeakingPriorities(selected);
            navigation.navigate('FirstPracticePreview');
          }}
          disabled={selected.length === 0}
          summaryText={
            selected.length > 0
              ? t('onboarding.selectedOfMax', {
                  count: selected.length,
                  max: MAX_SPEAKING_PRIORITIES,
                })
              : t('onboarding.priorityHint')
          }
        />
      }
    >
      <OnboardingHeader
        title={t('onboarding.priorityTitle')}
        subtitle={t('onboarding.prioritySubtitle')}
        step={5}
        totalSteps={ONBOARDING_TOTAL_STEPS}
        onBack={() => navigation.goBack()}
      />

      <Text style={styles.limitHint}>
        {t('onboarding.priorityLimit', { max: MAX_SPEAKING_PRIORITIES })}
      </Text>

      <ChipGroup
        options={SPEAKING_PRIORITY_OPTIONS.map((option) => ({
          id: option.id,
          label: tSpeakingPriorityLabel(t, option.id),
          icon: option.icon,
        }))}
        selectedIds={selected}
        onToggle={toggle}
        multiSelect
        maxSelections={MAX_SPEAKING_PRIORITIES}
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
  limitHint: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
});
