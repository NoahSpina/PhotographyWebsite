import { useEffect, useRef, type SyntheticEvent } from "react";

/**
 * Shows a native modal `<dialog>` (focus trap, inert page, top layer) for as
 * long as the component is mounted, so a parent `AnimatePresence` can play
 * exit animations before React removes it. Escape and native closes are
 * routed through `onRequestClose` instead of hiding the dialog immediately,
 * and focus returns to whatever opened it once it unmounts.
 */
export function useMotionDialog(onRequestClose: () => void) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!openerRef.current && document.activeElement instanceof HTMLElement) {
      openerRef.current = document.activeElement;
    }
    const opener = openerRef.current;
    if (dialog && !dialog.open) dialog.showModal();

    return () => opener?.focus({ preventScroll: true });
  }, []);

  return {
    dialogRef,
    dialogProps: {
      onCancel(event: SyntheticEvent<HTMLDialogElement>) {
        event.preventDefault();
        onRequestClose();
      },
      onClose: onRequestClose,
    },
  };
}
