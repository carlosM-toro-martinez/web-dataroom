import { Boxes, CalendarClock, ClipboardList, Compass, Drill, FlaskConical, Hourglass, Layers, Ruler } from "lucide-react";
import { InternalHeader } from "@/shared/ui/InternalHeader";

const pageShell = "mx-auto w-full max-w-7xl space-y-6 px-4 pb-8 sm:px-6 lg:px-8";
const panelClass =
  "rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)]";

// Funcionalidades previstas; el backend (/api/drilling) y las tablas ya existen.
const PLANNED_FEATURES = [
  {
    icon: ClipboardList,
    title: "Campañas y pozos",
    description: "Programas de perforación por Exploración o Producción, con collar planificado y real."
  },
  {
    icon: CalendarClock,
    title: "Partes diarios",
    description: "Metros perforados por turno, horas de perforación y de espera, máquina y operador."
  },
  {
    icon: Compass,
    title: "Control de desviación",
    description: "Mediciones de azimut e inclinación a lo largo del pozo."
  },
  {
    icon: Ruler,
    title: "Recuperación y RQD",
    description: "Corridas con longitud recuperada, porcentaje de recuperación y RQD."
  },
  {
    icon: Boxes,
    title: "Cajas de testigo",
    description: "Numeración, tramos, ubicación en almacén y fotografía de cada caja."
  },
  {
    icon: Layers,
    title: "Logueo geológico",
    description: "Litología, alteración, mineralización y estructuras por tramo."
  },
  {
    icon: FlaskConical,
    title: "Muestras y laboratorio",
    description: "Muestreo por tramos, lotes con folio y nota de remisión, y resultados por elemento."
  }
];

export function SondajesPage() {
  return (
    <div className={pageShell}>
      <InternalHeader
        eyebrow="Sondajes"
        title="Sondajes"
        description="Seguimiento de las perforaciones de la empresa minera."
      />

      <section className={`${panelClass} flex flex-col items-center gap-4 px-6 py-12 text-center`}>
        <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-primary)] text-[var(--color-on-primary)]">
          <Drill size={30} />
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-primary)] px-3 py-1 text-xs font-bold uppercase tracking-widest text-[var(--color-primary)]">
          <Hourglass size={13} />
          Próximamente
        </span>
        <h2 className="text-2xl font-extrabold">Módulo en construcción</h2>
        <p className="max-w-2xl text-sm text-[var(--color-on-surface-variant)]">
          Aquí se registrarán las perforaciones en curso: avance diario, control del pozo, testigos,
          logueo y envío de muestras al laboratorio.
        </p>
      </section>

      <section className={`${panelClass} p-5`}>
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
          Lo que incluirá
        </h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {PLANNED_FEATURES.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] p-4"
            >
              <Icon size={20} className="text-[var(--color-primary)]" />
              <h4 className="mt-3 text-sm font-bold">{title}</h4>
              <p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">{description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
