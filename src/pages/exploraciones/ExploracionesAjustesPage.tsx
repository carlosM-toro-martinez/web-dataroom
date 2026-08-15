import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, RefreshCw, Search } from "lucide-react";
import {
  getDuplicateSampleCodes,
  repairSampleCodes,
  type DuplicateSampleCodeReport,
  type SampleCodeCorrection
} from "@/features/exploraciones/api/sampleCodesApi";
import { InternalHeader } from "@/shared/ui/InternalHeader";
import { useToast } from "@/shared/ui/toast/ToastProvider";

const panelClass =
  "rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5";
const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-bold text-[var(--color-on-primary)] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60";
const secondaryButton =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-outline-variant)] px-4 py-2.5 text-sm font-bold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)] disabled:cursor-not-allowed disabled:opacity-60";

export function ExploracionesAjustesPage() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  const duplicatesQuery = useQuery({
    queryKey: ["exploraciones", "sample-codes", "duplicates"],
    queryFn: getDuplicateSampleCodes
  });
  const repairMutation = useMutation({
    mutationFn: repairSampleCodes,
    onSuccess: async (result) => {
      showSuccess(`Reajuste completado. ${result.correctedCount} registros corregidos.`);
      await queryClient.invalidateQueries({ queryKey: ["exploraciones"] });
    },
    onError: (error) => {
      showError(error instanceof Error ? error.message : "No se pudo reajustar los talones.");
    }
  });

  const report = duplicatesQuery.data;
  const corrected = repairMutation.data?.corrected ?? [];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 pb-8 sm:px-6 lg:px-8">
      <InternalHeader
        title="Ajustes de exploraciones"
        eyebrow="Administracion"
        description="Diagnostico y reajuste global de codigos de talonario entre Interior Mina y Superficie."
      />

      <section className={panelClass}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-[var(--color-on-surface)]">Talones repetidos</h2>
            <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">
              Revisa duplicados antes de ejecutar el reajuste correlativo global.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={secondaryButton}
              onClick={() => duplicatesQuery.refetch()}
              disabled={duplicatesQuery.isFetching}
            >
              <Search size={16} />
              {duplicatesQuery.isFetching ? "Revisando..." : "Revisar repetidos"}
            </button>
            <button
              type="button"
              className={primaryButton}
              onClick={() => repairMutation.mutate()}
              disabled={repairMutation.isPending}
            >
              <RefreshCw size={16} className={repairMutation.isPending ? "animate-spin" : ""} />
              {repairMutation.isPending ? "Reajustando..." : "Reajustar codigos"}
            </button>
          </div>
        </div>

        <DuplicateSummary report={report} isLoading={duplicatesQuery.isLoading} />
      </section>

      {report?.duplicates.length ? <DuplicateTable report={report} /> : null}
      {corrected.length ? <CorrectionsTable rows={corrected} /> : null}
    </div>
  );
}

function DuplicateSummary({ report, isLoading }: { report?: DuplicateSampleCodeReport; isLoading: boolean }) {
  if (isLoading) {
    return <p className="mt-4 text-sm text-[var(--color-on-surface-variant)]">Cargando diagnostico...</p>;
  }

  if (!report || report.duplicateCount === 0) {
    return (
      <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-600">
        <CheckCircle2 size={18} />
        No hay codigos de talonario repetidos.
      </div>
    );
  }

  return (
    <div className="mt-4 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-700">
      <AlertTriangle size={18} />
      {report.duplicateCount} codigos repetidos afectan {report.affectedSampleCount} registros.
    </div>
  );
}

function DuplicateTable({ report }: { report: DuplicateSampleCodeReport }) {
  return (
    <section className={panelClass}>
      <h2 className="text-lg font-bold">Duplicados encontrados</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wider text-[var(--color-on-surface-variant)]">
            <tr>
              <th className="px-3 py-2">Codigo</th>
              <th className="px-3 py-2">Modulo</th>
              <th className="px-3 py-2">Categoria</th>
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {report.duplicates.flatMap((group) =>
              group.samples.map((sample) => (
                <tr key={`${sample.module}-${sample.id}`} className="border-t border-[var(--color-border-soft)]">
                  <td className="px-3 py-2 font-bold">{group.code}</td>
                  <td className="px-3 py-2">{sample.module === "interior" ? "Interior Mina" : "Superficie"}</td>
                  <td className="px-3 py-2">{sample.category === "PRODUCTION" ? "Produccion" : "Exploracion"}</td>
                  <td className="px-3 py-2">{sample.name ?? "-"}</td>
                  <td className="px-3 py-2">{new Date(sample.createdAt).toLocaleString("es-BO")}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CorrectionsTable({ rows }: { rows: SampleCodeCorrection[] }) {
  return (
    <section className={panelClass}>
      <h2 className="text-lg font-bold">Correcciones aplicadas</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wider text-[var(--color-on-surface-variant)]">
            <tr>
              <th className="px-3 py-2">Modulo</th>
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">Anterior</th>
              <th className="px-3 py-2">Nuevo</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.module}-${row.id}`} className="border-t border-[var(--color-border-soft)]">
                <td className="px-3 py-2">{row.module === "interior" ? "Interior Mina" : "Superficie"}</td>
                <td className="px-3 py-2">{row.name ?? "-"}</td>
                <td className="px-3 py-2 font-bold text-[var(--color-error)]">{row.previousCode}</td>
                <td className="px-3 py-2 font-bold text-emerald-600">{row.nextCode}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
