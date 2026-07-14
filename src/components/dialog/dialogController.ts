import type { AppDialogConfig, AppDialogController } from './dialogTypes';

let controller: AppDialogController | null = null;

export function registerDialogController(next: AppDialogController | null): void {
  controller = next;
}

/**
 * Imperative Voira dialog entry point for non-React call sites
 * (utils, gates, services). Requires DialogProvider to be mounted.
 */
export function showAppDialog(config: AppDialogConfig): void {
  if (!controller) {
    if (__DEV__) {
      console.warn('[VoiraDialog] DialogProvider is not mounted — dialog skipped.', {
        title: config.title,
      });
    }
    return;
  }
  controller.show(config);
}

export function hideAppDialog(): void {
  controller?.hide();
}

export function showAppFeedback(options: {
  title: string;
  message: string;
  variant?: 'success' | 'error' | 'warning' | 'info' | 'neutral';
  primaryLabel?: string;
  onPrimary?: () => void;
}): void {
  showAppDialog({
    title: options.title,
    message: options.message,
    variant: options.variant ?? 'info',
    dismissible: true,
    primaryButton: {
      id: 'ok',
      label: options.primaryLabel ?? 'Tamam',
      variant: 'primary',
    },
    onAction: (id) => {
      if (id === 'ok') {
        options.onPrimary?.();
      }
    },
  });
}

export function showAppConfirm(options: {
  title: string;
  message: string;
  variant?: 'warning' | 'destructive' | 'neutral' | 'info';
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}): void {
  showAppDialog({
    title: options.title,
    message: options.message,
    variant: options.destructive ? 'destructive' : (options.variant ?? 'warning'),
    dismissible: true,
    primaryButton: {
      id: 'confirm',
      label: options.confirmLabel,
      variant: options.destructive ? 'destructive' : 'primary',
    },
    tertiaryButton: {
      id: 'cancel',
      label: options.cancelLabel ?? 'Vazgeç',
      variant: 'tertiary',
    },
    onAction: (id) => {
      if (id === 'confirm') {
        void options.onConfirm();
        return;
      }
      if (id === 'cancel' || id === null) {
        options.onCancel?.();
      }
    },
  });
}
