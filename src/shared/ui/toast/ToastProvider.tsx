import { createContext, useCallback, useContext, useMemo, useState, type PropsWithChildren } from "react";
import { CircleCheckBig, CircleX, X } from "lucide-react";

type ToastType = "success" | "error";

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

interface ShowToastOptions {
  type: ToastType;
  message: string;
  durationMs?: number;
}

interface ToastContextValue {
  showToast: (options: ShowToastOptions) => void;
  showSuccess: (message: string, durationMs?: number) => void;
  showError: (message: string, durationMs?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: PropsWithChildren) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    ({ type, message, durationMs = 4000 }: ShowToastOptions) => {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      setToasts((current) => [...current, { id, type, message }]);
      window.setTimeout(() => removeToast(id), durationMs);
    },
    [removeToast]
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      showToast,
      showSuccess: (message, durationMs) => showToast({ type: "success", message, durationMs }),
      showError: (message, durationMs) => showToast({ type: "error", message, durationMs })
    }),
    [showToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[120] flex justify-center px-4">
        <div className="w-full max-w-xl space-y-2">
          {toasts.map((toast) => {
            const isSuccess = toast.type === "success";
            return (
              <div
                key={toast.id}
                role="alert"
                className={`pointer-events-auto flex items-start gap-3 rounded-lg border px-4 py-3 shadow-xl backdrop-blur ${
                  isSuccess
                    ? "border-[var(--color-success)]/45 bg-[var(--color-success)]/15 text-[var(--color-success)]"
                    : "border-[var(--color-error)]/45 bg-[var(--color-error)]/15 text-[var(--color-error)]"
                }`}
              >
                {isSuccess ? (
                  <CircleCheckBig size={18} className="mt-0.5 shrink-0" />
                ) : (
                  <CircleX size={18} className="mt-0.5 shrink-0" />
                )}
                <p className="flex-1 text-sm font-medium text-[var(--color-on-surface)]">{toast.message}</p>
                <button
                  type="button"
                  onClick={() => removeToast(toast.id)}
                  className="rounded p-1 text-[var(--color-on-surface-variant)] transition hover:bg-white/10 hover:text-[var(--color-on-surface)]"
                  aria-label="Cerrar alerta"
                >
                  <X size={14} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast debe usarse dentro de ToastProvider.");
  }
  return context;
}
