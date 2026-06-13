import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface SubrouteBackButtonProps {
  to?: string;
  label?: string;
}

export function SubrouteBackButton({ to = "/inventario", label = "Volver" }: SubrouteBackButtonProps) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate(to)}
      className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)]/45 hover:text-[var(--color-on-surface)]"
    >
      <ChevronLeft size={14} />
      {label}
    </button>
  );
}
