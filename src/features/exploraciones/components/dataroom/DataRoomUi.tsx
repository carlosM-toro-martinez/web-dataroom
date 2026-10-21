import { Fragment, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";

// Piezas comunes de la navegación del Data Room (perforaciones y superficie).

export type Crumb = { label: string; to?: string | undefined };

// Camino completo hasta donde estás; cada paso lleva de vuelta a ese nivel.
export function DataRoomBreadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Location" className="-mt-1">
      <ol className="flex flex-wrap items-center gap-x-1 gap-y-1 text-sm">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <Fragment key={`${index}-${item.label}`}>
              {index > 0 ? <ChevronRight size={14} className="shrink-0 text-[var(--color-on-surface-variant)]" aria-hidden /> : null}
              <li className="min-w-0">
                {last || !item.to ? (
                  <span aria-current={last ? "page" : undefined} className={`inline-block max-w-[16rem] truncate align-bottom ${last ? "font-bold text-[var(--color-on-surface)]" : "text-[var(--color-on-surface-variant)]"}`}>
                    {item.label}
                  </span>
                ) : (
                  <Link to={item.to} className="inline-block max-w-[16rem] truncate rounded-md px-1.5 py-0.5 align-bottom font-semibold text-[var(--color-primary)] hover:bg-[var(--color-surface-container-high)] hover:underline">
                    {item.label}
                  </Link>
                )}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

// Números de ensayo: hasta 3 decimales, sin ceros de sobra; "—" cuando no hay dato.
export function fmtNum(value: unknown, maxDecimals = 3): string {
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  return n.toLocaleString("en-US", { maximumFractionDigits: maxDecimals });
}

export function Section({ title, description, action, children }: { title: string; description?: ReactNode; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold">{title}</h2>
          {description ? <p className="mt-0.5 text-xs text-[var(--color-on-surface-variant)]">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

// Datos clave del nivel donde estás (nombre del pozo, profundidad, etc.).
export function ContextHeader({ eyebrow, title, subtitle, stats, action }: { eyebrow: string; title: string; subtitle?: ReactNode; stats?: Array<{ label: string; value: ReactNode }>; action?: ReactNode }) {
  return (
    <header className="rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-primary)]">{eyebrow}</p>
          <h2 className="mt-0.5 truncate text-2xl font-extrabold">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {stats?.length ? (
        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-xl bg-[var(--color-surface-container)] px-3.5 py-2.5">
              <dt className="text-[10px] font-bold uppercase tracking-wide text-[var(--color-on-surface-variant)]">{stat.label}</dt>
              <dd className="mt-0.5 text-base font-bold">{stat.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </header>
  );
}

export type Column<T> = {
  header: string;
  cell: (row: T) => ReactNode;
  // Los números van a la derecha y en letra monoespaciada para poder compararlos de un vistazo.
  numeric?: boolean;
  // Se oculta en pantallas angostas.
  wide?: boolean;
};

// Tabla de datos: encabezado fijo, filas clicables (toda la fila lleva al detalle) y sin columnas de "id".
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  rowTo,
  empty,
  maxHeight
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  rowTo?: ((row: T) => string) | undefined;
  empty: ReactNode;
  maxHeight?: string;
}) {
  const navigate = useNavigate();
  return (
    <div className="overflow-auto rounded-xl border border-[var(--color-border-soft)]" style={maxHeight ? { maxHeight } : undefined}>
      <table className="w-full min-w-max border-collapse text-sm">
        <thead className="sticky top-0 z-10">
          <tr className="bg-[var(--color-surface-container-high)]">
            {columns.map((column) => (
              <th
                key={column.header}
                scope="col"
                className={`whitespace-nowrap px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-wide text-[var(--color-on-surface-variant)] ${column.numeric ? "text-right" : "text-left"} ${column.wide ? "hidden md:table-cell" : ""}`}
              >
                {column.header}
              </th>
            ))}
            {rowTo ? <th className="w-8" aria-label="Open" /> : null}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row, index) => {
              const to = rowTo?.(row);
              return (
                <tr
                  key={rowKey(row, index)}
                  onClick={to ? () => navigate(to) : undefined}
                  className={`border-t border-[var(--color-border-soft)] transition ${to ? "cursor-pointer hover:bg-[var(--color-surface-container-high)]" : ""}`}
                >
                  {columns.map((column, i) => (
                    <td key={column.header} className={`px-3.5 py-2.5 ${column.numeric ? "text-right font-mono tabular-nums" : ""} ${column.wide ? "hidden md:table-cell" : ""}`}>
                      {i === 0 && to ? (
                        <Link to={to} onClick={(event) => event.stopPropagation()} className="font-semibold text-[var(--color-primary)] hover:underline">
                          {column.cell(row)}
                        </Link>
                      ) : (
                        column.cell(row)
                      )}
                    </td>
                  ))}
                  {to ? (
                    <td className="pr-3 text-[var(--color-on-surface-variant)]">
                      <ChevronRight size={16} aria-hidden />
                    </td>
                  ) : null}
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={columns.length + (rowTo ? 1 : 0)} className="px-4 py-8 text-center text-sm text-[var(--color-on-surface-variant)]">
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// Fila de "chips" para cambiar de zona / área / nivel / labor sin volver atrás.
export function ChipRow({
  label,
  items,
  allLabel,
  allTo
}: {
  label: string;
  items: Array<{ id: string; label: string; to: string; selected: boolean; hint?: string }>;
  allLabel?: string;
  allTo?: string;
}) {
  if (!items.length && !allTo) return null;
  const chip = "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition";
  const idle = "border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] hover:border-[var(--color-primary)]";
  const active = "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-on-primary)]";
  const anySelected = items.some((item) => item.selected);
  return (
    <div className="flex items-center gap-3">
      <span className="w-14 shrink-0 text-[11px] font-bold uppercase tracking-wide text-[var(--color-on-surface-variant)]">{label}</span>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {allTo ? (
          <Link to={allTo} className={`${chip} ${anySelected ? idle : active}`}>
            {allLabel ?? "All"}
          </Link>
        ) : null}
        {items.map((item) => (
          <Link key={item.id} to={item.to} aria-current={item.selected ? "true" : undefined} className={`${chip} ${item.selected ? active : idle}`}>
            {item.label}
            {item.hint ? <span className={`text-xs font-medium ${item.selected ? "opacity-80" : "text-[var(--color-on-surface-variant)]"}`}>{item.hint}</span> : null}
          </Link>
        ))}
      </div>
    </div>
  );
}
