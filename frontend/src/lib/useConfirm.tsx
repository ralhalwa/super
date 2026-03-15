import { useState, useCallback, type ReactNode } from "react";
import ConfirmDialog from "../components/ConfirmDialog";

type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
};

export function useConfirm() {
  const [state, setState] = useState<{
    opts: ConfirmOptions;
    resolve: (ok: boolean) => void;
  } | null>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ opts, resolve });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    state?.resolve(true);
    setState(null);
  }, [state]);

  const handleCancel = useCallback(() => {
    state?.resolve(false);
    setState(null);
  }, [state]);

  const dialog: ReactNode = state ? (
    <ConfirmDialog
      open
      title={state.opts.title}
      message={state.opts.message}
      confirmLabel={state.opts.confirmLabel}
      danger={state.opts.danger}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  ) : null;

  return { confirm, dialog };
}
