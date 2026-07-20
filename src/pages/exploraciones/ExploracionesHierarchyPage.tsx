import { FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Layers3, MapPinned, Pencil, RefreshCw, Search, Trash2, X } from "lucide-react";
import {
  useCreateInteriorAreaMutation,
  useCreateInteriorLaborMutation,
  useCreateInteriorLevelMutation,
  useCreateSurfaceAreaMutation,
  useCreateSurfaceLaborMutation,
  useCreateSurfaceLevelMutation,
  useDeleteInteriorAreaMutation,
  useDeleteInteriorLaborMutation,
  useDeleteInteriorLevelMutation,
  useDeleteSurfaceAreaMutation,
  useDeleteSurfaceLaborMutation,
  useDeleteSurfaceLevelMutation,
  useInteriorAreasQuery,
  useInteriorHierarchyQuery,
  useOfflineProposalCatalogsQuery,
  useSurfaceAreasQuery,
  useSurfaceHierarchyQuery,
  useUpdateInteriorAreaMutation,
  useUpdateInteriorLaborMutation,
  useUpdateInteriorLevelMutation,
  useUpdateSurfaceAreaMutation,
  useUpdateSurfaceLaborMutation,
  useUpdateSurfaceLevelMutation
} from "@/features/exploraciones/hooks/useProposalSamples";
import type {
  InteriorHierarchyArea,
  SurfaceHierarchyArea
} from "@/features/exploraciones/model/proposalSamples.schema";
import type { OfflineProposalCatalog } from "@/features/exploraciones/db/exploracionesDb";
import { cacheProposalCatalogs, pruneMissingProposalCatalogs } from "@/features/exploraciones/db/exploracionesDb";
import { InternalHeader } from "@/shared/ui/InternalHeader";
import { useToast } from "@/shared/ui/toast/ToastProvider";

const pageShell = "mx-auto w-full max-w-7xl space-y-5 px-4 pb-8 sm:px-6 lg:px-8";
const panelClass = "rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)]";
const fieldClass =
  "w-full rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] px-3 py-2.5 text-sm text-[var(--color-on-surface)] outline-none transition focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]";
const secondaryButton =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-outline-variant)] px-3 py-2 text-sm font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)] disabled:cursor-not-allowed disabled:opacity-50";
const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60";

type ViewMode = "interior" | "surface";
type EditTarget =
  | { type: "area"; id: string }
  | { type: "level"; id: string }
  | { type: "labor"; id: string }
  | null;
type StructureForm = {
  areaName: string;
  areaAbbreviation: string;
  areaDescription: string;
  levelAreaId: string;
  levelName: string;
  levelAbbreviation: string;
  levelElevation: string;
  levelDescription: string;
  laborLevelId: string;
  laborName: string;
  laborAbbreviation: string;
  laborDescription: string;
};

const emptyStructureForm: StructureForm = {
  areaName: "",
  areaAbbreviation: "",
  areaDescription: "",
  levelAreaId: "",
  levelName: "",
  levelAbbreviation: "",
  levelElevation: "",
  levelDescription: "",
  laborLevelId: "",
  laborName: "",
  laborAbbreviation: "",
  laborDescription: ""
};

export function ExploracionesHierarchyPage() {
  const { showError, showSuccess } = useToast();
  const [viewMode, setViewMode] = useState<ViewMode>("interior");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<StructureForm>(emptyStructureForm);
  const [editTarget, setEditTarget] = useState<EditTarget>(null);
  const interior = useInteriorHierarchyQuery();
  const surface = useSurfaceHierarchyQuery();
  const createInteriorArea = useCreateInteriorAreaMutation();
  const createInteriorLevel = useCreateInteriorLevelMutation();
  const createInteriorLabor = useCreateInteriorLaborMutation();
  const createSurfaceArea = useCreateSurfaceAreaMutation();
  const createSurfaceLevel = useCreateSurfaceLevelMutation();
  const createSurfaceLabor = useCreateSurfaceLaborMutation();
  const updateInteriorArea = useUpdateInteriorAreaMutation();
  const updateInteriorLevel = useUpdateInteriorLevelMutation();
  const updateInteriorLabor = useUpdateInteriorLaborMutation();
  const updateSurfaceArea = useUpdateSurfaceAreaMutation();
  const updateSurfaceLevel = useUpdateSurfaceLevelMutation();
  const updateSurfaceLabor = useUpdateSurfaceLaborMutation();
  const deleteInteriorArea = useDeleteInteriorAreaMutation();
  const deleteInteriorLevel = useDeleteInteriorLevelMutation();
  const deleteInteriorLabor = useDeleteInteriorLaborMutation();
  const deleteSurfaceArea = useDeleteSurfaceAreaMutation();
  const deleteSurfaceLevel = useDeleteSurfaceLevelMutation();
  const deleteSurfaceLabor = useDeleteSurfaceLaborMutation();
  const interiorAreas = useInteriorAreasQuery();
  const surfaceAreas = useSurfaceAreasQuery();
  const offlineCatalogs = useOfflineProposalCatalogsQuery();
  const activeQuery = viewMode === "interior" ? interior : surface;
  const activeAreasQuery = viewMode === "interior" ? interiorAreas : surfaceAreas;
  const hasRemoteStructure = Boolean(activeQuery.data || activeAreasQuery.data);
  const localHierarchy = useMemo(
    () => buildLocalHierarchy(viewMode, offlineCatalogs.data ?? []),
    [offlineCatalogs.data, viewMode]
  );
  const rawData = useMemo(
    () =>
      mergeHierarchyWithAreas(
        mergeHierarchyTrees(activeQuery.data ?? [], hasRemoteStructure ? [] : localHierarchy),
        activeAreasQuery.data ?? []
      ),
    [activeQuery.data, activeAreasQuery.data, hasRemoteStructure, localHierarchy]
  );
  const activeData = useMemo(
    () => filterHierarchyData(rawData, search, viewMode),
    [rawData, search, viewMode]
  );
  const areaOptions = rawData.map((area) => ({ id: area.id, label: formatHierarchyLabel(area.name, area.abbreviation) }));
  const levelOptions = (rawData as Array<InteriorHierarchyArea | SurfaceHierarchyArea>)
    .flatMap((area) =>
      (area.levels ?? []).map((level) => ({
        id: level.id,
        label: `${formatHierarchyLabel(area.name, area.abbreviation)} / ${formatHierarchyLabel(level.name, level.abbreviation)}`
      }))
    );
  const isSaving =
    createInteriorArea.isPending ||
    createInteriorLevel.isPending ||
    createInteriorLabor.isPending ||
    createSurfaceArea.isPending ||
    createSurfaceLevel.isPending ||
    createSurfaceLabor.isPending ||
    updateInteriorArea.isPending ||
    updateInteriorLevel.isPending ||
    updateInteriorLabor.isPending ||
    updateSurfaceArea.isPending ||
    updateSurfaceLevel.isPending ||
    updateSurfaceLabor.isPending ||
    deleteInteriorArea.isPending ||
    deleteInteriorLevel.isPending ||
    deleteInteriorLabor.isPending ||
    deleteSurfaceArea.isPending ||
    deleteSurfaceLevel.isPending ||
    deleteSurfaceLabor.isPending;

  useEffect(() => {
    const sourceData = activeQuery.data ?? [];
    const areaData = activeAreasQuery.data ?? [];
    const items = buildHierarchyCacheItems(viewMode, sourceData, areaData);
    if (items.length > 0) void cacheProposalCatalogs(items);

    if (activeQuery.isSuccess) {
      const levelIds = sourceData.flatMap((area) => (area.levels ?? []).map((level) => level.id));
      const laborIds = sourceData.flatMap((area) =>
        (area.levels ?? []).flatMap((level) => (level.labors ?? []).map((labor) => labor.id))
      );
      void pruneMissingProposalCatalogs(viewMode, "level", levelIds);
      void pruneMissingProposalCatalogs(viewMode, "labor", laborIds);
    }
    if (activeQuery.isSuccess && activeAreasQuery.isSuccess) {
      const areaIds = Array.from(
        new Set([...sourceData.map((area) => area.id), ...areaData.map((area) => area.id)])
      );
      void pruneMissingProposalCatalogs(viewMode, "area", areaIds);
    }
  }, [activeAreasQuery.data, activeAreasQuery.isSuccess, activeQuery.data, activeQuery.isSuccess, viewMode]);

  const setField = (field: keyof StructureForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  async function refreshHierarchy() {
    await Promise.all([activeQuery.refetch(), activeAreasQuery.refetch()]);
  }

  async function submitArea(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = form.areaName.trim();
    const abbreviation = form.areaAbbreviation.trim().toUpperCase();
    if (!name || !abbreviation) {
      showError("El área necesita nombre y abreviatura.");
      return;
    }

    try {
      const payload = {
        name,
        abbreviation,
        description: form.areaDescription.trim() || undefined
      };
      if (viewMode === "interior") {
        if (editTarget?.type === "area") {
          await updateInteriorArea.mutateAsync({ id: editTarget.id, payload });
        } else {
          await createInteriorArea.mutateAsync(payload);
        }
      } else {
        if (editTarget?.type === "area") {
          await updateSurfaceArea.mutateAsync({ id: editTarget.id, payload });
        } else {
          await createSurfaceArea.mutateAsync(payload);
        }
      }
      setEditTarget(null);
      setForm((current) => ({ ...current, areaName: "", areaAbbreviation: "", areaDescription: "" }));
      await refreshHierarchy();
      showSuccess(editTarget?.type === "area" ? "Área actualizada." : "Área creada.");
    } catch (error) {
      showError(error instanceof Error ? error.message : "No se pudo crear el área.");
    }
  }

  async function submitLevel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = form.levelName.trim();
    const abbreviation = form.levelAbbreviation.trim().toUpperCase();
    if (!form.levelAreaId || !name || !abbreviation) {
      showError("Selecciona un área e indica nombre y abreviatura del nivel.");
      return;
    }

    try {
      const elevation = form.levelElevation.trim() ? Number(form.levelElevation) : undefined;
      if (form.levelElevation.trim() && Number.isNaN(elevation)) {
        throw new Error("La elevación debe ser numérica.");
      }
      const common = {
        name,
        abbreviation,
        elevation,
        description: form.levelDescription.trim() || undefined
      };
      if (viewMode === "interior") {
        if (editTarget?.type === "level") {
          await updateInteriorLevel.mutateAsync({ id: editTarget.id, payload: { ...common, interiorAreaId: form.levelAreaId } });
        } else {
          await createInteriorLevel.mutateAsync({ ...common, interiorAreaId: form.levelAreaId });
        }
      } else {
        if (editTarget?.type === "level") {
          await updateSurfaceLevel.mutateAsync({ id: editTarget.id, payload: { ...common, surfaceAreaId: form.levelAreaId } });
        } else {
          await createSurfaceLevel.mutateAsync({ ...common, surfaceAreaId: form.levelAreaId });
        }
      }
      setEditTarget(null);
      setForm((current) => ({
        ...current,
        levelName: "",
        levelAbbreviation: "",
        levelElevation: "",
        levelDescription: ""
      }));
      await refreshHierarchy();
      showSuccess(editTarget?.type === "level" ? "Nivel actualizado." : "Nivel creado.");
    } catch (error) {
      showError(error instanceof Error ? error.message : "No se pudo crear el nivel.");
    }
  }

  async function submitLabor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = form.laborName.trim();
    const abbreviation = form.laborAbbreviation.trim().toUpperCase();
    if (!form.laborLevelId || !name || !abbreviation) {
      showError("Selecciona un nivel e indica nombre y abreviatura de la labor.");
      return;
    }

    try {
      const common = {
        name,
        abbreviation,
        description: form.laborDescription.trim() || undefined
      };
      if (viewMode === "interior") {
        if (editTarget?.type === "labor") {
          await updateInteriorLabor.mutateAsync({ id: editTarget.id, payload: { ...common, interiorLevelId: form.laborLevelId } });
        } else {
          await createInteriorLabor.mutateAsync({ ...common, interiorLevelId: form.laborLevelId });
        }
      } else {
        if (editTarget?.type === "labor") {
          await updateSurfaceLabor.mutateAsync({ id: editTarget.id, payload: { ...common, surfaceLevelId: form.laborLevelId } });
        } else {
          await createSurfaceLabor.mutateAsync({ ...common, surfaceLevelId: form.laborLevelId });
        }
      }
      setEditTarget(null);
      setForm((current) => ({
        ...current,
        laborName: "",
        laborAbbreviation: "",
        laborDescription: ""
      }));
      await refreshHierarchy();
      showSuccess(editTarget?.type === "labor" ? "Labor actualizada." : "Labor creada.");
    } catch (error) {
      showError(error instanceof Error ? error.message : "No se pudo crear la labor.");
    }
  }

  function cancelEdit() {
    setEditTarget(null);
    setForm(emptyStructureForm);
  }

  function editArea(area: InteriorHierarchyArea | SurfaceHierarchyArea) {
    setEditTarget({ type: "area", id: area.id });
    setForm((current) => ({
      ...current,
      areaName: area.name,
      areaAbbreviation: area.abbreviation ?? "",
      areaDescription: area.description ?? ""
    }));
  }

  function editLevel(area: InteriorHierarchyArea | SurfaceHierarchyArea, level: NonNullable<InteriorHierarchyArea["levels"][number]>) {
    setEditTarget({ type: "level", id: level.id });
    setForm((current) => ({
      ...current,
      levelAreaId: area.id,
      levelName: level.name,
      levelAbbreviation: level.abbreviation ?? "",
      levelElevation: level.elevation == null ? "" : String(level.elevation),
      levelDescription: level.description ?? ""
    }));
  }

  function editLabor(level: NonNullable<InteriorHierarchyArea["levels"][number]>, labor: NonNullable<InteriorHierarchyArea["levels"][number]["labors"][number]>) {
    setEditTarget({ type: "labor", id: labor.id });
    setForm((current) => ({
      ...current,
      laborLevelId: level.id,
      laborName: labor.name,
      laborAbbreviation: labor.abbreviation ?? "",
      laborDescription: labor.description ?? ""
    }));
  }

  async function deleteNode(target: { type: "area" | "level" | "labor"; id: string; label: string }) {
    if (!window.confirm(`¿Eliminar ${target.label}?`)) return;
    try {
      if (target.type === "area") {
        if (viewMode === "interior") await deleteInteriorArea.mutateAsync(target.id);
        else await deleteSurfaceArea.mutateAsync(target.id);
      } else if (target.type === "level") {
        if (viewMode === "interior") await deleteInteriorLevel.mutateAsync(target.id);
        else await deleteSurfaceLevel.mutateAsync(target.id);
      } else {
        if (viewMode === "interior") await deleteInteriorLabor.mutateAsync(target.id);
        else await deleteSurfaceLabor.mutateAsync(target.id);
      }
      await refreshHierarchy();
      showSuccess("Registro eliminado.");
    } catch (error) {
      showError(error instanceof Error ? error.message : "No se pudo eliminar. Puede tener dependientes.");
    }
  }

  return (
    <div className={pageShell}>
      <InternalHeader
        eyebrow="Exploraciones"
        title="Estructura de codificaciones"
        description="Define cómo se arman las áreas, niveles y labores que luego formarán el código de cada muestra."
      />

      <section className={`${panelClass} p-4`}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row">
            <ModeButton active={viewMode === "interior"} onClick={() => setViewMode("interior")} icon={Layers3}>
              Interior Mina
            </ModeButton>
            <ModeButton active={viewMode === "surface"} onClick={() => setViewMode("surface")} icon={MapPinned}>
              Superficie
            </ModeButton>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" className={secondaryButton} onClick={() => void activeQuery.refetch()}>
              <RefreshCw size={15} className={activeQuery.isFetching ? "animate-spin" : ""} />
              Actualizar
            </button>
            <Link to="/exploraciones" className={secondaryButton}>
              Volver
            </Link>
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] p-4">
          <p className="text-sm font-bold">Cómo se arma el código</p>
          <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">
            Crea primero el área, luego sus niveles y finalmente las labores. La tabla inferior mostrará el resultado como AREA/NIVEL/LABOR.
          </p>
        </div>
      </section>

      <section className={`${panelClass} p-4`}>
        <div className="grid gap-4 xl:grid-cols-3">
          <StructureFormCard
            title={editTarget?.type === "area" ? "Editar área" : "1. Crear área"}
            onSubmit={submitArea}
            disabled={isSaving}
            editing={editTarget?.type === "area"}
            onCancel={cancelEdit}
          >
            <TextField label="Nombre del área" value={form.areaName} onChange={(value) => setField("areaName", value)} placeholder="Ej. LIPEÑA" />
            <TextField label="Abreviatura" value={form.areaAbbreviation} onChange={(value) => setField("areaAbbreviation", value.toUpperCase())} placeholder="Ej. LIP" />
            <TextField label="Descripción" value={form.areaDescription} onChange={(value) => setField("areaDescription", value)} placeholder="Opcional" />
          </StructureFormCard>

          <StructureFormCard
            title={editTarget?.type === "level" ? "Editar nivel" : "2. Crear nivel"}
            onSubmit={submitLevel}
            disabled={isSaving}
            editing={editTarget?.type === "level"}
            onCancel={cancelEdit}
          >
            <SelectField label="Área padre" value={form.levelAreaId} options={areaOptions} onChange={(value) => setField("levelAreaId", value)} placeholder="Selecciona área" />
            <TextField label="Nombre del nivel" value={form.levelName} onChange={(value) => setField("levelName", value)} placeholder="Ej. NIVEL 40" />
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField label="Abreviatura" value={form.levelAbbreviation} onChange={(value) => setField("levelAbbreviation", value.toUpperCase())} placeholder="Ej. NIV40" />
              <TextField label="Elevación" type="number" value={form.levelElevation} onChange={(value) => setField("levelElevation", value)} placeholder="Opcional" />
            </div>
            <TextField label="Descripción" value={form.levelDescription} onChange={(value) => setField("levelDescription", value)} placeholder="Opcional" />
          </StructureFormCard>

          <StructureFormCard
            title={editTarget?.type === "labor" ? "Editar labor" : "3. Crear labor"}
            onSubmit={submitLabor}
            disabled={isSaving}
            editing={editTarget?.type === "labor"}
            onCancel={cancelEdit}
          >
            <SelectField label="Nivel padre" value={form.laborLevelId} options={levelOptions} onChange={(value) => setField("laborLevelId", value)} placeholder="Selecciona nivel" />
            <TextField label="Nombre de la labor" value={form.laborName} onChange={(value) => setField("laborName", value)} placeholder="Ej. RECORTE_SUR_1" />
            <TextField label="Abreviatura" value={form.laborAbbreviation} onChange={(value) => setField("laborAbbreviation", value.toUpperCase())} placeholder="Ej. RS1" />
            <TextField label="Descripción" value={form.laborDescription} onChange={(value) => setField("laborDescription", value)} placeholder="Opcional" />
          </StructureFormCard>
        </div>
      </section>

      <section className={`${panelClass} overflow-hidden`}>
        <div className="grid gap-3 border-b border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] px-4 py-3 lg:grid-cols-[1fr_20rem] lg:items-center">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
              {viewMode === "interior" ? "Árbol de Interior Mina" : "Áreas de Superficie"}
            </h2>
            <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">
              Mostrando {activeData.length} de {rawData.length} área{rawData.length === 1 ? "" : "s"}.
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

        {activeQuery.isLoading && activeAreasQuery.isLoading ? (
          <p className="p-5 text-sm text-[var(--color-on-surface-variant)]">Cargando jerarquía...</p>
        ) : null}
        {activeQuery.isError && activeAreasQuery.isError ? (
          <p className="p-5 text-sm font-semibold text-[var(--color-error)]">
            No se pudo cargar la jerarquía. Revisa conexión o permisos de la API.
          </p>
        ) : null}
        {!activeQuery.isLoading && !activeAreasQuery.isLoading && activeData.length === 0 ? (
          <p className="p-5 text-sm text-[var(--color-on-surface-variant)]">
            La API respondió sin áreas para mostrar.
          </p>
        ) : null}

        <div className="p-3 sm:p-4">
          {viewMode === "interior" ? (
            <InteriorCodificationTable
              areas={activeData as InteriorHierarchyArea[]}
              onEditArea={editArea}
              onEditLevel={editLevel}
              onEditLabor={editLabor}
              onDelete={deleteNode}
            />
          ) : (
            <SurfaceCodificationTable
              areas={activeData as SurfaceHierarchyArea[]}
              onEditArea={editArea}
              onEditLevel={editLevel}
              onEditLabor={editLabor}
              onDelete={deleteNode}
            />
          )}
        </div>
      </section>
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

function InteriorCodificationTable({
  areas,
  onEditArea,
  onEditLevel,
  onEditLabor,
  onDelete
}: {
  areas: InteriorHierarchyArea[];
  onEditArea: (area: InteriorHierarchyArea) => void;
  onEditLevel: (area: InteriorHierarchyArea, level: InteriorHierarchyArea["levels"][number]) => void;
  onEditLabor: (level: InteriorHierarchyArea["levels"][number], labor: InteriorHierarchyArea["levels"][number]["labors"][number]) => void;
  onDelete: (target: { type: "area" | "level" | "labor"; id: string; label: string }) => void;
}) {
  const rows = buildInteriorCodificationRows(areas);

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--color-border-soft)]">
      <table className="w-full min-w-[760px] border-collapse bg-[var(--color-surface-container-low)] text-left text-sm">
        <thead>
          <tr>
            <th colSpan={5} className="border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2 text-base font-black uppercase">
              Muestras codificaciones
            </th>
          </tr>
          <tr className="bg-[var(--color-surface-container-high)] text-xs font-black uppercase tracking-wider text-[var(--color-on-surface-variant)]">
            <th className="w-[24%] border border-[var(--color-border-soft)] px-3 py-2">Áreas</th>
            <th className="w-[27%] border border-[var(--color-border-soft)] px-3 py-2">Nivel</th>
            <th className="w-[32%] border border-[var(--color-border-soft)] px-3 py-2">Labor</th>
            <th className="w-[17%] border border-[var(--color-border-soft)] px-3 py-2">Abreviatura</th>
            <th className="w-[10%] border border-[var(--color-border-soft)] px-3 py-2">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.area.id}-${row.level?.id ?? "none"}-${row.labor?.id ?? "none"}-${index}`}>
              {row.showArea ? (
                <td
                  rowSpan={row.areaRowSpan}
                  className="border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] px-3 py-2 align-middle text-center font-black"
                >
                  {formatHierarchyLabel(row.area.name, row.area.abbreviation)}
                  <NodeActions onEdit={() => onEditArea(row.area)} onDelete={() => onDelete({ type: "area", id: row.area.id, label: formatHierarchyLabel(row.area.name, row.area.abbreviation) })} />
                </td>
              ) : null}
              {row.showLevel ? (
                <td
                  rowSpan={row.levelRowSpan}
                  className="border border-[var(--color-border-soft)] px-3 py-2 align-middle font-bold"
                >
                  {row.level ? (
                    <>
                      {formatHierarchyLabel(row.level.name, row.level.abbreviation)}
                      <NodeActions onEdit={() => onEditLevel(row.area, row.level!)} onDelete={() => onDelete({ type: "level", id: row.level!.id, label: formatHierarchyLabel(row.level!.name, row.level!.abbreviation) })} />
                    </>
                  ) : "-"}
                </td>
              ) : null}
              <td className="border border-[var(--color-border-soft)] px-3 py-2 font-semibold">
                {row.labor ? (
                  <>
                    {formatHierarchyLabel(row.labor.name, row.labor.abbreviation)}
                    {row.level ? <NodeActions onEdit={() => onEditLabor(row.level!, row.labor!)} onDelete={() => onDelete({ type: "labor", id: row.labor!.id, label: formatHierarchyLabel(row.labor!.name, row.labor!.abbreviation) })} /> : null}
                  </>
                ) : "-"}
              </td>
              <td className="border border-[var(--color-border-soft)] px-3 py-2 font-mono font-bold">
                {row.code || "-"}
              </td>
              <td className="border border-[var(--color-border-soft)] px-3 py-2 text-xs text-[var(--color-on-surface-variant)]">-</td>
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr>
              <td colSpan={5} className="border border-[var(--color-border-soft)] px-3 py-6 text-center text-[var(--color-on-surface-variant)]">
                No hay codificaciones para mostrar.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function SurfaceCodificationTable({
  areas,
  onEditArea,
  onEditLevel,
  onEditLabor,
  onDelete
}: {
  areas: SurfaceHierarchyArea[];
  onEditArea: (area: SurfaceHierarchyArea) => void;
  onEditLevel: (area: SurfaceHierarchyArea, level: SurfaceHierarchyArea["levels"][number]) => void;
  onEditLabor: (level: SurfaceHierarchyArea["levels"][number], labor: SurfaceHierarchyArea["levels"][number]["labors"][number]) => void;
  onDelete: (target: { type: "area" | "level" | "labor"; id: string; label: string }) => void;
}) {
  const rows = buildSurfaceCodificationRows(areas);

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--color-border-soft)]">
      <table className="w-full min-w-[760px] border-collapse bg-[var(--color-surface-container-low)] text-left text-sm">
        <thead>
          <tr>
            <th colSpan={5} className="border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2 text-base font-black uppercase">
              Muestras codificaciones
            </th>
          </tr>
          <tr className="bg-[var(--color-surface-container-high)] text-xs font-black uppercase tracking-wider text-[var(--color-on-surface-variant)]">
            <th className="w-[24%] border border-[var(--color-border-soft)] px-3 py-2">Áreas</th>
            <th className="w-[27%] border border-[var(--color-border-soft)] px-3 py-2">Nivel</th>
            <th className="w-[32%] border border-[var(--color-border-soft)] px-3 py-2">Labor</th>
            <th className="w-[17%] border border-[var(--color-border-soft)] px-3 py-2">Abreviatura</th>
            <th className="w-[10%] border border-[var(--color-border-soft)] px-3 py-2">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.area.id}-${row.level?.id ?? "none"}-${row.labor?.id ?? "none"}-${index}`}>
              {row.showArea ? (
                <td
                  rowSpan={row.areaRowSpan}
                  className="border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] px-3 py-2 align-middle text-center font-black"
                >
                  {formatHierarchyLabel(row.area.name, row.area.abbreviation)}
                  <NodeActions onEdit={() => onEditArea(row.area)} onDelete={() => onDelete({ type: "area", id: row.area.id, label: formatHierarchyLabel(row.area.name, row.area.abbreviation) })} />
                </td>
              ) : null}
              {row.showLevel ? (
                <td
                  rowSpan={row.levelRowSpan}
                  className="border border-[var(--color-border-soft)] px-3 py-2 align-middle font-bold"
                >
                  {row.level ? (
                    <>
                      {formatHierarchyLabel(row.level.name, row.level.abbreviation)}
                      <NodeActions onEdit={() => onEditLevel(row.area, row.level!)} onDelete={() => onDelete({ type: "level", id: row.level!.id, label: formatHierarchyLabel(row.level!.name, row.level!.abbreviation) })} />
                    </>
                  ) : "-"}
                </td>
              ) : null}
              <td className="border border-[var(--color-border-soft)] px-3 py-2 font-semibold">
                {row.labor ? (
                  <>
                    {formatHierarchyLabel(row.labor.name, row.labor.abbreviation)}
                    {row.level ? <NodeActions onEdit={() => onEditLabor(row.level!, row.labor!)} onDelete={() => onDelete({ type: "labor", id: row.labor!.id, label: formatHierarchyLabel(row.labor!.name, row.labor!.abbreviation) })} /> : null}
                  </>
                ) : "-"}
              </td>
              <td className="border border-[var(--color-border-soft)] px-3 py-2 font-mono font-bold">
                {row.code || "-"}
              </td>
              <td className="border border-[var(--color-border-soft)] px-3 py-2 text-xs text-[var(--color-on-surface-variant)]">-</td>
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr>
              <td colSpan={5} className="border border-[var(--color-border-soft)] px-3 py-6 text-center text-[var(--color-on-surface-variant)]">
                No hay codificaciones para mostrar.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function StructureFormCard({
  title,
  children,
  onSubmit,
  disabled,
  editing = false,
  onCancel
}: {
  title: string;
  children: ReactNode;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  disabled: boolean;
  editing?: boolean;
  onCancel?: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-black uppercase tracking-wider text-[var(--color-on-surface-variant)]">{title}</h2>
        {editing && onCancel ? (
          <button type="button" className="rounded-md p-1 text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]" onClick={onCancel} title="Cancelar edición">
            <X size={16} />
          </button>
        ) : null}
      </div>
      <div className="mt-3 space-y-3">{children}</div>
      <button type="submit" className={`${primaryButton} mt-4 w-full`} disabled={disabled}>
        {editing ? "Actualizar" : "Guardar"}
      </button>
    </form>
  );
}

function NodeActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <span className="mt-2 flex justify-center gap-1">
      <button
        type="button"
        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--color-outline-variant)] text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]"
        onClick={onEdit}
        title="Editar"
      >
        <Pencil size={13} />
      </button>
      <button
        type="button"
        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--color-outline-variant)] text-[var(--color-error)]"
        onClick={onDelete}
        title="Eliminar"
      >
        <Trash2 size={13} />
      </button>
    </span>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text"
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
        {label}
      </span>
      <input
        className={fieldClass}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
  placeholder
}: {
  label: string;
  value: string;
  options: Array<{ id: string; label: string }>;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
        {label}
      </span>
      <select className={fieldClass} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

const emptySamples = {
  exploration: { registered: 0, dispatched: 0, completed: 0, total: 0 },
  production: { registered: 0, dispatched: 0, completed: 0, total: 0 },
  total: 0
};

function catalogId(item: OfflineProposalCatalog) {
  return item.remoteId ?? item.localId;
}

function buildLocalHierarchy(mode: ViewMode, catalogs: OfflineProposalCatalog[]) {
  const usable = catalogs.filter((item) => item.module === mode && !item.localId.startsWith("seed-"));
  const areas = usable.filter((item) => item.entity === "area");
  const levels = usable.filter((item) => item.entity === "level");
  const labors = usable.filter((item) => item.entity === "labor");

  return areas.map((area) => {
    const areaId = catalogId(area);
    const areaLevels = levels
      .filter((level) => level.parentRemoteId === areaId || level.parentLocalId === area.localId)
      .map((level) => {
        const levelId = catalogId(level);
        const levelLabors = labors
          .filter((labor) => labor.parentRemoteId === levelId || labor.parentLocalId === level.localId)
          .map((labor) => ({
            id: catalogId(labor),
            name: labor.name,
            abbreviation: labor.abbreviation,
            description: labor.description,
            samples: emptySamples
          }));

        return {
          id: levelId,
          name: level.name,
          abbreviation: level.abbreviation,
          elevation: level.elevation,
          description: level.description,
          samples: emptySamples,
          labors: levelLabors
        };
      });

    return {
      id: areaId,
      name: area.name,
      abbreviation: area.abbreviation,
      description: area.description,
      samples: emptySamples,
      levels: areaLevels
    };
  }) as Array<InteriorHierarchyArea | SurfaceHierarchyArea>;
}

function mergeHierarchyTrees<T extends InteriorHierarchyArea | SurfaceHierarchyArea>(remote: T[], local: Array<InteriorHierarchyArea | SurfaceHierarchyArea>) {
  const byId = new Map<string, InteriorHierarchyArea | SurfaceHierarchyArea>();
  [...local, ...remote].forEach((area) => {
    const existing = byId.get(area.id);
    if (!existing) {
      byId.set(area.id, { ...area, levels: area.levels ?? [] });
      return;
    }

    const levelById = new Map((existing.levels ?? []).map((level) => [level.id, level]));
    (area.levels ?? []).forEach((level) => {
      const existingLevel = levelById.get(level.id);
      if (!existingLevel) {
        levelById.set(level.id, level);
        return;
      }
      const laborById = new Map((existingLevel.labors ?? []).map((labor) => [labor.id, labor]));
      (level.labors ?? []).forEach((labor) => laborById.set(labor.id, labor));
      levelById.set(level.id, { ...existingLevel, ...level, labors: Array.from(laborById.values()) });
    });
    byId.set(area.id, { ...existing, ...area, levels: Array.from(levelById.values()) });
  });

  return Array.from(byId.values()) as T[];
}

function mergeHierarchyWithAreas<T extends InteriorHierarchyArea | SurfaceHierarchyArea>(
  hierarchy: T[],
  areas: Array<{ id: string; name: string; abbreviation?: string | null; description?: string | null }>
) {
  const byId = new Map(hierarchy.map((area) => [area.id, { ...area, levels: area.levels ?? [] }]));

  areas.forEach((area) => {
    if (!byId.has(area.id)) {
      byId.set(area.id, {
        id: area.id,
        name: area.name,
        abbreviation: area.abbreviation,
        description: area.description,
        levels: []
      } as unknown as T);
    }
  });

  return Array.from(byId.values()) as T[];
}

function buildHierarchyCacheItems(
  mode: ViewMode,
  hierarchy: Array<InteriorHierarchyArea | SurfaceHierarchyArea>,
  areas: Array<{ id: string; name: string; abbreviation?: string | null; description?: string | null }>
) {
  const items: Array<Omit<OfflineProposalCatalog, "id" | "createdAt" | "updatedAt" | "synced">> = [];
  const areaMap = new Map<string, { id: string; name: string; abbreviation?: string | null; description?: string | null }>();
  areas.forEach((area) => areaMap.set(area.id, area));
  hierarchy.forEach((area) => areaMap.set(area.id, area));

  areaMap.forEach((area) => {
    items.push({
      localId: `cache-${mode}-area-${area.id}`,
      remoteId: area.id,
      module: mode,
      entity: "area",
      name: area.name,
      abbreviation: area.abbreviation ?? undefined,
      description: area.description ?? undefined
    });
  });

  hierarchy.forEach((area) => {
    (area.levels ?? []).forEach((level) => {
      items.push({
        localId: `cache-${mode}-level-${level.id}`,
        remoteId: level.id,
        module: mode,
        entity: "level",
        name: level.name,
        abbreviation: level.abbreviation ?? undefined,
        description: level.description ?? undefined,
        parentRemoteId: area.id,
        elevation: level.elevation ?? undefined
      });

      (level.labors ?? []).forEach((labor) => {
        items.push({
          localId: `cache-${mode}-labor-${labor.id}`,
          remoteId: labor.id,
          module: mode,
          entity: "labor",
          name: labor.name,
          abbreviation: labor.abbreviation ?? undefined,
          description: labor.description ?? undefined,
          parentRemoteId: level.id
        });
      });
    });
  });

  return items;
}

function buildInteriorCodificationRows(areas: InteriorHierarchyArea[]) {
  return areas.flatMap((area) => {
    const levels = area.levels.length > 0 ? area.levels : [null];
    const areaRowSpan = levels.reduce((total, level) => total + Math.max(level?.labors.length ?? 1, 1), 0);
    let areaPrinted = false;

    return levels.flatMap((level) => {
      const labors = level?.labors.length ? level.labors : [null];
      const levelRowSpan = labors.length;
      let levelPrinted = false;

      return labors.map((labor) => {
        const row = {
          area,
          level,
          labor,
          areaRowSpan,
          levelRowSpan,
          showArea: !areaPrinted,
          showLevel: !levelPrinted,
          code: buildCodificationCode(area.abbreviation, level?.abbreviation, labor?.abbreviation)
        };
        areaPrinted = true;
        levelPrinted = true;
        return row;
      });
    });
  });
}

function buildSurfaceCodificationRows(areas: SurfaceHierarchyArea[]) {
  return areas.flatMap((area) => {
    const levels = area.levels.length > 0 ? area.levels : [null];
    const areaRowSpan = levels.reduce((total, level) => total + Math.max(level?.labors.length ?? 1, 1), 0);
    let areaPrinted = false;

    return levels.flatMap((level) => {
      const labors = level?.labors.length ? level.labors : [null];
      const levelRowSpan = labors.length;
      let levelPrinted = false;

      return labors.map((labor) => {
        const row = {
          area,
          level,
          labor,
          areaRowSpan,
          levelRowSpan,
          showArea: !areaPrinted,
          showLevel: !levelPrinted,
          code: buildCodificationCode(area.abbreviation, level?.abbreviation, labor?.abbreviation)
        };
        areaPrinted = true;
        levelPrinted = true;
        return row;
      });
    });
  });
}

function buildCodificationCode(...parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join("/");
}

function formatHierarchyLabel(name: string, abbreviation?: string | null) {
  return abbreviation ? `${name} (${abbreviation})` : name;
}

function filterHierarchyData(
  items: Array<InteriorHierarchyArea | SurfaceHierarchyArea>,
  search: string,
  mode: ViewMode
) {
  const query = normalizeHierarchySearch(search);
  if (!query) return items;

  if (mode === "surface") {
    return (items as SurfaceHierarchyArea[])
      .map((area) => {
        const areaMatches = matchesHierarchyText(area, query);
        const levels = (area.levels ?? [])
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
