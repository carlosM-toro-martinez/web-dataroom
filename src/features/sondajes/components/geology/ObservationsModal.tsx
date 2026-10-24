import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, AlertTriangle, ChevronDown, ClipboardCheck, Download, FileSpreadsheet, Info, Loader2, RefreshCw } from "lucide-react";
import {
  getGeologyLog,
  getGeologyObservations,
  getGeologyReports,
  getHolePhotos,
  type GeologyObservation,
  type ObservationSeverity
} from "@/features/sondajes/api/geologyApi";
import { parseGeologyWorkbook, type ParsedGeologyWorkbook } from "@/features/sondajes/lib/geologyExcel";
import { compareWorkbooks } from "@/features/sondajes/lib/geologyCompare";
import { useDrillingHolesQuery } from "@/features/sondajes/hooks/useSondajes";
import { Modal, panelClass, primaryButton, secondaryButton } from "@/features/sondajes/components/ui";

const SEVERITY = {
  error: { label: "Error", Icon: AlertCircle, tone: "text-rose-600", chip: "bg-rose-500/10 text-rose-700", ring: "border-rose-500/40" },
  warning: { label: "Revisar", Icon: AlertTriangle, tone: "text-amber-600", chip: "bg-amber-500/10 text-amber-700", ring: "border-amber-500/40" },
  info: { label: "Aviso", Icon: Info, tone: "text-sky-600", chip: "bg-sky-500/10 text-sky-700", ring: "border-[var(--color-border-soft)]" }
} as const;

const csvCell = (value: string) => `"${value.replace(/"/g, '""')}"`;

function downloadCsv(items: GeologyObservation[]) {
  const rows = [
    ["Gravedad", "Pozo", "Tipo", "Observación", "Detalle", "Qué hacer", "Evidencia"],
    ...items.map((item) => [SEVERITY[item.severity].label, item.hole, item.category, item.title, item.detail, item.suggestion, item.evidence.map((e) => `${e.label}: ${e.value}`).join(" | ")])
  ];
  const blob = new Blob([`﻿${rows.map((row) => row.map(csvCell).join(";")).join("\r\n")}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `observaciones_geologia_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function ObservationCard({ item, onGo }: { item: GeologyObservation; onGo?: (item: GeologyObservation) => void }) {
  const [open, setOpen] = useState(false);
  const s = SEVERITY[item.severity];
  return (
    <article className={`rounded-2xl border bg-[var(--color-surface-container-low)] ${s.ring}`}>
      <button type="button" className="flex w-full items-start gap-3 p-3.5 text-left" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <s.Icon size={18} className={`mt-0.5 shrink-0 ${s.tone}`} />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider">
            <span className={`rounded-md px-1.5 py-0.5 ${s.chip}`}>{s.label}</span>
            <span className="rounded-md bg-[var(--color-surface-container-high)] px-1.5 py-0.5 text-[var(--color-on-surface-variant)]">{item.hole}</span>
            <span className="text-[var(--color-on-surface-variant)]">{item.category}</span>
          </span>
          <span className="mt-1 block text-sm font-bold leading-snug">{item.title}</span>
        </span>
        <ChevronDown size={16} className={`mt-1 shrink-0 text-[var(--color-on-surface-variant)] transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <div className="space-y-3 border-t border-[var(--color-border-soft)] px-4 pb-4 pt-3 text-sm">
          <p className="text-[var(--color-on-surface)]">{item.detail}</p>
          {item.evidence.length ? (
            <dl className="overflow-hidden rounded-xl border border-[var(--color-border-soft)] text-xs">
              {item.evidence.map((row, index) => (
                <div key={`${row.label}-${index}`} className="grid grid-cols-[minmax(0,2fr)_minmax(0,5fr)] gap-3 border-b border-[var(--color-border-soft)] px-3 py-1.5 last:border-b-0 odd:bg-[var(--color-surface-container-high)]/40">
                  <dt className="font-semibold text-[var(--color-on-surface-variant)]">{row.label}</dt>
                  <dd className="break-words font-mono tabular-nums">{row.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          <p className="rounded-xl bg-[color-mix(in_srgb,var(--color-primary)_8%,transparent)] px-3 py-2 text-xs">
            <b>Qué hacer: </b>
            {item.suggestion}
          </p>
          {onGo && item.holeId ? (
            <button type="button" className={primaryButton} onClick={() => onGo(item)}>
              Ir a corregir
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

type Props = { open: boolean; onClose: () => void; holeId?: string; onGo: (item: GeologyObservation) => void };

// Revisa la información geológica ya cargada y la compara con los Excel. No cambia nada: solo señala qué corregir.
export function ObservationsModal({ open, onClose, holeId, onGo }: Props) {
  const [mode, setMode] = useState<"system" | "excel">("system");
  const [severity, setSeverity] = useState<ObservationSeverity | "all">("all");
  const [category, setCategory] = useState("all");
  const [hole, setHole] = useState(holeId ?? "all");
  const holes = useDrillingHolesQuery();
  const review = useQuery({
    queryKey: ["sondajes", "geology-observations", holeId ?? "all"],
    queryFn: () => getGeologyObservations(holeId),
    enabled: open,
    staleTime: 0
  });

  const [excelItems, setExcelItems] = useState<GeologyObservation[] | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [excelError, setExcelError] = useState<string | null>(null);

  async function compare(fileList: FileList | null) {
    if (!fileList?.length) return;
    setExcelError(null);
    setExcelItems(null);
    try {
      const parsed: ParsedGeologyWorkbook[] = [];
      for (const [index, file] of Array.from(fileList).entries()) {
        setProgress(`Leyendo ${file.name} (${index + 1}/${fileList.length})…`);
        try {
          parsed.push(await parseGeologyWorkbook(file));
        } catch (error) {
          setExcelError(`${file.name}: ${error instanceof Error ? error.message : "no se pudo leer"}`);
        }
      }
      const allHoles = holes.data ?? [];
      const ids = new Set<string>();
      for (const file of parsed) {
        const code = (file.holeCode ?? file.fileHole ?? "").replace(/[^a-z0-9]/gi, "").toUpperCase();
        const match = allHoles.find((h) => h.code.replace(/[^a-z0-9]/gi, "").toUpperCase() === code) ?? allHoles.find((h) => code.startsWith(h.code.replace(/[^a-z0-9]/gi, "").toUpperCase()));
        if (match) ids.add(match.id);
      }
      const data = new Map<string, Awaited<ReturnType<typeof loadHole>>>();
      for (const id of ids) {
        setProgress("Leyendo lo que hay en el sistema…");
        data.set(id, await loadHole(id));
      }
      setProgress("Comparando…");
      setExcelItems(compareWorkbooks({ files: parsed, holes: allHoles.map((h) => ({ id: h.id, code: h.code })), data }));
    } catch (error) {
      setExcelError(error instanceof Error ? error.message : "No se pudo comparar.");
    } finally {
      setProgress(null);
    }
  }

  const source = mode === "system" ? review.data?.items ?? [] : excelItems ?? [];
  const holeOptions = useMemo(() => [...new Set(source.map((item) => item.hole))].sort(), [source]);
  const categories = useMemo(() => [...new Set(source.map((item) => item.category))], [source]);
  const visible = source.filter((item) => (severity === "all" || item.severity === severity) && (category === "all" || item.category === category) && (hole === "all" || item.hole === hole));
  const count = (s: ObservationSeverity) => source.filter((item) => item.severity === s).length;
  const busy = Boolean(progress);

  return (
    <Modal
      open={open}
      onClose={() => !busy && onClose()}
      size="xl"
      icon={<ClipboardCheck size={20} />}
      title="Observaciones de la información geológica"
      subtitle="Revisa reportes, logueo y fotos, y señala lo que no cuadra o está incompleto. No cambia ningún dato."
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <button type="button" className={secondaryButton} disabled={!visible.length} onClick={() => downloadCsv(visible)}>
            <Download size={15} />
            Descargar lista (Excel/CSV)
          </button>
          <button type="button" className={primaryButton} onClick={onClose} disabled={busy}>
            Cerrar
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="inline-flex rounded-xl border border-[var(--color-border-soft)] p-1">
          {(
            [
              ["system", "Revisión del sistema"],
              ["excel", "Comparar con Excel"]
            ] as const
          ).map(([value, text]) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${mode === value ? "bg-[var(--color-primary)] text-[var(--color-on-primary)]" : "text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]"}`}
            >
              {text}
            </button>
          ))}
        </div>

        {mode === "excel" ? (
          <section className={`${panelClass} space-y-3 p-4`}>
            <p className="text-sm font-bold">Elige los Excel de reporte diario que quieres contrastar</p>
            <p className="text-xs text-[var(--color-on-surface-variant)]">
              El sistema lee cada Excel y lo compara con lo guardado: datos del reporte, cada tramo del logueo y las imágenes. Puedes elegir muchos a la vez. Los Excel no se suben ni se guardan.
            </p>
            <label className={`${secondaryButton} cursor-pointer`}>
              <input
                type="file"
                multiple
                accept=".xlsx,.xlsm"
                className="hidden"
                disabled={busy}
                onChange={(event) => {
                  void compare(event.target.files);
                  event.target.value = "";
                }}
              />
              <FileSpreadsheet size={15} />
              Elegir Excel
            </label>
            {progress ? (
              <p className="flex items-center gap-2 text-sm font-semibold">
                <Loader2 size={15} className="animate-spin" /> {progress}
              </p>
            ) : null}
            {excelError ? <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-600">{excelError}</p> : null}
          </section>
        ) : null}

        {mode === "system" && review.isLoading ? (
          <p className="flex items-center gap-2 text-sm">
            <Loader2 size={16} className="animate-spin" /> Revisando la información…
          </p>
        ) : null}
        {mode === "system" && review.isError ? <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-600">No se pudo hacer la revisión. Revisa tu conexión.</p> : null}

        {mode === "system" && review.data ? (
          <section className="grid gap-2 sm:grid-cols-3">
            {review.data.holes.map((stat) => (
              <div key={stat.holeId} className={`${panelClass} p-3 text-xs`}>
                <p className="text-sm font-extrabold">{stat.hole}</p>
                <p className="mt-1 text-[var(--color-on-surface-variant)]">
                  {stat.reports} reportes · {stat.logIntervals} tramos logueados ({String(stat.loggedMeters).replace(".", ",")} m)
                </p>
                <p className="text-[var(--color-on-surface-variant)]">
                  {stat.photos} fotos · {stat.coreBoxPhotos} de cajas, {stat.photosWithMeters + stat.photosWithBoxes === 0 ? "ninguna con metros ni caja" : `${stat.photosWithMeters} con metros`}
                </p>
                {stat.photosWithoutReport ? <p className="text-amber-700">{stat.photosWithoutReport} fotos sin reporte</p> : null}
              </div>
            ))}
          </section>
        ) : null}

        {source.length || (mode === "system" && review.data) || excelItems ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              {(["all", "error", "warning", "info"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSeverity(value)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${severity === value ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-on-primary)]" : "border-[var(--color-border-soft)] text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]"}`}
                >
                  {value === "all" ? `Todas (${source.length})` : `${SEVERITY[value].label} (${count(value)})`}
                </button>
              ))}
              {!holeId && holeOptions.length > 1 ? (
                <select className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] px-3 py-1.5 text-xs font-semibold" value={hole} onChange={(event) => setHole(event.target.value)}>
                  <option value="all">Todos los pozos</option>
                  {holeOptions.map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
              ) : null}
              {categories.length > 1 ? (
                <select className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] px-3 py-1.5 text-xs font-semibold" value={category} onChange={(event) => setCategory(event.target.value)}>
                  <option value="all">Todo tipo</option>
                  {categories.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              ) : null}
              {mode === "system" ? (
                <button type="button" className={`${secondaryButton} ml-auto`} onClick={() => void review.refetch()} disabled={review.isFetching}>
                  <RefreshCw size={14} className={review.isFetching ? "animate-spin" : ""} />
                  Volver a revisar
                </button>
              ) : null}
            </div>

            {visible.length === 0 ? (
              <p className={`${panelClass} px-4 py-8 text-center text-sm text-[var(--color-on-surface-variant)]`}>
                {source.length === 0 ? "No se encontraron observaciones. Todo cuadra." : "Ninguna observación con esos filtros."}
              </p>
            ) : (
              <div className="space-y-2">
                {visible.map((item) => (
                  <ObservationCard key={item.id} item={item} onGo={onGo} />
                ))}
              </div>
            )}
          </>
        ) : null}
      </div>
    </Modal>
  );
}

async function loadHole(holeId: string) {
  const [reports, log, photos] = await Promise.all([getGeologyReports(holeId), getGeologyLog(holeId), getHolePhotos(holeId)]);
  return { reports, log, photos };
}
