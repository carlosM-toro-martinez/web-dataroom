import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  Check,
  ClipboardList,
  CloudUpload,
  Eye,
  Pencil,
  Plus,
  Printer,
  RotateCcw,
  ShieldAlert,
  Trash2
} from "lucide-react";
import { InternalHeader } from "@/shared/ui/InternalHeader";
import { useToast } from "@/shared/ui/toast/ToastProvider";
import { useAuth } from "@/features/auth/context/AuthContext";
import {
  useDeleteShiftReportMutation,
  useDrillingCampaignsQuery,
  useDrillingHolesQuery,
  useHoleShiftReportsQuery,
  usePersonnelQuery,
  useQueueShiftReportMutation
} from "@/features/sondajes/hooks/useSondajes";
import { useShiftReportsSync } from "@/features/sondajes/hooks/useShiftReportsSync";
import { getQueuedShiftReport, type ShiftIncident, type ShiftReportPayload } from "@/features/sondajes/db/sondajesDb";
import { REPORTE_DIARIO } from "@/features/sondajes/config/reporteDiarioFormato";
import {
  collectIncidents,
  formatReportDate,
  mergeShiftReports,
  summarizeReports,
  viewToPayload,
  type IncidentView,
  type ShiftReportView
} from "@/features/sondajes/lib/shiftReports";
import { buildShiftReportHtml, printShiftReport } from "@/features/sondajes/lib/printShiftReport";
import { HoleStatusBadge } from "@/features/sondajes/components/HoleStatus";
import { ShiftReportFormModal } from "@/features/sondajes/components/ShiftReportFormModal";
import { SyncBar } from "@/features/sondajes/components/SyncBar";
import {
  Field,
  Modal,
  dangerButton,
  fieldClass,
  formatMeters,
  iconButton,
  panelClass,
  primaryButton,
  secondaryButton
} from "@/features/sondajes/components/ui";

const F = REPORTE_DIARIO;
const pageShell = "mx-auto w-full max-w-5xl space-y-5 px-4 pb-10 sm:px-6 lg:px-8";

function formatHours(value: number) {
  return `${value.toLocaleString("es-BO", { maximumFractionDigits: 1 })} h`;
}

const shiftName = (shift: "DAY" | "NIGHT") => `Turno ${F.turnos[shift]}`;

export function SondajesHolePage() {
  const { holeId = "" } = useParams();
  const { user } = useAuth();
  const { showError, showSuccess } = useToast();
  const holesQuery = useDrillingHolesQuery();
  const campaignsQuery = useDrillingCampaignsQuery();
  const reportsQuery = useHoleShiftReportsQuery(holeId);
  const { data: personnel = [] } = usePersonnelQuery();
  const sync = useShiftReportsSync();
  const queueReport = useQueueShiftReportMutation();
  const deleteReport = useDeleteShiftReportMutation();

  const [tab, setTab] = useState<"reports" | "incidents">("reports");
  const [form, setForm] = useState<{ open: boolean; report: ShiftReportView | null }>({ open: false, report: null });
  const [viewKey, setViewKey] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<ShiftReportView | null>(null);
  const [resolving, setResolving] = useState<IncidentView | null>(null);

  const hole = holesQuery.data?.find((item) => item.id === holeId);
  const campaign = campaignsQuery.data?.find((item) => item.id === hole?.campaignId);
  const reports = useMemo(() => mergeShiftReports(holeId, reportsQuery.data ?? [], sync.queue), [holeId, reportsQuery.data, sync.queue]);
  const viewing = viewKey ? reports.find((report) => report.key === viewKey) ?? null : null;
  const incidents = useMemo(() => collectIncidents(reports), [reports]);
  const openIncidents = incidents.filter((incident) => incident.status === "OPEN").length;
  const totals = summarizeReports(reports);
  const planned = hole?.plannedDepth ?? null;
  const progress = planned ? Math.min(100, (totals.currentDepth / planned) * 100) : 0;

  // Guarda en la cola del dispositivo y, si hay conexión, sincroniza (igual que las muestras).
  async function persist(payload: ShiftReportPayload, target: ShiftReportView | null, messages: { ok: string; offline: string }) {
    const localId = await queueReport.mutateAsync({
      holeId,
      payload,
      edit: target ? { localId: target.pendingCreate ? target.localId : undefined, remoteId: target.remoteId } : undefined
    });
    if (!navigator.onLine) {
      showSuccess(messages.offline);
      return;
    }
    await sync.runSync({ silent: false });
    const queued = await getQueuedShiftReport(localId);
    if (!queued) showSuccess(messages.ok);
    else if (queued.syncError) showError(`Guardado en el dispositivo, pero el servidor lo rechazó: ${queued.syncError}`);
    else showSuccess(`${messages.ok.replace(/\.$/, "")} (pendiente de enviar).`);
  }

  async function saveReport(payload: ShiftReportPayload) {
    try {
      await persist(payload, form.report, {
        ok: "Parte guardado y sincronizado.",
        offline: "Parte guardado en este dispositivo. Se sincronizará cuando haya conexión."
      });
      setForm({ open: false, report: null });
    } catch (error) {
      showError(error instanceof Error ? error.message : "No se pudo guardar el parte.");
    }
  }

  async function setReview(report: ShiftReportView, reviewed: boolean, notes: string) {
    try {
      await persist(
        {
          ...viewToPayload(report),
          reviewStatus: reviewed ? "REVIEWED" : "PENDING",
          reviewedBy: reviewed ? user?.nombre ?? "Usuario" : null,
          reviewedAt: reviewed ? new Date().toISOString() : null,
          reviewNotes: notes.trim() || null
        },
        report,
        { ok: reviewed ? "Parte marcado como revisado." : "Revisión quitada.", offline: "Revisión guardada en este dispositivo." }
      );
    } catch (error) {
      showError(error instanceof Error ? error.message : "No se pudo guardar la revisión.");
    }
  }

  async function updateIncident(incident: IncidentView, patch: Partial<ShiftIncident>, messages: { ok: string; offline: string }) {
    const report = incident.report;
    const payload = viewToPayload(report);
    payload.incidents = (report.incidents ?? []).map((item) => (item.id === incident.id ? { ...item, ...patch } : item));
    try {
      await persist(payload, report, messages);
    } catch (error) {
      showError(error instanceof Error ? error.message : "No se pudo actualizar la incidencia.");
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    try {
      await deleteReport.mutateAsync({ localId: toDelete.localId, remoteId: toDelete.remoteId, pendingCreate: toDelete.pendingCreate });
      showSuccess(toDelete.pendingCreate ? "Parte descartado." : "Parte eliminado.");
      if (viewKey === toDelete.key) setViewKey(null);
      setToDelete(null);
    } catch (error) {
      showError(error instanceof Error ? error.message : "No se pudo eliminar el parte.");
    }
  }

  function print(report: ShiftReportView) {
    try {
      printShiftReport(viewToPayload(report), { hole, campaign });
    } catch (error) {
      showError(error instanceof Error ? error.message : "No se pudo abrir la impresión.");
    }
  }

  if (!hole) {
    return (
      <div className={pageShell}>
        <InternalHeader eyebrow="Sondajes" title="Pozo" />
        <div className={`${panelClass} p-8 text-center text-sm text-[var(--color-on-surface-variant)]`}>
          {holesQuery.isLoading ? "Cargando pozo..." : "No se encontró el pozo en este dispositivo. Abre Sondajes con conexión para descargarlo."}
          <div className="mt-4">
            <Link to="/sondajes" className={secondaryButton}>
              <ArrowLeft size={15} />
              Volver a Sondajes
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isSaving = queueReport.isPending || sync.isSyncing;

  return (
    <div className={pageShell}>
      <InternalHeader
        eyebrow={campaign ? `Sondajes · ${F.proyecto(campaign)}` : "Sondajes"}
        title={`Pozo ${hole.code}`}
        description="Partes diarios de perforación"
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link to="/sondajes" className={secondaryButton}>
          <ArrowLeft size={15} />
          Programas
        </Link>
        <button type="button" className={`${primaryButton} px-5 py-3 text-base`} onClick={() => setForm({ open: true, report: null })}>
          <Plus size={18} />
          Nuevo parte
        </button>
      </div>

      <SyncBar sync={sync} />

      {/* Resumen del pozo */}
      <section className={`${panelClass} p-5`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Estado</p>
            <div className="mt-1.5">
              <HoleStatusBadge status={hole.status} />
            </div>
          </div>
          <div className="min-w-[220px] flex-1 sm:max-w-md">
            <div className="flex items-baseline justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Profundidad</span>
              <span className="font-mono text-sm font-bold">
                {formatMeters(totals.currentDepth)} <span className="text-[var(--color-on-surface-variant)]">/ {formatMeters(planned)}</span>
              </span>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[var(--color-surface-container-high)]">
              <div className="h-full rounded-full bg-[var(--color-primary)] transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-1 text-right text-xs text-[var(--color-on-surface-variant)]">{Math.round(progress)}% del objetivo</p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Metros perforados", formatMeters(totals.meters)],
            ["Partes", String(totals.count)],
            ["Horas perforando", formatHours(totals.drillingHours)],
            ["Incidencias abiertas", String(openIncidents)]
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-[var(--color-surface-container-high)] px-3 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">{label}</p>
              <p className={`mt-0.5 text-lg font-extrabold tabular-nums ${label === "Incidencias abiertas" && openIncidents > 0 ? "text-rose-600" : ""}`}>{value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pestañas */}
      <div className="inline-flex rounded-xl border border-[var(--color-border-soft)] p-1">
        {(
          [
            ["reports", `Partes diarios (${reports.length})`],
            ["incidents", `Incidencias${openIncidents ? ` · ${openIncidents} abierta${openIncidents === 1 ? "" : "s"}` : ""}`]
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              tab === value ? "bg-[var(--color-primary)] text-[var(--color-on-primary)]" : "text-[var(--color-on-surface-variant)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "reports" ? (
        <section className="space-y-3">
          {reportsQuery.isLoading ? (
            Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-24 animate-pulse rounded-2xl bg-[var(--color-surface-container-high)]" />)
          ) : reports.length === 0 ? (
            <div className={`${panelClass} flex flex-col items-center gap-3 px-6 py-12 text-center`}>
              <ClipboardList size={28} className="text-[var(--color-on-surface-variant)]" />
              <p className="text-sm font-bold">Este pozo aún no tiene partes diarios</p>
              <p className="max-w-sm text-xs text-[var(--color-on-surface-variant)]">
                Registra el avance de cada turno. Funciona también sin internet: se envía solo cuando vuelve la conexión.
              </p>
              <button type="button" className={primaryButton} onClick={() => setForm({ open: true, report: null })}>
                <Plus size={16} />
                Registrar primer parte
              </button>
            </div>
          ) : (
            reports.map((report) => (
              <ReportCard
                key={report.key}
                report={report}
                onView={() => setViewKey(report.key)}
                onPrint={() => print(report)}
                onEdit={() => setForm({ open: true, report })}
                onDelete={() => setToDelete(report)}
              />
            ))
          )}
        </section>
      ) : (
        <IncidentsPanel
          incidents={incidents}
          onResolve={setResolving}
          onReopen={(incident) =>
            updateIncident(incident, { status: "OPEN", resolution: null, resolvedBy: null, resolvedAt: null }, { ok: "Incidencia reabierta.", offline: "Incidencia reabierta en este dispositivo." })
          }
          onOpenReport={(incident) => setViewKey(incident.report.key)}
        />
      )}

      <ShiftReportFormModal
        open={form.open}
        report={form.report}
        hole={hole}
        campaign={campaign}
        reports={reports}
        suggestedFrom={totals.currentDepth}
        personnel={personnel}
        saving={isSaving}
        onClose={() => setForm({ open: false, report: null })}
        onSubmit={saveReport}
      />

      {viewing ? (
        <ReportViewModal
          report={viewing}
          html={buildShiftReportHtml(viewToPayload(viewing), { hole, campaign })}
          saving={isSaving}
          onClose={() => setViewKey(null)}
          onPrint={() => print(viewing)}
          onEdit={() => {
            setViewKey(null);
            setForm({ open: true, report: viewing });
          }}
          onReview={(reviewed, notes) => setReview(viewing, reviewed, notes)}
          onResolve={(incident) => setResolving({ ...incident, report: viewing })}
        />
      ) : null}

      <ResolveIncidentModal
        incident={resolving}
        saving={isSaving}
        onClose={() => setResolving(null)}
        onResolve={async (resolution) => {
          if (!resolving) return;
          await updateIncident(
            resolving,
            { status: "RESOLVED", resolution, resolvedBy: user?.nombre ?? "Usuario", resolvedAt: new Date().toISOString() },
            { ok: "Incidencia resuelta.", offline: "Incidencia resuelta en este dispositivo." }
          );
          setResolving(null);
        }}
      />

      <Modal
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        size="md"
        icon={<Trash2 size={20} />}
        title={toDelete?.pendingCreate ? "Descartar parte" : "Eliminar parte"}
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
              ? `Este parte (${formatReportDate(toDelete.date)}, ${shiftName(toDelete.shift).toLowerCase()}) aún no se envió. Se borrará de este dispositivo.`
              : `¿Eliminar el parte No. ${toDelete.reportNumber ?? "—"} del ${formatReportDate(toDelete.date)}, ${shiftName(toDelete.shift).toLowerCase()}? Necesita conexión.`
            : null}
        </p>
      </Modal>
    </div>
  );
}

// ─── Componentes ─────────────────────────────────────────────────────────────

function SyncBadge({ report }: { report: ShiftReportView }) {
  if (report.sync === "synced") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
        <Check size={11} />
        Sincronizado
      </span>
    );
  }
  if (report.sync === "error") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold text-rose-600">
        <AlertTriangle size={11} />
        Error
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-bold text-sky-600">
      <CloudUpload size={11} />
      Pendiente
    </span>
  );
}

function ReviewBadge({ report }: { report: ShiftReportView }) {
  return report.reviewStatus === "REVIEWED" ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-bold text-violet-600" title={report.reviewedBy ?? undefined}>
      <BadgeCheck size={11} />
      Revisado
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-500/15 px-2 py-0.5 text-[10px] font-bold text-slate-500">Por revisar</span>
  );
}

function ReportCard({
  report,
  onView,
  onPrint,
  onEdit,
  onDelete
}: {
  report: ShiftReportView;
  onView: () => void;
  onPrint: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const open = (report.incidents ?? []).filter((incident) => incident.status === "OPEN").length;
  return (
    <article className={`${panelClass} p-4 ${report.sync === "error" ? "border-rose-500/50" : report.sync === "pending" ? "border-sky-500/40" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <button type="button" className="flex items-center gap-3 text-left" onClick={onView}>
          <span className="inline-flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-[var(--color-surface-container-high)] leading-none">
            <span className="text-[9px] font-bold uppercase text-[var(--color-on-surface-variant)]">Turno</span>
            <span className="text-lg font-black text-[var(--color-primary)]">{F.turnos[report.shift]}</span>
          </span>
          <span>
            <span className="block text-sm font-bold capitalize">{formatReportDate(report.date)}</span>
            <span className="block text-xs text-[var(--color-on-surface-variant)]">
              No. {report.reportNumber ?? "—"}
              {report.operator ? ` · ${report.operator}` : ""}
            </span>
          </span>
        </button>
        <div className="text-right">
          <p className="font-mono text-xl font-extrabold tabular-nums text-[var(--color-primary)]">+{report.metersDrilled.toFixed(2)} m</p>
          <p className="font-mono text-xs text-[var(--color-on-surface-variant)]">
            {report.fromDepth.toFixed(2)} → {report.toDepth.toFixed(2)} m
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-on-surface-variant)]">
        {report.coreRecovery != null ? <span>Recuperación: <b className="text-[var(--color-on-surface)]">{report.coreRecovery} m</b></span> : null}
        {report.drillingHours != null ? <span>Perforando: <b className="text-[var(--color-on-surface)]">{formatHours(report.drillingHours)}</b></span> : null}
        {report.diameter ? <span>Diámetro: <b className="text-[var(--color-on-surface)]">{report.diameter}</b></span> : null}
        {report.rockType ? <span>Roca: <b className="text-[var(--color-on-surface)]">{report.rockType}</b></span> : null}
      </div>
      {report.sync === "error" && report.syncError ? (
        <p className="mt-2 rounded-lg bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-600">{report.syncError}</p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--color-border-soft)] pt-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <SyncBadge report={report} />
          <ReviewBadge report={report} />
          {open > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold text-rose-600">
              <ShieldAlert size={11} />
              {open} incidencia{open === 1 ? "" : "s"}
            </span>
          ) : null}
        </div>
        <div className="flex gap-1">
          <button type="button" className={iconButton} title="Ver parte" onClick={onView}>
            <Eye size={16} />
          </button>
          <button type="button" className={iconButton} title="Imprimir / PDF" onClick={onPrint}>
            <Printer size={16} />
          </button>
          <button type="button" className={iconButton} title="Editar" onClick={onEdit}>
            <Pencil size={16} />
          </button>
          <button type="button" className={`${iconButton} hover:text-rose-600`} title={report.pendingCreate ? "Descartar" : "Eliminar"} onClick={onDelete}>
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </article>
  );
}

function ReportViewModal({
  report,
  html,
  saving,
  onClose,
  onPrint,
  onEdit,
  onReview,
  onResolve
}: {
  report: ShiftReportView;
  html: string;
  saving: boolean;
  onClose: () => void;
  onPrint: () => void;
  onEdit: () => void;
  onReview: (reviewed: boolean, notes: string) => void;
  onResolve: (incident: ShiftIncident) => void;
}) {
  const [notes, setNotes] = useState(report.reviewNotes ?? "");
  const reviewed = report.reviewStatus === "REVIEWED";
  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      icon={<ClipboardList size={20} />}
      title={`Parte No. ${report.reportNumber ?? "—"} · ${formatReportDate(report.date)} · ${shiftName(report.shift)}`}
      subtitle={F.titulo}
      footer={
        <>
          <button type="button" className={secondaryButton} onClick={onClose}>
            Cerrar
          </button>
          <button type="button" className={secondaryButton} onClick={onEdit}>
            <Pencil size={15} />
            Editar
          </button>
          <button type="button" className={primaryButton} onClick={onPrint}>
            <Printer size={15} />
            Imprimir / PDF
          </button>
        </>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        {/* Vista idéntica a la hoja impresa */}
        <div className="overflow-hidden rounded-2xl border border-[var(--color-border-soft)] bg-white">
          <iframe title="Vista del parte" srcDoc={html} className="h-[70vh] w-full" />
        </div>

        <div className="space-y-4">
          <section className="rounded-2xl border border-[var(--color-border-soft)] p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">Revisión</h3>
              <ReviewBadge report={report} />
            </div>
            {reviewed ? (
              <p className="mt-2 text-xs text-[var(--color-on-surface-variant)]">
                Revisado por <b>{report.reviewedBy ?? "—"}</b>
                {report.reviewedAt ? ` el ${new Date(report.reviewedAt).toLocaleString("es-BO")}` : ""}
              </p>
            ) : null}
            <Field label="Notas de revisión" className="mt-3">
              <textarea className={`${fieldClass} min-h-[70px] resize-y text-sm`} value={notes} onChange={(event) => setNotes(event.target.value)} />
            </Field>
            <button
              type="button"
              className={`${reviewed ? secondaryButton : primaryButton} mt-3 w-full`}
              disabled={saving}
              onClick={() => onReview(!reviewed, notes)}
            >
              {reviewed ? <RotateCcw size={15} /> : <BadgeCheck size={15} />}
              {reviewed ? "Quitar revisión" : "Marcar como revisado"}
            </button>
          </section>

          <section className="rounded-2xl border border-[var(--color-border-soft)] p-4">
            <h3 className="text-sm font-bold">Incidencias</h3>
            {(report.incidents ?? []).length === 0 ? (
              <p className="mt-2 text-xs text-[var(--color-on-surface-variant)]">Sin incidencias. Se agregan desde «Editar».</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {(report.incidents ?? []).map((incident) => (
                  <li key={incident.id} className="rounded-xl bg-[var(--color-surface-container-high)] p-3 text-xs">
                    <p className="font-bold">
                      {incident.category} · <SeverityText severity={incident.severity} />
                    </p>
                    <p className="mt-0.5">{incident.description}</p>
                    {incident.status === "RESOLVED" ? (
                      <p className="mt-1 font-semibold text-emerald-600">Resuelta{incident.resolution ? `: ${incident.resolution}` : ""}</p>
                    ) : (
                      <button type="button" className={`${secondaryButton} mt-2 w-full py-1.5 text-xs`} onClick={() => onResolve(incident)} disabled={saving}>
                        <Check size={13} />
                        Resolver
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </Modal>
  );
}

function IncidentsPanel({
  incidents,
  onResolve,
  onReopen,
  onOpenReport
}: {
  incidents: IncidentView[];
  onResolve: (incident: IncidentView) => void;
  onReopen: (incident: IncidentView) => void;
  onOpenReport: (incident: IncidentView) => void;
}) {
  const [filter, setFilter] = useState<"OPEN" | "RESOLVED" | "ALL">("OPEN");
  const visible = incidents.filter((incident) => filter === "ALL" || incident.status === filter);
  const severityRank = { HIGH: 0, MEDIUM: 1, LOW: 2 } as const;
  visible.sort((a, b) => severityRank[a.severity] - severityRank[b.severity] || b.report.date.localeCompare(a.report.date));

  return (
    <section className="space-y-3">
      <div className="flex gap-1.5">
        {(
          [
            ["OPEN", "Abiertas"],
            ["RESOLVED", "Resueltas"],
            ["ALL", "Todas"]
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              filter === value
                ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-on-primary)]"
                : "border-[var(--color-border-soft)] text-[var(--color-on-surface-variant)]"
            }`}
          >
            {label} {value === "ALL" ? incidents.length : incidents.filter((incident) => incident.status === value).length}
          </button>
        ))}
      </div>
      {visible.length === 0 ? (
        <div className={`${panelClass} px-6 py-10 text-center text-sm text-[var(--color-on-surface-variant)]`}>
          {filter === "OPEN" ? "No hay incidencias abiertas." : "No hay incidencias en este filtro."}
        </div>
      ) : (
        visible.map((incident) => (
          <article key={incident.id} className={`${panelClass} p-4 ${incident.status === "OPEN" && incident.severity === "HIGH" ? "border-rose-500/50" : ""}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold">
                  {incident.category} · <SeverityText severity={incident.severity} />
                </p>
                <p className="mt-1 text-sm">{incident.description}</p>
                <button type="button" className="mt-1 text-xs font-semibold text-[var(--color-primary)] hover:underline" onClick={() => onOpenReport(incident)}>
                  Parte No. {incident.report.reportNumber ?? "—"} · {formatReportDate(incident.report.date)} · {shiftName(incident.report.shift)}
                </button>
                {incident.status === "RESOLVED" ? (
                  <p className="mt-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700">
                    <b>Resuelta</b>
                    {incident.resolvedBy ? ` por ${incident.resolvedBy}` : ""}
                    {incident.resolution ? `: ${incident.resolution}` : ""}
                  </p>
                ) : null}
              </div>
              {incident.status === "OPEN" ? (
                <button type="button" className={primaryButton} onClick={() => onResolve(incident)}>
                  <Check size={15} />
                  Resolver
                </button>
              ) : (
                <button type="button" className={secondaryButton} onClick={() => onReopen(incident)}>
                  <RotateCcw size={15} />
                  Reabrir
                </button>
              )}
            </div>
          </article>
        ))
      )}
    </section>
  );
}

function ResolveIncidentModal({
  incident,
  saving,
  onClose,
  onResolve
}: {
  incident: IncidentView | null;
  saving: boolean;
  onClose: () => void;
  onResolve: (resolution: string) => Promise<void>;
}) {
  const [resolution, setResolution] = useState("");
  return (
    <Modal
      open={Boolean(incident)}
      onClose={() => {
        setResolution("");
        onClose();
      }}
      size="md"
      icon={<Check size={20} />}
      title="Resolver incidencia"
      subtitle={incident ? `${incident.category} · ${F.incidencias.severidades[incident.severity]}` : undefined}
      footer={
        <>
          <button type="button" className={secondaryButton} onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className={primaryButton}
            disabled={saving}
            onClick={async () => {
              await onResolve(resolution.trim());
              setResolution("");
            }}
          >
            <Check size={15} />
            Marcar como resuelta
          </button>
        </>
      }
    >
      {incident ? <p className="mb-3 rounded-xl bg-[var(--color-surface-container-high)] px-3 py-2.5 text-sm">{incident.description}</p> : null}
      <Field label="¿Cómo se resolvió?">
        <textarea className={`${fieldClass} min-h-[90px] resize-y`} value={resolution} onChange={(event) => setResolution(event.target.value)} placeholder="Acción tomada" />
      </Field>
    </Modal>
  );
}

function SeverityText({ severity }: { severity: ShiftIncident["severity"] }) {
  const tone = severity === "HIGH" ? "text-rose-600" : severity === "MEDIUM" ? "text-amber-600" : "text-sky-600";
  return <span className={`font-bold ${tone}`}>{F.incidencias.severidades[severity]}</span>;
}
