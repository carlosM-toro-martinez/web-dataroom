import { ClipboardList, Compass, Drill, MapPin, Pencil } from "lucide-react";
import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import type { DrillingCampaign, DrillingHole, DrillingHoleStatus } from "@/features/sondajes/model/sondajes.schema";
import { HoleStatusMenu } from "@/features/sondajes/components/HoleStatus";
import { Modal, SectionTitle, formatDate, formatMeters, formatNumber, primaryButton, secondaryButton } from "@/features/sondajes/components/ui";

const TYPE_LABELS: Record<string, string> = { DDH: "DDH · Diamantina", RC: "RC · Aire reverso", AC: "AC · Air core", OTHER: "Otro" };

function Metric({ label, value, mono = true }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <div className="rounded-xl bg-[var(--color-surface-container-high)] px-3 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">{label}</p>
      <p className={`mt-0.5 text-sm font-semibold ${mono ? "font-mono tabular-nums" : ""}`}>{value}</p>
    </div>
  );
}

export function HoleDetailModal({
  hole,
  campaign,
  statusSaving,
  onClose,
  onEdit,
  onStatusChange
}: {
  hole: DrillingHole | null;
  campaign?: DrillingCampaign;
  statusSaving: boolean;
  onClose: () => void;
  onEdit: (hole: DrillingHole) => void;
  onStatusChange: (hole: DrillingHole, status: DrillingHoleStatus) => void;
}) {
  if (!hole) return null;
  const planned = hole.plannedDepth ?? null;
  const reached = hole.finalDepth ?? hole.currentDepth ?? null;
  const progress = planned && reached ? Math.min(100, (reached / planned) * 100) : 0;
  const hasExecution = hole.east != null || hole.north != null || hole.finalDepth != null || hole.azimuth != null;

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      icon={<Drill size={20} />}
      title={hole.code}
      subtitle={campaign ? `${campaign.name}${campaign.area ? ` · ${campaign.area}` : ""}` : undefined}
      footer={
        <>
          <button type="button" className={secondaryButton} onClick={onClose}>
            Cerrar
          </button>
          <Link to={`/sondajes/pozos/${hole.id}`} className={secondaryButton}>
            <ClipboardList size={15} />
            Partes diarios
          </Link>
          <button type="button" className={primaryButton} onClick={() => onEdit(hole)}>
            <Pencil size={15} />
            Editar
          </button>
        </>
      }
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--color-border-soft)] p-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">Estado</p>
            <div className="mt-1.5">
              <HoleStatusMenu status={hole.status} disabled={statusSaving} onChange={(status) => onStatusChange(hole, status)} />
            </div>
          </div>
          <div className="min-w-[180px] flex-1 sm:max-w-xs">
            <div className="flex items-baseline justify-between text-xs">
              <span className="font-semibold text-[var(--color-on-surface-variant)]">Avance</span>
              <span className="font-mono font-semibold">
                {formatMeters(reached ?? 0)} / {formatMeters(planned)}
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[var(--color-surface-container-high)]">
              <div className="h-full rounded-full bg-[var(--color-primary)] transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>

        <section>
          <SectionTitle aside={<MapPin size={15} className="text-[var(--color-on-surface-variant)]" />}>Collar programado</SectionTitle>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Metric label="X (Este)" value={formatNumber(hole.plannedEast)} />
            <Metric label="Y (Norte)" value={formatNumber(hole.plannedNorth)} />
            <Metric label="Z (Cota)" value={formatNumber(hole.plannedElevation)} />
            <Metric label="Azimuth" value={hole.plannedAzimuth != null ? `${formatNumber(hole.plannedAzimuth, 0)}°` : "—"} />
            <Metric label="Dip" value={hole.plannedDip != null ? `${formatNumber(hole.plannedDip, 0)}°` : "—"} />
            <Metric label="Target depth" value={formatMeters(hole.plannedDepth)} />
          </div>
        </section>

        {hasExecution ? (
          <section>
            <SectionTitle aside={<Compass size={15} className="text-[var(--color-on-surface-variant)]" />}>Ejecución</SectionTitle>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Metric label="X real" value={formatNumber(hole.east)} />
              <Metric label="Y real" value={formatNumber(hole.north)} />
              <Metric label="Z real" value={formatNumber(hole.elevation)} />
              <Metric label="Azimuth real" value={hole.azimuth != null ? `${formatNumber(hole.azimuth, 0)}°` : "—"} />
              <Metric label="Dip real" value={hole.dip != null ? `${formatNumber(hole.dip, 0)}°` : "—"} />
              <Metric label="Prof. final" value={formatMeters(hole.finalDepth)} />
            </div>
          </section>
        ) : null}

        <section>
          <SectionTitle>Información</SectionTitle>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Metric label="Tipo" value={TYPE_LABELS[hole.type] ?? hole.type} mono={false} />
            <Metric label="Ubicación" value={hole.locationType === "UNDERGROUND" ? "Interior mina" : "Superficie"} mono={false} />
            <Metric label="Sector" value={hole.sector || "—"} mono={false} />
            <Metric label="Inicio" value={formatDate(hole.startedAt)} mono={false} />
            <Metric label="Fin" value={formatDate(hole.finishedAt)} mono={false} />
            <Metric label="Actualizado" value={formatDate(hole.updatedAt)} mono={false} />
          </div>
          {hole.target ? (
            <p className="mt-3 rounded-xl bg-[var(--color-surface-container-high)] px-3 py-2.5 text-sm">
              <span className="font-semibold">Objetivo: </span>
              {hole.target}
            </p>
          ) : null}
          {hole.notes ? (
            <p className="mt-2 whitespace-pre-wrap rounded-xl bg-[var(--color-surface-container-high)] px-3 py-2.5 text-sm">{hole.notes}</p>
          ) : null}
        </section>
      </div>
    </Modal>
  );
}
