import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, Database, Layers3, MapPinned, RefreshCw, Search } from "lucide-react";
import {
  useInteriorHierarchyQuery,
  useSurfaceHierarchyQuery
} from "@/features/exploraciones/hooks/useProposalSamples";
import type {
  HierarchySampleCounts,
  InteriorHierarchyArea,
  SurfaceHierarchyArea
} from "@/features/exploraciones/model/proposalSamples.schema";
import { InternalHeader } from "@/shared/ui/InternalHeader";

const pageShell = "mx-auto w-full max-w-7xl space-y-5 px-4 pb-8 sm:px-6 lg:px-8";
const panelClass = "rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)]";
const fieldClass =
  "w-full rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] px-3 py-2.5 text-sm text-[var(--color-on-surface)] outline-none transition focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]";
const secondaryButton =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-outline-variant)] px-3 py-2 text-sm font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)] disabled:cursor-not-allowed disabled:opacity-50";

type ViewMode = "interior" | "surface";

export function ExploracionesHierarchyPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("interior");
  const [showJson, setShowJson] = useState(false);
  const [search, setSearch] = useState("");
  const interior = useInteriorHierarchyQuery();
  const surface = useSurfaceHierarchyQuery();
  const activeQuery = viewMode === "interior" ? interior : surface;
  const rawData = activeQuery.data ?? [];
  const activeData = useMemo(
    () => filterHierarchyData(rawData, search, viewMode),
    [rawData, search, viewMode]
  );
  const totals = useMemo(() => sumHierarchyTotals(rawData), [rawData]);
  const visibleTotals = useMemo(() => sumHierarchyTotals(activeData), [activeData]);
  const endpoint = viewMode === "interior" ? "/api/interior/hierarchy" : "/api/surface-sample/hierarchy";
  const structureText =
    viewMode === "interior"
      ? "Interior se lee como Área → Nivel → Labor. Los conteos del área y nivel son acumulados de sus hijos."
      : "Superficie es plana: cada tarjeta representa un área con sus conteos directos.";

  return (
    <div className={pageShell}>
      <InternalHeader
        eyebrow="Exploraciones"
        title="Jerarquía de muestras"
        description="Vista directa de los endpoints de jerarquía para revisar cómo está armado Interior Mina y Superficie."
      />

      <section className={`${panelClass} p-4`}>
        <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-start">
          <div className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row">
            <ModeButton active={viewMode === "interior"} onClick={() => setViewMode("interior")} icon={Layers3}>
              Interior Mina
            </ModeButton>
            <ModeButton active={viewMode === "surface"} onClick={() => setViewMode("surface")} icon={MapPinned}>
              Superficie
            </ModeButton>
            </div>

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_18rem]">
              <div className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">Endpoint activo</p>
                <p className="mt-2 break-all font-mono text-sm font-bold text-[var(--color-on-surface)]">GET {endpoint}</p>
                <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">{structureText}</p>
              </div>
              <div className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">Total de muestras</p>
                <p className="mt-2 text-4xl font-black">{totals.total}</p>
                <p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">
                  Incluye exploración y producción.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row xl:flex-col">
            <button type="button" className={secondaryButton} onClick={() => void activeQuery.refetch()}>
              <RefreshCw size={15} className={activeQuery.isFetching ? "animate-spin" : ""} />
              Actualizar
            </button>
            <button type="button" className={secondaryButton} onClick={() => setShowJson((current) => !current)}>
              <Database size={15} />
              {showJson ? "Ocultar JSON" : "Ver JSON"}
            </button>
            <Link to="/exploraciones" className={secondaryButton}>
              Volver
            </Link>
          </div>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
          <SummaryCard label="Exploración" counts={totals.exploration} />
          <SummaryCard label="Producción" counts={totals.production} />
          <div className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] p-3 lg:min-w-64">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">Leyenda de estados</p>
            <div className="mt-3 grid gap-2 text-xs">
              <LegendRow label="Registradas" description="Creadas, aún no enviadas a laboratorio." />
              <LegendRow label="Despachadas" description="Incluidas en un lote enviado." />
              <LegendRow label="Completadas" description="Con resultados registrados." />
            </div>
          </div>
        </div>
      </section>

      <section className={`${panelClass} overflow-hidden`}>
        <div className="grid gap-3 border-b border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] px-4 py-3 lg:grid-cols-[1fr_20rem] lg:items-center">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
              {viewMode === "interior" ? "Árbol de Interior Mina" : "Áreas de Superficie"}
            </h2>
            <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">
              Mostrando {activeData.length} de {rawData.length} área{rawData.length === 1 ? "" : "s"} · Total visible: {visibleTotals.total}
            </p>
          </div>
          <label className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-on-surface-variant)]" />
            <input
              className={`${fieldClass} pl-9`}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar área, nivel o labor"
            />
          </label>
        </div>

        {activeQuery.isLoading ? (
          <p className="p-5 text-sm text-[var(--color-on-surface-variant)]">Cargando jerarquía...</p>
        ) : null}
        {activeQuery.isError ? (
          <p className="p-5 text-sm font-semibold text-[var(--color-error)]">
            No se pudo cargar la jerarquía. Revisa conexión o permisos de la API.
          </p>
        ) : null}
        {!activeQuery.isLoading && !activeQuery.isError && activeData.length === 0 ? (
          <p className="p-5 text-sm text-[var(--color-on-surface-variant)]">
            La API respondió sin áreas para mostrar.
          </p>
        ) : null}

        <div className="space-y-4 p-4">
          {viewMode === "interior"
            ? (activeData as InteriorHierarchyArea[]).map((area) => <InteriorAreaNode key={area.id} area={area} />)
            : (activeData as SurfaceHierarchyArea[]).map((area) => <SurfaceAreaRow key={area.id} area={area} />)}
        </div>
      </section>

      {showJson ? (
        <section className={`${panelClass} overflow-hidden`}>
          <div className="border-b border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] px-4 py-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">Respuesta JSON</h2>
          </div>
          <pre className="max-h-[520px] overflow-auto p-4 text-xs text-[var(--color-on-surface)]">
            {JSON.stringify(activeData, null, 2)}
          </pre>
        </section>
      ) : null}
    </div>
  );
}

function ModeButton({
  active,
  icon: Icon,
  onClick,
  children
}: {
  active: boolean;
  icon: typeof Layers3;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition ${
        active
          ? "bg-[var(--color-primary)] text-[var(--color-on-primary)]"
          : "border border-[var(--color-outline-variant)] text-[var(--color-on-surface-variant)]"
      }`}
      onClick={onClick}
    >
      <Icon size={16} />
      {children}
    </button>
  );
}

function InteriorAreaNode({ area }: { area: InteriorHierarchyArea }) {
  return (
    <article className="overflow-hidden rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)]">
      <HierarchyHeader
        badge="Área"
        title={area.name}
        subtitle={area.abbreviation ? `Abreviatura: ${area.abbreviation}` : "Sin abreviatura"}
        samples={area.samples}
      />
      <div className="space-y-3 border-t border-[var(--color-border-soft)] p-3 sm:p-4">
        {area.levels.map((level) => (
          <details key={level.id} open className="overflow-hidden rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)]">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3 sm:p-4">
              <div className="min-w-0 flex-1">
                <HierarchyHeader
                  badge="Nivel"
                  title={level.name}
                  subtitle={[
                    level.abbreviation ? `Abreviatura: ${level.abbreviation}` : "",
                    level.elevation ? `Elevación: ${level.elevation} msnm` : ""
                  ].filter(Boolean).join(" · ") || "Sin datos adicionales"}
                  samples={level.samples}
                  compact
                />
              </div>
              <ChevronDown size={16} className="shrink-0" />
            </summary>
            <div className="space-y-2 border-t border-[var(--color-border-soft)] p-3 sm:p-4">
              {level.labors.map((labor) => (
                <div key={labor.id} className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] p-3">
                  <HierarchyHeader
                    badge="Labor"
                    title={labor.name}
                    subtitle={labor.abbreviation ? `Abreviatura: ${labor.abbreviation}` : "Sin abreviatura"}
                    samples={labor.samples}
                    compact
                  />
                </div>
              ))}
              {level.labors.length === 0 ? <EmptyText text="Sin labores registradas." /> : null}
            </div>
          </details>
        ))}
        {area.levels.length === 0 ? <EmptyText text="Sin niveles registrados." /> : null}
      </div>
    </article>
  );
}

function SurfaceAreaRow({ area }: { area: SurfaceHierarchyArea }) {
  return (
    <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)]">
      <HierarchyHeader
        badge="Área"
        title={area.name}
        subtitle={area.abbreviation ? `Abreviatura: ${area.abbreviation}` : "Sin abreviatura"}
        samples={area.samples}
      />
    </article>
  );
}

function HierarchyHeader({
  badge,
  title,
  subtitle,
  samples,
  compact = false
}: {
  badge: string;
  title: string;
  subtitle: string;
  samples: HierarchySampleCounts;
  compact?: boolean;
}) {
  return (
    <div className="grid w-full gap-3 p-3 sm:p-4 lg:grid-cols-[minmax(0,1fr)_minmax(32rem,auto)] lg:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[var(--color-primary)] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[var(--color-on-primary)]">
            {badge}
          </span>
          <h3 className={`${compact ? "text-sm" : "text-base"} min-w-0 font-extrabold`}>{title}</h3>
        </div>
        <p className="mt-2 text-xs text-[var(--color-on-surface-variant)]">{subtitle.trim() || "-"}</p>
      </div>
      <CountsMatrix samples={samples} />
    </div>
  );
}

function SummaryCard({ label, counts }: { label: string; counts: HierarchySampleCounts["exploration"] }) {
  return (
    <div className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] p-3">
      <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">{label}</p>
      <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
        <CountCell label="Registradas" value={counts.registered} />
        <CountCell label="Despachadas" value={counts.dispatched} />
        <CountCell label="Completadas" value={counts.completed} />
        <CountCell label="Total" value={counts.total} />
      </div>
    </div>
  );
}

function CountsMatrix({ samples }: { samples: HierarchySampleCounts }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)]">
      <div className="grid grid-cols-[1.05fr_repeat(4,minmax(4.2rem,1fr))] border-b border-[var(--color-border-soft)] text-[10px] font-black uppercase tracking-wider text-[var(--color-on-surface-variant)]">
        <div className="px-2 py-2">Categoría</div>
        <div className="px-2 py-2 text-center">Registradas</div>
        <div className="px-2 py-2 text-center">Despachadas</div>
        <div className="px-2 py-2 text-center">Completadas</div>
        <div className="px-2 py-2 text-center">Total</div>
      </div>
      <CountRow label="Exploración" counts={samples.exploration} />
      <CountRow label="Producción" counts={samples.production} />
      <div className="grid grid-cols-[1.05fr_repeat(4,minmax(4.2rem,1fr))] border-t border-[var(--color-border-soft)] text-sm font-black">
        <div className="px-2 py-2 text-[var(--color-on-surface-variant)]">Total general</div>
        <div />
        <div />
        <div />
        <div className="px-2 py-2 text-center">{samples.total}</div>
      </div>
    </div>
  );
}

function CountRow({ label, counts }: { label: string; counts: HierarchySampleCounts["exploration"] }) {
  return (
    <div className="grid grid-cols-[1.05fr_repeat(4,minmax(4.2rem,1fr))] text-sm">
      <div className="px-2 py-2 font-bold text-[var(--color-on-surface-variant)]">{label}</div>
      <div className="px-2 py-2 text-center font-bold">{counts.registered}</div>
      <div className="px-2 py-2 text-center font-bold">{counts.dispatched}</div>
      <div className="px-2 py-2 text-center font-bold">{counts.completed}</div>
      <div className="px-2 py-2 text-center font-black">{counts.total}</div>
    </div>
  );
}

function CountCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-[var(--color-surface-container-highest)] px-2 py-2">
      <p className="min-h-8 text-[10px] font-bold leading-tight text-[var(--color-on-surface-variant)]">{label}</p>
      <p className="mt-1 text-lg font-black">{value}</p>
    </div>
  );
}

function LegendRow({ label, description }: { label: string; description: string }) {
  return (
    <div>
      <p className="font-bold text-[var(--color-on-surface)]">{label}</p>
      <p className="text-[var(--color-on-surface-variant)]">{description}</p>
    </div>
  );
}

function EmptyText({ text }: { text: string }) {
  return <p className="text-sm text-[var(--color-on-surface-variant)]">{text}</p>;
}

function filterHierarchyData(
  items: Array<InteriorHierarchyArea | SurfaceHierarchyArea>,
  search: string,
  mode: ViewMode
) {
  const query = normalizeHierarchySearch(search);
  if (!query) return items;

  if (mode === "surface") {
    return (items as SurfaceHierarchyArea[]).filter((area) => matchesHierarchyText(area, query));
  }

  return (items as InteriorHierarchyArea[])
    .map((area) => {
      const areaMatches = matchesHierarchyText(area, query);
      const levels = area.levels
        .map((level) => {
          const levelMatches = matchesHierarchyText(level, query);
          const labors = level.labors.filter((labor) => matchesHierarchyText(labor, query));
          return levelMatches ? level : { ...level, labors };
        })
        .filter((level) => areaMatches || matchesHierarchyText(level, query) || level.labors.length > 0);

      return areaMatches ? area : { ...area, levels };
    })
    .filter((area) => matchesHierarchyText(area, query) || area.levels.length > 0);
}

function matchesHierarchyText(item: { name?: string | null; abbreviation?: string | null }, query: string) {
  return normalizeHierarchySearch(`${item.name ?? ""} ${item.abbreviation ?? ""}`).includes(query);
}

function normalizeHierarchySearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function sumHierarchyTotals(items: Array<InteriorHierarchyArea | SurfaceHierarchyArea>) {
  return items.reduce(
    (acc, item) => ({
      exploration: {
        registered: acc.exploration.registered + item.samples.exploration.registered,
        dispatched: acc.exploration.dispatched + item.samples.exploration.dispatched,
        completed: acc.exploration.completed + item.samples.exploration.completed,
        total: acc.exploration.total + item.samples.exploration.total
      },
      production: {
        registered: acc.production.registered + item.samples.production.registered,
        dispatched: acc.production.dispatched + item.samples.production.dispatched,
        completed: acc.production.completed + item.samples.production.completed,
        total: acc.production.total + item.samples.production.total
      },
      total: acc.total + item.samples.total
    }),
    {
      exploration: { registered: 0, dispatched: 0, completed: 0, total: 0 },
      production: { registered: 0, dispatched: 0, completed: 0, total: 0 },
      total: 0
    }
  );
}
