import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Ban, Check, CheckCircle2, ChevronDown, Circle, Loader2, PauseCircle, type LucideIcon } from "lucide-react";
import {
  DRILLING_HOLE_STATUSES,
  DRILLING_HOLE_STATUS_LABELS,
  type DrillingHoleStatus
} from "@/features/sondajes/model/sondajes.schema";

type StatusMeta = { label: string; icon: LucideIcon; badge: string; dot: string; bar: string };

// Un color por estado, legible en tema claro y oscuro.
export const HOLE_STATUS_META: Record<DrillingHoleStatus, StatusMeta> = {
  PLANNED: {
    label: DRILLING_HOLE_STATUS_LABELS.PLANNED,
    icon: Circle,
    badge: "bg-slate-500/15 text-slate-500 ring-slate-500/30",
    dot: "bg-slate-500",
    bar: "bg-slate-400"
  },
  DRILLING: {
    label: DRILLING_HOLE_STATUS_LABELS.DRILLING,
    icon: Loader2,
    badge: "bg-amber-500/15 text-amber-600 ring-amber-500/40",
    dot: "bg-amber-500",
    bar: "bg-amber-500"
  },
  PAUSED: {
    label: DRILLING_HOLE_STATUS_LABELS.PAUSED,
    icon: PauseCircle,
    badge: "bg-sky-500/15 text-sky-600 ring-sky-500/40",
    dot: "bg-sky-500",
    bar: "bg-sky-500"
  },
  COMPLETED: {
    label: DRILLING_HOLE_STATUS_LABELS.COMPLETED,
    icon: CheckCircle2,
    badge: "bg-emerald-500/15 text-emerald-600 ring-emerald-500/40",
    dot: "bg-emerald-500",
    bar: "bg-emerald-500"
  },
  ABANDONED: {
    label: DRILLING_HOLE_STATUS_LABELS.ABANDONED,
    icon: Ban,
    badge: "bg-rose-500/15 text-rose-600 ring-rose-500/40",
    dot: "bg-rose-500",
    bar: "bg-rose-500"
  }
};

export function HoleStatusBadge({ status, size = "md" }: { status: DrillingHoleStatus; size?: "sm" | "md" }) {
  const meta = HOLE_STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-bold ring-1 ring-inset ${meta.badge} ${
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"
      }`}
    >
      <span className={`relative inline-flex h-2 w-2 rounded-full ${meta.dot}`}>
        {status === "DRILLING" ? (
          <span className={`absolute inset-0 animate-ping rounded-full ${meta.dot} opacity-75`} />
        ) : null}
      </span>
      {meta.label}
    </span>
  );
}

// Badge que abre un menú para cambiar el estado en un clic.
export function HoleStatusMenu({
  status,
  disabled,
  onChange
}: {
  status: DrillingHoleStatus;
  disabled?: boolean;
  onChange: (status: DrillingHoleStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // El menú es fixed (para no quedar recortado por la tabla): se ubica junto al botón.
  function placeMenu() {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return false;
    const menuHeight = 230;
    const top = rect.bottom + menuHeight > window.innerHeight ? rect.top - menuHeight - 4 : rect.bottom + 4;
    setPosition({ top, left: Math.max(8, Math.min(rect.left, window.innerWidth - 220)) });
    return rect.bottom > 0 && rect.top < window.innerHeight;
  }

  useEffect(() => {
    if (!open) return;
    const close = (event: Event) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    // Al desplazar la página el menú acompaña al botón; se cierra solo si el botón sale de pantalla.
    const follow = () => {
      if (!placeMenu()) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", follow, true);
    window.addEventListener("resize", follow);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", follow, true);
      window.removeEventListener("resize", follow);
    };
  }, [open]);

  function toggle() {
    if (disabled) return;
    placeMenu();
    setOpen((current) => !current);
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        disabled={disabled}
        className="group inline-flex items-center gap-1 rounded-full transition disabled:cursor-wait"
        aria-haspopup="menu"
        aria-expanded={open}
        title="Cambiar estado"
      >
        <HoleStatusBadge status={status} />
        <ChevronDown size={14} className="text-[var(--color-on-surface-variant)] transition group-hover:text-[var(--color-on-surface)]" />
      </button>
      {open && position
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              style={{ top: position.top, left: position.left }}
              className="fixed z-[130] w-52 overflow-hidden rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-1.5 shadow-2xl"
            >
              <p className="px-2.5 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                Cambiar estado
              </p>
              {DRILLING_HOLE_STATUSES.map((option) => {
                const meta = HOLE_STATUS_META[option];
                const Icon = meta.icon;
                const active = option === status;
                return (
                  <button
                    key={option}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setOpen(false);
                      if (!active) onChange(option);
                    }}
                    className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm transition hover:bg-[var(--color-surface-container-high)] ${
                      active ? "font-bold" : ""
                    }`}
                  >
                    <span className={`inline-flex h-6 w-6 items-center justify-center rounded-lg ${meta.badge}`}>
                      <Icon size={13} />
                    </span>
                    <span className="flex-1">{meta.label}</span>
                    {active ? <Check size={15} className="text-[var(--color-primary)]" /> : null}
                  </button>
                );
              })}
            </div>,
            document.body
          )
        : null}
    </>
  );
}

// Barra apilada con la proporción de pozos por estado.
export function StatusProgressBar({ counts, total }: { counts: Partial<Record<DrillingHoleStatus, number>>; total: number }) {
  if (total === 0) return <div className="h-1.5 w-full rounded-full bg-[var(--color-surface-container-high)]" />;
  return (
    <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-container-high)]">
      {DRILLING_HOLE_STATUSES.map((status) => {
        const value = counts[status] ?? 0;
        if (value === 0) return null;
        return <span key={status} className={HOLE_STATUS_META[status].bar} style={{ width: `${(value / total) * 100}%` }} />;
      })}
    </div>
  );
}
