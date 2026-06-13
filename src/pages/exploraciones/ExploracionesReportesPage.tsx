import { ArrowLeft, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function ExploracionesReportesPage() {
  const navigate = useNavigate();

  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <header className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="page-title font-headline text-3xl font-extrabold">
              Reportes y tendencias
            </h1>
            <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">
              Espacio preparado para reportes avanzados del módulo de exploraciones.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/exploraciones")}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-outline-variant)] px-4 py-2 text-sm font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)]"
          >
            <ArrowLeft size={15} />
            Volver a exploraciones
          </button>
        </div>
      </header>

      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-6">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-[var(--color-primary)]/15 p-2 text-[var(--color-primary)]">
            <BarChart3 size={18} />
          </div>
          <p className="text-sm text-[var(--color-on-surface-variant)]">
            Ruta creada correctamente. En el siguiente paso podemos montar aquí los gráficos,
            indicadores y tendencias que necesitas.
          </p>
        </div>
      </article>
    </section>
  );
}
