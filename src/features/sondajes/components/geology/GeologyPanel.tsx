import { useEffect, useMemo, useState } from "react";
import {
  Camera,
  Eye,
  FileSpreadsheet,
  Images,
  Layers,
  Microscope,
  Pencil,
  Plus,
  Printer,
  Trash2,
  Users
} from "lucide-react";
import { useToast } from "@/shared/ui/toast/ToastProvider";
import { useAuth } from "@/features/auth/context/AuthContext";
import type { DrillingCampaign, DrillingHole } from "@/features/sondajes/model/sondajes.schema";
import type { GeologyReportPayload, LogInterval, PhotoMeta } from "@/features/sondajes/model/geology.schema";
import {
  useAddPhotosMutation,
  useDeleteGeologyReportMutation,
  useGeologyLogQuery,
  useGeologyReportsQuery,
  useGeologySync,
  useHolePhotosQuery,
  useSaveGeologyLogMutation,
  useSaveGeologyReportMutation
} from "@/features/sondajes/hooks/useGeology";
import { fetchPhotoBlob } from "@/features/sondajes/api/geologyApi";
import { getPhotoBlob } from "@/features/sondajes/db/geologyDb";
import {
  fmt,
  mergeGeologyLog,
  mergeGeologyReports,
  mergePhotos,
  summarizeLog,
  toLogPayload,
  viewToReportPayload,
  type GeologyReportView,
  type PhotoView
} from "@/features/sondajes/lib/geology";
import { buildGeologyReportHtml, blobToDataUrl, printGeologyReport, type PrintPhoto } from "@/features/sondajes/lib/printGeologyReport";
import { formatReportDate, reportDateToIso } from "@/features/sondajes/lib/shiftReports";
import { SyncBar } from "@/features/sondajes/components/SyncBar";
import { Modal, dangerButton, iconButton, panelClass, primaryButton, secondaryButton } from "@/features/sondajes/components/ui";
import { Stat, SyncPill } from "@/features/sondajes/components/geology/GeologyShared";
import { PhotoGallery, PhotoLightbox, PhotoStrip, PhotoUploadModal } from "@/features/sondajes/components/geology/Photos";
import { GeologyReportFormModal, type AttachedPhoto } from "@/features/sondajes/components/geology/GeologyReportFormModal";
import { GeologyLogView } from "@/features/sondajes/components/geology/GeologyLogView";
import { GeologyImportModal, describeImport } from "@/features/sondajes/components/geology/GeologyImportModal";
import { useDrillingHolesQuery } from "@/features/sondajes/hooks/useSondajes";

type SubTab = "reports" | "log" | "photos";
type Messages = { ok: string; offline: string };

// Imágenes para la vista/impresión: copia local o descarga; se incrustan como data URL.
async function loadSources(photos: PhotoView[], variant: "thumb" | "full"): Promise<PrintPhoto[]> {
  const loaded = await Promise.all(
    photos.map(async (photo) => {
      let blob = (await getPhotoBlob(photo.id, variant)) ?? undefined;
      if (!blob && !photo.pendingCreate && navigator.onLine) blob = await fetchPhotoBlob(photo.id, variant).catch(() => undefined);
      blob ??= await getPhotoBlob(photo.id, "thumb");
      return blob ? { ...photo, src: await blobToDataUrl(blob) } : null;
    })
  );
  return loaded.filter((item): item is PrintPhoto => item !== null);
}

const KIND_ORDER = { DETAIL: 0, CORE_BOX: 1, SECTION: 2, OTHER: 3 } as const;

export function GeologyPanel({ hole, campaign }: { hole: DrillingHole; campaign?: DrillingCampaign }) {
  const { can } = useAuth();
  const { showError, showSuccess } = useToast();
  const reportsQuery = useGeologyReportsQuery(hole.id);
  const logQuery = useGeologyLogQuery(hole.id);
  const photosQuery = useHolePhotosQuery(hole.id);
  const sync = useGeologySync();
  const saveReport = useSaveGeologyReportMutation();
  const saveLog = useSaveGeologyLogMutation();
  const addPhotos = useAddPhotosMutation();
  const deleteReport = useDeleteGeologyReportMutation();

  const [tab, setTab] = useState<SubTab>("reports");
  const [form, setForm] = useState<{ open: boolean; report: GeologyReportView | null }>({ open: false, report: null });
  const [viewId, setViewId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<GeologyReportView | null>(null);
  const [upload, setUpload] = useState<{ open: boolean; defaults?: Partial<PhotoMeta> }>({ open: false });
  const [lightbox, setLightbox] = useState<{ photoId: string; ids: string[] } | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const holesQuery = useDrillingHolesQuery();

  const reports = useMemo(() => mergeGeologyReports(hole.id, reportsQuery.data ?? [], sync.queue), [hole.id, reportsQuery.data, sync.queue]);
  const log = useMemo(() => mergeGeologyLog(hole.id, logQuery.data ?? [], sync.queue), [hole.id, logQuery.data, sync.queue]);
  const photos = useMemo(
    () => mergePhotos(hole.id, photosQuery.data ?? [], sync.queue).sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || (a.boxFrom ?? 0) - (b.boxFrom ?? 0)),
    [hole.id, photosQuery.data, sync.queue]
  );
  const logSummary = summarizeLog(log.rows);
  const lastReport = reports.find((report) => report.sync !== "error");
  const suggestedFrom = Math.max(lastReport?.toDepth ?? 0, lastReport ? 0 : logSummary.loggedTo, lastReport ? 0 : hole.currentDepth ?? 0);
  const viewing = viewId ? reports.find((report) => report.id === viewId) ?? null : null;
  const busy = saveReport.isPending || saveLog.isPending || addPhotos.isPending || sync.isSyncing;

  // Tras guardar en la cola: si hay red se envía ya; si no, queda en el dispositivo.
  async function afterSave(messages: Messages) {
    if (!navigator.onLine) {
      showSuccess(messages.offline);
      return;
    }
    const result = await sync.runSync();
    if (result?.failed) showError(`Guardado en el dispositivo, pero el servidor lo rechazó: ${result.errors[0]}`);
    else showSuccess(messages.ok);
  }

  async function submitReport(payload: GeologyReportPayload, attached: AttachedPhoto[]) {
    try {
      const target = form.report ? { id: form.report.id, pendingCreate: form.report.pendingCreate } : undefined;
      const reportId = await saveReport.mutateAsync({ holeId: hole.id, payload, target });
      if (attached.length) {
        await addPhotos.mutateAsync({
          holeId: hole.id,
          photos: attached.map((item) => ({ source: item.file, meta: { kind: item.kind, reportId, takenAt: payload.date } }))
        });
      }
      setForm({ open: false, report: null });
      await afterSave({ ok: "Reporte geológico guardado y sincronizado.", offline: "Reporte guardado en este dispositivo. Se sincronizará cuando haya conexión." });
    } catch (error) {
      showError(error instanceof Error ? error.message : "No se pudo guardar el reporte.");
    }
  }

  async function submitLog(rows: LogInterval[], messages: Messages) {
    try {
      await saveLog.mutateAsync({ holeId: hole.id, rows: rows.map(toLogPayload) });
      await afterSave(messages);
    } catch (error) {
      showError(error instanceof Error ? error.message : "No se pudo guardar el logueo.");
      throw error;
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    try {
      await deleteReport.mutateAsync({ id: toDelete.id, pendingCreate: toDelete.pendingCreate });
      showSuccess(toDelete.pendingCreate ? "Reporte descartado." : "Reporte eliminado. Sus fotos siguen en la galería.");
      if (viewId === toDelete.id) setViewId(null);
      setToDelete(null);
    } catch (error) {
      showError(error instanceof Error ? error.message : "No se pudo eliminar el reporte.");
    }
  }

  async function print(report: GeologyReportView) {
    try {
      const sources = await loadSources(photos.filter((photo) => photo.reportId === report.id), "full");
      printGeologyReport(buildGeologyReportHtml(viewToReportPayload(report), { hole, campaign, photos: sources }));
    } catch (error) {
      showError(error instanceof Error ? error.message : "No se pudo abrir la impresión.");
    }
  }

  const openPhoto = (photo: PhotoView, list: PhotoView[] = photos) => setLightbox({ photoId: photo.id, ids: list.map((item) => item.id) });
  const lightboxPhotos = lightbox ? lightbox.ids.map((id) => photos.find((photo) => photo.id === id)).filter((photo): photo is PhotoView => Boolean(photo)) : [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {can("geologiaSondajes", "create") ? (
          <>
            <button type="button" className={secondaryButton} onClick={() => setImportOpen(true)}>
              <FileSpreadsheet size={16} />
              Importar Excel
            </button>
            <button type="button" className={secondaryButton} onClick={() => setUpload({ open: true, defaults: { reportId: lastReport?.id ?? null } })}>
              <Camera size={16} />
              Fotos
            </button>
            <button type="button" className={`${primaryButton} px-5 py-3 text-base`} onClick={() => setForm({ open: true, report: null })}>
              <Plus size={18} />
              Nuevo reporte
            </button>
          </>
        ) : null}
      </div>

      <SyncBar sync={sync} itemLabel="cambio(s) de geología" />

      <section className={`${panelClass} p-5`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Geología del sondaje</p>
            <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">
              {lastReport ? (
                <>
                  Último reporte <b className="text-[var(--color-on-surface)]">{formatReportDate(lastReport.date)}</b>
                  {lastReport.geologists ? (
                    <>
                      {" "}· <Users size={12} className="inline" /> {lastReport.geologists}
                    </>
                  ) : null}
                </>
              ) : (
                "Sin reportes geológicos todavía."
              )}
            </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Profundidad reportada" value={lastReport ? `${fmt(lastReport.toDepth)} m` : "—"} tone="text-[var(--color-primary)]" />
          <Stat label="Reportes" value={String(reports.length)} />
          <Stat label="Logueado hasta" value={logSummary.intervals ? `${fmt(logSummary.loggedTo)} m` : "—"} />
          <Stat label="Fotografías" value={String(photos.length)} />
        </div>
      </section>

      <div className="flex gap-1 overflow-x-auto rounded-xl border border-[var(--color-border-soft)] p-1 sm:inline-flex">
        {(
          [
            ["reports", Microscope, `Reportes (${reports.length})`],
            ["log", Layers, `Logueo (${logSummary.intervals})`],
            ["photos", Images, `Fotos (${photos.length})`]
          ] as const
        ).map(([value, Icon, text]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
              tab === value ? "bg-[var(--color-primary)] text-[var(--color-on-primary)]" : "text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]"
            }`}
          >
            <Icon size={15} />
            {text}
          </button>
        ))}
      </div>

      {tab === "reports" ? (
        <section className="space-y-3">
          {reportsQuery.isLoading ? (
            Array.from({ length: 2 }).map((_, index) => <div key={index} className="h-32 animate-pulse rounded-2xl bg-[var(--color-surface-container-high)]" />)
          ) : reports.length === 0 ? (
            <div className={`${panelClass} flex flex-col items-center gap-3 px-6 py-12 text-center`}>
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] text-[var(--color-primary)]">
                <Microscope size={26} />
              </span>
              <p className="text-sm font-bold">Aún no hay reportes geológicos</p>
              <p className="max-w-sm text-xs text-[var(--color-on-surface-variant)]">
                Registra el resumen geológico del avance de cada día o importa el Excel del reporte diario. Funciona sin internet.
              </p>
              {can("geologiaSondajes", "create") ? (
                <div className="flex flex-wrap justify-center gap-2">
                  <button type="button" className={primaryButton} onClick={() => setForm({ open: true, report: null })}>
                    <Plus size={16} />
                    Nuevo reporte
                  </button>
                  <button type="button" className={secondaryButton} onClick={() => setImportOpen(true)}>
                    <FileSpreadsheet size={16} />
                    Importar Excel
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            reports.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                photos={photos.filter((photo) => photo.reportId === report.id)}
                canEdit={can("geologiaSondajes", "update")}
                canDelete={can("geologiaSondajes", "delete")}
                onView={() => setViewId(report.id)}
                onPrint={() => print(report)}
                onEdit={() => setForm({ open: true, report })}
                onDelete={() => setToDelete(report)}
                onOpenPhoto={(photo, list) => openPhoto(photo, list)}
              />
            ))
          )}
        </section>
      ) : tab === "log" ? (
        <GeologyLogView
          log={log}
          plannedDepth={hole.plannedDepth ?? null}
          canEdit={can("geologiaSondajes", "update")}
          canImport={can("geologiaSondajes", "create")}
          onSave={submitLog}
          onImport={() => setImportOpen(true)}
        />
      ) : (
        <PhotoGallery
          photos={photos}
          reports={reports}
          canAdd={can("geologiaSondajes", "create")}
          onOpen={(photo) => openPhoto(photo)}
          onAdd={() => setUpload({ open: true, defaults: { reportId: lastReport?.id ?? null } })}
        />
      )}

      <GeologyReportFormModal
        open={form.open}
        report={form.report}
        hole={hole}
        reports={reports}
        photos={photos}
        suggestedFrom={suggestedFrom}
        saving={busy}
        onClose={() => setForm({ open: false, report: null })}
        onSubmit={submitReport}
      />

      {viewing ? (
        <ReportViewModal
          report={viewing}
          hole={hole}
          campaign={campaign}
          photos={photos.filter((photo) => photo.reportId === viewing.id)}
          canEdit={can("geologiaSondajes", "update")}
          onClose={() => setViewId(null)}
          onPrint={() => print(viewing)}
          onEdit={() => {
            setViewId(null);
            setForm({ open: true, report: viewing });
          }}
        />
      ) : null}

      <PhotoUploadModal
        open={upload.open}
        holeId={hole.id}
        reports={reports}
        defaults={upload.defaults}
        knownHashes={photos.map((photo) => photo.contentHash).filter((hash): hash is string => Boolean(hash))}
        onClose={() => setUpload({ open: false })}
        afterSave={afterSave}
      />

      {lightbox && lightboxPhotos.length ? (
        <PhotoLightbox
          photos={lightboxPhotos}
          photoId={lightbox.photoId}
          reports={reports}
          onNavigate={(photoId) => setLightbox((current) => (current ? { ...current, photoId } : current))}
          onClose={() => setLightbox(null)}
          afterSave={afterSave}
        />
      ) : null}

      <GeologyImportModal
        open={importOpen}
        holes={holesQuery.data ?? [hole]}
        lockedHole={hole}
        onClose={() => setImportOpen(false)}
        onImported={async (result) => {
          setImportOpen(false);
          const text = describeImport(result);
          await afterSave({ ok: `Importado: ${text}.`, offline: `Importado en este dispositivo (${text}). Se sincronizará cuando haya conexión.` });
          setTab(result.reports ? "reports" : result.logs ? "log" : "photos");
        }}
      />

      <Modal
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        size="md"
        icon={<Trash2 size={20} />}
        title={toDelete?.pendingCreate ? "Descartar reporte" : "Eliminar reporte geológico"}
        footer={
          <>
            <button type="button" className={secondaryButton} onClick={() => setToDelete(null)}>
              Cancelar
            </button>
            <button type="button" className={dangerButton} onClick={confirmDelete} disabled={deleteReport.isPending}>
              <Trash2 size={15} />
              {toDelete?.pendingCreate ? "Descartar" : "Eliminar"}
            </button>
          </>
        }
      >
        <p className="text-sm">
          {toDelete
            ? toDelete.pendingCreate
              ? `El reporte del ${formatReportDate(toDelete.date)} aún no se envió. Se borrará de este dispositivo.`
              : `¿Eliminar el reporte geológico del ${formatReportDate(toDelete.date)}? Las fotos quedan en la galería del pozo. Necesita conexión.`
            : null}
        </p>
      </Modal>
    </div>
  );
}

function ReportCard({
  report,
  photos,
  canEdit,
  canDelete,
  onView,
  onPrint,
  onEdit,
  onDelete,
  onOpenPhoto
}: {
  report: GeologyReportView;
  photos: PhotoView[];
  canEdit: boolean;
  canDelete: boolean;
  onView: () => void;
  onPrint: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onOpenPhoto: (photo: PhotoView, list: PhotoView[]) => void;
}) {
  const date = new Date(report.date);
  const advance = report.toDepth - report.fromDepth;
  return (
    <article className={`${panelClass} p-4 ${report.sync === "error" ? "border-rose-500/50" : report.sync === "pending" ? "border-sky-500/40" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <button type="button" className="flex min-w-0 items-center gap-3 text-left" onClick={onView}>
          <span className="inline-flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-[var(--color-primary)] leading-none text-[var(--color-on-primary)]">
            <span className="text-lg font-black">{String(date.getUTCDate()).padStart(2, "0")}</span>
            <span className="text-[9px] font-bold uppercase">{new Intl.DateTimeFormat("es-BO", { month: "short", timeZone: "UTC" }).format(date)}</span>
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-bold capitalize">{formatReportDate(report.date)}</span>
            <span className="block truncate text-xs text-[var(--color-on-surface-variant)]">{report.geologists || "Geólogos sin registrar"}</span>
          </span>
        </button>
        <div className="text-right">
          <p className="font-mono text-xl font-extrabold tabular-nums text-[var(--color-primary)]">+{fmt(advance)} m</p>
          <p className="font-mono text-xs text-[var(--color-on-surface-variant)]">
            {fmt(report.fromDepth)} → {fmt(report.toDepth)} m
          </p>
        </div>
      </div>

      {report.geologySummary ? <p className="mt-3 line-clamp-2 text-sm text-[var(--color-on-surface-variant)]">{report.geologySummary}</p> : null}

      <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
        {report.rigName ? <span className="rounded-md bg-[var(--color-surface-container-high)] px-2 py-0.5 font-semibold">{report.rigName}</span> : null}
        {report.diameter ? <span className="rounded-md bg-[var(--color-surface-container-high)] px-2 py-0.5 font-semibold">{report.diameter}</span> : null}
        {report.endStatus ? <span className="rounded-md bg-[var(--color-surface-container-high)] px-2 py-0.5 font-semibold">{report.endStatus}</span> : null}
      </div>

      {photos.length ? (
        <div className="mt-3">
          <PhotoStrip photos={photos} onOpen={(photo) => onOpenPhoto(photo, photos)} />
        </div>
      ) : null}
      {report.sync === "error" && report.syncError ? <p className="mt-2 rounded-lg bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-600">{report.syncError}</p> : null}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--color-border-soft)] pt-2">
        <div className="flex items-center gap-1.5">
          <SyncPill sync={report.sync} />
          {photos.length ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-surface-container-high)] px-2 py-0.5 text-[10px] font-bold text-[var(--color-on-surface-variant)]">
              <Images size={11} />
              {photos.length}
            </span>
          ) : null}
        </div>
        <div className="flex gap-1">
          <button type="button" className={iconButton} title="Ver reporte" onClick={onView}>
            <Eye size={16} />
          </button>
          <button type="button" className={iconButton} title="Imprimir / PDF" onClick={onPrint}>
            <Printer size={16} />
          </button>
          {canEdit ? (
            <button type="button" className={iconButton} title="Editar" onClick={onEdit}>
              <Pencil size={16} />
            </button>
          ) : null}
          {canDelete ? (
            <button type="button" className={`${iconButton} hover:text-rose-600`} title={report.pendingCreate ? "Descartar" : "Eliminar"} onClick={onDelete}>
              <Trash2 size={16} />
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function ReportViewModal({
  report,
  hole,
  campaign,
  photos,
  canEdit,
  onClose,
  onPrint,
  onEdit
}: {
  report: GeologyReportView;
  hole: DrillingHole;
  campaign?: DrillingCampaign;
  photos: PhotoView[];
  canEdit: boolean;
  onClose: () => void;
  onPrint: () => void;
  onEdit: () => void;
}) {
  const [html, setHtml] = useState<string | null>(null);
  const photoKey = photos.map((photo) => `${photo.id}:${photo.kind}:${photo.caption ?? ""}`).join("|");

  useEffect(() => {
    let cancelled = false;
    setHtml(null);
    void loadSources(photos, "thumb").then((sources) => {
      if (!cancelled) setHtml(buildGeologyReportHtml(viewToReportPayload(report), { hole, campaign, photos: sources }));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report, photoKey, hole, campaign]);

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      icon={<Microscope size={20} />}
      title={`Reporte geológico · ${formatReportDate(report.date)}`}
      subtitle={`Pozo ${hole.code} · ${fmt(report.fromDepth)} → ${fmt(report.toDepth)} m`}
      footer={
        <>
          <button type="button" className={secondaryButton} onClick={onClose}>
            Cerrar
          </button>
          {canEdit ? (
            <button type="button" className={secondaryButton} onClick={onEdit}>
              <Pencil size={15} />
              Editar
            </button>
          ) : null}
          <button type="button" className={primaryButton} onClick={onPrint}>
            <Printer size={15} />
            Imprimir / PDF
          </button>
        </>
      }
    >
      <div className="overflow-hidden rounded-2xl border border-[var(--color-border-soft)] bg-white">
        {html ? <iframe title="Vista del reporte geológico" srcDoc={html} className="h-[72vh] w-full" /> : <div className="h-[72vh] animate-pulse bg-slate-100" />}
      </div>
    </Modal>
  );
}
