import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { VoiraDialog, type VoiraDialogButton } from './VoiraDialog';
import { registerDialogController } from './dialogController';
import type { AppDialogButton, AppDialogConfig } from './dialogTypes';

type DialogContextValue = {
  showDialog: (config: AppDialogConfig) => void;
  hideDialog: () => void;
};

const DialogContext = createContext<DialogContextValue | undefined>(undefined);

type ActiveDialog = AppDialogConfig & {
  loadingButtonId: string | null;
};

function toDialogButton(
  source: AppDialogButton | undefined,
  loadingButtonId: string | null,
  onPress: (button: AppDialogButton) => void,
): VoiraDialogButton | undefined {
  if (!source) return undefined;
  return {
    label: source.label,
    variant: source.variant,
    loading: loadingButtonId === source.id,
    disabled: loadingButtonId != null && loadingButtonId !== source.id,
    onPress: () => onPress(source),
  };
}

export function DialogProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<ActiveDialog | null>(null);
  const activeRef = useRef<ActiveDialog | null>(null);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  const hideDialog = useCallback(() => {
    setActive(null);
  }, []);

  const showDialog = useCallback((config: AppDialogConfig) => {
    setActive({
      ...config,
      loadingButtonId: null,
    });
  }, []);

  useEffect(() => {
    registerDialogController({
      show: showDialog,
      hide: hideDialog,
    });
    return () => registerDialogController(null);
  }, [hideDialog, showDialog]);

  const handleDismiss = useCallback(() => {
    const current = activeRef.current;
    if (!current || current.loadingButtonId) return;
    setActive(null);
    activeRef.current = null;
    requestAnimationFrame(() => {
      current.onAction?.(null);
    });
  }, []);

  const handleButtonPress = useCallback((button: AppDialogButton) => {
    const current = activeRef.current;
    if (!current || current.loadingButtonId) return;

    // Close first so a follow-up showAppDialog/showAppFeedback in onAction
    // is not immediately cleared by this dismiss.
    setActive(null);
    activeRef.current = null;

    // Defer callback to next tick after unmount of the closing dialog.
    requestAnimationFrame(() => {
      current.onAction?.(button.id);
    });
  }, []);

  const value = useMemo(
    (): DialogContextValue => ({
      showDialog,
      hideDialog,
    }),
    [hideDialog, showDialog],
  );

  return (
    <DialogContext.Provider value={value}>
      {children}
      {active ? (
        <VoiraDialog
          visible
          title={active.title}
          message={active.message}
          variant={active.variant}
          icon={active.icon}
          dismissible={active.dismissible !== false && !active.loadingButtonId}
          scrollable={active.scrollable}
          onDismiss={handleDismiss}
          primaryButton={toDialogButton(
            active.primaryButton,
            active.loadingButtonId,
            (button) => void handleButtonPress(button),
          )}
          secondaryButton={toDialogButton(
            active.secondaryButton,
            active.loadingButtonId,
            (button) => void handleButtonPress(button),
          )}
          tertiaryButton={toDialogButton(
            active.tertiaryButton,
            active.loadingButtonId,
            (button) => void handleButtonPress(button),
          )}
        />
      ) : null}
    </DialogContext.Provider>
  );
}

export function useAppDialog(): DialogContextValue {
  const ctx = useContext(DialogContext);
  if (!ctx) {
    throw new Error('useAppDialog must be used within DialogProvider');
  }
  return ctx;
}
