import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Download,
  FileSpreadsheet,
  Images,
  Info,
  Layers,
  Loader2,
  Microscope,
  Trash2,
  Upload,
  XCircle
} from "lucide-react";
import { utils, writeFile } from "xlsx";
import type { DrillingHole } from "@/features/sondajes/model/sondajes.schema";
import type { PhotoKind } from "@/features/sondajes/model/geology.schema";
import { parseGeologyWorkbook, type ExcelPhoto, type ParsedGeologyWorkbook } from "@/features/sondajes/lib/geologyExcel";
import {
  loadHoleGeologyContext,
  logReach,
  matchHole,
  reportFromWorkbook,
  type HoleGeologyContext,
  type HoleMatch
} from "@/features/sondajes/lib/geologyImport";
import { PHOTO_KINDS, fmt, lithologyColor } from "@/features/sondajes/lib/geology";
import { SEVERITY_LABEL, reviewWorkbook, type Finding, type PreviousDay, type Severity } from "@/features/sondajes/lib/geologyReview";
import { formatReportDate, isoToReportDate } from "@/features/sondajes/lib/shiftReports";
import { formatBytes } from "@/features/sondajes/lib/imageProcessing";
import { useAddPhotosMutation, useSaveGeologyLogMutation, useSaveGeologyReportMutation } from "@/features/sondajes/hooks/useGeology";
import { Modal, iconButton, primaryButton, secondaryButton } from "@/features/sondajes/components/ui";

// ─── Estado de cada archivo ──────────────────────────────────────────────────
type PhotoChoice = { include: boolean; kind: PhotoKind };
type Entry = {
  key: string;
  file: File;
  status: "reading" | "ready" | "error";
  error?: string;
  parsed?: ParsedGeologyWorkbook;
  match: HoleMatch;
  holeId: string | null;
  confirmed: boolean;
  report: boolean;
  log: boolean;
  photos: Record<string, PhotoChoice>;
  initialized: boolean;
  expanded: boolean;
};

export type GeologyImportResult = { files: number; reports: number; logs: number; photos: number; skippedPhotos: number };

export function describeImport(result: GeologyImportResult) {
  const parts = [
    `${result.files} archivo(s)`,
    result.reports ? `${result.reports} reporte(s)` : null,
    result.logs ? `${result.logs} logueo(s)` : null,
    result.photos ? `${result.photos} foto(s)` : null,
    result.skippedPhotos ? `${result.skippedPhotos} foto(s) repetida(s) omitida(s)` : null
  ];
  return parts.filter(Boolean).join(", ");
}

const dateText = (iso: string | null | undefined) => (iso ? formatReportDate(`${iso}T00:00:00.000Z`, "short") : "sin fecha");
const sortKey = (entry: Entry) => `${entry.parsed?.date ?? "9999"}|${entry.parsed?.fileDate ?? "9999"}|${entry.file.name}`;

// ─── Revisión: observaciones de cada archivo, mirando también el día anterior ─
const localToday = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

function buildReviews(entries: Entry[], contexts: Record<string, HoleGeologyContext>, holeById: Map<string, DrillingHole>) {
  const reviews = new Map<string, Finding[]>();
  const today = localToday();
  const ready = entries.filter((entry) => entry.status === "ready" && entry.parsed);
  for (const entry of ready) {
    const parsed = entry.parsed!;
    const hole = entry.holeId ? holeById.get(entry.holeId) ?? null : null;
    let previous: PreviousDay | null = null;
    const earlierSections = new Map<string, string>();
    if (hole && parsed.date) {
      const date = parsed.date;
      const candidates: PreviousDay[] = [];
      for (const other of ready) {
        if (other === entry || other.holeId !== hole.id || !other.parsed!.date || other.parsed!.date >= date) continue;
        const report = reportFromWorkbook(other.parsed!);
        if (report) {
          candidates.push({ ...report, date: other.parsed!.date, startDate: other.parsed!.startDate, source: `el archivo ${other.file.name}` });
        }
        for (const photo of other.parsed!.photos) {
          if (photo.kind === "SECTION" && photo.hash) earlierSections.set(photo.hash, `la del ${dateText(other.parsed!.date)} (${other.file.name})`);
        }
      }
      for (const report of contexts[hole.id]?.reports ?? []) {
        const reportDate = isoToReportDate(report.date);
        if (reportDate >= date || candidates.some((item) => item.date === reportDate)) continue;
        candidates.push({ ...report, date: reportDate, source: "el reporte ya cargado" });
      }
      previous = candidates.sort((a, b) => b.date.localeCompare(a.date))[0] ?? null;
    }
    reviews.set(entry.key, reviewWorkbook({ parsed, hole, match: entry.match, previous, earlierSections, today }));
  }
  return reviews;
}

const NEEDS_CONFIRMATION = "Tiene datos a corregir: corrige el Excel y vuelve a cargarlo, o confirma para importarlo tal cual.";
const countBy = (findings: Finding[] | undefined, severity: Severity) => (findings ?? []).filter((item) => item.severity === severity).length;

// ─── Plan: qué se aplicará realmente de cada archivo ─────────────────────────
type EntryPlan = {
  importable: boolean;
  blockedReason?: string;
  report: { apply: boolean; note?: string; replacesExisting?: boolean };
  log: { apply: boolean; note?: string };
  photos: Array<{ photo: ExcelPhoto; include: boolean; kind: PhotoKind; duplicateOf?: string }>;
  notes: string[];
};

function buildPlans(entries: Entry[], contexts: Record<string, HoleGeologyContext>, reviews: Map<string, Finding[]>, lockedHoleId?: string) {
  const plans = new Map<string, EntryPlan>();
  const byHole = new Map<string, Entry[]>();
  for (const entry of entries) {
    if (entry.status !== "ready" || !entry.parsed) continue;
    const blocked = !entry.holeId
      ? "Elige a qué pozo corresponde."
      : lockedHoleId && entry.holeId !== lockedHoleId
        ? `Este archivo es del pozo ${entry.match?.hole.code ?? "otro"}. Impórtalo desde ese pozo o desde Programas.`
        : countBy(reviews.get(entry.key), "error") && !entry.confirmed
          ? NEEDS_CONFIRMATION
          : undefined;
    if (blocked || !entry.holeId) {
      plans.set(entry.key, { importable: false, blockedReason: blocked, report: { apply: false }, log: { apply: false }, photos: [], notes: [] });
      continue;
    }
    byHole.set(entry.holeId, [...(byHole.get(entry.holeId) ?? []), entry]);
  }

  for (const [holeId, group] of byHole) {
    const context = contexts[holeId];
    const ordered = [...group].sort((a, b) => sortKey(a).localeCompare(sortKey(b)));

    // Logueo: es acumulado; se aplica solo el del archivo que llega más profundo.
    const withLog = ordered.filter((entry) => entry.log && entry.parsed!.logRows.length > 0);
    // Empate en profundidad: gana el de fecha más reciente en el nombre del archivo (uno sin fecha va último).
    const beats = (a: Entry, b: Entry) =>
      logReach(a.parsed!) !== logReach(b.parsed!) ? logReach(a.parsed!) > logReach(b.parsed!) : (a.parsed!.fileDate ?? "") >= (b.parsed!.fileDate ?? "");
    const logWinner = withLog.reduce<Entry | null>((best, entry) => (!best || beats(entry, best) ? entry : best), null);

    // Reporte: uno por fecha. Si dos archivos traen la misma fecha, gana el que tiene esa fecha también en el nombre.
    const byDate = new Map<string, Entry[]>();
    for (const entry of ordered) {
      if (!entry.report || !reportFromWorkbook(entry.parsed!)) continue;
      byDate.set(entry.parsed!.date!, [...(byDate.get(entry.parsed!.date!) ?? []), entry]);
    }
    const reportWinner = new Map<string, Entry>();
    for (const [date, candidates] of byDate) {
      reportWinner.set(date, candidates.find((entry) => entry.parsed!.fileDate === date) ?? candidates[candidates.length - 1]);
    }

    const seen = new Map<string, string>();
    for (const entry of ordered) {
      const parsed = entry.parsed!;
      const notes: string[] = [];
      const report = reportFromWorkbook(parsed);
      let reportPlan: EntryPlan["report"] = { apply: false };
      if (!report) reportPlan = { apply: false, note: "La hoja de resumen no tiene fecha o profundidades válidas." };
      else if (!entry.report) reportPlan = { apply: false, note: "No se importará." };
      else if (reportWinner.get(parsed.date!) !== entry) {
        reportPlan = { apply: false, note: `Otro archivo trae el reporte del ${dateText(parsed.date)}: se usa ${reportWinner.get(parsed.date!)!.file.name}.` };
      } else {
        const existing = context?.reports.find((item) => isoToReportDate(item.date) === parsed.date);
        reportPlan = { apply: true, replacesExisting: Boolean(existing), note: existing ? `Reemplaza el reporte del ${dateText(parsed.date)} que ya está en el sistema.` : undefined };
      }

      let logPlan: EntryPlan["log"] = { apply: false };
      if (!parsed.logRows.length) logPlan = { apply: false, note: "El archivo no trae tramos." };
      else if (!entry.log) logPlan = { apply: false, note: context && context.loggedTo > logReach(parsed) ? `El pozo ya tiene logueo hasta ${fmt(context.loggedTo)} m.` : "No se importará." };
      else if (logWinner !== entry) logPlan = { apply: false, note: `Lo reemplaza el de ${logWinner!.file.name} (llega a ${fmt(logReach(logWinner!.parsed!))} m).` };
      else {
        logPlan = {
          apply: true,
          note: context?.logRows ? `Reemplaza los ${context.logRows} tramos actuales (hasta ${fmt(context.loggedTo)} m).` : undefined
        };
        if (context && context.loggedTo > logReach(parsed)) notes.push(`El logueo actual del pozo llega a ${fmt(context.loggedTo)} m y este solo a ${fmt(logReach(parsed))} m.`);
      }

      const photos = parsed.photos.map((photo) => {
        const choice = entry.photos[photo.key] ?? { include: true, kind: photo.kind };
        let duplicateOf: string | undefined;
        if (photo.hash && context?.photoHashes.has(photo.hash)) duplicateOf = "el sistema";
        else if (photo.hash && seen.has(photo.hash)) duplicateOf = seen.get(photo.hash);
        const include = choice.include && !duplicateOf;
        if (include && photo.hash) seen.set(photo.hash, entry.file.name);
        return { photo, include, kind: choice.kind, duplicateOf };
      });

      plans.set(entry.key, { importable: true, report: reportPlan, log: logPlan, photos, notes });
    }
  }
  return plans;
}

// ─── Componente ──────────────────────────────────────────────────────────────
export function GeologyImportModal({
  open,
  holes,
  lockedHole,
  onClose,
  onImported
}: {
  open: boolean;
  holes: DrillingHole[];
  // Abierto desde un pozo: solo se importa a ese pozo.
  lockedHole?: DrillingHole;
  onClose: () => void;
  onImported: (result: GeologyImportResult) => Promise<void>;
}) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [contexts, setContexts] = useState<Record<string, HoleGeologyContext>>({});
  const [contextErrors, setContextErrors] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState<{ done: number; total: number; label: string } | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const saveReport = useSaveGeologyReportMutation();
  const saveLog = useSaveGeologyLogMutation();
  const addPhotos = useAddPhotosMutation();
  const holeById = useMemo(() => new Map(holes.map((hole) => [hole.id, hole])), [holes]);

  useEffect(() => {
    if (open) return;
    setEntries([]);
    setContexts({});
    setContextErrors({});
    setProgress(null);
    setFailure(null);
  }, [open]);

  const update = useCallback((key: string, patch: Partial<Entry> | ((entry: Entry) => Partial<Entry>)) => {
    setEntries((current) => current.map((entry) => (entry.key === key ? { ...entry, ...(typeof patch === "function" ? patch(entry) : patch) } : entry)));
  }, []);

  const ensureContext = useCallback(async (holeId: string) => {
    if (contexts[holeId]) return;
    try {
      const context = await loadHoleGeologyContext(holeId);
      setContexts((current) => ({ ...current, [holeId]: context }));
    } catch (error) {
      setContextErrors((current) => ({ ...current, [holeId]: error instanceof Error ? error.message : "No se pudo leer el pozo." }));
    }
  }, [contexts]);

  // Valores iniciales cuando el archivo ya se leyó y se conoce lo que tiene su pozo.
  useEffect(() => {
    for (const entry of entries) {
      if (entry.initialized || entry.status !== "ready" || !entry.parsed || !entry.holeId) continue;
      const context = contexts[entry.holeId];
      if (!context) continue;
      update(entry.key, {
        initialized: true,
        report: Boolean(reportFromWorkbook(entry.parsed)),
        log: entry.parsed.logRows.length > 0 && logReach(entry.parsed) >= context.loggedTo,
        photos: Object.fromEntries(
          entry.parsed.photos.map((photo) => [photo.key, { include: !(photo.hash && context.photoHashes.has(photo.hash)), kind: photo.kind }])
        )
      });
    }
  }, [entries, contexts, update]);

  async function addFiles(list: FileList | null) {
    if (!list?.length) return;
    const files = Array.from(list).filter((file) => /\.xls[xm]$/i.test(file.name));
    const fresh: Entry[] = files.map((file) => ({
      key: `${file.name}-${file.size}-${file.lastModified}`,
      file,
      status: "reading",
      match: null,
      holeId: null,
      confirmed: false,
      report: false,
      log: false,
      photos: {},
      initialized: false,
      expanded: false
    }));
    setEntries((current) => [...current, ...fresh.filter((entry) => !current.some((item) => item.key === entry.key))]);
    // De a uno: cada archivo trae varios MB de fotos.
    for (const entry of fresh) {
      try {
        const parsed = await parseGeologyWorkbook(entry.file);
        const match = matchHole(parsed, holes);
        const holeId = match?.hole.id ?? (lockedHole && !parsed.holeCode ? lockedHole.id : null);
        update(entry.key, { status: "ready", parsed, match, holeId });
        if (holeId) void ensureContext(holeId);
      } catch (error) {
        update(entry.key, { status: "error", error: error instanceof Error ? error.message : "No se pudo leer el archivo." });
      }
    }
  }

  const reviews = useMemo(() => buildReviews(entries, contexts, holeById), [entries, contexts, holeById]);
  const plans = useMemo(() => buildPlans(entries, contexts, reviews, lockedHole?.id), [entries, contexts, reviews, lockedHole?.id]);
  const reviewTotals = useMemo(() => {
    const all = [...reviews.values()];
    return {
      errorFiles: all.filter((findings) => countBy(findings, "error")).length,
      errors: all.reduce((sum, findings) => sum + countBy(findings, "error"), 0),
      warnings: all.reduce((sum, findings) => sum + countBy(findings, "warning"), 0),
      infos: all.reduce((sum, findings) => sum + countBy(findings, "info"), 0)
    };
  }, [reviews]);

  // Planilla para devolver al equipo de geología con todo lo que hay que corregir, celda por celda.
  function downloadFindings() {
    const rows = [...entries]
      .sort((a, b) => sortKey(a).localeCompare(sortKey(b)))
      .flatMap((entry) =>
        (reviews.get(entry.key) ?? []).map((finding) => ({
          Archivo: entry.file.name,
          Pozo: (entry.holeId && holeById.get(entry.holeId)?.code) || entry.parsed?.holeCode || "",
          Tipo: SEVERITY_LABEL[finding.severity],
          Ubicación: finding.where,
          Observación: finding.message
        }))
      );
    const sheet = utils.json_to_sheet(rows, { header: ["Archivo", "Pozo", "Tipo", "Ubicación", "Observación"] });
    sheet["!cols"] = [{ wch: 34 }, { wch: 12 }, { wch: 10 }, { wch: 26 }, { wch: 110 }];
    const book = utils.book_new();
    utils.book_append_sheet(book, sheet, "Observaciones");
    writeFile(book, `Observaciones_reportes_geologicos_${localToday()}.xlsx`);
  }
  const ready = entries.filter((entry) => entry.status === "ready");
  // No se puede importar hasta que cada archivo tenga su plan (leído, pozo consultado y opciones iniciales puestas).
  const reading =
    entries.some((entry) => entry.status === "reading") ||
    ready.some((entry) => entry.holeId && !contextErrors[entry.holeId] && (!contexts[entry.holeId] || !entry.initialized));
  const totals = useMemo(() => {
    let reports = 0, logs = 0, photos = 0, duplicates = 0, files = 0;
    for (const plan of plans.values()) {
      if (!plan.importable) continue;
      const fileHasWork = plan.report.apply || plan.log.apply || plan.photos.some((item) => item.include);
      if (fileHasWork) files += 1;
      if (plan.report.apply) reports += 1;
      if (plan.log.apply) logs += 1;
      photos += plan.photos.filter((item) => item.include).length;
      duplicates += plan.photos.filter((item) => item.duplicateOf).length;
    }
    return { files, reports, logs, photos, duplicates };
  }, [plans]);

  async function runImport() {
    setFailure(null);
    // Por fecha; dentro de una fecha va primero el archivo cuyo reporte se aplica, para que las fotos
    // de los demás archivos de ese día ya tengan a qué reporte ligarse.
    const winnerFirst = (entry: Entry) => (plans.get(entry.key)?.report.apply ? "0" : "1");
    const workKey = (entry: Entry) => `${entry.parsed?.date ?? "9999"}|${winnerFirst(entry)}|${sortKey(entry)}`;
    const work = entries
      .filter((entry) => plans.get(entry.key)?.importable)
      .sort((a, b) => workKey(a).localeCompare(workKey(b)));
    const total = work.length;
    const reportIds = new Map<string, string>(); // `${holeId}|${fecha}` → id del reporte
    const known = new Map<string, Set<string>>();
    let done = 0, reports = 0, logs = 0, photos = 0, skippedPhotos = 0;
    try {
      for (const entry of work) {
        const plan = plans.get(entry.key)!;
        const parsed = entry.parsed!;
        const holeId = entry.holeId!;
        const context = contexts[holeId];
        setProgress({ done, total, label: entry.file.name });
        const dateKey = `${holeId}|${parsed.date}`;
        if (plan.report.apply) {
          const existing = context?.reports.find((item) => isoToReportDate(item.date) === parsed.date);
          const target = reportIds.has(dateKey)
            ? { id: reportIds.get(dateKey)!, pendingCreate: true }
            : existing
              ? { id: existing.id, pendingCreate: existing.pendingCreate }
              : undefined;
          const id = await saveReport.mutateAsync({ holeId, payload: reportFromWorkbook(parsed)!, target });
          reportIds.set(dateKey, id);
          reports += 1;
        }
        if (plan.log.apply) {
          await saveLog.mutateAsync({ holeId, rows: parsed.logRows });
          logs += 1;
        }
        const chosen = plan.photos.filter((item) => item.include);
        if (chosen.length) {
          const reportId = reportIds.get(dateKey) ?? context?.reports.find((item) => isoToReportDate(item.date) === parsed.date)?.id ?? null;
          if (!known.has(holeId)) known.set(holeId, new Set(context?.photoHashes ?? []));
          const result = await addPhotos.mutateAsync({
            holeId,
            knownHashes: known.get(holeId),
            photos: chosen.map((item) => ({
              source: item.photo.blob,
              meta: {
                kind: item.kind,
                reportId,
                caption: item.photo.caption || null,
                takenAt: parsed.date ? `${parsed.date}T00:00:00.000Z` : null,
                contentHash: item.photo.hash
              }
            }))
          });
          photos += result.added;
          skippedPhotos += result.skipped;
        }
        done += 1;
      }
      skippedPhotos += totals.duplicates;
      setProgress({ done: total, total, label: "Sincronizando…" });
      await onImported({ files: done, reports, logs, photos, skippedPhotos });
    } catch (error) {
      setFailure(`Se importaron ${done} de ${total} archivos. ${error instanceof Error ? error.message : "Error al importar."}`);
    } finally {
      setProgress(null);
    }
  }

  const groups = useMemo(() => {
    const map = new Map<string, Entry[]>();
    for (const entry of [...entries].sort((a, b) => sortKey(a).localeCompare(sortKey(b)))) {
      const key = entry.status === "ready" && entry.holeId ? entry.holeId : "__pending";
      map.set(key, [...(map.get(key) ?? []), entry]);
    }
    return [...map.entries()].sort(([a], [b]) => (a === "__pending" ? 1 : b === "__pending" ? -1 : (holeById.get(a)?.code ?? "").localeCompare(holeById.get(b)?.code ?? "")));
  }, [entries, holeById]);

  const busy = Boolean(progress);
  const fileInput = (
    <input ref={inputRef} type="file" accept=".xlsx,.xlsm" multiple className="hidden" onChange={(event) => { void addFiles(event.target.files); event.target.value = ""; }} />
  );

  return (
    <Modal
      open={open}
      onClose={() => !busy && onClose()}
      size="xl"
      icon={<FileSpreadsheet size={20} />}
      title={lockedHole ? `Importar reportes diarios · ${lockedHole.code}` : "Importar reportes geológicos diarios"}
      subtitle="Excel del equipo de geología (01_RESUMEN, 02_QUICK_LOG, 03_FOTOGRAFIAS, 04_SECCION_GEOLOGICA). Nada se guarda hasta que confirmes."
      footer={
        <>
          {entries.length ? (
            <p className="mr-auto self-center text-xs text-[var(--color-on-surface-variant)]">
              {totals.files} archivo(s) · {totals.reports} reporte(s) · {totals.logs} logueo(s) · {totals.photos} foto(s)
              {totals.duplicates ? ` · ${totals.duplicates} repetida(s) se omiten` : ""}
            </p>
          ) : null}
          <button type="button" className={secondaryButton} onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          {entries.length ? (
            <button type="button" className={primaryButton} onClick={runImport} disabled={busy || reading || totals.files === 0}>
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
              {busy ? `Importando ${progress!.done + 1 > progress!.total ? progress!.total : progress!.done + 1}/${progress!.total}` : `Importar ${totals.files || ""}`}
            </button>
          ) : null}
        </>
      }
    >
      {fileInput}
      {entries.length === 0 ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-[var(--color-border-soft)] px-6 py-14 text-center transition hover:border-[var(--color-primary)] hover:bg-[color-mix(in_srgb,var(--color-primary)_5%,transparent)]"
        >
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-primary)] text-[var(--color-on-primary)]">
            <FileSpreadsheet size={26} />
          </span>
          <span className="text-base font-extrabold">Elegir uno o varios Reporte_diario_*.xlsx</span>
          <span className="max-w-md text-xs text-[var(--color-on-surface-variant)]">
            {lockedHole
              ? `Se importan al pozo ${lockedHole.code}.`
              : "Cada archivo se asigna a su pozo y se importan en orden de fecha. Puedes elegir todos los días de varios pozos a la vez."}
          </span>
        </button>
      ) : (
        <div className="space-y-5">
          {progress ? (
            <div className="rounded-2xl border border-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-primary)_8%,transparent)] p-4">
              <p className="flex items-center gap-2 text-sm font-bold">
                <Loader2 size={16} className="animate-spin text-[var(--color-primary)]" />
                {progress.label}
              </p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--color-surface-container-high)]">
                <div className="h-full rounded-full bg-[var(--color-primary)] transition-all" style={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%` }} />
              </div>
            </div>
          ) : null}
          {failure ? <p className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-600">{failure}</p> : null}

          {reviews.size ? (
            <div
              className={`flex flex-wrap items-center gap-3 rounded-2xl border p-3 ${
                reviewTotals.errors ? "border-rose-500/40 bg-rose-500/5" : "border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)]"
              }`}
              data-testid="review-summary"
            >
              <div className="min-w-0 flex-1 text-xs">
                <p className="text-sm font-extrabold">Revisión de los Excel</p>
                <p className="mt-0.5 text-[var(--color-on-surface-variant)]">
                  {reviewTotals.errors
                    ? `${reviewTotals.errorFiles} archivo(s) con datos a corregir. Lo ideal es corregir el Excel y volver a cargarlo; si confirmas, se importa tal cual.`
                    : reviewTotals.warnings
                      ? "Nada bloquea la importación, pero hay datos a revisar."
                      : "Sin observaciones importantes."}
                </p>
                <p className="mt-1.5 flex flex-wrap gap-1.5">
                  <SeverityChip severity="error" count={reviewTotals.errors} />
                  <SeverityChip severity="warning" count={reviewTotals.warnings} />
                  <SeverityChip severity="info" count={reviewTotals.infos} />
                </p>
              </div>
              <button
                type="button"
                className={secondaryButton}
                onClick={downloadFindings}
                disabled={reviewTotals.errors + reviewTotals.warnings + reviewTotals.infos === 0}
              >
                <Download size={15} />
                Descargar observaciones (.xlsx)
              </button>
            </div>
          ) : null}

          {groups.map(([groupKey, group]) => {
            const hole = holeById.get(groupKey);
            const context = hole ? contexts[hole.id] : undefined;
            return (
              <section key={groupKey} className="space-y-3">
                <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--color-border-soft)] pb-2">
                  <h3 className="text-sm font-extrabold">{hole ? `Pozo ${hole.code}` : "Sin pozo asignado"}</h3>
                  {hole ? (
                    <span className="text-xs text-[var(--color-on-surface-variant)]">
                      {contextErrors[hole.id]
                        ? contextErrors[hole.id]
                        : context
                          ? `Hoy tiene ${context.reports.length} reporte(s) · logueo hasta ${fmt(context.loggedTo)} m · ${context.photoHashes.size} foto(s) con huella`
                          : "Consultando lo que ya tiene…"}
                    </span>
                  ) : null}
                </header>
                {group.map((entry) => (
                  <EntryCard
                    key={entry.key}
                    entry={entry}
                    plan={plans.get(entry.key)}
                    findings={reviews.get(entry.key) ?? []}
                    holes={lockedHole ? [lockedHole] : holes}
                    disabled={busy}
                    onChange={(patch) => update(entry.key, patch)}
                    onHoleChange={(holeId) => {
                      update(entry.key, { holeId, confirmed: false, initialized: false });
                      if (holeId) void ensureContext(holeId);
                    }}
                    onRemove={() => setEntries((current) => current.filter((item) => item.key !== entry.key))}
                  />
                ))}
              </section>
            );
          })}

          <button type="button" className={`${secondaryButton} w-full border-dashed`} onClick={() => inputRef.current?.click()} disabled={busy}>
            <FileSpreadsheet size={15} />
            Agregar más archivos
          </button>
        </div>
      )}
    </Modal>
  );
}

// ─── Tarjeta de un archivo ───────────────────────────────────────────────────
function Toggle({
  checked,
  disabled,
  onChange,
  icon,
  title,
  status,
  tone
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
  icon: React.ReactNode;
  title: string;
  status?: string;
  tone: "ok" | "off" | "muted";
}) {
  return (
    <label
      className={`flex min-w-0 cursor-pointer items-start gap-2.5 rounded-xl border p-2.5 transition ${
        disabled ? "cursor-not-allowed opacity-50" : ""
      } ${tone === "ok" ? "border-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-primary)_7%,transparent)]" : "border-[var(--color-border-soft)]"}`}
    >
      <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-primary)]" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />
      <span className={`mt-0.5 shrink-0 ${tone === "ok" ? "text-[var(--color-primary)]" : "text-[var(--color-on-surface-variant)]"}`}>{icon}</span>
      <span className="min-w-0">
        <span className="block text-xs font-bold">{title}</span>
        {status ? <span className="block text-[11px] leading-snug text-[var(--color-on-surface-variant)]">{status}</span> : null}
      </span>
    </label>
  );
}

function PreviewImage({ blob }: { blob: Blob }) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);
  return url ? <img src={url} alt="" className="aspect-[4/3] w-full object-cover" /> : <div className="aspect-[4/3] w-full animate-pulse bg-[var(--color-surface-container-high)]" />;
}

const SEVERITY_STYLE: Record<Severity, { chip: string; box: string; icon: React.ReactNode }> = {
  error: { chip: "bg-rose-500/15 text-rose-700 dark:text-rose-300", box: "border-rose-500/40 bg-rose-500/5", icon: <XCircle size={13} className="mt-0.5 shrink-0 text-rose-600" /> },
  warning: { chip: "bg-amber-500/15 text-amber-700 dark:text-amber-300", box: "border-amber-500/40 bg-amber-500/5", icon: <AlertTriangle size={13} className="mt-0.5 shrink-0 text-amber-600" /> },
  info: { chip: "bg-sky-500/15 text-sky-700 dark:text-sky-300", box: "border-sky-500/30 bg-sky-500/5", icon: <Info size={13} className="mt-0.5 shrink-0 text-sky-600" /> }
};

function SeverityChip({ severity, count }: { severity: Severity; count: number }) {
  if (!count) return null;
  return (
    <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${SEVERITY_STYLE[severity].chip}`}>
      {count} {SEVERITY_LABEL[severity].toLowerCase()}
    </span>
  );
}

function FindingsList({ findings }: { findings: Finding[] }) {
  const [showAll, setShowAll] = useState(false);
  const groups = (["error", "warning", "info"] as Severity[]).map((severity) => ({ severity, items: findings.filter((item) => item.severity === severity) })).filter((group) => group.items.length);
  const limit = 6;
  return (
    <div className="mt-3 space-y-2" data-testid="findings">
      {groups.map(({ severity, items }) => (
        <div key={severity} className={`rounded-xl border p-3 text-xs ${SEVERITY_STYLE[severity].box}`}>
          <p className="font-bold">
            {SEVERITY_LABEL[severity]} ({items.length})
          </p>
          <ul className="mt-1.5 space-y-1">
            {(showAll || severity === "error" ? items : items.slice(0, limit)).map((item, index) => (
              <li key={index} className="flex gap-1.5">
                {SEVERITY_STYLE[severity].icon}
                <span className="min-w-0">
                  <span className="mr-1.5 rounded bg-[var(--color-surface-container-high)] px-1 py-px font-mono text-[10px] font-semibold">{item.where}</span>
                  {item.message}
                </span>
              </li>
            ))}
          </ul>
          {!showAll && severity !== "error" && items.length > limit ? (
            <button type="button" className="mt-1 text-[11px] font-semibold text-[var(--color-primary)]" onClick={() => setShowAll(true)}>
              Ver {items.length - limit} más
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function EntryCard({
  entry,
  plan,
  findings,
  holes,
  disabled,
  onChange,
  onHoleChange,
  onRemove
}: {
  entry: Entry;
  plan?: EntryPlan;
  findings: Finding[];
  holes: DrillingHole[];
  disabled: boolean;
  onChange: (patch: Partial<Entry> | ((entry: Entry) => Partial<Entry>)) => void;
  onHoleChange: (holeId: string | null) => void;
  onRemove: () => void;
}) {
  const parsed = entry.parsed;
  if (entry.status !== "ready" || !parsed) {
    return (
      <article className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--color-border-soft)] p-4">
        <span className="flex min-w-0 items-center gap-2 text-sm">
          {entry.status === "reading" ? <Loader2 size={16} className="shrink-0 animate-spin text-[var(--color-primary)]" /> : <XCircle size={16} className="shrink-0 text-rose-600" />}
          <span className="truncate font-semibold">{entry.file.name}</span>
          <span className={`shrink-0 text-xs ${entry.status === "error" ? "text-rose-600" : "text-[var(--color-on-surface-variant)]"}`}>
            {entry.status === "reading" ? "Leyendo…" : entry.error}
          </span>
        </span>
        <button type="button" className={iconButton} onClick={onRemove} aria-label="Quitar archivo" disabled={disabled}>
          <Trash2 size={15} />
        </button>
      </article>
    );
  }

  const advance = parsed.fromDepth !== null && parsed.toDepth !== null ? parsed.toDepth - parsed.fromDepth : null;
  const dateMismatch = Boolean(parsed.date && parsed.fileDate && parsed.date !== parsed.fileDate);
  const blocked = plan && !plan.importable;
  const photoPlans = plan?.photos ?? [];
  const newPhotos = photoPlans.filter((item) => item.include).length;
  const duplicates = photoPlans.filter((item) => item.duplicateOf).length;
  const errors = countBy(findings, "error");
  const notes = plan?.notes ?? [];

  return (
    <article
      data-testid="import-entry"
      className={`rounded-2xl border p-4 ${errors && !entry.confirmed ? "border-rose-500/50 bg-rose-500/[0.03]" : blocked ? "border-amber-500/50 bg-amber-500/5" : "border-[var(--color-border-soft)]"}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 truncate text-sm font-bold">
            <FileSpreadsheet size={15} className="shrink-0 text-emerald-600" />
            <span className="truncate">{entry.file.name}</span>
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className={`rounded-md px-2 py-0.5 font-bold ${dateMismatch ? "bg-amber-500/15 text-amber-700 dark:text-amber-300" : "bg-[var(--color-surface-container-high)]"}`}>
              Reporte {dateText(parsed.date)}
            </span>
            {parsed.holeCode ? <span className="rounded-md bg-[var(--color-surface-container-high)] px-2 py-0.5 font-mono font-semibold">{parsed.holeCode}</span> : null}
            {advance !== null ? (
              <span className="rounded-md bg-[var(--color-surface-container-high)] px-2 py-0.5 font-mono font-semibold">
                {fmt(parsed.fromDepth!)} → {fmt(parsed.toDepth!)} m · {advance === 0 ? "sin avance" : `+${fmt(advance)} m`}
              </span>
            ) : null}
            <SeverityChip severity="error" count={errors} />
            <SeverityChip severity="warning" count={countBy(findings, "warning")} />
            <SeverityChip severity="info" count={countBy(findings, "info")} />
          </div>
        </div>
        <button type="button" className={iconButton} onClick={onRemove} aria-label="Quitar archivo" disabled={disabled}>
          <Trash2 size={15} />
        </button>
      </div>

      {!entry.match ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-amber-500/60 bg-amber-500/10 p-3 text-xs">
          <span className="font-semibold">No hay un pozo {parsed.holeCode ?? ""} en el sistema. ¿A cuál corresponde?</span>
          <select
            className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] px-2 py-1 text-xs font-semibold"
            value={entry.holeId ?? ""}
            disabled={disabled}
            onChange={(event) => onHoleChange(event.target.value || null)}
          >
            <option value="">Elegir pozo…</option>
            {holes.map((hole) => (
              <option key={hole.id} value={hole.id}>
                {hole.code}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      {findings.length ? <FindingsList findings={findings} /> : null}
      {errors && entry.holeId ? (
        <label
          className={`mt-2 flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 text-xs ${entry.confirmed ? "border-emerald-500/50 bg-emerald-500/5" : "border-rose-500/50 bg-rose-500/10"}`}
        >
          <input
            type="checkbox"
            data-testid="confirm-entry"
            className="mt-0.5 h-4 w-4 accent-emerald-600"
            checked={entry.confirmed}
            disabled={disabled}
            onChange={(event) => onChange({ confirmed: event.target.checked })}
          />
          <span>
            <span className="block font-semibold">Revisé las observaciones: importar este archivo tal cual</span>
            <span className="text-[var(--color-on-surface-variant)]">Los datos se guardan exactamente como vienen en el Excel, sin corregir nada.</span>
          </span>
        </label>
      ) : null}
      {blocked && plan?.blockedReason && plan.blockedReason !== NEEDS_CONFIRMATION ? (
        <p className="mt-2 text-xs font-semibold text-amber-700 dark:text-amber-300">{plan.blockedReason}</p>
      ) : null}

      {!blocked && plan ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <Toggle
            checked={entry.report}
            disabled={disabled || !reportFromWorkbook(parsed)}
            onChange={(report) => onChange({ report })}
            icon={<Microscope size={15} />}
            title={`Reporte del ${dateText(parsed.date)}`}
            status={plan.report.note ?? (plan.report.apply ? "Se importa." : undefined)}
            tone={plan.report.apply ? "ok" : "off"}
          />
          <Toggle
            checked={entry.log}
            disabled={disabled || parsed.logRows.length === 0}
            onChange={(log) => onChange({ log })}
            icon={<Layers size={15} />}
            title={`Quick log · ${parsed.logRows.length} tramos`}
            status={plan.log.note ?? (plan.log.apply ? `Hasta ${fmt(Math.max(0, ...parsed.logRows.map((row) => row.toDepth)))} m.` : undefined)}
            tone={plan.log.apply ? "ok" : "off"}
          />
          <Toggle
            checked={newPhotos > 0}
            disabled={disabled || parsed.photos.length === 0 || photoPlans.every((item) => item.duplicateOf)}
            onChange={(include) =>
              onChange((current) => ({
                photos: Object.fromEntries(parsed.photos.map((photo) => [photo.key, { ...(current.photos[photo.key] ?? { kind: photo.kind }), include }]))
              }))
            }
            icon={<Images size={15} />}
            title={`Fotografías · ${newPhotos} de ${parsed.photos.length}`}
            status={duplicates ? `${duplicates} repetida(s): ya están, no se suben otra vez.` : parsed.photos.length ? "Se comprimen y se asocian al reporte." : "El archivo no trae fotos."}
            tone={newPhotos > 0 ? "ok" : "off"}
          />
        </div>
      ) : null}

      {notes.length ? (
        <ul className="mt-2 space-y-1 text-xs text-amber-800 dark:text-amber-300">
          {notes.map((note) => (
            <li key={note} className="flex gap-1.5">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" />
              {note}
            </li>
          ))}
        </ul>
      ) : !blocked && plan && !findings.length ? (
        <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
          <CheckCircle2 size={13} />
          Sin observaciones.
        </p>
      ) : null}

      {!blocked && parsed.photos.length ? (
        <div className="mt-3">
          <button type="button" className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-primary)]" onClick={() => onChange({ expanded: !entry.expanded })}>
            <ChevronDown size={14} className={`transition ${entry.expanded ? "rotate-180" : ""}`} />
            {entry.expanded ? "Ocultar fotos" : `Ver fotos (${parsed.photos.length})`}
          </button>
          {entry.expanded ? (
            <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
              {photoPlans.map((item) => {
                const choice = entry.photos[item.photo.key] ?? { include: true, kind: item.photo.kind };
                return (
                  <li key={item.photo.key} className={`overflow-hidden rounded-lg border ${item.include ? "border-[var(--color-primary)]" : "border-[var(--color-border-soft)] opacity-50"}`}>
                    <label className="relative block cursor-pointer">
                      <PreviewImage blob={item.photo.blob} />
                      <input
                        type="checkbox"
                        className="absolute left-1.5 top-1.5 h-4 w-4 accent-[var(--color-primary)]"
                        checked={item.include}
                        disabled={disabled || Boolean(item.duplicateOf)}
                        onChange={(event) => onChange((current) => ({ photos: { ...current.photos, [item.photo.key]: { ...choice, include: event.target.checked } } }))}
                      />
                      <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1 py-0.5 text-[9px] font-bold text-white">{formatBytes(item.photo.blob.size)}</span>
                    </label>
                    {item.duplicateOf ? (
                      <p className="bg-[var(--color-surface-container-high)] px-1.5 py-1 text-[10px] font-semibold text-[var(--color-on-surface-variant)]">Repetida: ya está en {item.duplicateOf}</p>
                    ) : (
                      <select
                        className="w-full border-t border-[var(--color-border-soft)] bg-transparent px-1.5 py-1 text-[10px] font-semibold"
                        value={choice.kind}
                        disabled={disabled}
                        onChange={(event) => onChange((current) => ({ photos: { ...current.photos, [item.photo.key]: { ...choice, kind: event.target.value as PhotoKind } } }))}
                      >
                        {(Object.keys(PHOTO_KINDS) as PhotoKind[]).map((kind) => (
                          <option key={kind} value={kind}>
                            {PHOTO_KINDS[kind].label}
                          </option>
                        ))}
                      </select>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      ) : null}

      {!blocked && parsed.logRows.length ? (
        <div className="mt-3 flex h-2.5 w-full overflow-hidden rounded-full" title="Columna litológica del quick log">
          {parsed.logRows.map((row, index) => (
            <span key={index} style={{ flexGrow: row.toDepth - row.fromDepth, background: lithologyColor(row.lithology) }} />
          ))}
        </div>
      ) : null}
    </article>
  );
}
