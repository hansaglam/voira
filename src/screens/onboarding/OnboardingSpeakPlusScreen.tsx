import React from 'react';
import { OnboardingScreenProps, PremiumScreenProps } from '../../navigation/types';
import { PremiumScreen } from '../PremiumScreen';

type Props = OnboardingScreenProps<'OnboardingSpeakPlus'>;

/** Onboarding contextual SpeakPlus step — reuses PremiumScreen in onboarding mode. */
export function OnboardingSpeakPlusScreen(props: Props) {
  return <PremiumScreen {...(props as PremiumScreenProps)} />;
}
