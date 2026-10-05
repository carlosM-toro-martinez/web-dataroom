import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export const fieldClass =
  "w-full rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] px-3 py-2.5 text-sm text-[var(--color-on-surface)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--color-primary)_25%,transparent)] disabled:cursor-not-allowed disabled:opacity-60";
export const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] shadow-sm transition hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60";
export const secondaryButton =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] px-3.5 py-2.5 text-sm font-semibold text-[var(--color-on-surface)] transition hover:border-[var(--color-primary)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";
export const dangerButton =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60";
export const iconButton =
  "inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-on-surface-variant)] transition hover:bg-[var(--color-surface-container-high)] hover:text-[var(--color-on-surface)]";
export const panelClass =
  "rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)]";

type ModalProps = {
  open: boolean;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  size?: "md" | "lg" | "xl";
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
};

const SIZES = { md: "sm:max-w-lg", lg: "sm:max-w-3xl", xl: "sm:max-w-5xl" };

// Modal: hoja inferior en móvil, ventana centrada en escritorio. Cierra con Escape o clic fuera.
export function Modal({ open, title, subtitle, icon, size = "lg", onClose, children, footer }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-black/55 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`flex max-h-[94vh] w-full flex-col overflow-hidden rounded-t-3xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] text-[var(--color-on-surface)] shadow-2xl sm:rounded-3xl ${SIZES[size]}`}
      >
        <header className="flex items-start justify-between gap-3 border-b border-[var(--color-border-soft)] px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            {icon ? (
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] text-[var(--color-primary)]">
                {icon}
              </span>
            ) : null}
            <div className="min-w-0">
              <h2 className="truncate text-base font-bold">{title}</h2>
              {subtitle ? <p className="mt-0.5 text-xs text-[var(--color-on-surface-variant)]">{subtitle}</p> : null}
            </div>
          </div>
          <button type="button" className={iconButton} onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer ? (
          <footer className="flex flex-col-reverse gap-2 border-t border-[var(--color-border-soft)] px-5 py-4 sm:flex-row sm:justify-end">
            {footer}
          </footer>
        ) : null}
      </section>
    </div>,
    document.body
  );
}

export function Field({
  label,
  hint,
  error,
  required,
  group,
  children,
  className = ""
}: {
  label: ReactNode;
  hint?: string;
  error?: string;
  required?: boolean;
  // true cuando el contenido son botones (un <label> les cambiaría el nombre accesible).
  group?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const Wrapper = group ? "div" : "label";
  return (
    <Wrapper className={`block ${className}`} {...(group ? { role: "group", ...(typeof label === "string" ? { "aria-label": label } : {}) } : {})}>
      <span className="mb-1.5 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
        {label}
        {required ? <span className="text-rose-500">*</span> : null}
      </span>
      {children}
      {error ? (
        <span className="mt-1 block text-xs font-medium text-rose-500">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-[var(--color-on-surface-variant)]">{hint}</span>
      ) : null}
    </Wrapper>
  );
}

export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">{children}</h3>
      {aside}
    </div>
  );
}

// ─── Formato ─────────────────────────────────────────────────────────────────
// Coordenadas y ángulos con punto decimal, igual que el Excel del programa y los SIG.
export function formatNumber(value?: number | null, decimals = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toFixed(decimals);
}

export function formatMeters(value?: number | null) {
  if (value === null || value === undefined) return "—";
  return `${value.toLocaleString("es-BO", { maximumFractionDigits: 1 })} m`;
}

export function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-BO", { timeZone: "America/La_Paz", dateStyle: "medium" }).format(date);
}

// Convierte texto de un input numérico (acepta coma decimal) a número o null.
export function toNumberOrNull(value: string) {
  const cleaned = value.trim().replace(",", ".");
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export function toInputNumber(value?: number | null) {
  return value === null || value === undefined ? "" : String(value);
}
