import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Boxes,
  CalendarClock,
  ClipboardList,
  CloudUpload,
  Compass,
  Drill,
  Eye,
  FileSpreadsheet,
  FlaskConical,
  FolderKanban,
  FolderPlus,
  Layers,
  MoreVertical,
  Pencil,
  Plus,
  Ruler,
  Search,
  Trash2,
  Users,
  X
} from "lucide-react";
import { InternalHeader } from "@/shared/ui/InternalHeader";
import { useToast } from "@/shared/ui/toast/ToastProvider";
import {
  useCreateDrillingCampaignMutation,
  useCreateDrillingHoleMutation,
  useDeleteDrillingCampaignMutation,
  useDeleteDrillingHoleMutation,
  useDrillingCampaignsQuery,
  useDrillingHolesQuery,
  useImportDrillingHolesMutation,
  useUpdateDrillingCampaignMutation,
  useUpdateDrillingHoleMutation
} from "@/features/sondajes/hooks/useSondajes";
import {
  DRILLING_HOLE_STATUSES,
  type DrillingCampaign,
  type DrillingHole,
  type DrillingHoleStatus
} from "@/features/sondajes/model/sondajes.schema";
import { HOLE_STATUS_META, HoleStatusMenu, StatusProgressBar } from "@/features/sondajes/components/HoleStatus";
import { HoleFormModal } from "@/features/sondajes/components/HoleFormModal";
import { HoleDetailModal } from "@/features/sondajes/components/HoleDetailModal";
import { ProgramFormModal } from "@/features/sondajes/components/ProgramFormModal";
import { ImportProgramModal, type ImportRequest } from "@/features/sondajes/components/ImportProgramModal";
import { PersonnelModal } from "@/features/sondajes/components/PersonnelModal";
import { SyncBar } from "@/features/sondajes/components/SyncBar";
import { useShiftReportsSync } from "@/features/sondajes/hooks/useShiftReportsSync";
import {
  Modal,
  dangerButton,
  fieldClass,
  formatMeters,
  formatNumber,
  iconButton,
  panelClass,
  primaryButton,
  secondaryButton
} from "@/features/sondajes/components/ui";

const pageShell = "mx-auto w-full max-w-7xl space-y-5 px-4 pb-10 sm:px-6 lg:px-8";
const ALL = "all";

// Funcionalidades siguientes; tablas y API ya existen.
const UPCOMING_FEATURES = [
  { icon: Compass, title: "Control de desviación", description: "Mediciones de azimut e inclinación del pozo." },
  { icon: Ruler, title: "Recuperación y RQD", description: "Corridas con recuperación y RQD." },
  { icon: Boxes, title: "Cajas de testigo", description: "Tramos, ubicación en almacén y fotos." },
  { icon: Layers, title: "Logueo geológico", description: "Litología, alteración, mineralización y estructuras." },
  { icon: FlaskConical, title: "Muestras y laboratorio", description: "Lotes con folio, nota de remisión y resultados." }
];

type ConfirmState =
  | { kind: "hole"; hole: DrillingHole }
  | { kind: "program"; campaign: DrillingCampaign }
  | null;

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function countByStatus(holes: DrillingHole[]) {
  const counts: Partial<Record<DrillingHoleStatus, number>> = {};
  holes.forEach((hole) => {
    counts[hole.status] = (counts[hole.status] ?? 0) + 1;
  });
  return counts;
}

function sumPlanned(holes: DrillingHole[]) {
  return holes.reduce((sum, hole) => sum + (hole.plannedDepth ?? 0), 0);
}

export function SondajesPage() {
  const { showError, showSuccess } = useToast();
  const campaignsQuery = useDrillingCampaignsQuery();
  const holesQuery = useDrillingHolesQuery();
  const createCampaign = useCreateDrillingCampaignMutation();
  const updateCampaign = useUpdateDrillingCampaignMutation();
  const deleteCampaign = useDeleteDrillingCampaignMutation();
  const createHole = useCreateDrillingHoleMutation();
  const updateHole = useUpdateDrillingHoleMutation();
  const deleteHole = useDeleteDrillingHoleMutation();
  const importHoles = useImportDrillingHolesMutation();
  const sync = useShiftReportsSync();
  const pendingByHole = useMemo(() => {
    const counts = new Map<string, number>();
    sync.queue.filter((item) => !item.synced).forEach((item) => counts.set(item.holeId, (counts.get(item.holeId) ?? 0) + 1));
    return counts;
  }, [sync.queue]);

  const [selectedCampaignId, setSelectedCampaignId] = useState<string>(ALL);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<DrillingHoleStatus | typeof ALL>(ALL);
  const [holeForm, setHoleForm] = useState<{ open: boolean; hole: DrillingHole | null }>({ open: false, hole: null });
  const [programForm, setProgramForm] = useState<{ open: boolean; campaign: DrillingCampaign | null }>({ open: false, campaign: null });
  const [detailHoleId, setDetailHoleId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [personnelOpen, setPersonnelOpen] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [statusSavingId, setStatusSavingId] = useState<string | null>(null);

  const campaigns = useMemo(
    () => [...(campaignsQuery.data ?? [])].sort((a, b) => a.name.localeCompare(b.name, "es")),
    [campaignsQuery.data]
  );
  const allHoles = holesQuery.data ?? [];
  const campaignById = useMemo(() => new Map(campaigns.map((campaign) => [campaign.id, campaign])), [campaigns]);
  const selectedCampaign = selectedCampaignId === ALL ? undefined : campaignById.get(selectedCampaignId);

  const scopedHoles = useMemo(
    () => (selectedCampaignId === ALL ? allHoles : allHoles.filter((hole) => hole.campaignId === selectedCampaignId)),
    [allHoles, selectedCampaignId]
  );
  const statusCounts = useMemo(() => countByStatus(scopedHoles), [scopedHoles]);
  const visibleHoles = useMemo(() => {
    const term = search.trim().toLowerCase();
    return scopedHoles
      .filter((hole) => statusFilter === ALL || hole.status === statusFilter)
      .filter((hole) => !term || `${hole.code} ${hole.sector ?? ""} ${hole.target ?? ""}`.toLowerCase().includes(term))
      .sort((a, b) => a.code.localeCompare(b.code, "es", { numeric: true }));
  }, [scopedHoles, statusFilter, search]);

  const detailHole = detailHoleId ? allHoles.find((hole) => hole.id === detailHoleId) ?? null : null;
  const isLoading = campaignsQuery.isLoading || holesQuery.isLoading;
  const loadError = campaignsQuery.error ?? holesQuery.error;

  // ─── Acciones ──────────────────────────────────────────────────────────────
  async function changeStatus(hole: DrillingHole, status: DrillingHoleStatus) {
    setStatusSavingId(hole.id);
    try {
      await updateHole.mutateAsync({ id: hole.id, payload: { status } });
      showSuccess(`${hole.code}: ${HOLE_STATUS_META[status].label}`);
    } catch (error) {
      showError(errorMessage(error, "No se pudo cambiar el estado."));
    } finally {
      setStatusSavingId(null);
    }
  }

  async function saveHole(payload: Record<string, unknown>) {
    try {
      if (holeForm.hole) {
        await updateHole.mutateAsync({ id: holeForm.hole.id, payload });
        showSuccess("Pozo actualizado.");
      } else {
        await createHole.mutateAsync(payload);
        showSuccess("Pozo creado.");
      }
      setHoleForm({ open: false, hole: null });
    } catch (error) {
      showError(errorMessage(error, "No se pudo guardar el pozo."));
    }
  }

  async function saveProgram(payload: Record<string, unknown>) {
    try {
      if (programForm.campaign) {
        await updateCampaign.mutateAsync({ id: programForm.campaign.id, payload });
        showSuccess("Programa actualizado.");
      } else {
        const created = await createCampaign.mutateAsync(payload);
        setSelectedCampaignId(created.id);
        showSuccess("Programa creado.");
      }
      setProgramForm({ open: false, campaign: null });
    } catch (error) {
      showError(errorMessage(error, "No se pudo guardar el programa."));
    }
  }

  async function runImport(request: ImportRequest) {
    let createdCampaignId: string | undefined;
    try {
      let campaignId: string;
      if (request.target.mode === "new") {
        const created = await createCampaign.mutateAsync({
          name: request.target.name,
          code: request.target.code,
          area: request.target.area || null,
          status: "ACTIVE"
        });
        createdCampaignId = created.id;
        campaignId = created.id;
      } else {
        campaignId = request.target.campaignId;
      }
      const result = await importHoles.mutateAsync({ campaignId, holes: request.holes });
      setSelectedCampaignId(campaignId);
      setImportOpen(false);
      showSuccess(`${result.created} pozos importados.`);
    } catch (error) {
      // Si el programa se creó para esta importación y los pozos fallaron, no se deja vacío.
      if (createdCampaignId) await deleteCampaign.mutateAsync(createdCampaignId).catch(() => undefined);
      showError(errorMessage(error, "No se pudo importar el programa."));
    }
  }

  async function confirmDelete() {
    if (!confirm) return;
    try {
      if (confirm.kind === "hole") {
        await deleteHole.mutateAsync(confirm.hole.id);
        if (detailHoleId === confirm.hole.id) setDetailHoleId(null);
        showSuccess(`Pozo ${confirm.hole.code} eliminado.`);
      } else {
        await deleteCampaign.mutateAsync(confirm.campaign.id);
        if (selectedCampaignId === confirm.campaign.id) setSelectedCampaignId(ALL);
        showSuccess("Programa eliminado.");
      }
      setConfirm(null);
    } catch (error) {
      showError(errorMessage(error, "No se pudo eliminar."));
    }
  }

  const openNewHole = () => {
    if (campaigns.length === 0) {
      showError("Primero crea o importa un programa de perforación.");
      return;
    }
    setHoleForm({ open: true, hole: null });
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  const stats = [
    { label: "Pozos", value: scopedHoles.length.toString(), tone: "text-[var(--color-on-surface)]" },
    { label: "Proyectados", value: String(statusCounts.PLANNED ?? 0), tone: "text-slate-500" },
    { label: "En proceso", value: String(statusCounts.DRILLING ?? 0), tone: "text-amber-600" },
    { label: "Terminados", value: String(statusCounts.COMPLETED ?? 0), tone: "text-emerald-600" },
    { label: "Metros programados", value: formatMeters(sumPlanned(scopedHoles)), tone: "text-[var(--color-primary)]" }
  ];

  return (
    <div className={pageShell}>
      <InternalHeader
        eyebrow="Sondajes"
        title="Programas de perforación"
        description="Pozos programados por área, su ubicación, orientación y estado de avance."
      />

      <div className="flex flex-wrap items-center justify-end gap-2">
        <button type="button" className={secondaryButton} onClick={() => setPersonnelOpen(true)}>
          <Users size={16} />
          Personal
        </button>
        <button type="button" className={secondaryButton} onClick={() => setImportOpen(true)}>
          <FileSpreadsheet size={16} />
          Importar Excel
        </button>
        <button type="button" className={secondaryButton} onClick={() => setProgramForm({ open: true, campaign: null })}>
          <FolderPlus size={16} />
          Nuevo programa
        </button>
        <button type="button" className={primaryButton} onClick={openNewHole}>
          <Plus size={16} />
          Nuevo pozo
        </button>
      </div>

      <SyncBar sync={sync} />

      {loadError ? (
        <div className={`${panelClass} p-6 text-sm text-rose-600`}>{errorMessage(loadError, "No se pudieron cargar los sondajes.")}</div>
      ) : null}

      {/* Indicadores */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {stats.map((stat) => (
          <div key={stat.label} className={`${panelClass} px-4 py-3.5 ${stat.label === "Metros programados" ? "col-span-2 md:col-span-1" : ""}`}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">{stat.label}</p>
            <p className={`mt-1 text-2xl font-extrabold tabular-nums ${stat.tone}`}>{isLoading ? "—" : stat.value}</p>
          </div>
        ))}
      </section>

      {/* Programas */}
      <section className="flex gap-3 overflow-x-auto pb-1">
        <ProgramCard
          active={selectedCampaignId === ALL}
          title="Todos los programas"
          subtitle={`${campaigns.length} programa${campaigns.length === 1 ? "" : "s"}`}
          holes={allHoles}
          onSelect={() => setSelectedCampaignId(ALL)}
        />
        {campaigns.map((campaign) => (
          <ProgramCard
            key={campaign.id}
            active={selectedCampaignId === campaign.id}
            title={campaign.name}
            area={campaign.area}
            subtitle={campaign.category === "PRODUCTION" ? "Producción" : "Exploración"}
            holes={allHoles.filter((hole) => hole.campaignId === campaign.id)}
            onSelect={() => setSelectedCampaignId(campaign.id)}
            onEdit={() => setProgramForm({ open: true, campaign })}
            onDelete={() => setConfirm({ kind: "program", campaign })}
          />
        ))}
      </section>

      {/* Pozos */}
      <section className={`${panelClass} overflow-hidden`}>
        <div className="flex flex-col gap-3 border-b border-[var(--color-border-soft)] p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-xs">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-on-surface-variant)]" />
            <input className={`${fieldClass} pl-9 pr-9`} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar pozo" />
            {search ? (
              <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[var(--color-on-surface-variant)]" onClick={() => setSearch("")} aria-label="Limpiar búsqueda">
                <X size={14} />
              </button>
            ) : null}
          </div>
          <div className="flex gap-1.5 overflow-x-auto">
            <FilterChip active={statusFilter === ALL} onClick={() => setStatusFilter(ALL)} label="Todos" count={scopedHoles.length} />
            {DRILLING_HOLE_STATUSES.map((status) => (
              <FilterChip
                key={status}
                active={statusFilter === status}
                onClick={() => setStatusFilter(status)}
                label={HOLE_STATUS_META[status].label}
                count={statusCounts[status] ?? 0}
                dot={HOLE_STATUS_META[status].dot}
              />
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-12 animate-pulse rounded-xl bg-[var(--color-surface-container-high)]" />
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <EmptyState onImport={() => setImportOpen(true)} onCreate={() => setProgramForm({ open: true, campaign: null })} />
        ) : visibleHoles.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-[var(--color-on-surface-variant)]">
            {scopedHoles.length === 0 ? "Este programa aún no tiene pozos." : "No hay pozos con estos filtros."}
          </p>
        ) : (
          <>
            {/* Escritorio */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-[var(--color-surface-container-high)] text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                  <tr>
                    <th className="px-4 py-3">Drillhole</th>
                    {selectedCampaignId === ALL ? <th className="px-4 py-3">Programa</th> : null}
                    <th className="px-4 py-3 text-right">X</th>
                    <th className="px-4 py-3 text-right">Y</th>
                    <th className="px-4 py-3 text-right">Z</th>
                    <th className="px-4 py-3 text-right">Az</th>
                    <th className="px-4 py-3 text-right">Dip</th>
                    <th className="px-4 py-3 text-right">Target</th>
                    <th className="px-4 py-3">Avance</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-soft)]">
                  {visibleHoles.map((hole) => {
                    const campaign = campaignById.get(hole.campaignId);
                    return (
                      <tr key={hole.id} className="transition hover:bg-[var(--color-surface-container-high)]">
                        <td className="px-4 py-3">
                          <button type="button" className="text-left font-bold hover:text-[var(--color-primary)]" onClick={() => setDetailHoleId(hole.id)}>
                            {hole.code}
                          </button>
                          <span className="block text-[11px] text-[var(--color-on-surface-variant)]">{hole.type}</span>
                          <PendingTag count={pendingByHole.get(hole.id) ?? 0} />
                        </td>
                        {selectedCampaignId === ALL ? (
                          <td className="px-4 py-3">
                            <span className="rounded-md bg-[var(--color-surface-container-high)] px-2 py-1 text-xs font-semibold">
                              {campaign?.area || campaign?.code || "—"}
                            </span>
                          </td>
                        ) : null}
                        <td className="px-4 py-3 text-right font-mono tabular-nums">{formatNumber(hole.plannedEast)}</td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums">{formatNumber(hole.plannedNorth)}</td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums">{formatNumber(hole.plannedElevation)}</td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums">{formatNumber(hole.plannedAzimuth, 0)}°</td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums">{formatNumber(hole.plannedDip, 0)}°</td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums">{formatMeters(hole.plannedDepth)}</td>
                        <td className="px-4 py-3">
                          <DepthProgress current={hole.currentDepth ?? 0} planned={hole.plannedDepth ?? null} />
                        </td>
                        <td className="px-4 py-3">
                          <HoleStatusMenu status={hole.status} disabled={statusSavingId === hole.id} onChange={(status) => changeStatus(hole, status)} />
                        </td>
                        <td className="px-4 py-3">
                          <RowActions
                            holeId={hole.id}
                            onView={() => setDetailHoleId(hole.id)}
                            onEdit={() => setHoleForm({ open: true, hole })}
                            onDelete={() => setConfirm({ kind: "hole", hole })}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Móvil */}
            <div className="divide-y divide-[var(--color-border-soft)] md:hidden">
              {visibleHoles.map((hole) => {
                const campaign = campaignById.get(hole.campaignId);
                return (
                  <article key={hole.id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <button type="button" className="text-left" onClick={() => setDetailHoleId(hole.id)}>
                        <span className="block font-bold">{hole.code}</span>
                        <PendingTag count={pendingByHole.get(hole.id) ?? 0} />
                        <span className="text-xs text-[var(--color-on-surface-variant)]">
                          {campaign?.area || campaign?.name} · {formatMeters(hole.plannedDepth)}
                        </span>
                      </button>
                      <HoleStatusMenu status={hole.status} disabled={statusSavingId === hole.id} onChange={(status) => changeStatus(hole, status)} />
                    </div>
                    <dl className="grid grid-cols-3 gap-2 text-xs">
                      {[
                        ["X", formatNumber(hole.plannedEast)],
                        ["Y", formatNumber(hole.plannedNorth)],
                        ["Z", formatNumber(hole.plannedElevation)],
                        ["Az", `${formatNumber(hole.plannedAzimuth, 0)}°`],
                        ["Dip", `${formatNumber(hole.plannedDip, 0)}°`],
                        ["Tipo", hole.type]
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-lg bg-[var(--color-surface-container-high)] px-2 py-1.5">
                          <dt className="text-[10px] font-bold uppercase text-[var(--color-on-surface-variant)]">{label}</dt>
                          <dd className="font-mono font-semibold">{value}</dd>
                        </div>
                      ))}
                    </dl>
                    <DepthProgress current={hole.currentDepth ?? 0} planned={hole.plannedDepth ?? null} />
                    <RowActions
                      holeId={hole.id}
                      onView={() => setDetailHoleId(hole.id)}
                      onEdit={() => setHoleForm({ open: true, hole })}
                      onDelete={() => setConfirm({ kind: "hole", hole })}
                    />
                  </article>
                );
              })}
            </div>
          </>
        )}
        {!isLoading && visibleHoles.length > 0 ? (
          <p className="border-t border-[var(--color-border-soft)] px-4 py-3 text-xs text-[var(--color-on-surface-variant)]">
            {visibleHoles.length} de {scopedHoles.length} pozos{selectedCampaign ? ` · ${selectedCampaign.name}` : ""}
          </p>
        ) : null}
      </section>

      {/* Próximamente */}
      <section className={`${panelClass} p-5`}>
        <div className="flex items-center gap-2">
          <Drill size={16} className="text-[var(--color-primary)]" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Próximamente en Sondajes</h3>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {UPCOMING_FEATURES.map(({ icon: Icon, title, description }) => (
            <div key={title} className="flex gap-3 rounded-xl border border-dashed border-[var(--color-border-soft)] p-3.5">
              <Icon size={18} className="mt-0.5 shrink-0 text-[var(--color-on-surface-variant)]" />
              <div>
                <h4 className="text-sm font-bold">{title}</h4>
                <p className="mt-0.5 text-xs text-[var(--color-on-surface-variant)]">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <HoleFormModal
        open={holeForm.open}
        hole={holeForm.hole}
        defaultCampaignId={selectedCampaignId === ALL ? campaigns[0]?.id : selectedCampaignId}
        campaigns={campaigns}
        saving={createHole.isPending || updateHole.isPending}
        onClose={() => setHoleForm({ open: false, hole: null })}
        onSubmit={saveHole}
      />
      <ProgramFormModal
        open={programForm.open}
        campaign={programForm.campaign}
        saving={createCampaign.isPending || updateCampaign.isPending}
        onClose={() => setProgramForm({ open: false, campaign: null })}
        onSubmit={saveProgram}
      />
      <ImportProgramModal
        open={importOpen}
        campaigns={campaigns}
        saving={createCampaign.isPending || importHoles.isPending}
        onClose={() => setImportOpen(false)}
        onImport={runImport}
      />
      <PersonnelModal open={personnelOpen} onClose={() => setPersonnelOpen(false)} />
      <HoleDetailModal
        hole={detailHole}
        campaign={detailHole ? campaignById.get(detailHole.campaignId) : undefined}
        statusSaving={statusSavingId === detailHole?.id}
        onClose={() => setDetailHoleId(null)}
        onEdit={(hole) => {
          setDetailHoleId(null);
          setHoleForm({ open: true, hole });
        }}
        onStatusChange={changeStatus}
      />
      <Modal
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        size="md"
        icon={<Trash2 size={20} />}
        title={confirm?.kind === "program" ? "Eliminar programa" : "Eliminar pozo"}
        footer={
          <>
            <button type="button" className={secondaryButton} onClick={() => setConfirm(null)}>
              Cancelar
            </button>
            <button type="button" className={dangerButton} onClick={confirmDelete} disabled={deleteHole.isPending || deleteCampaign.isPending}>
              <Trash2 size={15} />
              Eliminar
            </button>
          </>
        }
      >
        <p className="text-sm">
          {confirm?.kind === "program"
            ? `¿Eliminar el programa "${confirm.campaign.name}"? Solo se puede si no tiene pozos.`
            : confirm?.kind === "hole"
              ? `¿Eliminar el pozo ${confirm.hole.code}? Solo se puede si aún no tiene partes, muestras ni otros registros.`
              : null}
        </p>
      </Modal>
    </div>
  );
}

function ProgramCard({
  active,
  title,
  area,
  subtitle,
  holes,
  onSelect,
  onEdit,
  onDelete
}: {
  active: boolean;
  title: string;
  area?: string | null;
  subtitle: string;
  holes: DrillingHole[];
  onSelect: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const counts = countByStatus(holes);
  const done = counts.COMPLETED ?? 0;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => (event.key === "Enter" || event.key === " ") && onSelect()}
      className={`group relative w-64 shrink-0 cursor-pointer rounded-2xl border p-4 text-left transition ${
        active
          ? "border-[var(--color-primary)] bg-[var(--color-surface-container-high)] shadow-sm ring-1 ring-[var(--color-primary)]"
          : "border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] hover:border-[var(--color-primary)]"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface-container-highest)] text-[var(--color-primary)]">
          <FolderKanban size={17} />
        </span>
        {area ? (
          <span className="rounded-full bg-[var(--color-primary)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--color-on-primary)]">
            {area}
          </span>
        ) : null}
      </div>
      <h3 className="mt-3 line-clamp-2 text-sm font-bold leading-snug">{title}</h3>
      <p className="mt-0.5 text-xs text-[var(--color-on-surface-variant)]">
        {subtitle} · {holes.length} pozo{holes.length === 1 ? "" : "s"} · {formatMeters(sumPlanned(holes))}
      </p>
      <div className="mt-3">
        <StatusProgressBar counts={counts} total={holes.length} />
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--color-on-surface-variant)]">
          {DRILLING_HOLE_STATUSES.filter((status) => counts[status]).map((status) => (
            <span key={status} className="inline-flex items-center gap-1">
              <span className={`h-1.5 w-1.5 rounded-full ${HOLE_STATUS_META[status].dot}`} />
              {counts[status]} {HOLE_STATUS_META[status].label.toLowerCase()}
            </span>
          ))}
          {holes.length > 0 ? <span className="ml-auto font-semibold">{Math.round((done / holes.length) * 100)}%</span> : null}
        </div>
      </div>
      {onEdit || onDelete ? (
        <div className="mt-3 flex gap-1 border-t border-[var(--color-border-soft)] pt-2">
          {onEdit ? (
            <button
              type="button"
              className={`${iconButton} h-8 w-8`}
              title="Editar programa"
              onClick={(event) => {
                event.stopPropagation();
                onEdit();
              }}
            >
              <Pencil size={14} />
            </button>
          ) : null}
          {onDelete ? (
            <button
              type="button"
              className={`${iconButton} h-8 w-8 hover:text-rose-600`}
              title="Eliminar programa"
              onClick={(event) => {
                event.stopPropagation();
                onDelete();
              }}
            >
              <Trash2 size={14} />
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function FilterChip({ active, label, count, dot, onClick }: { active: boolean; label: string; count: number; dot?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
        active
          ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-on-primary)]"
          : "border-[var(--color-border-soft)] text-[var(--color-on-surface-variant)] hover:border-[var(--color-primary)]"
      }`}
    >
      {dot ? <span className={`h-1.5 w-1.5 rounded-full ${dot}`} /> : null}
      {label}
      <span className={`tabular-nums ${active ? "opacity-80" : "opacity-60"}`}>{count}</span>
    </button>
  );
}

function RowActions({
  holeId,
  onView,
  onEdit,
  onDelete
}: {
  holeId: string;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Cerrar al hacer clic fuera o con Escape
  useEffect(() => {
    if (!open) return;
    function handleClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const item = (icon: React.ReactNode, label: string, onClick: () => void, danger = false) => (
    <button
      type="button"
      className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition hover:bg-[var(--color-surface-container-high)] ${
        danger ? "text-rose-500 hover:text-rose-600" : "text-[var(--color-on-surface)] hover:text-[var(--color-primary)]"
      }`}
      onClick={() => { onClick(); setOpen(false); }}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div ref={ref} className="relative flex justify-end">
      <button
        type="button"
        className={iconButton}
        title="Acciones"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <MoreVertical size={16} />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 w-48 overflow-hidden rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container)] py-1 shadow-xl"
        >
          <Link
            to={`/sondajes/pozos/${holeId}`}
            className="flex items-center gap-2.5 px-3 py-2 text-sm transition hover:bg-[var(--color-surface-container-high)] hover:text-[var(--color-primary)]"
            onClick={() => setOpen(false)}
          >
            <ClipboardList size={15} />
            Partes diarios
          </Link>
          {item(<Eye size={15} />, "Ver detalle", onView)}
          {item(<Pencil size={15} />, "Editar pozo", onEdit)}
          <div className="my-1 border-t border-[var(--color-border-soft)]" />
          {item(<Trash2 size={15} />, "Eliminar pozo", onDelete, true)}
        </div>
      ) : null}
    </div>
  );
}

function DepthProgress({ current, planned }: { current: number; planned: number | null }) {
  const percent = planned ? Math.min(100, (current / planned) * 100) : 0;
  return (
    <div className="min-w-[110px]">
      <div className="flex items-baseline justify-between gap-2 font-mono text-[11px] tabular-nums">
        <span className="font-semibold">{formatMeters(current)}</span>
        <span className="text-[var(--color-on-surface-variant)]">{Math.round(percent)}%</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-container-high)]">
        <div className="h-full rounded-full bg-[var(--color-primary)]" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function PendingTag({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-bold text-sky-600">
      <CloudUpload size={11} />
      {count} parte{count === 1 ? "" : "s"} sin enviar
    </span>
  );
}

function EmptyState({ onImport, onCreate }: { onImport: () => void; onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 px-6 py-14 text-center">
      <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-primary)] text-[var(--color-on-primary)]">
        <Drill size={28} />
      </span>
      <div>
        <h3 className="text-lg font-extrabold">Aún no hay programas de perforación</h3>
        <p className="mt-1 max-w-md text-sm text-[var(--color-on-surface-variant)]">
          Importa el Excel del programa DDH (Mosa, Lipeña…) o crea un programa y agrega sus pozos uno a uno.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" className={primaryButton} onClick={onImport}>
          <FileSpreadsheet size={16} />
          Importar Excel
        </button>
        <button type="button" className={secondaryButton} onClick={onCreate}>
          <FolderPlus size={16} />
          Crear programa
        </button>
      </div>
    </div>
  );
}

