import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Loader2, Upload, XCircle } from "lucide-react";
import type { DrillingHole } from "@/features/sondajes/model/sondajes.schema";
import { createDrillingShiftReport } from "@/features/sondajes/api/sondajesApi";
import {
  SHIFT_NAME,
  roundDepth,
  createPayload,
  exportShiftReports,
  loadRigIds,
  planBackupImport,
  type BackupRow
} from "@/features/sondajes/lib/shiftReportsBackup";
import { formatReportDate } from "@/features/sondajes/lib/shiftReports";
import { Modal, panelClass, primaryButton, secondaryButton } from "@/features/sondajes/components/ui";

const errorText = (error: unknown, fallback: string) => {
  const data = (error as { response?: { data?: { error?: string; message?: string } } })?.response?.data;
  return data?.error ?? data?.message ?? (error instanceof Error && error.message ? error.message : fallback);
};

const STATUS_STYLE = {
  new: { label: "Se carga", chip: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  exists: { label: "Ya existe", chip: "bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)]" },
  error: { label: "No se puede", chip: "bg-rose-500/15 text-rose-700 dark:text-rose-300" }
} as const;

type Outcome = { row: BackupRow; ok: boolean; message?: string };

export function ShiftReportsBackupModal({
  open,
  holes,
  canImport,
  onClose,
  onDone
}: {
  open: boolean;
  holes: DrillingHole[];
  canImport: boolean;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [exporting, setExporting] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [rows, setRows] = useState<BackupRow[] | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [outcomes, setOutcomes] = useState<Outcome[] | null>(null);

  useEffect(() => {
    if (open) return;
    setFileName(null);
    setRows(null);
    setFailure(null);
    setProgress(null);
    setOutcomes(null);
    setExporting(null);
  }, [open]);

  const counts = useMemo(() => {
    const list = rows ?? [];
    return {
      new: list.filter((row) => row.status === "new").length,
      exists: list.filter((row) => row.status === "exists").length,
      error: list.filter((row) => row.status === "error").length,
      warnings: list.filter((row) => row.status === "new" && row.warning).length
    };
  }, [rows]);
  const busy = Boolean(exporting) || reading || Boolean(progress);

  async function runExport() {
    setFailure(null);
    if (!navigator.onLine) {
      setFailure("Conéctate a internet para exportar: los partes se leen del servidor.");
      return;
    }
    try {
      setExporting("Leyendo partes…");
      const total = await exportShiftReports(holes, (done, all) => setExporting(`Leyendo pozo ${Math.min(done + 1, all)} de ${all}…`));
      onDone(`${total} parte(s) exportados.`);
    } catch (error) {
      setFailure(errorText(error, "No se pudo exportar."));
    } finally {
      setExporting(null);
    }
  }

  async function chooseFile(file: File | undefined) {
    if (!file) return;
    setFailure(null);
    setOutcomes(null);
    setRows(null);
    setFileName(file.name);
    if (!navigator.onLine) {
      setFailure("Conéctate a internet para importar: hay que comparar con los partes del servidor.");
      return;
    }
    setReading(true);
    try {
      setRows(await planBackupImport(file, holes));
    } catch (error) {
      setFailure(errorText(error, "No se pudo leer el archivo."));
    } finally {
      setReading(false);
    }
  }

  async function runImport() {
    if (!rows) return;
    const pending = rows.filter((row) => row.status === "new");
    setFailure(null);
    setProgress({ done: 0, total: pending.length });
    const rigIds = await loadRigIds();
    const results: Outcome[] = [];
    for (const [index, row] of pending.entries()) {
      try {
        await createDrillingShiftReport(row.hole!.id, createPayload(row, rigIds));
        results.push({ row, ok: true });
      } catch (error) {
        results.push({ row, ok: false, message: errorText(error, "Error al crear el parte.") });
      }
      setProgress({ done: index + 1, total: pending.length });
    }
    setProgress(null);
    setOutcomes(results);
    await queryClient.invalidateQueries({ queryKey: ["sondajes"] });
    const created = results.filter((item) => item.ok).length;
    const failed = results.length - created;
    // Todo bien: se cierra y se avisa. Si algo falló, queda abierta con el detalle.
    if (!failed) {
      onClose();
      onDone(`${created} parte(s) cargados. ${counts.exists} ya existían y se omitieron.`);
    }
  }

  const visibleRows = rows ?? [];

  return (
    <Modal
      open={open}
      onClose={() => !busy && onClose()}
      size="lg"
      icon={<FileSpreadsheet size={20} />}
      title="Respaldo de partes de perforación"
      subtitle="Exporta los partes a Excel o carga en este sistema los que le falten."
      footer={
        <>
          <button type="button" className={secondaryButton} onClick={onClose} disabled={busy}>
            {outcomes ? "Cerrar" : "Cancelar"}
          </button>
          {rows && !outcomes ? (
            <button type="button" className={primaryButton} onClick={runImport} disabled={busy || counts.new === 0} data-testid="backup-import">
              {progress ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
              {progress ? `Cargando ${progress.done}/${progress.total}` : counts.new ? `Cargar ${counts.new} parte(s) faltante(s)` : "No falta ningún parte"}
            </button>
          ) : null}
        </>
      }
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx"
        className="hidden"
        data-testid="backup-file"
        onChange={(event) => {
          void chooseFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <div className="space-y-4">
        <section className={`${panelClass} flex flex-wrap items-center gap-3 p-4`}>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">1. Exportar</p>
            <p className="mt-0.5 text-xs text-[var(--color-on-surface-variant)]">
              Descarga todos los partes de los {holes.length} pozo(s) en un Excel, completos (actividades, consumibles, incidentes…).
            </p>
          </div>
          <button type="button" className={secondaryButton} onClick={runExport} disabled={busy || holes.length === 0}>
            {exporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
            {exporting ?? "Exportar partes (.xlsx)"}
          </button>
        </section>

        {canImport ? (
          <section className={`${panelClass} space-y-3 p-4`}>
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">2. Importar los que faltan</p>
                <p className="mt-0.5 text-xs text-[var(--color-on-surface-variant)]">
                  Elige un Excel exportado. Solo se cargan los partes que este sistema no tiene; los demás se omiten solos, no hace falta borrarlos del archivo.
                </p>
              </div>
              <button type="button" className={secondaryButton} onClick={() => inputRef.current?.click()} disabled={busy}>
                {reading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                {fileName ? "Elegir otro archivo" : "Elegir Excel"}
              </button>
            </div>

            {fileName ? <p className="truncate text-xs font-semibold">{fileName}</p> : null}

            {rows ? (
              <>
                {outcomes && outcomes.some((item) => !item.ok) ? (
                  <p className="rounded-xl bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-700 dark:text-amber-300">
                    {outcomes.filter((item) => item.ok).length} cargado(s) y {outcomes.filter((item) => !item.ok).length} con error: el motivo está en la tabla.
                  </p>
                ) : null}
                <p className="flex flex-wrap gap-1.5 text-[11px] font-bold" data-testid="backup-summary">
                  <span className={`rounded-md px-2 py-0.5 ${STATUS_STYLE.new.chip}`}>
                    {outcomes ? `${outcomes.filter((item) => item.ok).length} cargados` : `${counts.new} se cargan`}
                  </span>
                  <span className={`rounded-md px-2 py-0.5 ${STATUS_STYLE.exists.chip}`}>{counts.exists} ya existen</span>
                  {counts.error ? <span className={`rounded-md px-2 py-0.5 ${STATUS_STYLE.error.chip}`}>{counts.error} con problemas</span> : null}
                  {counts.warnings ? <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-amber-700 dark:text-amber-300">{counts.warnings} a revisar</span> : null}
                </p>
                <div className="max-h-[46vh] overflow-auto rounded-xl border border-[var(--color-border-soft)]">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-[var(--color-surface-container-high)] text-[10px] uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                      <tr>
                        <th className="px-3 py-2">Pozo</th>
                        <th className="px-3 py-2">Parte</th>
                        <th className="px-3 py-2">Fecha · turno</th>
                        <th className="px-3 py-2">Tramo</th>
                        <th className="px-3 py-2">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...visibleRows]
                        .sort((a, b) => (a.status === b.status ? 0 : a.status === "new" ? -1 : b.status === "new" ? 1 : a.status === "error" ? -1 : 1))
                        .map((row) => {
                          const outcome = outcomes?.find((item) => item.row === row);
                          return (
                            <tr key={row.excelRow} className={`border-t border-[var(--color-border-soft)] ${row.status === "exists" ? "opacity-60" : ""}`}>
                              <td className="px-3 py-2 font-mono font-semibold">{row.holeCode || "—"}</td>
                              <td className="px-3 py-2">{row.reportNumber ? `No. ${row.reportNumber}` : "—"}</td>
                              <td className="whitespace-nowrap px-3 py-2">
                                {row.date ? `${formatReportDate(`${row.date}T00:00:00.000Z`, "short")} · ${SHIFT_NAME[row.shift] ?? row.shift}` : `Fila ${row.excelRow}`}
                              </td>
                              <td className="whitespace-nowrap px-3 py-2 font-mono">
                                {row.fromDepth !== null && row.toDepth !== null ? `${roundDepth(row.fromDepth)} → ${roundDepth(row.toDepth)} m` : "—"}
                              </td>
                              <td className="px-3 py-2">
                                {outcome ? (
                                  outcome.ok ? (
                                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                                      <CheckCircle2 size={13} /> Cargado
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-start gap-1 font-semibold text-rose-600">
                                      <XCircle size={13} className="mt-0.5 shrink-0" /> {outcome.message}
                                    </span>
                                  )
                                ) : (
                                  <>
                                    <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${STATUS_STYLE[row.status].chip}`}>{STATUS_STYLE[row.status].label}</span>
                                    {row.reason ? <span className="mt-0.5 block text-[11px] text-[var(--color-on-surface-variant)]">{row.reason}</span> : null}
                                  </>
                                )}
                                {row.status === "new" && row.warning ? (
                                  <span className="mt-0.5 flex items-start gap-1 text-[11px] text-amber-700 dark:text-amber-300">
                                    <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                                    {row.warning}
                                  </span>
                                ) : null}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </>
            ) : null}
          </section>
        ) : null}

        {failure ? <p className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-600">{failure}</p> : null}
      </div>
    </Modal>
  );
}
