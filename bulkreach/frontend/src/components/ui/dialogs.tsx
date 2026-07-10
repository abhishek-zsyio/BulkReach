import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, X, Check, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

// ─────────────────────────────────────────────────────────────────
// ConfirmModal — drops-in for window.confirm()
// ─────────────────────────────────────────────────────────────────

interface ConfirmModalProps {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "info";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onCancel]);

  useEffect(() => {
    if (open) setTimeout(() => cancelRef.current?.focus(), 60);
  }, [open]);

  const iconColor =
    variant === "danger"
      ? "var(--color-love)"
      : variant === "warning"
      ? "var(--color-gold)"
      : "var(--color-iris)";

  const confirmBtnClass =
    variant === "danger" ? "btn-danger" : "btn-primary";

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="confirm-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
          onClick={onCancel}
        >
          <motion.div
            key="confirm-panel"
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 12 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm bg-rose-surface border-2 border-rose-border shadow-[6px_6px_0px_0px_var(--color-shadow)] p-6 space-y-5"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby="confirm-message"
          >
            {/* Colored top accent bar */}
            <span
              className="absolute top-0 left-0 right-0 h-[3px]"
              style={{ background: iconColor }}
            />

            {/* Icon + Title + Message */}
            <div className="flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-none flex items-center justify-center border-2 border-rose-border shrink-0"
                style={{ background: `${iconColor}20`, color: iconColor }}
              >
                {variant === "danger" ? <Trash2 size={18} /> : <AlertTriangle size={18} />}
              </div>
              <div className="flex-1 min-w-0">
                {title && (
                  <p id="confirm-title" className="text-sm font-extrabold text-rose-text uppercase tracking-wider mb-1">
                    {title}
                  </p>
                )}
                <p id="confirm-message" className="text-sm text-rose-subtle font-semibold leading-relaxed">
                  {message}
                </p>
              </div>
              <button onClick={onCancel} className="text-rose-muted hover:text-rose-text transition-colors mt-0.5 shrink-0">
                <X size={16} />
              </button>
            </div>

            {/* Gradient divider */}
            <div className="h-[1px]" style={{ background: `linear-gradient(90deg, ${iconColor}60, transparent)` }} />

            {/* Buttons */}
            <div className="flex items-center gap-3 justify-end">
              <button ref={cancelRef} onClick={onCancel} className="btn-secondary text-xs py-2 px-4">
                {cancelLabel}
              </button>
              <button onClick={onConfirm} className={`${confirmBtnClass} text-xs py-2 px-4`}>
                <Check size={13} className="stroke-[3]" />
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

// ─────────────────────────────────────────────────────────────────
// PromptModal — drops-in for window.prompt()
// ─────────────────────────────────────────────────────────────────

interface PromptModalProps {
  open: boolean;
  title?: string;
  message: string;
  placeholder?: string;
  defaultValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

export function PromptModal({
  open,
  title = "Enter a value",
  message,
  placeholder = "",
  defaultValue = "",
  confirmLabel = "OK",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: PromptModalProps) {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setValue(defaultValue);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [open, defaultValue]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onCancel]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    onConfirm(value.trim());
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="prompt-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
          onClick={onCancel}
        >
          <motion.div
            key="prompt-panel"
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 12 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm bg-rose-surface border-2 border-rose-border shadow-[6px_6px_0px_0px_var(--color-shadow)] p-6 space-y-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="prompt-title"
          >
            <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-rose-pine to-rose-iris" />

            <div className="flex items-center justify-between">
              <p id="prompt-title" className="text-sm font-extrabold text-rose-text uppercase tracking-wider">
                {title}
              </p>
              <button type="button" onClick={onCancel} className="text-rose-muted hover:text-rose-text transition-colors">
                <X size={16} />
              </button>
            </div>

            {message && (
              <p className="text-xs text-rose-subtle font-semibold leading-relaxed">{message}</p>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={placeholder}
                className="input w-full"
              />
              <div className="flex items-center gap-3 justify-end">
                <button type="button" onClick={onCancel} className="btn-secondary text-xs py-2 px-4">
                  {cancelLabel}
                </button>
                <button
                  type="submit"
                  disabled={!value.trim()}
                  className="btn-primary text-xs py-2 px-4 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Check size={13} className="stroke-[3]" />
                  {confirmLabel}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}


// ─────────────────────────────────────────────────────────────────
// useConfirm — returns { confirm, modal }
// Usage: const { confirm, modal } = useConfirm();
//        const ok = await confirm({ message: "Sure?" });
//        // render {modal} in JSX
// ─────────────────────────────────────────────────────────────────

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "info";
}

interface ConfirmState extends ConfirmOptions {
  open: boolean;
  resolve: ((value: boolean) => void) | null;
}

export function useConfirm() {
  const [state, setState] = useState<ConfirmState>({
    open: false,
    message: "",
    resolve: null,
  });

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ open: true, resolve, ...options });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    setState((s) => ({ ...s, open: false }));
    state.resolve?.(true);
  }, [state.resolve]);

  const handleCancel = useCallback(() => {
    setState((s) => ({ ...s, open: false }));
    state.resolve?.(false);
  }, [state.resolve]);

  const modal = (
    <ConfirmModal
      open={state.open}
      title={state.title}
      message={state.message}
      confirmLabel={state.confirmLabel}
      cancelLabel={state.cancelLabel}
      variant={state.variant}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  );

  return { confirm, modal };
}

// ─────────────────────────────────────────────────────────────────
// usePrompt — returns { prompt, modal }
// Usage: const { prompt, modal } = usePrompt();
//        const name = await prompt({ message: "Enter name:", defaultValue: "..." });
// ─────────────────────────────────────────────────────────────────

interface PromptOptions {
  title?: string;
  message: string;
  placeholder?: string;
  defaultValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

interface PromptState extends PromptOptions {
  open: boolean;
  resolve: ((value: string | null) => void) | null;
}

export function usePrompt() {
  const [state, setState] = useState<PromptState>({
    open: false,
    message: "",
    resolve: null,
  });

  const prompt = useCallback((options: PromptOptions): Promise<string | null> => {
    return new Promise((resolve) => {
      setState({ open: true, resolve, ...options });
    });
  }, []);

  const handleConfirm = useCallback((value: string) => {
    setState((s) => ({ ...s, open: false }));
    state.resolve?.(value);
  }, [state.resolve]);

  const handleCancel = useCallback(() => {
    setState((s) => ({ ...s, open: false }));
    state.resolve?.(null);
  }, [state.resolve]);

  const modal = (
    <PromptModal
      open={state.open}
      title={state.title}
      message={state.message}
      placeholder={state.placeholder}
      defaultValue={state.defaultValue}
      confirmLabel={state.confirmLabel}
      cancelLabel={state.cancelLabel}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  );

  return { prompt, modal };
}
