import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

type InternalHeaderProps = {
  title: string;
  description?: string;
  eyebrow?: string;
};

// Encabezado de cada página: título, descripción y volver. La navegación vive en la barra superior (AppTopBar).
export function InternalHeader({ title, description, eyebrow }: InternalHeaderProps) {
  const navigate = useNavigate();
  return (
    <div className="flex items-start gap-4">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)]"
        aria-label="Volver"
      >
        <ArrowLeft size={18} />
      </button>
      <div className="min-w-0">
        {eyebrow ? <p className="mb-1 text-xs font-bold uppercase tracking-widest text-[var(--color-primary)]">{eyebrow}</p> : null}
        <h1 className="page-title font-headline text-2xl font-extrabold leading-tight md:text-3xl">{title}</h1>
        {description ? <p className="mt-1.5 max-w-3xl text-sm text-[var(--color-on-surface-variant)]">{description}</p> : null}
      </div>
    </div>
  );
}
