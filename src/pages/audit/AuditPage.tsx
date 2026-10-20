import { useMemo, useState } from "react";
import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, ChevronLeft, ChevronRight, Download, History, Loader2, Search, ShieldAlert, ShieldCheck, X } from "lucide-react";
import { InternalHeader } from "@/shared/ui/InternalHeader";
import { useToast } from "@/shared/ui/toast/ToastProvider";
import { Modal, fieldClass, panelClass, primaryButton, secondaryButton } from "@/features/sondajes/components/ui";
import {
  downloadAuditCsv,
  getAuditDetail,
  getAuditFilters,
  getAuditList,
  getAuditSummary,
  verifyAuditChain
} from "@/features/audit/api/auditApi";
import type { AuditFilters, AuditRow } from "@/features/audit/model/audit.schema";
import {
  SOURCE_LABEL,
  TONE_CLASS,
  actionInfo,
  fieldLabel,
  formatValue,
  formatWhen,
  tableInfo
} from "@/features/audit/lib/auditLabels";

const PAGE_SIZE = 50;
const inputDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
// Las fechas del filtro son días completos en la hora local del usuario.
const startOfDay = (value: string) => new Date(`${value}T00:00:00`).toISOString();
const startOfNextDay = (value: string) => {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + 1);
  return date.toISOString();
};

function ActionChip({ action }: { action: string }) {
  const info = actionInfo(action);
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-bold ${TONE_CLASS[info.tone]}`}>{info.label}</span>;
}

function who(row: AuditRow) {
  if (row.actor_name) return { name: row.actor_name, sub: row.actor_email ?? "" };
  if (row.source === "database") return { name: "Directo en la base de datos", sub: row.db_user ? `usuario de BD: ${row.db_user}` : "" };
  if (row.source === "system") return { name: "Sistema", sub: "tarea interna" };
  return { name: "Sin identificar", sub: row.ip ?? "" };
}

function subject(row: AuditRow) {
  const info = tableInfo(row.table_name);
  return { module: info.module, label: info.label, name: row.record_label ?? row.record_id ?? "" };
}

// Detalle de un cambio: antes / después campo por campo.
function Changes({ row }: { row: AuditRow }) {
  const old = row.old_data ?? {};
  const next = row.new_data ?? {};
  if (row.action === "UPDATE") {
    const keys = row.changed_fields?.length ? row.changed_fields : Object.keys(next);
    return (
      <table className="w-full text-left text-xs">
        <thead className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
          <tr>
            <th className="py-2 pr-3">Campo</th>
            <th className="py-2 pr-3">Antes</th>
            <th className="py-2">Después</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border-soft)]">
          {keys.map((key) => (
            <tr key={key}>
              <td className="py-2 pr-3 align-top font-semibold">{fieldLabel(key)}</td>
              <td className="max-w-[260px] break-words py-2 pr-3 align-top text-rose-700 dark:text-rose-300">{formatValue(old[key])}</td>
              <td className="max-w-[260px] break-words py-2 align-top text-emerald-700 dark:text-emerald-300">{formatValue(next[key])}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
  const data = row.action === "DELETE" ? old : next;
  const entries = Object.entries(data).filter(([key]) => key !== "updatedAt");
  if (entries.length === 0) return null;
  return (
    <>
      <p className="mb-2 text-xs text-[var(--color-on-surface-variant)]">
        {row.action === "DELETE" ? "Así estaba el registro justo antes de eliminarse:" : "Datos con los que se creó el registro:"}
      </p>
      <dl className="grid gap-x-6 gap-y-1.5 text-xs sm:grid-cols-2">
        {entries.map(([key, value]) => (
          <div key={key} className="flex gap-2 border-b border-[var(--color-border-soft)] py-1">
            <dt className="w-40 shrink-0 font-semibold">{fieldLabel(key)}</dt>
            <dd className="min-w-0 break-words">{formatValue(value)}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}

function DetailModal({ seq, onClose, onHistory }: { seq: number | null; onClose: () => void; onHistory: (row: AuditRow) => void }) {
  const query = useQuery({ queryKey: ["audit", "detail", seq], queryFn: () => getAuditDetail(seq as number), enabled: seq !== null });
  const row = query.data;
  const info = row ? subject(row) : null;
  const actor = row ? who(row) : null;
  const details: Array<[string, string | null | undefined]> = row
    ? [
        ["Hora (de la base de datos)", formatWhen(row.at)],
        ["Origen", SOURCE_LABEL[row.source] ?? row.source],
        ["Acción en la aplicación", row.route],
        ["Dirección IP", row.ip],
        ["Navegador / dispositivo", row.user_agent],
        ["Rol del usuario", row.actor_role],
        ["N° de petición", row.request_id],
        ["Registro afectado (id)", row.record_id]
      ]
    : [];
  return (
    <Modal
      open={seq !== null}
      onClose={onClose}
      size="lg"
      icon={<History size={20} />}
      title={row ? `Registro #${row.seq}` : "Registro de auditoría"}
      subtitle={row ? `${actionInfo(row.action).label} · ${info?.label ?? ""}` : undefined}
      footer={
        <>
          {row?.record_id ? (
            <button type="button" className={secondaryButton} onClick={() => onHistory(row)}>
              <History size={15} />
              Ver todo el historial de este registro
            </button>
          ) : null}
          <button type="button" className={primaryButton} onClick={onClose}>
            Cerrar
          </button>
        </>
      }
    >
      {query.isLoading || !row ? (
        <p className="flex items-center gap-2 py-8 text-sm text-[var(--color-on-surface-variant)]">
          <Loader2 size={16} className="animate-spin" /> Cargando…
        </p>
      ) : (
        <div className="space-y-5">
          <section className={`${panelClass} p-4`}>
            <div className="flex flex-wrap items-center gap-2">
              <ActionChip action={row.action} />
              <span className="text-sm font-bold">{info?.name || info?.label}</span>
              <span className="text-xs text-[var(--color-on-surface-variant)]">
                {info?.module} · {info?.label}
              </span>
            </div>
            <p className="mt-2 text-sm">
              <b>{actor?.name}</b>
              {actor?.sub ? <span className="text-[var(--color-on-surface-variant)]"> · {actor.sub}</span> : null}
              <span className="text-[var(--color-on-surface-variant)]"> · {formatWhen(row.at)}</span>
            </p>
          </section>

          {row.action === "INSERT" || row.action === "UPDATE" || row.action === "DELETE" ? (
            <section>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                {row.action === "UPDATE" ? "Qué cambió" : "Datos"}
              </h3>
              <Changes row={row} />
            </section>
          ) : null}

          {row.detail && Object.keys(row.detail).length ? (
            <section>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Detalle</h3>
              <dl className="grid gap-x-6 gap-y-1.5 text-xs sm:grid-cols-2">
                {Object.entries(row.detail).map(([key, value]) => (
                  <div key={key} className="flex gap-2 border-b border-[var(--color-border-soft)] py-1">
                    <dt className="w-40 shrink-0 font-semibold">{fieldLabel(key)}</dt>
                    <dd className="min-w-0 break-words">{formatValue(value)}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          <section>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Datos técnicos</h3>
            <dl className="grid gap-x-6 gap-y-1.5 text-xs sm:grid-cols-2">
              {details
                .filter(([, value]) => value)
                .map(([label, value]) => (
                  <div key={label} className="flex gap-2 border-b border-[var(--color-border-soft)] py-1">
                    <dt className="w-40 shrink-0 font-semibold">{label}</dt>
                    <dd className="min-w-0 break-all">{value}</dd>
                  </div>
                ))}
              <div className="flex gap-2 border-b border-[var(--color-border-soft)] py-1 sm:col-span-2">
                <dt className="w-40 shrink-0 font-semibold">Sello de integridad</dt>
                <dd className="min-w-0 break-all font-mono text-[10px]">{row.hash}</dd>
              </div>
            </dl>
          </section>
        </div>
      )}
    </Modal>
  );
}

export function AuditPage() {
  const { showError, showSuccess } = useToast();
  const today = inputDate(new Date());
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [actorId, setActorId] = useState("");
  const [action, setAction] = useState("");
  const [table, setTable] = useState("");
  const [search, setSearch] = useState("");
  const [record, setRecord] = useState<{ table: string; id: string; label: string } | null>(null);
  const [page, setPage] = useState(1);
  const [openSeq, setOpenSeq] = useState<number | null>(null);

  const filters = useMemo<AuditFilters>(() => {
    const next: AuditFilters = {};
    if (from) next.from = startOfDay(from);
    if (to) next.to = startOfNextDay(to);
    if (actorId) next.actorId = Number(actorId);
    if (action) next.action = action;
    if (record) {
      next.table = record.table;
      next.recordId = record.id;
    } else if (table) next.table = table;
    if (search.trim()) next.search = search.trim();
    return next;
  }, [from, to, actorId, action, table, record, search]);

  const summary = useQuery({ queryKey: ["audit", "summary"], queryFn: getAuditSummary, refetchInterval: 60_000 });
  const filterOptions = useQuery({ queryKey: ["audit", "filters"], queryFn: getAuditFilters, staleTime: 60_000 });
  const list = useQuery({
    queryKey: ["audit", "list", filters, page],
    queryFn: () => getAuditList(filters, page, PAGE_SIZE),
    placeholderData: keepPreviousData
  });
  const verify = useMutation({ mutationFn: verifyAuditChain, onError: () => showError("No se pudo verificar la bitácora.") });
  const [exporting, setExporting] = useState(false);

  const tablesByModule = useMemo(() => {
    const groups = new Map<string, Array<{ name: string; label: string; events: number }>>();
    for (const item of filterOptions.data?.tables ?? []) {
      const info = tableInfo(item.name);
      groups.set(info.module, [...(groups.get(info.module) ?? []), { name: item.name, label: info.label, events: item.events }]);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b, "es"));
  }, [filterOptions.data]);

  const hasFilters = Boolean(from || to || actorId || action || table || record || search);
  const rows = list.data?.data ?? [];
  const meta = list.data?.meta;

  function change<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setPage(1);
    };
  }

  function preset(days: number) {
    const start = new Date();
    start.setDate(start.getDate() - (days - 1));
    setFrom(inputDate(start));
    setTo(today);
    setPage(1);
  }

  function clear() {
    setFrom("");
    setTo("");
    setActorId("");
    setAction("");
    setTable("");
    setSearch("");
    setRecord(null);
    setPage(1);
  }

  async function exportCsv() {
    setExporting(true);
    try {
      await downloadAuditCsv(filters);
      showSuccess("Bitácora exportada (hasta 50.000 registros por descarga).");
    } catch {
      showError("No se pudo exportar la bitácora.");
    } finally {
      setExporting(false);
    }
  }

  const verdict = verify.data;
  return (
    <div className="space-y-6">
      <InternalHeader
        eyebrow="Administración"
        title="Bitácora de auditoría"
        description="Quién creó, modificó o eliminó cada dato del sistema, desde dónde y cuándo. Los registros no se pueden editar ni borrar."
      />

      {/* Integridad */}
      <section className={`${panelClass} flex flex-wrap items-center gap-4 p-4`}>
        <span
          className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
            verdict ? (verdict.ok ? "bg-emerald-500/15 text-emerald-600" : "bg-rose-500/15 text-rose-600") : "bg-[var(--color-surface-container-high)] text-[var(--color-primary)]"
          }`}
        >
          {verdict && !verdict.ok ? <ShieldAlert size={22} /> : <ShieldCheck size={22} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">
            {verdict
              ? verdict.ok
                ? `Cadena íntegra: ${verdict.checked.toLocaleString("es-BO")} registros verificados, ninguno alterado.`
                : `¡Atención! Se detectó una alteración en el registro #${verdict.brokenAt}.`
              : `${(summary.data?.records ?? 0).toLocaleString("es-BO")} registros en la bitácora`}
          </p>
          <p className="text-xs text-[var(--color-on-surface-variant)]">
            {verdict && !verdict.ok
              ? verdict.reason
              : summary.data?.since
                ? `Auditoría activa desde el ${formatWhen(summary.data.since)}. Cada registro está encadenado con el anterior mediante un sello criptográfico.`
                : "Cada registro está encadenado con el anterior mediante un sello criptográfico."}
          </p>
        </div>
        <button type="button" className={secondaryButton} onClick={() => verify.mutate()} disabled={verify.isPending}>
          {verify.isPending ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
          {verify.isPending ? "Verificando…" : "Verificar integridad"}
        </button>
        <button type="button" className={secondaryButton} onClick={exportCsv} disabled={exporting}>
          {exporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
          Exportar (.csv)
        </button>
      </section>

      {/* Filtros */}
      <section className={`${panelClass} space-y-3 p-4`}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">Desde</span>
            <input type="date" className={fieldClass} value={from} max={to || today} onChange={(event) => change(setFrom)(event.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">Hasta</span>
            <input type="date" className={fieldClass} value={to} min={from} max={today} onChange={(event) => change(setTo)(event.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">Usuario</span>
            <select className={fieldClass} value={actorId} onChange={(event) => change(setActorId)(event.target.value)}>
              <option value="">Todos</option>
              {filterOptions.data?.actors.map((actor) => (
                <option key={actor.id} value={actor.id}>
                  {actor.name ?? actor.email} ({actor.events})
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">Qué hizo</span>
            <select className={fieldClass} value={action} onChange={(event) => change(setAction)(event.target.value)}>
              <option value="">Todo</option>
              {filterOptions.data?.actions.map((item) => (
                <option key={item.name} value={item.name}>
                  {actionInfo(item.name).label} ({item.events})
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">Sobre qué</span>
            <select className={fieldClass} value={record ? "" : table} disabled={Boolean(record)} onChange={(event) => change(setTable)(event.target.value)}>
              <option value="">Todo el sistema</option>
              {tablesByModule.map(([module, tables]) => (
                <optgroup key={module} label={module}>
                  {tables.map((item) => (
                    <option key={item.name} value={item.name}>
                      {item.label} ({item.events})
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-on-surface-variant)]" />
            <input
              className={`${fieldClass} pl-9`}
              placeholder="Buscar por nombre del registro, usuario, correo o ruta…"
              value={search}
              onChange={(event) => change(setSearch)(event.target.value)}
            />
          </div>
          {[
            ["Hoy", 1],
            ["7 días", 7],
            ["30 días", 30]
          ].map(([label, days]) => (
            <button key={label} type="button" className={secondaryButton} onClick={() => preset(days as number)}>
              {label}
            </button>
          ))}
          {hasFilters ? (
            <button type="button" className={secondaryButton} onClick={clear}>
              <X size={15} />
              Limpiar filtros
            </button>
          ) : null}
        </div>
        {record ? (
          <p className="flex flex-wrap items-center gap-2 rounded-xl bg-[var(--color-surface-container-high)] px-3 py-2 text-xs">
            <History size={14} className="text-[var(--color-primary)]" />
            Historial completo de <b>{record.label || record.id}</b> ({tableInfo(record.table).label})
            <button type="button" className="ml-auto font-semibold text-[var(--color-primary)]" onClick={() => change(setRecord)(null)}>
              Quitar
            </button>
          </p>
        ) : null}
      </section>

      {/* Lista */}
      <section className={`${panelClass} overflow-hidden`}>
        {list.isError ? (
          <p className="p-6 text-sm text-rose-600">No se pudo cargar la bitácora. Intenta de nuevo.</p>
        ) : list.isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="h-12 animate-pulse rounded-xl bg-[var(--color-surface-container-high)]" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-[var(--color-on-surface-variant)]">No hay registros con estos filtros.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--color-surface-container-high)] text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                <tr>
                  <th className="px-4 py-3">Fecha y hora</th>
                  <th className="px-4 py-3">Usuario</th>
                  <th className="px-4 py-3">Qué hizo</th>
                  <th className="px-4 py-3">Sobre qué</th>
                  <th className="px-4 py-3">Qué cambió</th>
                  <th className="px-4 py-3">Desde</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-soft)]">
                {rows.map((row) => {
                  const actor = who(row);
                  const info = subject(row);
                  const changed = row.changed_fields ?? [];
                  return (
                    <tr
                      key={row.seq}
                      className="cursor-pointer align-top transition hover:bg-[var(--color-surface-container-high)]"
                      onClick={() => setOpenSeq(row.seq)}
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">
                        {formatWhen(row.at)}
                        <span className="block text-[10px] text-[var(--color-on-surface-variant)]">#{row.seq}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="block font-semibold">{actor.name}</span>
                        <span className="block text-[11px] text-[var(--color-on-surface-variant)]">{actor.sub}</span>
                      </td>
                      <td className="px-4 py-3">
                        <ActionChip action={row.action} />
                      </td>
                      <td className="px-4 py-3">
                        <span className="block font-semibold">{info.name || "—"}</span>
                        <span className="block text-[11px] text-[var(--color-on-surface-variant)]">
                          {info.module} · {info.label}
                        </span>
                      </td>
                      <td className="max-w-[280px] px-4 py-3 text-xs text-[var(--color-on-surface-variant)]">
                        {changed.length ? changed.map(fieldLabel).join(", ") : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <span className="block">{SOURCE_LABEL[row.source] ?? row.source}</span>
                        <span className="block font-mono text-[10px] text-[var(--color-on-surface-variant)]">{row.ip ?? ""}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {meta && meta.total > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--color-border-soft)] px-4 py-3 text-xs text-[var(--color-on-surface-variant)]">
            <span>
              {((meta.page - 1) * meta.limit + 1).toLocaleString("es-BO")}–{Math.min(meta.page * meta.limit, meta.total).toLocaleString("es-BO")} de {meta.total.toLocaleString("es-BO")} registros
            </span>
            <span className="flex items-center gap-1.5">
              <button type="button" className={secondaryButton} disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
                <ChevronLeft size={15} />
              </button>
              Página {meta.page} de {meta.totalPages}
              <button type="button" className={secondaryButton} disabled={page >= meta.totalPages} onClick={() => setPage((current) => current + 1)}>
                <ChevronRight size={15} />
              </button>
            </span>
          </div>
        ) : null}
      </section>

      <DetailModal
        seq={openSeq}
        onClose={() => setOpenSeq(null)}
        onHistory={(row) => {
          setRecord({ table: row.table_name, id: row.record_id ?? "", label: row.record_label ?? "" });
          setOpenSeq(null);
          setPage(1);
        }}
      />
    </div>
  );
}
