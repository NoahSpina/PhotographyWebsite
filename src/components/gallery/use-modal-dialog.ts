import { useEffect, type RefObject, type SyntheticEvent } from "react";

/**
 * Opens a native `<dialog>` as a modal on mount and routes every close
 * through `dialog.close()` (which restores focus to the opener) followed by
 * `onClose`. State is not left to the native `close` event alone because
 * some embedded browsers never deliver it; that event stays wired as a
 * fallback, so `onClose` must be safe to call twice.
 */
export function useModalDialog(
  dialogRef: RefObject<HTMLDialogElement | null>,
  onClose: () => void,
) {
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, [dialogRef]);

  function close() {
    dialogRef.current?.close();
    onClose();
  }

  return {
    close,
    dialogProps: {
      onCancel(event: SyntheticEvent<HTMLDialogElement>) {
        event.preventDefault();
        close();
      },
      onClose,
    },
  };
}
