import { useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, FlaskConical, Info, Map as MapIcon, MapPinned, Microscope, Ruler, TrendingUp } from "lucide-react";
import { InternalHeader } from "@/shared/ui/InternalHeader";
import { fieldClass, panelClass } from "@/features/sondajes/components/ui";
import {
  useCoverage,
  useEstimation,
  useGrades,
  useLaboratories,
  useOverview,
  useQuality,
  useScope,
  type AnalyticsFilters,
  type ElementSel,
  type Estimation,
  type EstimationMethod,
  type Variogram
} from "@/features/analytics/analyticsApi";

type TabKey = "resumen" | "leyes" | "cobertura" | "laboratorios" | "calidad" | "prediccion";
const TABS: Array<{ key: TabKey; label: string; icon: typeof MapIcon }> = [
  { key: "resumen", label: "Resumen", icon: Info },
  { key: "leyes", label: "Leyes", icon: TrendingUp },
  { key: "cobertura", label: "Cobertura", icon: MapPinned },
  { key: "laboratorios", label: "Laboratorios", icon: FlaskConical },
  { key: "calidad", label: "Calidad", icon: Microscope },
  { key: "prediccion", label: "Estimación", icon: MapIcon }
];

const nf = new Intl.NumberFormat("es-BO", { maximumFractionDigits: 2 });
const nf3 = new Intl.NumberFormat("es-BO", { maximumFractionDigits: 3 });
const fmt = (value: number | null | undefined, digits = 2) =>
  value == null || !Number.isFinite(value) ? "—" : value >= 100 ? nf.format(Math.round(value)) : (digits === 3 ? nf3 : nf).format(value);
const pct = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 100) : 0);
const days = (value: number | null | undefined) => (value == null ? "—" : `${value < 10 ? value.toFixed(1) : Math.round(value)} d`);
const monthLabel = (month: string) => {
  const [year, m] = month.split("-");
  const names = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${names[Number(m) - 1] ?? m} ${String(year).slice(2)}`;
};
const dateLabel = (value: string | null) => (value ? new Date(value).toLocaleDateString("es-BO", { day: "2-digit", month: "short", year: "numeric" }) : "—");

const SOURCE_LABEL: Record<string, string> = { INTERIOR: "Interior mina", SURFACE: "Superficie" };
const CATEGORY_LABEL: Record<string, string> = { EXPLORATION: "Exploración", PRODUCTION: "Producción" };

const toIso = (value: string, plusDay = 0) => {
  if (!value) return undefined;
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + plusDay);
  return date.toISOString();
};

// ─── Piezas de interfaz ────────────────────────────────────────────────────────
function Card({ title, subtitle, action, children, className = "" }: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`${panelClass} p-5 ${className}`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-bold">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-xs text-[var(--color-on-surface-variant)]">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Kpi({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "good" | "warn" }) {
  return (
    <div className={`${panelClass} p-4`}>
      <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--color-on-surface-variant)]">{label}</p>
      <p className={`mt-1 font-mono text-3xl font-extrabold ${tone === "warn" ? "text-amber-600 dark:text-amber-300" : ""}`}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">{hint}</p> : null}
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-dashed border-[var(--color-border-soft)] px-4 py-8 text-center text-sm text-[var(--color-on-surface-variant)]">{children}</p>;
}

function Loading() {
  return <div className="h-40 animate-pulse rounded-2xl bg-[var(--color-surface-container-high)]" role="status" aria-label="Cargando" />;
}

function Chip({ tone, children }: { tone: "good" | "warn" | "bad" | "muted"; children: ReactNode }) {
  const cls = {
    good: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    warn: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    bad: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
    muted: "bg-slate-500/15 text-slate-600 dark:text-slate-300"
  }[tone];
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-bold ${cls}`}>{children}</span>;
}

function DataTable({ head, rows, empty, maxHeight }: { head: Array<{ label: string; right?: boolean }>; rows: ReactNode[][]; empty: string; maxHeight?: string }) {
  if (!rows.length) return <Empty>{empty}</Empty>;
  return (
    <div className="overflow-auto rounded-xl border border-[var(--color-border-soft)]" style={maxHeight ? { maxHeight } : undefined}>
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10">
          <tr className="bg-[var(--color-surface-container-high)]">
            {head.map((h) => (
              <th key={h.label} className={`whitespace-nowrap px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-[var(--color-on-surface-variant)] ${h.right ? "text-right" : "text-left"}`}>
                {h.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-t border-[var(--color-border-soft)] hover:bg-[var(--color-surface-container-high)]">
              {row.map((cell, i) => (
                <td key={i} className={`px-3 py-2 ${head[i]?.right ? "text-right font-mono" : ""}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Barras horizontales de una sola serie (un solo color: lo que cambia es el largo).
function BarList({ rows, unit, max }: { rows: Array<{ label: string; sub?: string | null; value: number; marker?: number; note?: string }>; unit: string; max?: number }) {
  const top = max ?? Math.max(...rows.map((r) => Math.max(r.value, r.marker ?? 0)), 1e-9);
  return (
    <ul className="space-y-2.5">
      {rows.map((row, index) => (
        <li key={`${index}-${row.label}`} title={`${row.label}: ${fmt(row.value, 3)} ${unit}${row.note ? ` · ${row.note}` : ""}`}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-semibold">
              {row.label}
              {row.sub ? <span className="ml-2 text-xs font-normal text-[var(--color-on-surface-variant)]">{row.sub}</span> : null}
            </span>
            <span className="shrink-0 font-mono text-sm font-bold">
              {fmt(row.value, 3)} <span className="text-xs font-normal text-[var(--color-on-surface-variant)]">{unit}</span>
            </span>
          </div>
          <div className="relative mt-1 h-2.5 rounded-full bg-[var(--color-surface-container-high)]">
            <div className="h-full rounded-full bg-[var(--color-primary)]" style={{ width: `${Math.max((row.value / top) * 100, 1.5)}%` }} />
            {row.marker != null ? (
              <span className="absolute top-1/2 h-4 w-[3px] -translate-y-1/2 rounded bg-[var(--color-tertiary)]" style={{ left: `calc(${Math.min((row.marker / top) * 100, 100)}% - 1px)` }} aria-hidden />
            ) : null}
          </div>
          {row.note ? <p className="mt-0.5 text-[11px] text-[var(--color-on-surface-variant)]">{row.note}</p> : null}
        </li>
      ))}
    </ul>
  );
}

// Columnas mensuales (cantidad de muestras).
function MonthColumns({ data }: { data: Array<{ month: string; value: number }> }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...data.map((d) => d.value), 1);
  const W = 640;
  const H = 180;
  const pad = { l: 8, r: 8, t: 22, b: 26 };
  const slot = (W - pad.l - pad.r) / Math.max(data.length, 1);
  const barW = Math.min(slot * 0.62, 34);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Muestras registradas por mes">
      <line x1={pad.l} x2={W - pad.r} y1={H - pad.b} y2={H - pad.b} stroke="var(--color-border-soft)" />
      {data.map((d, i) => {
        const h = ((H - pad.t - pad.b) * d.value) / max;
        const x = pad.l + slot * i + (slot - barW) / 2;
        const y = H - pad.b - h;
        return (
          <g key={d.month} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            <rect x={pad.l + slot * i} y={0} width={slot} height={H} fill="transparent" />
            <rect x={x} y={y} width={barW} height={Math.max(h, 1)} rx={4} fill="var(--color-primary)" opacity={hover == null || hover === i ? 1 : 0.45}>
              <title>{`${monthLabel(d.month)}: ${d.value} muestras`}</title>
            </rect>
            {hover === i || data.length <= 8 ? (
              <text x={x + barW / 2} y={y - 6} textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--color-on-surface)">
                {d.value}
              </text>
            ) : null}
            <text x={x + barW / 2} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--color-on-surface-variant)">
              {monthLabel(d.month)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// Línea de la ley promedio por mes.
function TrendLine({ data, unit }: { data: Array<{ month: string; avg: number; n: number }>; unit: string }) {
  const [hover, setHover] = useState<number | null>(null);
  if (data.length < 2) return <Empty>Se necesitan al menos 2 meses con resultados para ver una tendencia.</Empty>;
  const W = 640;
  const H = 200;
  const pad = { l: 44, r: 30, t: 14, b: 26 };
  const max = Math.max(...data.map((d) => d.avg), 1e-9);
  const x = (i: number) => pad.l + ((W - pad.l - pad.r) * i) / (data.length - 1);
  const y = (v: number) => H - pad.b - ((H - pad.t - pad.b) * v) / max;
  const path = data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d.avg).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Ley promedio mensual (${unit})`} onMouseLeave={() => setHover(null)}>
      {[0, 0.5, 1].map((t) => (
        <g key={t}>
          <line x1={pad.l} x2={W - pad.r} y1={y(max * t)} y2={y(max * t)} stroke="var(--color-border-soft)" strokeDasharray={t === 0 ? undefined : "3 4"} />
          <text x={pad.l - 6} y={y(max * t) + 3} textAnchor="end" fontSize="10" fill="var(--color-on-surface-variant)">
            {fmt(max * t)}
          </text>
        </g>
      ))}
      <path d={path} fill="none" stroke="var(--color-primary)" strokeWidth={2} strokeLinejoin="round" />
      {data.map((d, i) => (
        <g key={d.month} onMouseEnter={() => setHover(i)}>
          <rect x={x(i) - 18} y={0} width={36} height={H} fill="transparent" />
          <circle cx={x(i)} cy={y(d.avg)} r={hover === i ? 5 : 3.5} fill="var(--color-primary)" stroke="var(--color-surface-container-low)" strokeWidth={2} />
          {i % Math.ceil(data.length / 8) === 0 ? (
            <text x={x(i)} y={H - 8} textAnchor={i === data.length - 1 ? "end" : "middle"} fontSize="10" fill="var(--color-on-surface-variant)">
              {monthLabel(d.month)}
            </text>
          ) : null}
        </g>
      ))}
      {hover != null && data[hover] ? (
        <text x={Math.min(Math.max(x(hover), 90), W - 90)} y={Math.max(y(data[hover].avg) - 12, 12)} textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--color-on-surface)">
          {monthLabel(data[hover].month)}: {fmt(data[hover].avg, 3)} {unit} ({data[hover].n} muestras)
        </text>
      ) : null}
    </svg>
  );
}

// ─── Página ────────────────────────────────────────────────────────────────────
export function SampleAnalyticsPage() {
  const [tab, setTab] = useState<TabKey>("resumen");
  const [category, setCategory] = useState<AnalyticsFilters["category"]>("");
  const [source, setSource] = useState<AnalyticsFilters["source"]>("");
  const [fromDay, setFromDay] = useState("");
  const [toDay, setToDay] = useState("");
  const [elementKey, setElementKey] = useState("");

  const filters = useMemo<AnalyticsFilters>(() => {
    const f: AnalyticsFilters = {};
    if (category) f.category = category;
    if (source) f.source = source;
    const from = toIso(fromDay);
    const to = toIso(toDay, 1);
    if (from) f.from = from;
    if (to) f.to = to;
    return f;
  }, [category, source, fromDay, toDay]);

  const overview = useOverview(filters);
  const own = useScope().data?.scope === "own";
  const elements = overview.data?.elements ?? [];
  const selected = elements.find((e) => `${e.symbol}|${e.unit}` === elementKey) ?? elements[0];
  const element: ElementSel = selected ? { element: selected.symbol, unit: selected.unit } : {};
  const needsElement = tab === "leyes" || tab === "calidad" || tab === "prediccion";

  return (
    <section className="space-y-5 text-[var(--color-on-surface)]">
      <InternalHeader
        eyebrow="Análisis"
        title="Análisis de muestras"
        description={
          own
            ? "Leyes, cobertura, laboratorios y calidad de las muestras que tú registraste, para decidir dónde y cuánto muestrear."
            : "Leyes, cobertura, laboratorios y calidad de las muestras de interior mina y superficie, para decidir dónde y cuánto muestrear."
        }
      />
      {own ? (
        <p className="-mt-2 flex items-start gap-2 rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container)] px-4 py-3 text-xs text-[var(--color-on-surface-variant)]">
          <Info size={15} className="mt-0.5 shrink-0" />
          Estás viendo solo las muestras que registraste tú. Las cifras de los demás geólogos no aparecen aquí; la estimación espacial usa únicamente tus puntos.
        </p>
      ) : null}

      <div className={`${panelClass} flex flex-wrap items-end gap-3 p-4`}>
        <label className="min-w-[9rem] flex-1 text-xs font-semibold">
          Tipo
          <select className={`${fieldClass} mt-1`} value={category} onChange={(e) => setCategory(e.target.value as AnalyticsFilters["category"])}>
            <option value="">Exploración y Producción</option>
            <option value="EXPLORATION">Exploración</option>
            <option value="PRODUCTION">Producción</option>
          </select>
        </label>
        <label className="min-w-[9rem] flex-1 text-xs font-semibold">
          Origen
          <select className={`${fieldClass} mt-1`} value={source} onChange={(e) => setSource(e.target.value as AnalyticsFilters["source"])}>
            <option value="">Interior mina y superficie</option>
            <option value="INTERIOR">Interior mina</option>
            <option value="SURFACE">Superficie</option>
          </select>
        </label>
        <label className="text-xs font-semibold">
          Desde
          <input type="date" className={`${fieldClass} mt-1`} value={fromDay} max={toDay || undefined} onChange={(e) => setFromDay(e.target.value)} />
        </label>
        <label className="text-xs font-semibold">
          Hasta
          <input type="date" className={`${fieldClass} mt-1`} value={toDay} min={fromDay || undefined} onChange={(e) => setToDay(e.target.value)} />
        </label>
        {needsElement ? (
          <label className="min-w-[11rem] text-xs font-semibold">
            Elemento
            <select className={`${fieldClass} mt-1`} value={selected ? `${selected.symbol}|${selected.unit}` : ""} onChange={(e) => setElementKey(e.target.value)}>
              {elements.map((e) => (
                <option key={`${e.symbol}|${e.unit}`} value={`${e.symbol}|${e.unit}`}>
                  {e.symbol.toUpperCase()}
                  {e.unit ? ` (${e.unit})` : ""} · {e.samples} muestras
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {fromDay || toDay || category || source ? (
          <button
            type="button"
            className="pb-2.5 text-xs font-semibold text-[var(--color-primary)] hover:underline"
            onClick={() => {
              setCategory("");
              setSource("");
              setFromDay("");
              setToDay("");
            }}
          >
            Limpiar filtros
          </button>
        ) : null}
      </div>

      <nav className="flex gap-1 overflow-x-auto border-b border-[var(--color-border-soft)]" aria-label="Secciones">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              aria-current={active ? "page" : undefined}
              className={`relative inline-flex items-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-semibold transition ${active ? "text-[var(--color-primary)] after:absolute after:inset-x-2 after:bottom-[-1px] after:h-[3px] after:rounded-full after:bg-[var(--color-primary)]" : "text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]"}`}
            >
              <Icon size={16} />
              {t.label}
            </button>
          );
        })}
      </nav>

      {overview.isError ? (
        <Empty>No se pudo cargar el análisis. Revisa tu conexión e inténtalo de nuevo.</Empty>
      ) : tab === "resumen" ? (
        <SummaryTab filters={filters} goTo={setTab} />
      ) : tab === "leyes" ? (
        <GradesTab filters={filters} element={element} />
      ) : tab === "cobertura" ? (
        <CoverageTab filters={filters} />
      ) : tab === "laboratorios" ? (
        <LaboratoriesTab filters={filters} />
      ) : tab === "calidad" ? (
        <QualityTab filters={filters} element={element} />
      ) : (
        <EstimationTab filters={filters} element={element} ready={Boolean(selected)} />
      )}
    </section>
  );
}

// ─── Resumen ───────────────────────────────────────────────────────────────────
function SummaryTab({ filters, goTo }: { filters: AnalyticsFilters; goTo: (tab: TabKey) => void }) {
  const overview = useOverview(filters);
  const coverage = useCoverage(filters);
  const labs = useLaboratories(filters);
  if (overview.isLoading || !overview.data) return <Loading />;
  const { totals, dispatches, byMonth } = overview.data;
  const change = totals.prev30 > 0 ? Math.round(((totals.last30 - totals.prev30) / totals.prev30) * 100) : null;

  const overdue = (labs.data?.pending ?? []).filter((p) => p.overdue);
  const noResults = (coverage.data?.labors ?? []).filter((l) => l.samples >= 5 && l.with_results === 0);
  const empty = coverage.data?.emptyLabors ?? [];
  const missingCoords = totals.samples - totals.with_coords;
  const alerts: Array<{ tone: "warn" | "bad"; text: ReactNode; tab: TabKey }> = [];
  if (overdue.length) {
    const worst = [...overdue].sort((a, b) => b.days_waiting - a.days_waiting)[0]!;
    alerts.push({ tone: "bad", tab: "laboratorios", text: <><strong>{overdue.length}</strong> envío{overdue.length === 1 ? "" : "s"} a laboratorio tarda{overdue.length === 1 ? "" : "n"} más de lo normal. El más antiguo: folio {worst.folio} en {worst.lab}, {Math.round(worst.days_waiting)} días sin respuesta completa.</> });
  }
  if (noResults.length) alerts.push({ tone: "warn", tab: "cobertura", text: <><strong>{noResults.length}</strong> labor{noResults.length === 1 ? "" : "es"} con 5 o más muestras todavía sin ningún resultado (ej.: {noResults[0]!.labor}, {noResults[0]!.level}).</> });
  if (missingCoords > 0) alerts.push({ tone: "warn", tab: "cobertura", text: <><strong>{missingCoords}</strong> muestras ({pct(missingCoords, totals.samples)}%) no tienen coordenadas: no se pueden ubicar en el mapa ni usar en la estimación.</> });
  if (empty.length) alerts.push({ tone: "warn", tab: "cobertura", text: <><strong>{empty.length}</strong> labor{empty.length === 1 ? "" : "es"} creadas que nunca se muestrearon.</> });

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Muestras" value={nf.format(totals.samples)} hint={`${totals.interior} interior · ${totals.surface} superficie`} />
        <Kpi label="Con resultados" value={`${pct(totals.with_results, totals.samples)}%`} hint={`${totals.with_results} de ${totals.samples}`} tone={pct(totals.with_results, totals.samples) < 30 ? "warn" : undefined} />
        <Kpi label="Con coordenadas" value={`${pct(totals.with_coords, totals.samples)}%`} hint={`${totals.with_coords} de ${totals.samples}`} tone={pct(totals.with_coords, totals.samples) < 70 ? "warn" : undefined} />
        <Kpi
          label="Últimos 30 días"
          value={totals.last30}
          hint={change == null ? "sin período anterior para comparar" : `${change >= 0 ? "+" : ""}${change}% frente a los 30 días previos (${totals.prev30})`}
        />
      </div>

      <Card title="Qué atender" subtitle="Lo que el sistema detecta con los datos actuales.">
        {alerts.length ? (
          <ul className="space-y-2">
            {alerts.map((a, i) => (
              <li key={i} className="flex items-start gap-3 rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container)] px-3.5 py-3 text-sm">
                <AlertTriangle size={17} className={`mt-0.5 shrink-0 ${a.tone === "bad" ? "text-rose-500" : "text-amber-500"}`} />
                <span className="flex-1">{a.text}</span>
                <button type="button" className="shrink-0 text-xs font-semibold text-[var(--color-primary)] hover:underline" onClick={() => goTo(a.tab)}>
                  Ver detalle
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-300">
            <CheckCircle2 size={17} /> Nada que atender con los filtros actuales.
          </p>
        )}
      </Card>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="Muestras por mes" subtitle="Fecha de muestreo (o de registro si falta)." className="lg:col-span-2">
          {byMonth.length ? <MonthColumns data={byMonth.map((m) => ({ month: m.month, value: m.samples }))} /> : <Empty>Sin muestras con estos filtros.</Empty>}
        </Card>
        <Card title="Estado de las muestras">
          <ul className="space-y-3 text-sm">
            {[
              ["Registradas", totals.registered],
              ["Despachadas al laboratorio", totals.dispatched],
              ["Completadas", totals.completed]
            ].map(([label, value]) => (
              <li key={label as string}>
                <div className="flex justify-between">
                  <span>{label}</span>
                  <span className="font-mono font-bold">{value}</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-[var(--color-surface-container-high)]">
                  <div className="h-full rounded-full bg-[var(--color-primary)]" style={{ width: `${pct(value as number, totals.samples)}%` }} />
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-[var(--color-on-surface-variant)]">
            Lotes de despacho: {dispatches.pending} pendientes · {dispatches.completed} completados. Exploración {totals.exploration} · Producción {totals.production}.
          </p>
        </Card>
      </div>
    </div>
  );
}

// ─── Leyes ─────────────────────────────────────────────────────────────────────
function GradesTab({ filters, element }: { filters: AnalyticsFilters; element: ElementSel }) {
  const [groupBy, setGroupBy] = useState("level");
  const grades = useGrades(filters, element, groupBy);
  if (!element.element) return <Empty>Todavía no hay resultados de laboratorio cargados con estos filtros.</Empty>;
  if (grades.isLoading || !grades.data) return <Loading />;
  const g = grades.data;
  const unit = g.unit ?? "";
  const total = g.groups.reduce((sum, r) => sum + r.n, 0);
  return (
    <div className="space-y-5">
      <Card
        title={`Ley promedio de ${(g.element ?? "").toUpperCase()}`}
        subtitle={`${total} muestras con resultado. La marca naranja indica el valor máximo de cada grupo. Los resultados "menor que el límite" (${g.belowDetection}) no se promedian.`}
        action={
          <div className="flex gap-1 rounded-xl bg-[var(--color-surface-container-high)] p-1" role="group" aria-label="Agrupar por">
            {[
              ["level", "Nivel"],
              ["labor", "Labor"],
              ["area", "Área"],
              ["objective", "Objetivo"]
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setGroupBy(key!)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${groupBy === key ? "bg-[var(--color-primary)] text-[var(--color-on-primary)]" : "text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]"}`}
              >
                {label}
              </button>
            ))}
          </div>
        }
      >
        {g.groups.length ? (
          <BarList
            unit={unit}
            rows={g.groups.slice(0, 15).map((r) => ({ label: r.label, sub: r.parent, value: r.avg, marker: r.max, note: `${r.n} muestra${r.n === 1 ? "" : "s"} · mediana ${fmt(r.median, 3)} · mín ${fmt(r.min, 3)} · máx ${fmt(r.max, 3)}` }))}
          />
        ) : (
          <Empty>Sin resultados de este elemento.</Empty>
        )}
        {g.groups.length > 15 ? <p className="mt-3 text-xs text-[var(--color-on-surface-variant)]">Se muestran los 15 de mayor ley promedio de {g.groups.length}.</p> : null}
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Tendencia mensual" subtitle={`Ley promedio de ${(g.element ?? "").toUpperCase()} (${unit}) por mes de muestreo.`}>
          <TrendLine data={g.trend} unit={unit} />
        </Card>
        <Card title="Las 10 muestras de mayor ley">
          <DataTable
            head={[{ label: "Código" }, { label: "Dónde" }, { label: `Ley (${unit})`, right: true }]}
            empty="Sin datos."
            rows={g.top.map((t) => [<span className="font-mono font-semibold">{t.code}</span>, <span className="text-xs">{t.area} · {t.level} · {t.labor}</span>, <strong>{fmt(t.value, 3)}</strong>])}
          />
        </Card>
      </div>
    </div>
  );
}

// ─── Cobertura ─────────────────────────────────────────────────────────────────
function CoverageTab({ filters }: { filters: AnalyticsFilters }) {
  const coverage = useCoverage(filters);
  const [onlyIssues, setOnlyIssues] = useState(false);
  if (coverage.isLoading || !coverage.data) return <Loading />;
  const { labors, emptyLabors } = coverage.data;
  const rows = labors.filter((l) => !onlyIssues || l.with_results < l.samples || l.with_coords < l.samples || (l.days_since ?? 0) > 90);
  return (
    <div className="space-y-5">
      <Card
        title="Cobertura por labor"
        subtitle="Cuántas muestras hay en cada labor y qué tan completas están. Se marca en ámbar lo que conviene revisar."
        action={
          <label className="flex items-center gap-2 text-xs font-semibold">
            <input type="checkbox" checked={onlyIssues} onChange={(e) => setOnlyIssues(e.target.checked)} />
            Solo con pendientes
          </label>
        }
      >
        <DataTable
          empty="Sin muestras con estos filtros."
          head={[{ label: "Labor" }, { label: "Tipo" }, { label: "Muestras", right: true }, { label: "Con resultados" }, { label: "Con coordenadas" }, { label: "Último muestreo" }]}
          rows={rows.map((l) => [
            <div>
              <p className="font-semibold">{l.labor}</p>
              <p className="text-xs text-[var(--color-on-surface-variant)]">{l.area} · {l.level} · {SOURCE_LABEL[l.source]}</p>
            </div>,
            <Chip tone="muted">{CATEGORY_LABEL[l.category]}</Chip>,
            <strong>{l.samples}</strong>,
            <Progress value={l.with_results} total={l.samples} />,
            <Progress value={l.with_coords} total={l.samples} />,
            <span className={(l.days_since ?? 0) > 90 ? "text-amber-600 dark:text-amber-300" : ""}>
              {dateLabel(l.last_at)}
              {l.days_since != null ? <span className="block text-xs text-[var(--color-on-surface-variant)]">hace {Math.round(l.days_since)} d</span> : null}
            </span>
          ])}
        />
      </Card>
      {emptyLabors.length ? (
        <Card title="Labores sin ninguna muestra" subtitle="Existen en el sistema pero nunca se muestrearon.">
          <div className="flex flex-wrap gap-2">
            {emptyLabors.map((l, i) => (
              <span key={i} className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container)] px-2.5 py-1 text-xs">
                <strong>{l.labor}</strong> <span className="text-[var(--color-on-surface-variant)]">· {l.area} · {l.level}</span>
              </span>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function Progress({ value, total }: { value: number; total: number }) {
  const p = pct(value, total);
  return (
    <div className="min-w-[7rem]" title={`${value} de ${total}`}>
      <div className="flex justify-between text-xs">
        <span className="font-mono font-semibold">{p}%</span>
        <span className="text-[var(--color-on-surface-variant)]">{value}/{total}</span>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-[var(--color-surface-container-high)]">
        <div className={`h-full rounded-full ${p < 50 ? "bg-amber-500" : "bg-[var(--color-primary)]"}`} style={{ width: `${p}%` }} />
      </div>
    </div>
  );
}

// ─── Laboratorios ──────────────────────────────────────────────────────────────
function LaboratoriesTab({ filters }: { filters: AnalyticsFilters }) {
  const labs = useLaboratories(filters);
  if (labs.isLoading || !labs.data) return <Loading />;
  const { laboratories, pending, defaultNormalDays } = labs.data;
  const overdue = pending.filter((p) => p.overdue);
  return (
    <div className="space-y-5">
      <Card title="Tiempo de entrega por laboratorio" subtitle="Días desde el envío hasta el primer resultado cargado (o hasta marcar la muestra como completada).">
        <DataTable
          empty="Aún no hay envíos."
          head={[{ label: "Laboratorio" }, { label: "Muestras enviadas", right: true }, { label: "Entregadas", right: true }, { label: "Pendientes", right: true }, { label: "Promedio", right: true }, { label: "Mediana", right: true }, { label: "El 90% llega en", right: true }, { label: "Plazo normal", right: true }]}
          rows={laboratories.map((l) => [
            <strong>{l.lab}</strong>,
            l.items,
            l.completed,
            <span className={l.pending > 0 ? "text-amber-600 dark:text-amber-300" : ""}>{l.pending}</span>,
            days(l.avg_days),
            days(l.median_days),
            days(l.p90_days),
            days(l.normal_days)
          ])}
        />
        <p className="mt-3 text-xs text-[var(--color-on-surface-variant)]">
          «Plazo normal» = 1,5 veces la mediana del laboratorio (si tiene al menos 3 entregas); si no, {defaultNormalDays} días.
        </p>
      </Card>

      <Card
        title="Envíos con respuesta pendiente"
        subtitle={overdue.length ? `${overdue.length} de ${pending.length} pasan del plazo normal de su laboratorio.` : `${pending.length} lotes en espera, todos dentro del plazo normal.`}
      >
        <DataTable
          maxHeight="520px"
          empty="No hay envíos pendientes."
          head={[{ label: "Folio" }, { label: "Laboratorio" }, { label: "Enviado" }, { label: "Muestras pendientes", right: true }, { label: "Espera", right: true }, { label: "Estado" }]}
          rows={[...pending]
            .sort((a, b) => Number(b.overdue) - Number(a.overdue) || b.days_waiting - a.days_waiting)
            .map((p) => [
              <span className="font-mono font-semibold">#{p.folio}</span>,
              p.lab,
              dateLabel(p.sent_at),
              `${p.pending} de ${p.items}`,
              days(p.days_waiting),
              p.overdue ? <Chip tone="bad">Pasó el plazo ({days(p.normal_days)})</Chip> : <Chip tone="good">En plazo</Chip>
            ])}
        />
      </Card>
    </div>
  );
}

// ─── Calidad ───────────────────────────────────────────────────────────────────
function QualityTab({ filters, element }: { filters: AnalyticsFilters; element: ElementSel }) {
  const quality = useQuality(filters, element);
  if (!element.element) return <Empty>Todavía no hay resultados cargados.</Empty>;
  if (quality.isLoading || !quality.data) return <Loading />;
  const q = quality.data;
  const unit = q.unit ?? "";
  return (
    <div className="space-y-5">
      <Card
        title={`Comparación entre laboratorios · ${(q.element ?? "").toUpperCase()}`}
        subtitle={`Se compara la misma muestra analizada por dos laboratorios (o dos veces por el mismo). Es «coherente» si el 80% o más difiere menos de ±${q.tolerance}%.`}
      >
        <DataTable
          empty="Ninguna muestra tiene este elemento analizado por dos laboratorios todavía. Para evaluar la calidad hay que enviar una muestra a más de un laboratorio."
          head={[{ label: "Laboratorios" }, { label: "Muestras comparadas", right: true }, { label: "Diferencia media", right: true }, { label: "Dentro de ±" + q.tolerance + "%", right: true }, { label: "Correlación", right: true }, { label: "Veredicto" }]}
          rows={q.pairs.map((p) => {
            const share = pct(p.within, p.n);
            const verdict = p.n < 5 ? <Chip tone="muted">Pocos datos</Chip> : share >= 80 ? <Chip tone="good">Coherente</Chip> : share >= 50 ? <Chip tone="warn">Revisar</Chip> : <Chip tone="bad">Discrepan</Chip>;
            return [
              <span className="font-semibold">{p.lab_a} <span className="font-normal text-[var(--color-on-surface-variant)]">vs</span> {p.lab_b}</span>,
              p.n,
              <span title="Positivo: el primero reporta más que el segundo">{p.bias_pct >= 0 ? "+" : ""}{fmt(p.bias_pct, 1)}%</span>,
              `${share}%`,
              p.corr == null ? "—" : fmt(p.corr, 2),
              verdict
            ];
          })}
        />
        <p className="mt-3 text-xs text-[var(--color-on-surface-variant)]">
          La «diferencia media» es firmada: si es positiva, el primer laboratorio reporta más que el segundo (sesgo). Una correlación alta con diferencia grande indica un desfase constante entre ambos.
        </p>
      </Card>
      {q.worst.length ? (
        <Card title="Las muestras donde más discrepan" subtitle={`Valores en ${unit}. Conviene revisar estas muestras con el laboratorio.`}>
          <DataTable
            empty=""
            head={[{ label: "Muestra" }, { label: "Laboratorios" }, { label: "Valor A", right: true }, { label: "Valor B", right: true }, { label: "Diferencia", right: true }]}
            rows={q.worst.map((w) => [
              <span className="font-mono font-semibold">{w.code}</span>,
              <span className="text-xs">{w.lab_a} / {w.lab_b}</span>,
              fmt(w.va, 3),
              fmt(w.vb, 3),
              <strong className={Math.abs(w.diff_pct) > q.tolerance ? "text-rose-500" : ""}>{w.diff_pct >= 0 ? "+" : ""}{fmt(w.diff_pct, 0)}%</strong>
            ])}
          />
        </Card>
      ) : null}
    </div>
  );
}

// ─── Estimación espacial ───────────────────────────────────────────────────────
const METHODS: Array<{ key: EstimationMethod; label: string; hint: string; min: number }> = [
  { key: "idw", label: "IDW", hint: "Distancia inversa (IDW): simple y rápido, pesa las muestras vecinas según qué tan cerca están.", min: 5 },
  { key: "kriging", label: "Kriging", hint: "Kriging: aprende cómo se parecen las muestras entre sí (variograma) y además dice qué tan incierta es cada zona.", min: 8 }
];

function EstimationTab({ filters, element, ready }: { filters: AnalyticsFilters; element: ElementSel; ready: boolean }) {
  const [levelId, setLevelId] = useState<string | undefined>();
  const [method, setMethod] = useState<EstimationMethod>("idw");
  const estimation = useEstimation(filters, element, levelId, method, ready);
  if (!ready) return <Empty>Todavía no hay resultados cargados.</Empty>;
  if (estimation.isLoading || !estimation.data) return <Loading />;
  const e = estimation.data;
  const unit = e.unit ?? "";
  const current = METHODS.find((m) => m.key === method)!;
  return (
    <div className="space-y-5">
      <Card
        title={`Mapa de leyes estimadas · ${(e.element ?? "").toUpperCase()}`}
        subtitle={`${current.hint} También propone dónde conviene muestrear después.`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div role="group" aria-label="Método de estimación" className="inline-flex overflow-hidden rounded-lg border border-[var(--color-border-soft)]">
              {METHODS.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setMethod(m.key)}
                  aria-pressed={method === m.key}
                  className={`px-3 py-1.5 text-xs font-semibold transition ${method === m.key ? "bg-[var(--color-primary)] text-[var(--color-on-primary)]" : "hover:bg-[var(--color-surface-container-high)]"}`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <select className={`${fieldClass} !w-auto`} value={e.selectedLevelId ?? ""} onChange={(ev) => setLevelId(ev.target.value)} aria-label="Nivel">
              {e.levels.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.parent} · {l.label} ({l.points} con coordenadas)
                </option>
              ))}
            </select>
          </div>
        }
      >
        {!e.levels.length ? (
          <Empty>No hay muestras con resultado de este elemento.</Empty>
        ) : !e.result ? (
          <Empty>
            Este nivel tiene menos de {current.min} muestras con coordenadas y resultado: no alcanza para estimar con {current.label}. Elige otro nivel, completa las coordenadas
            {method === "kriging" ? " o prueba con IDW, que pide menos puntos." : "."}
          </Empty>
        ) : (
          <EstimationMap estimation={e} unit={unit} />
        )}
      </Card>
      <p className="flex items-start gap-2 rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container)] px-4 py-3 text-xs text-[var(--color-on-surface-variant)]">
        <Info size={15} className="mt-0.5 shrink-0" />
        Es una estimación de apoyo para priorizar, no un recurso ni una reserva. Con pocas muestras la incertidumbre es alta. Antes de decidir sobre perforación o muestreo, un geólogo debe validarla
        {method === "kriging" ? " y revisar que el variograma automático tenga sentido geológico." : "; si además quieres ver la incertidumbre de cada zona, usa Kriging."}
      </p>
    </div>
  );
}

// Variograma: puntos = lo medido entre pares de muestras; curva = el modelo ajustado que usa el kriging.
function VariogramChart({ vg }: { vg: Variogram }) {
  const W = 300;
  const H = 150;
  const L = 34;
  const B = 22;
  const maxH = Math.max(vg.range * 1.15, ...vg.bins.map((b) => b.h), 1e-9);
  const maxG = Math.max(vg.sill * 1.2, ...vg.bins.map((b) => b.gamma), 1e-9);
  const x = (h: number) => L + (h / maxH) * (W - L - 8);
  const y = (g: number) => H - B - (g / maxG) * (H - B - 8);
  const curve: string[] = [];
  for (let i = 0; i <= 40; i++) {
    const h = (maxH * i) / 40;
    const r = Math.min(h / vg.range, 1);
    const g = h <= 0 ? 0 : h >= vg.range ? vg.sill : vg.nugget + (vg.sill - vg.nugget) * (1.5 * r - 0.5 * r ** 3);
    curve.push(`${i === 0 ? "M" : "L"}${x(h).toFixed(1)},${y(g).toFixed(1)}`);
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Variograma">
      <line x1={L} y1={H - B} x2={W - 8} y2={H - B} stroke="var(--color-border-soft)" />
      <line x1={L} y1={8} x2={L} y2={H - B} stroke="var(--color-border-soft)" />
      <path d={curve.join(" ")} fill="none" stroke="var(--color-primary)" strokeWidth={2} />
      {vg.bins.map((b, i) => (
        <circle key={i} cx={x(b.h)} cy={y(b.gamma)} r={3.5} fill="var(--color-surface-container-low)" stroke="var(--color-on-surface)" strokeWidth={1.5}>
          <title>{`A ${Math.round(b.h)} m de distancia: diferencia ${fmt(b.gamma, 3)} (${b.n} pares)`}</title>
        </circle>
      ))}
      <text x={(L + W) / 2} y={H - 4} textAnchor="middle" fontSize="10" fill="var(--color-on-surface-variant)">distancia entre muestras (m)</text>
      <text x={4} y={14} fontSize="10" fill="var(--color-on-surface-variant)">diferencia</text>
    </svg>
  );
}

function EstimationMap({ estimation, unit }: { estimation: Estimation; unit: string }) {
  const [hover, setHover] = useState<string | null>(null);
  const [layer, setLayer] = useState<"grade" | "uncertainty">("grade");
  const r = estimation.result!;
  const kriged = r.method === "kriging";
  const showUncertainty = kriged && layer === "uncertainty";
  const maxStdev = Math.max(...r.cells.map((c) => c.stdev ?? 0), 1e-9);
  const uncertaintyShade = (sd: number) => `color-mix(in srgb, var(--color-tertiary) ${Math.round(8 + (sd / maxStdev) * 87)}%, var(--color-surface-container-low))`;
  const pts = estimation.points ?? [];
  const W = 640;
  const margin = r.radius / 2;
  const minE = r.bounds.minEast - margin;
  const maxE = r.bounds.maxEast + margin;
  const minN = r.bounds.minNorth - margin;
  const maxN = r.bounds.maxNorth + margin;
  const spanE = Math.max(maxE - minE, 1);
  const spanN = Math.max(maxN - minN, 1);
  const H = Math.min(Math.max((W * spanN) / spanE, 260), 560);
  const PAD = 16;
  const scale = Math.min((W - 2 * PAD) / spanE, (H - 2 * PAD) / spanN);
  const ox = (W - spanE * scale) / 2;
  const oy = (H - spanN * scale) / 2;
  const sx = (e: number) => ox + (e - minE) * scale;
  const sy = (n: number) => H - oy - (n - minN) * scale;
  const cell = Math.max(r.step * scale, 2);
  const lo = r.stats.min;
  const span = Math.max(r.stats.max - lo, 1e-9);
  // Una sola tonalidad: cuanto más intensa, mayor la ley estimada.
  const shade = (v: number) => `color-mix(in srgb, var(--color-primary) ${Math.round(12 + ((v - lo) / span) * 83)}%, var(--color-surface-container-low))`;
  const v = r.validation;
  const reliability = v.correlation == null ? null : v.correlation >= 0.6 ? "buena" : v.correlation >= 0.3 ? "moderada" : "baja";

  return (
    <div className="grid gap-5 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)]" role="img" aria-label="Mapa de leyes estimadas">
          {r.cells.map((c, i) => (
            <rect key={i} x={sx(c.east) - cell / 2} y={sy(c.north) - cell / 2} width={cell + 0.5} height={cell + 0.5} fill={showUncertainty ? uncertaintyShade(c.stdev ?? 0) : shade(c.estimate)} />
          ))}
          {pts.map((p) => (
            <circle
              key={p.id}
              cx={sx(p.east)}
              cy={sy(p.north)}
              r={hover === p.id ? 6 : 4}
              fill={shade(p.value)}
              stroke="var(--color-on-surface)"
              strokeWidth={1.5}
              onMouseEnter={() => setHover(p.id)}
              onMouseLeave={() => setHover(null)}
            >
              <title>{`${p.code}: ${fmt(p.value, 3)} ${unit}`}</title>
            </circle>
          ))}
          {r.suggestions.map((s, i) => (
            <g key={i} transform={`translate(${sx(s.east)},${sy(s.north)})`}>
              <path d="M0,-9 L9,0 L0,9 L-9,0 Z" fill="var(--color-tertiary)" stroke="var(--color-surface-container-low)" strokeWidth={2}>
                <title>{`Sugerido ${i + 1}: Este ${Math.round(s.east)}, Norte ${Math.round(s.north)} · ley estimada ${fmt(s.estimate, 3)} ${unit}`}</title>
              </path>
              <text y={3.5} textAnchor="middle" fontSize="10" fontWeight="800" fill="#1a1204">
                {i + 1}
              </text>
            </g>
          ))}
        </svg>
        {kriged ? (
          <div role="group" aria-label="Capa del mapa" className="mt-3 inline-flex overflow-hidden rounded-lg border border-[var(--color-border-soft)] text-xs font-semibold">
            {([["grade", "Ley estimada"], ["uncertainty", "Incertidumbre"]] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                aria-pressed={layer === key}
                onClick={() => setLayer(key)}
                className={`px-3 py-1.5 transition ${layer === key ? "bg-[var(--color-primary)] text-[var(--color-on-primary)]" : "hover:bg-[var(--color-surface-container-high)]"}`}
              >
                {label}
              </button>
            ))}
          </div>
        ) : null}
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[var(--color-on-surface-variant)]">
          {showUncertainty ? (
            <span className="flex items-center gap-2">
              más segura
              <span className="h-2.5 w-24 rounded" style={{ background: `linear-gradient(90deg, ${uncertaintyShade(0)}, ${uncertaintyShade(maxStdev)})` }} />
              más incierta
            </span>
          ) : (
            <span className="flex items-center gap-2">
              {fmt(r.stats.min, 3)}
              <span className="h-2.5 w-24 rounded" style={{ background: `linear-gradient(90deg, ${shade(lo)}, ${shade(r.stats.max)})` }} />
              {fmt(r.stats.max, 3)} {unit}
            </span>
          )}
          <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full border-[1.5px] border-[var(--color-on-surface)]" /> muestra real</span>
          <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rotate-45 bg-[var(--color-tertiary)]" /> punto sugerido</span>
        </div>
      </div>

      <div className="space-y-4 lg:col-span-2">
        <div>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-bold"><Ruler size={15} /> Dónde muestrear después</h3>
          {r.suggestions.length ? (
            <ol className="space-y-2">
              {r.suggestions.map((s, i) => (
                <li key={i} className="flex items-start gap-3 rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container)] px-3 py-2 text-sm">
                  <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[var(--color-tertiary)] text-[11px] font-extrabold text-[#1a1204]">{i + 1}</span>
                  <span>
                    <span className="font-mono text-xs">E {Math.round(s.east)} · N {Math.round(s.north)}</span>
                    <span className="block text-xs text-[var(--color-on-surface-variant)]">
                      Ley estimada {fmt(s.estimate, 3)} {unit}
                      {s.stdev != null ? ` (± ${fmt(s.stdev, 3)})` : ""} · a {Math.round(s.distance)} m de la muestra más cercana
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-[var(--color-on-surface-variant)]">No hay zonas de ley alta sin muestrear: el nivel está bien cubierto.</p>
          )}
        </div>
        <div className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container)] px-3.5 py-3 text-sm">
          <p className="font-bold">Qué tan confiable es</p>
          <p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">
            Se quitó cada muestra y se estimó con las demás: correlación{" "}
            <strong className="text-[var(--color-on-surface)]">{v.correlation == null ? "—" : fmt(v.correlation, 2)}</strong>
            {reliability ? ` (${reliability})` : ""}, error típico {fmt(v.rmse, 3)} {unit}, sobre {v.n} muestras.
          </p>
        </div>
        {r.variogram ? (
          <div className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container)] px-3.5 py-3 text-sm">
            <p className="font-bold">Variograma del kriging</p>
            <VariogramChart vg={r.variogram} />
            <p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">
              Las muestras se parecen hasta unos <strong className="text-[var(--color-on-surface)]">{Math.round(r.variogram.range)} m</strong> (alcance); el ruido propio de la ley (pepita) es{" "}
              <strong className="text-[var(--color-on-surface)]">{r.variogram.sill > 0 ? Math.round((r.variogram.nugget / r.variogram.sill) * 100) : 0}%</strong> de la variación total.
            </p>
            {r.variogram.fit != null && r.variogram.fit < 0.5 ? (
              <p className="mt-2 flex items-start gap-1.5 text-xs text-[var(--color-on-surface-variant)]">
                <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                El modelo calza poco con los datos ({Math.round(r.variogram.fit * 100)}%): hay pocas muestras o la ley casi no depende de la ubicación. Toma el kriging de este nivel con mucha cautela.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
