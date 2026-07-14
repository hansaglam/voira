import type { VoiraDialogButtonVariant, VoiraDialogVariant } from './VoiraDialog';

export type AppDialogButton = {
  id: string;
  label: string;
  variant?: VoiraDialogButtonVariant;
  /** When true, dialog stays open until async work finishes, then closes. */
  keepOpenOnPress?: boolean;
};

export type AppDialogConfig = {
  title: string;
  message?: string;
  variant?: VoiraDialogVariant;
  /** Ionicons glyph name, or null to hide. */
  icon?: string | null;
  dismissible?: boolean;
  scrollable?: boolean;
  primaryButton?: AppDialogButton;
  secondaryButton?: AppDialogButton;
  tertiaryButton?: AppDialogButton;
  /** Called with button id, or null when dismissed via backdrop/back. */
  onAction?: (buttonId: string | null) => void;
};

export type AppDialogController = {
  show: (config: AppDialogConfig) => void;
  hide: () => void;
};
