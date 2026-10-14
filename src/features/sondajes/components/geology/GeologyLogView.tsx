import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ChevronDown, FileSpreadsheet, Layers, Plus, Save, Search, Trash2, X } from "lucide-react";
import type { LogInterval, LogMineral, LogStructure } from "@/features/sondajes/model/geology.schema";
import {
  ALTERATIONS,
  findLogIssues,
  LITHOLOGY,
  MINERALS,
  MINERAL_STYLES,
  STRUCTURES,
  SUPPORTS,
  TEXTURES,
  fmt,
  label,
  lithologyColor,
  summarizeLog,
  type LogState
} from "@/features/sondajes/lib/geology";
import { Field, Modal, dangerButton, fieldClass, panelClass, primaryButton, secondaryButton, toInputNumber, toNumberOrNull } from "@/features/sondajes/components/ui";
import { Chip, Stat, SyncPill } from "@/features/sondajes/components/geology/GeologyShared";

const PX_PER_METER_MIN = 3;

export function GeologyLogView({
  log,
  plannedDepth,
  canEdit,
  canImport,
  onSave,
  onImport
}: {
  log: LogState;
  plannedDepth: number | null;
  canEdit: boolean;
  canImport: boolean;
  onSave: (rows: LogInterval[], message: { ok: string; offline: string }) => Promise<void>;
  onImport: () => void;
}) {
  const rows = log.rows;
  const [lithFilter, setLithFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<{ index: number | null; row: LogInterval } | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  const summary = summarizeLog(rows);
  const issues = useMemo(() => findLogIssues(rows), [rows]);
  const overlaps = issues.filter((issue) => issue.type === "overlap").length;
  const gaps = issues.length - overlaps;
  const [showIssues, setShowIssues] = useState(true);
  const lithologies = useMemo(() => [...new Set(rows.map((row) => row.lithology).filter((code): code is string => Boolean(code)))], [rows]);
  const visible = rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => !lithFilter || row.lithology === lithFilter)
    .filter(({ row }) => {
      const term = search.trim().toLowerCase();
      if (!term) return true;
      return [row.lithology, row.texture, row.alteration1, row.alteration2, row.description, ...(row.minerals ?? []).map((m) => m.mineral)]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });

  useEffect(() => {
    if (selected === null) return;
    tableRef.current?.querySelector(`[data-row="${selected}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selected]);

  async function saveRow(row: LogInterval, index: number | null) {
    const next = index === null ? [...rows, row] : rows.map((item, position) => (position === index ? row : item));
    await onSave(next, { ok: index === null ? "Tramo agregado." : "Tramo actualizado.", offline: "Logueo guardado en este dispositivo." });
    setEditing(null);
  }

  async function deleteRow(index: number) {
    await onSave(
      rows.filter((_, position) => position !== index),
      { ok: "Tramo eliminado.", offline: "Logueo guardado en este dispositivo." }
    );
    setEditing(null);
  }

  if (rows.length === 0) {
    return (
      <div className={`${panelClass} flex flex-col items-center gap-3 px-6 py-12 text-center`}>
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] text-[var(--color-primary)]">
          <Layers size={26} />
        </span>
        <p className="text-sm font-bold">Este pozo aún no tiene logueo geológico</p>
        <p className="max-w-sm text-xs text-[var(--color-on-surface-variant)]">
          Importa la hoja QUICK_LOG del Excel del reporte diario o registra los tramos a mano.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {canImport ? (
            <button type="button" className={primaryButton} onClick={onImport}>
              <FileSpreadsheet size={16} />
              Importar Excel
            </button>
          ) : null}
          {canEdit ? (
            <button type="button" className={secondaryButton} onClick={() => setEditing({ index: null, row: emptyRow(0) })}>
              <Plus size={16} />
              Agregar tramo
            </button>
          ) : null}
        </div>
        <LogEditorModal editing={editing} canEdit={canEdit} onClose={() => setEditing(null)} onSave={saveRow} onDelete={deleteRow} />
      </div>
    );
  }

  const scaleTo = Math.max(summary.loggedTo, plannedDepth ?? 0, 10);

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Tramos" value={String(summary.intervals)} />
        <Stat label="Logueado hasta" value={`${fmt(summary.loggedTo)} m`} tone="text-[var(--color-primary)]" />
        <Stat label="Litologías" value={String(lithologies.length)} />
        <Stat label="Solapes / huecos" value={`${overlaps} / ${gaps}`} tone={issues.length ? "text-orange-600" : "text-emerald-600"} />
      </div>

      {issues.length ? (
        <div className="rounded-2xl border border-orange-500/40 bg-orange-500/10 p-3 text-xs text-orange-800 dark:text-orange-300">
          <button type="button" className="flex w-full items-center justify-between gap-2 text-left font-bold" onClick={() => setShowIssues((value) => !value)}>
            <span className="flex items-center gap-1.5">
              <AlertTriangle size={14} />
              El logueo tiene {overlaps ? `${overlaps} solapamiento(s)` : ""}
              {overlaps && gaps ? " y " : ""}
              {gaps ? `${gaps} hueco(s)` : ""}
            </span>
            <ChevronDown size={14} className={`transition ${showIssues ? "rotate-180" : ""}`} />
          </button>
          {showIssues ? (
            <>
              <ul className="mt-1.5 space-y-0.5 pl-5">
                {issues.map((issue) => (
                  <li key={`${issue.type}-${issue.from}-${issue.to}`} className="list-disc">
                    {issue.message}
                  </li>
                ))}
              </ul>
              <p className="mt-1.5 text-[11px] opacity-80">Se muestran tal cual vienen del Excel. Corrígelos en el archivo de origen o editando el tramo.</p>
            </>
          ) : null}
        </div>
      ) : null}

      {log.sync !== "synced" ? (
        <div className={`flex flex-wrap items-center gap-2 rounded-xl px-3 py-2 text-xs ${log.sync === "error" ? "bg-rose-500/10 text-rose-600" : "bg-sky-500/10 text-sky-700"}`}>
          <SyncPill sync={log.sync} />
          {log.sync === "error" ? log.syncError : "Hay cambios del logueo guardados en este dispositivo que aún no llegan al servidor."}
        </div>
      ) : null}

      <div className={`${panelClass} overflow-hidden`}>
        <div className="flex flex-col gap-3 border-b border-[var(--color-border-soft)] p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-1.5 overflow-x-auto">
            <Chip active={lithFilter === null} onClick={() => setLithFilter(null)}>
              Todas
            </Chip>
            {lithologies.map((code) => (
              <Chip key={code} active={lithFilter === code} onClick={() => setLithFilter(lithFilter === code ? null : code)}>
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: lithologyColor(code) }} />
                {code}
                <span className="opacity-70">{rows.filter((row) => row.lithology === code).length}</span>
              </Chip>
            ))}
          </div>
          <div className="flex gap-2">
            <div className="relative w-full lg:w-56">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-on-surface-variant)]" />
              <input className={`${fieldClass} py-2 pl-9`} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar código o mineral" />
            </div>
            {canEdit ? (
              <button type="button" className={`${secondaryButton} shrink-0 py-2`} onClick={() => setEditing({ index: null, row: emptyRow(summary.loggedTo) })}>
                <Plus size={15} />
                <span className="hidden sm:inline">Tramo</span>
              </button>
            ) : null}
          </div>
        </div>

        {/* Columna litológica horizontal (móvil) */}
        <div className="flex h-5 w-full md:hidden" aria-hidden>
          {rows.map((row, index) => (
            <span key={index} style={{ width: `${((row.toDepth - row.fromDepth) / scaleTo) * 100}%`, background: lithologyColor(row.lithology) }} />
          ))}
        </div>

        <div className="grid md:grid-cols-[148px_minmax(0,1fr)]">
          <StripLog rows={rows} scaleTo={scaleTo} selected={selected} onSelect={setSelected} />
          <div ref={tableRef} className="max-h-[70vh] overflow-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="sticky top-0 z-10 bg-[var(--color-surface-container-high)] text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                <tr>
                  <th className="px-3 py-2.5 text-right">Desde</th>
                  <th className="px-3 py-2.5 text-right">Hasta</th>
                  <th className="px-3 py-2.5">Litología</th>
                  <th className="px-3 py-2.5">Textura / soporte</th>
                  <th className="px-3 py-2.5">Alteración</th>
                  <th className="px-3 py-2.5">Mineralización</th>
                  <th className="px-3 py-2.5">Estruct.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-soft)]">
                {visible.map(({ row, index }) => (
                  <tr
                    key={index}
                    data-row={index}
                    onClick={() => {
                      setSelected(index);
                      setEditing({ index, row });
                    }}
                    className={`cursor-pointer align-top transition hover:bg-[var(--color-surface-container-high)] ${selected === index ? "bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)]" : ""}`}
                  >
                    <td className="px-3 py-2 text-right font-mono tabular-nums">{fmt(row.fromDepth)}</td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">{fmt(row.toDepth)}</td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-1.5 font-bold">
                        <span className="h-3 w-3 rounded-sm ring-1 ring-black/10" style={{ background: lithologyColor(row.lithology) }} />
                        {row.lithology ?? "—"}
                      </span>
                      {row.lithology && LITHOLOGY[row.lithology] && LITHOLOGY[row.lithology].label !== row.lithology ? (
                        <span className="block text-[10px] text-[var(--color-on-surface-variant)]">{LITHOLOGY[row.lithology].label}</span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">
                      {label(TEXTURES, row.texture) || "—"}
                      <span className="block text-[10px] text-[var(--color-on-surface-variant)]">{label(SUPPORTS, row.support)}</span>
                    </td>
                    <td className="px-3 py-2">
                      <Alteration code={row.alteration1} intensity={row.alteration1Int} />
                      <Alteration code={row.alteration2} intensity={row.alteration2Int} />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {(row.minerals ?? []).map((mineral, position) => (
                          <span key={position} className="rounded-md bg-[var(--color-surface-container-high)] px-1.5 py-0.5 text-[10px] font-semibold" title={`${label(MINERALS, mineral.mineral)} · ${label(MINERAL_STYLES, mineral.style)}`}>
                            {mineral.mineral} {mineral.pct ? `${mineral.pct}%` : ""} <span className="opacity-60">{mineral.style}</span>
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      {(row.structures ?? []).map((structure, position) => (
                        <span key={position} className="block font-semibold" title={label(STRUCTURES, structure.type)}>
                          {structure.type}
                          {structure.angle != null ? ` ${structure.angle}°` : ""}
                        </span>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {visible.length === 0 ? <p className="px-4 py-10 text-center text-sm text-[var(--color-on-surface-variant)]">Ningún tramo coincide con el filtro.</p> : null}
          </div>
        </div>
      </div>

      <Legend codes={lithologies} />
      <LogEditorModal editing={editing} canEdit={canEdit} onClose={() => setEditing(null)} onSave={saveRow} onDelete={deleteRow} />
    </section>
  );
}

function Alteration({ code, intensity }: { code?: string | null; intensity?: number | null }) {
  if (!code) return null;
  const level = Math.max(0, Math.min(5, intensity ?? 0));
  return (
    <span className="flex items-center gap-1.5" title={`${label(ALTERATIONS, code)} · intensidad ${intensity ?? "—"}`}>
      <span className="w-9 font-semibold">{code}</span>
      <span className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((step) => (
          <span key={step} className={`h-2 w-1.5 rounded-sm ${step <= level ? "bg-amber-500" : "bg-[var(--color-surface-container-highest)]"}`} />
        ))}
      </span>
    </span>
  );
}

// Columna litológica vertical a escala de profundidad.
function StripLog({ rows, scaleTo, selected, onSelect }: { rows: LogInterval[]; scaleTo: number; selected: number | null; onSelect: (index: number) => void }) {
  const height = Math.max(520, Math.min(1400, scaleTo * PX_PER_METER_MIN));
  const ticks = Math.max(10, Math.round(scaleTo / 10 / 5) * 5 * (scaleTo > 300 ? 2 : 1));
  const marks = Array.from({ length: Math.floor(scaleTo / ticks) + 1 }, (_, i) => i * ticks);
  const y = (depth: number) => (depth / scaleTo) * height;
  return (
    <div className="hidden max-h-[70vh] overflow-y-auto border-r border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] md:block">
      <div className="relative mx-3 my-3" style={{ height }}>
        {marks.map((mark) => (
          <div key={mark} className="absolute left-0 right-0 flex items-center gap-1" style={{ top: y(mark) }}>
            <span className="w-8 -translate-y-1/2 text-right font-mono text-[9px] text-[var(--color-on-surface-variant)]">{mark}</span>
            <span className="h-px flex-1 bg-[var(--color-border-soft)]" />
          </div>
        ))}
        <div className="absolute bottom-0 left-10 top-0 w-12 overflow-hidden rounded-md bg-[var(--color-surface-container-high)] ring-1 ring-[var(--color-border-soft)]">
          {rows.map((row, index) => (
            <button
              key={index}
              type="button"
              title={`${fmt(row.fromDepth)}–${fmt(row.toDepth)} m · ${row.lithology ?? "sin código"}`}
              onClick={() => onSelect(index)}
              className={`absolute left-0 right-0 transition hover:brightness-110 ${selected === index ? "z-10 ring-2 ring-[var(--color-on-surface)]" : ""}`}
              style={{ top: y(row.fromDepth), height: Math.max(1.5, y(row.toDepth) - y(row.fromDepth)), background: lithologyColor(row.lithology) }}
            />
          ))}
        </div>
        <div className="absolute bottom-0 left-[92px] top-0 w-3">
          {rows.map((row, index) =>
            row.alteration1Int ? (
              <span
                key={index}
                className="absolute left-0 rounded-sm bg-amber-500"
                style={{ top: y(row.fromDepth), height: Math.max(1.5, y(row.toDepth) - y(row.fromDepth)), width: `${(row.alteration1Int / 5) * 100}%`, opacity: 0.85 }}
              />
            ) : null
          )}
        </div>
      </div>
    </div>
  );
}

function Legend({ codes }: { codes: string[] }) {
  const known = Object.entries(LITHOLOGY).filter(([code]) => code !== "QTB");
  return (
    <div className={`${panelClass} flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-xs`}>
      <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Litología</span>
      {known
        .filter(([code]) => codes.includes(code) || codes.length === 0)
        .concat(codes.filter((code) => !LITHOLOGY[code]).map((code) => [code, { label: code, color: lithologyColor(code) }] as const))
        .map(([code, info]) => (
          <span key={code} className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm ring-1 ring-black/10" style={{ background: info.color }} />
            <b>{code}</b>
            {info.label !== code ? <span className="text-[var(--color-on-surface-variant)]">{info.label}</span> : null}
          </span>
        ))}
      <span className="inline-flex items-center gap-1.5">
        <span className="h-3 w-1.5 rounded-sm bg-amber-500" />
        <span className="text-[var(--color-on-surface-variant)]">Intensidad de alteración (1–5)</span>
      </span>
    </div>
  );
}

// ─── Editor de un tramo ──────────────────────────────────────────────────────
function emptyRow(from: number): LogInterval {
  return { fromDepth: from, toDepth: from + 1, minerals: [], structures: [] };
}

type Draft = {
  fromDepth: string;
  toDepth: string;
  lithology: string;
  texture: string;
  support: string;
  alteration1: string;
  alteration1Int: string;
  alteration2: string;
  alteration2Int: string;
  minerals: Array<{ mineral: string; pct: string; style: string }>;
  structures: Array<{ type: string; angle: string; fracCount: string }>;
  description: string;
  loggedBy: string;
};

function toDraft(row: LogInterval): Draft {
  return {
    fromDepth: toInputNumber(row.fromDepth),
    toDepth: toInputNumber(row.toDepth),
    lithology: row.lithology ?? "",
    texture: row.texture ?? "",
    support: row.support ?? "",
    alteration1: row.alteration1 ?? "",
    alteration1Int: toInputNumber(row.alteration1Int),
    alteration2: row.alteration2 ?? "",
    alteration2Int: toInputNumber(row.alteration2Int),
    minerals: (row.minerals ?? []).map((m) => ({ mineral: m.mineral, pct: m.pct ?? "", style: m.style ?? "" })),
    structures: (row.structures ?? []).map((s) => ({ type: s.type, angle: toInputNumber(s.angle), fracCount: toInputNumber(s.fracCount) })),
    description: row.description ?? "",
    loggedBy: row.loggedBy ?? ""
  };
}

function LogEditorModal({
  editing,
  canEdit,
  onClose,
  onSave,
  onDelete
}: {
  editing: { index: number | null; row: LogInterval } | null;
  canEdit: boolean;
  onClose: () => void;
  onSave: (row: LogInterval, index: number | null) => Promise<void>;
  onDelete: (index: number) => Promise<void>;
}) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setDraft(editing ? toDraft(editing.row) : null);
    setError(null);
  }, [editing]);

  if (!editing || !draft) return null;
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft({ ...draft, [key]: value });
  const intOrNull = (value: string) => {
    const parsed = toNumberOrNull(value);
    return parsed === null || Number.isNaN(parsed) ? null : Math.max(0, Math.round(parsed));
  };

  async function submit() {
    if (!draft || !editing) return;
    const from = toNumberOrNull(draft.fromDepth);
    const to = toNumberOrNull(draft.toDepth);
    if (from === null || to === null || Number.isNaN(from) || Number.isNaN(to) || from < 0) return setError("Escribe profundidades válidas.");
    if (to <= from) return setError("«Hasta» debe ser mayor que «Desde».");
    const minerals: LogMineral[] = draft.minerals
      .filter((m) => m.mineral.trim())
      .map((m) => ({ mineral: m.mineral.trim(), pct: m.pct.trim() || null, style: m.style.trim() || null }));
    const structures: LogStructure[] = draft.structures
      .filter((s) => s.type.trim())
      .map((s) => {
        const angle = toNumberOrNull(s.angle);
        const frac = toNumberOrNull(s.fracCount);
        return {
          type: s.type.trim(),
          angle: angle === null || Number.isNaN(angle) ? null : angle,
          fracCount: frac === null || Number.isNaN(frac) ? null : frac
        };
      });
    setBusy(true);
    try {
      await onSave(
        {
          ...editing.row,
          fromDepth: from,
          toDepth: to,
          lithology: draft.lithology.trim() || null,
          texture: draft.texture.trim() || null,
          support: draft.support.trim() || null,
          alteration1: draft.alteration1.trim() || null,
          alteration1Int: intOrNull(draft.alteration1Int),
          alteration2: draft.alteration2.trim() || null,
          alteration2Int: intOrNull(draft.alteration2Int),
          minerals: minerals.length ? minerals : null,
          structures: structures.length ? structures : null,
          description: draft.description.trim() || null,
          loggedBy: draft.loggedBy.trim() || null,
          loggedAt: editing.row.loggedAt ?? new Date().toISOString()
        },
        editing.index
      );
    } finally {
      setBusy(false);
    }
  }

  const datalist = (id: string, dictionary: Record<string, string>) => (
    <datalist id={id}>
      {Object.entries(dictionary).map(([code, text]) => (
        <option key={code} value={code}>
          {text}
        </option>
      ))}
    </datalist>
  );

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      icon={<Layers size={20} />}
      title={editing.index === null ? "Nuevo tramo" : `Tramo ${fmt(editing.row.fromDepth)}–${fmt(editing.row.toDepth)} m`}
      subtitle="Quick log · códigos del equipo de geología"
      footer={
        <>
          {error ? <p className="mr-auto self-center text-xs font-semibold text-rose-500">{error}</p> : null}
          {canEdit && editing.index !== null ? (
            <button type="button" className={`${dangerButton} sm:mr-auto`} disabled={busy} onClick={() => editing.index !== null && onDelete(editing.index)}>
              <Trash2 size={15} />
              Eliminar
            </button>
          ) : null}
          <button type="button" className={secondaryButton} onClick={onClose}>
            {canEdit ? "Cancelar" : "Cerrar"}
          </button>
          {canEdit ? (
            <button type="button" className={primaryButton} disabled={busy} onClick={submit}>
              <Save size={15} />
              Guardar tramo
            </button>
          ) : null}
        </>
      }
    >
      <fieldset disabled={!canEdit} className="space-y-5">
        {datalist("lith-codes", Object.fromEntries(Object.entries(LITHOLOGY).map(([code, info]) => [code, info.label])))}
        {datalist("texture-codes", TEXTURES)}
        {datalist("support-codes", SUPPORTS)}
        {datalist("alteration-codes", ALTERATIONS)}
        {datalist("mineral-codes", MINERALS)}
        {datalist("style-codes", MINERAL_STYLES)}
        {datalist("structure-codes", STRUCTURES)}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Field label="Desde (m)" required>
            <input className={`${fieldClass} font-mono`} inputMode="decimal" value={draft.fromDepth} onChange={(event) => set("fromDepth", event.target.value)} />
          </Field>
          <Field label="Hasta (m)" required>
            <input className={`${fieldClass} font-mono`} inputMode="decimal" value={draft.toDepth} onChange={(event) => set("toDepth", event.target.value)} />
          </Field>
          <Field label="Litología">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 rounded-sm" style={{ background: lithologyColor(draft.lithology) }} />
              <input list="lith-codes" className={`${fieldClass} pl-8 font-mono`} value={draft.lithology} onChange={(event) => set("lithology", event.target.value)} placeholder="ct" />
            </div>
          </Field>
          <Field label="Textura">
            <input list="texture-codes" className={`${fieldClass} font-mono`} value={draft.texture} onChange={(event) => set("texture", event.target.value)} placeholder="APH" />
          </Field>
          <Field label="Soporte">
            <input list="support-codes" className={`${fieldClass} font-mono`} value={draft.support} onChange={(event) => set("support", event.target.value)} placeholder="MTRX" />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Alteración 1">
            <input list="alteration-codes" className={`${fieldClass} font-mono`} value={draft.alteration1} onChange={(event) => set("alteration1", event.target.value)} placeholder="Sil" />
          </Field>
          <Field label="Intensidad">
            <input className={`${fieldClass} font-mono`} inputMode="numeric" value={draft.alteration1Int} onChange={(event) => set("alteration1Int", event.target.value)} placeholder="3" />
          </Field>
          <Field label="Alteración 2">
            <input list="alteration-codes" className={`${fieldClass} font-mono`} value={draft.alteration2} onChange={(event) => set("alteration2", event.target.value)} placeholder="Arg" />
          </Field>
          <Field label="Intensidad">
            <input className={`${fieldClass} font-mono`} inputMode="numeric" value={draft.alteration2Int} onChange={(event) => set("alteration2Int", event.target.value)} placeholder="1" />
          </Field>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">Mineralización</span>
            {draft.minerals.length < 4 ? (
              <button type="button" className="text-xs font-semibold text-[var(--color-primary)]" onClick={() => set("minerals", [...draft.minerals, { mineral: "", pct: "", style: "" }])}>
                + Mineral
              </button>
            ) : null}
          </div>
          <div className="space-y-2">
            {draft.minerals.map((mineral, index) => (
              <div key={index} className="grid grid-cols-[1fr_80px_1fr_36px] gap-2">
                <input list="mineral-codes" aria-label="Mineral" className={`${fieldClass} font-mono`} value={mineral.mineral} placeholder="Spc" onChange={(event) => set("minerals", draft.minerals.map((m, i) => (i === index ? { ...m, mineral: event.target.value } : m)))} />
                <input aria-label="Porcentaje" className={`${fieldClass} font-mono`} value={mineral.pct} placeholder="%" onChange={(event) => set("minerals", draft.minerals.map((m, i) => (i === index ? { ...m, pct: event.target.value } : m)))} />
                <input list="style-codes" aria-label="Estilo" className={`${fieldClass} font-mono`} value={mineral.style} placeholder="DISS" onChange={(event) => set("minerals", draft.minerals.map((m, i) => (i === index ? { ...m, style: event.target.value } : m)))} />
                <button type="button" aria-label="Quitar mineral" className="inline-flex items-center justify-center rounded-lg text-[var(--color-on-surface-variant)] hover:text-rose-600" onClick={() => set("minerals", draft.minerals.filter((_, i) => i !== index))}>
                  <X size={16} />
                </button>
              </div>
            ))}
            {draft.minerals.length === 0 ? <p className="text-xs text-[var(--color-on-surface-variant)]">Sin minerales registrados.</p> : null}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">Estructuras</span>
            {draft.structures.length < 2 ? (
              <button type="button" className="text-xs font-semibold text-[var(--color-primary)]" onClick={() => set("structures", [...draft.structures, { type: "", angle: "", fracCount: "" }])}>
                + Estructura
              </button>
            ) : null}
          </div>
          <div className="space-y-2">
            {draft.structures.map((structure, index) => (
              <div key={index} className="grid grid-cols-[1fr_90px_90px_36px] gap-2">
                <input list="structure-codes" aria-label="Tipo" className={`${fieldClass} font-mono`} value={structure.type} placeholder="Fa" onChange={(event) => set("structures", draft.structures.map((s, i) => (i === index ? { ...s, type: event.target.value } : s)))} />
                <input aria-label="Ángulo" inputMode="decimal" className={`${fieldClass} font-mono`} value={structure.angle} placeholder="Áng. °" onChange={(event) => set("structures", draft.structures.map((s, i) => (i === index ? { ...s, angle: event.target.value } : s)))} />
                <input aria-label="Fracturas" inputMode="numeric" className={`${fieldClass} font-mono`} value={structure.fracCount} placeholder="N° frac." onChange={(event) => set("structures", draft.structures.map((s, i) => (i === index ? { ...s, fracCount: event.target.value } : s)))} />
                <button type="button" aria-label="Quitar estructura" className="inline-flex items-center justify-center rounded-lg text-[var(--color-on-surface-variant)] hover:text-rose-600" onClick={() => set("structures", draft.structures.filter((_, i) => i !== index))}>
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
          <Field label="Observación litológica">
            <input className={fieldClass} value={draft.description} onChange={(event) => set("description", event.target.value)} />
          </Field>
          <Field label="Logueado por">
            <input className={fieldClass} value={draft.loggedBy} onChange={(event) => set("loggedBy", event.target.value)} placeholder="Eapaza" />
          </Field>
        </div>
      </fieldset>
    </Modal>
  );
}
