import React from 'react';
import { VoiraDialog, type VoiraDialogVariant } from './dialog/VoiraDialog';

export type VoiraFeedbackType = 'success' | 'error' | 'info' | 'warning';

export type VoiraFeedbackModalProps = {
  visible: boolean;
  type?: VoiraFeedbackType;
  title: string;
  message: string;
  primaryText?: string;
  onPrimaryPress: () => void;
  secondaryText?: string;
  onSecondaryPress?: () => void;
  tertiaryText?: string;
  onTertiaryPress?: () => void;
  dismissible?: boolean;
};

function mapType(type: VoiraFeedbackType): VoiraDialogVariant {
  if (type === 'success') return 'success';
  if (type === 'error') return 'error';
  if (type === 'warning') return 'warning';
  return 'info';
}

/**
 * Thin compatibility wrapper around VoiraDialog for existing call sites.
 * Prefer VoiraDialog / showAppDialog for new code.
 */
export function VoiraFeedbackModal({
  visible,
  type = 'success',
  title,
  message,
  primaryText = 'Tamam',
  onPrimaryPress,
  secondaryText,
  onSecondaryPress,
  tertiaryText,
  onTertiaryPress,
  dismissible = true,
}: VoiraFeedbackModalProps) {
  return (
    <VoiraDialog
      visible={visible}
      variant={mapType(type)}
      title={title}
      message={message}
      dismissible={dismissible}
      onDismiss={onSecondaryPress ?? onTertiaryPress ?? onPrimaryPress}
      primaryButton={{
        label: primaryText,
        variant: 'primary',
        onPress: onPrimaryPress,
      }}
      secondaryButton={
        secondaryText && onSecondaryPress
          ? {
              label: secondaryText,
              variant: 'secondary',
              onPress: onSecondaryPress,
            }
          : undefined
      }
      tertiaryButton={
        tertiaryText && onTertiaryPress
          ? {
              label: tertiaryText,
              variant: 'tertiary',
              onPress: onTertiaryPress,
            }
          : undefined
      }
    />
  );
}
