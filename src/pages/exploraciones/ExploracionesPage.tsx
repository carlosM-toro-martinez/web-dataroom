import { FormEvent, useEffect, useMemo, useState } from "react";
import L from "leaflet";
import {
  Beaker,
  Eye,
  FlaskConical,
  Landmark,
  Layers3,
  MapPinned,
  Microscope,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  Save,
  Search,
  Target,
  Trash2,
  X
} from "lucide-react";
import { MapContainer, Marker, TileLayer } from "react-leaflet";
import { AutocompleteSelect } from "@/shared/ui/AutocompleteSelect";
import { InternalHeader } from "@/shared/ui/InternalHeader";
import { ApiError } from "@/shared/api/core/apiError";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useToast } from "@/shared/ui/toast/ToastProvider";
import {
  useAssignInteriorSampleVoucherMutation,
  useAssignSurfaceSampleVoucherMutation,
  useInteriorAreasQuery,
  useInteriorLaborsQuery,
  useInteriorLaboratoriesQuery,
  useInteriorLevelsQuery,
  useInteriorObjectivesQuery,
  useInteriorSamplesQuery,
  useOfflineProposalCatalogsQuery,
  useOfflineProposalSamplesQuery,
  useQueueProposalCatalogMutation,
  useQueueRemoteProposalSampleEditMutation,
  useQueueProposalSampleMutation,
  useSharedElementsQuery,
  useSurfaceAreasQuery,
  useSurfaceLaboratoriesQuery,
  useSurfaceObjectivesQuery,
  useSurfaceSamplesQuery,
  useSyncProposalSamplesMutation,
  useUpdateInteriorSampleWithResultsMutation,
  useUpdateQueuedProposalSampleMutation,
  useUpdateSurfaceSampleWithResultsMutation
} from "@/features/exploraciones/hooks/useProposalSamples";
import type {
  CatalogItem,
  ElementCatalogItem,
  InteriorLabor,
  InteriorSample,
  LaboratorySlot,
  SamplePriority,
  SurfaceSample
} from "@/features/exploraciones/model/proposalSamples.schema";
import type { OfflineProposalCatalog, OfflineProposalSample } from "@/features/exploraciones/db/exploracionesDb";
import { cacheProposalCatalogs } from "@/features/exploraciones/db/exploracionesDb";

const pageShell =
  "exploraciones-page mx-auto w-full max-w-7xl space-y-6 px-4 pb-8 sm:px-6 lg:px-8";
const panelClass =
  "rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)]";
const fieldClass =
  "w-full rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] px-3 py-2.5 text-sm text-[var(--color-on-surface)] outline-none transition focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-60";
const secondaryButton =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-outline-variant)] px-3 py-2 text-sm font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)] disabled:cursor-not-allowed disabled:opacity-50";
const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60";

const geoMarkerIcon = L.divIcon({
  className: "exploraciones-geo-marker",
  html: `<span style="display:block;width:18px;height:18px;border-radius:9999px;background:var(--color-primary);border:3px solid white;box-shadow:0 2px 10px rgba(15,23,42,0.35);"></span>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9]
});

type RegisterType = "interior" | "surface";
type ResultStatusFilter = "all" | "with" | "without";
type ModalKind =
  | "element"
  | "interior-area"
  | "interior-level"
  | "interior-labor"
  | "interior-objective"
  | "interior-laboratory"
  | "surface-area"
  | "surface-objective"
  | "surface-laboratory";

interface ResultRow {
  id: string;
  labSlot: LaboratorySlot | "";
  elementId: string;
  value: string;
  unit: string;
  qualifier: string;
  laboratoryId: string;
}

interface SampleForm {
  interiorAreaId: string;
  interiorLevelId: string;
  interiorLaborId: string;
  interiorObjectiveId: string;
  surfaceAreaId: string;
  surfaceObjectiveId: string;
  priority: SamplePriority;
  sampleNameSuffix: string;
  sampledAt: string;
  east: string;
  north: string;
  elevation: string;
  labL1: string;
  labL2: string;
  labL3: string;
}

interface CatalogForm {
  name: string;
  abbreviation: string;
  description: string;
  symbol: string;
  defaultUnit: string;
  elevation: string;
  parentId: string;
}

type EditTarget =
  | { source: "local"; module: RegisterType; localId: string }
  | { source: "remote"; module: RegisterType; remoteId: string }
  | null;

type SampleTableRow = {
  id: string;
  code: string;
  name?: string | null;
  voucherNumber?: number | null;
  priority: SamplePriority;
  sampledAt?: string | null;
  objectiveName: string;
  location: string;
  createdByName: string;
  results: any[];
  labAssignments: any[];
  source: "local" | "remote";
  raw: OfflineProposalSample | InteriorSample | SurfaceSample;
};

type GeoPoint = {
  latitude: number;
  longitude: number;
  accuracy?: number;
};

const PRIORITY_OPTIONS: Array<{ id: SamplePriority; label: string }> = [
  { id: "NORMAL", label: "Normal" },
  { id: "HIGH", label: "Alta" },
  { id: "URGENT", label: "Urgente" },
  { id: "LOW", label: "Baja" }
];

const PRIORITY_LABELS: Record<SamplePriority, string> = {
  URGENT: "Urgente",
  HIGH: "Alta",
  NORMAL: "Normal",
  LOW: "Baja"
};

const PRIORITY_WEIGHT: Record<SamplePriority, number> = {
  URGENT: 4,
  HIGH: 3,
  NORMAL: 2,
  LOW: 1
};

const INTERIOR_DEFAULT_AREAS = [
  { localId: "seed-interior-area-mosa", name: "MOSA", abbreviation: "MS" },
  { localId: "seed-interior-area-central", name: "CENTRAL", abbreviation: "CEN" },
  { localId: "seed-interior-area-lipena", name: "LIPEÑA", abbreviation: "LIP" }
] as const;

const INTERIOR_DEFAULT_LEVELS = [
  { localId: "seed-interior-level-ms-esp", areaLocalId: "seed-interior-area-mosa", name: "ESPERANZA", abbreviation: "ESP" },
  { localId: "seed-interior-level-ms-luz", areaLocalId: "seed-interior-area-mosa", name: "LUZ", abbreviation: "LZ" },
  { localId: "seed-interior-level-cen-pv", areaLocalId: "seed-interior-area-central", name: "PORVENIR", abbreviation: "PV" },
  { localId: "seed-interior-level-lip-cd", areaLocalId: "seed-interior-area-lipena", name: "CUADRO", abbreviation: "CD" },
  { localId: "seed-interior-level-lip-niv0", areaLocalId: "seed-interior-area-lipena", name: "NIVEL 0", abbreviation: "NIV0" },
  { localId: "seed-interior-level-lip-niv40", areaLocalId: "seed-interior-area-lipena", name: "NIVEL 40", abbreviation: "NIV40" },
  { localId: "seed-interior-level-lip-niv80", areaLocalId: "seed-interior-area-lipena", name: "NIVEL 80", abbreviation: "NIV80" }
] as const;

const INTERIOR_DEFAULT_LABORS = [
  { levelLocalId: "seed-interior-level-ms-esp", name: "RECORTE_1", abbreviation: "R1" },
  { levelLocalId: "seed-interior-level-ms-luz", name: "RECORTE_1", abbreviation: "R1" },
  { levelLocalId: "seed-interior-level-cen-pv", name: "RECORTE_1", abbreviation: "R1" },
  { levelLocalId: "seed-interior-level-lip-cd", name: "CANDELARIA", abbreviation: "CAN" },
  { levelLocalId: "seed-interior-level-lip-niv0", name: "RAJO1", abbreviation: "RJ1" },
  { levelLocalId: "seed-interior-level-lip-niv0", name: "RAJO2", abbreviation: "RJ2" },
  { levelLocalId: "seed-interior-level-lip-niv0", name: "RAJO3", abbreviation: "RJ3" },
  { levelLocalId: "seed-interior-level-lip-niv0", name: "RAJO4", abbreviation: "RJ4" },
  { levelLocalId: "seed-interior-level-lip-niv40", name: "RAJO1", abbreviation: "RJ1" },
  { levelLocalId: "seed-interior-level-lip-niv40", name: "RECORTE_SUR_1", abbreviation: "RS1" },
  { levelLocalId: "seed-interior-level-lip-niv40", name: "RECORTE_SUR_2", abbreviation: "RS2" },
  { levelLocalId: "seed-interior-level-lip-niv40", name: "RECORTE_NORTE_1", abbreviation: "RN1" },
  { levelLocalId: "seed-interior-level-lip-niv80", name: "BANCA_NORTE", abbreviation: "BN" },
  { levelLocalId: "seed-interior-level-lip-niv80", name: "BANCA_CENTRO", abbreviation: "BC" },
  { levelLocalId: "seed-interior-level-lip-niv80", name: "BANCA_SUR", abbreviation: "BS" }
].map((item) => ({
  ...item,
  localId: `seed-interior-labor-${item.levelLocalId}-${item.abbreviation.toLowerCase()}-${item.name.toLowerCase()}`
}));

const DEFAULT_LABORATORIES = [
  { name: "LIPEÑA (LIPEÑA)", abbreviation: "LIP" },
  { name: "CHILCOBIJA (CHILCOBIJA)", abbreviation: "CHI" },
  { name: "POTOSI (CONDE ORTEGA)", abbreviation: "POT" },
  { name: "SPECTRO LAB", abbreviation: "SPL" },
  { name: "CASTRO", abbreviation: "CAS" }
] as const;

const SURFACE_DEFAULT_AREAS = [
  { localId: "seed-surface-area-mosa", name: "MOSA", abbreviation: "MS/SUP" },
  { localId: "seed-surface-area-central", name: "CENTRAL", abbreviation: "CEN/SUP" },
  { localId: "seed-surface-area-lipena", name: "LIPEÑA", abbreviation: "LIP/SUP" },
  { localId: "seed-surface-area-ayda", name: "AYDA", abbreviation: "AY/SUP" },
  { localId: "seed-surface-area-progreso", name: "EL PROGRESO", abbreviation: "EP/SUP" },
  { localId: "seed-surface-area-horizonte", name: "HORIZONTE", abbreviation: "HZ/SUP" }
] as const;

const INTERIOR_OBJECTIVE = {
  localId: "seed-interior-objective-tope-lateral",
  name: "TOPE_O_LATERAL_U_OTROS"
} as const;

const SURFACE_OBJECTIVE = {
  localId: "seed-surface-objective-desencape",
  name: "DESENCAPE_U_OTROS"
} as const;

function newId() {
  if (typeof crypto?.randomUUID === "function") return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toLocalDatetimeInput(date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function initialSampleForm(): SampleForm {
  return {
    interiorAreaId: "",
    interiorLevelId: "",
    interiorLaborId: "",
    interiorObjectiveId: "",
    surfaceAreaId: "",
    surfaceObjectiveId: "",
    priority: "NORMAL",
    sampleNameSuffix: "",
    sampledAt: toLocalDatetimeInput(),
    east: "",
    north: "",
    elevation: "",
    labL1: "",
    labL2: "",
    labL3: ""
  };
}

function initialCatalogForm(): CatalogForm {
  return {
    name: "",
    abbreviation: "",
    description: "",
    symbol: "",
    defaultUnit: "",
    elevation: "",
    parentId: ""
  };
}

function initialResult(): ResultRow {
  return {
    id: newId(),
    labSlot: "",
    elementId: "",
    value: "",
    unit: "",
    qualifier: "",
    laboratoryId: ""
  };
}

function toNumber(value: string) {
  if (!value.trim()) return undefined;
  const parsed = Number(value.trim().replace(",", "."));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toIso(value: string) {
  if (!value.trim()) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-BO", {
    timeZone: "America/La_Paz",
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function labelOptions(items: Array<{ id: string; name: string; abbreviation?: string | null }>) {
  const unique = new Map<string, { id: string; label: string; searchText: string }>();
  items.forEach((item) => {
    const key = `${item.name}|${item.abbreviation ?? ""}`.toLowerCase();
    if (unique.has(key)) return;
    unique.set(key, {
      id: item.id,
      label: item.abbreviation ? `${item.name} (${item.abbreviation})` : item.name,
      searchText: `${item.name} ${item.abbreviation ?? ""}`
    });
  });
  return Array.from(unique.values());
}

function elementOptions(items: ElementCatalogItem[]) {
  const unique = new Map<string, { id: string; label: string; searchText: string }>();
  items.forEach((item) => {
    const key = `${item.symbol}|${item.defaultUnit ?? ""}`.toLowerCase();
    if (unique.has(key)) return;
    unique.set(key, {
      id: item.id,
      label: `${item.symbol} - ${item.name}${item.defaultUnit ? ` [${item.defaultUnit}]` : ""}`,
      searchText: `${item.symbol} ${item.name} ${item.defaultUnit ?? ""}`
    });
  });
  return Array.from(unique.values());
}

function localCatalogId(item: OfflineProposalCatalog) {
  return item.remoteId ?? item.localId;
}

function localCatalogToItem(item: OfflineProposalCatalog): CatalogItem {
  return {
    id: localCatalogId(item),
    name: item.name,
    abbreviation: item.abbreviation,
    description: item.description
  };
}

function localElementToItem(item: OfflineProposalCatalog): ElementCatalogItem {
  return {
    id: localCatalogId(item),
    name: item.name,
    symbol: item.symbol ?? item.abbreviation ?? item.name,
    defaultUnit: item.defaultUnit,
    description: item.description
  };
}

function mergeById<T extends { id: string }>(remote: T[], local: T[]) {
  return Array.from(new Map([...remote, ...local].map((item) => [item.id, item])).values());
}

function normalizeCatalogText(value?: string | null) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getLaborPath(labor?: InteriorLabor) {
  const level = labor?.level;
  const area = level?.area;
  return [area?.abbreviation ?? area?.name, level?.abbreviation ?? level?.name, labor?.abbreviation ?? labor?.name]
    .filter(Boolean)
    .join(" / ");
}

function getResultText(results: Array<{ element?: ElementCatalogItem; value?: number | null; unit?: string | null }>) {
  if (results.length === 0) return "-";
  return results
    .slice(0, 4)
    .map((result) => {
      const label = result.element?.symbol ?? result.element?.name ?? "Elemento";
      return `${label}: ${result.value ?? "-"}${result.unit ? ` ${result.unit}` : ""}`;
    })
    .join(" · ");
}

function getLabAssignmentLabel(assignment?: any) {
  if (!assignment) return "-";
  const slot = assignment.slot ? `${assignment.slot} - ` : "";
  const name = assignment.laboratory?.name ?? assignment.interiorLaboratoryId ?? assignment.surfaceLaboratoryId ?? "Laboratorio";
  return `${slot}${name}`;
}

function flattenAssignmentResults(assignments?: any[], fallbackResults?: any[]) {
  const nested =
    assignments?.flatMap((assignment) =>
      (assignment.results ?? []).map((result: any) => ({
        ...result,
        labSlot: assignment.slot ?? "",
        laboratory: result.laboratory ?? assignment.laboratory,
        interiorLaboratoryId: assignment.interiorLaboratoryId,
        surfaceLaboratoryId: result.surfaceLaboratoryId ?? assignment.surfaceLaboratoryId,
        labAssignment: assignment,
        labAssignmentLabel: getLabAssignmentLabel(assignment)
      }))
    ) ?? [];
  return nested.length > 0 ? nested : fallbackResults ?? [];
}

function hasResults(results: unknown[]) {
  return results.length > 0;
}

function stringifyDetail(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function isConnectivityIssue(error: unknown) {
  if (!navigator.onLine) return true;
  if (error instanceof ApiError) return !error.statusCode;
  if (error instanceof Error) {
    return /red|network|conectar|connect|timeout|offline/i.test(error.message);
  }
  return false;
}

function modalTitle(kind: ModalKind) {
  const titles: Record<ModalKind, string> = {
    element: "Crear elemento",
    "interior-area": "Crear área interior",
    "interior-level": "Crear nivel interior",
    "interior-labor": "Crear labor interior",
    "interior-objective": "Crear objetivo interior",
    "interior-laboratory": "Crear laboratorio interior",
    "surface-area": "Crear área de superficie",
    "surface-objective": "Crear objetivo de superficie",
    "surface-laboratory": "Crear laboratorio de superficie"
  };
  return titles[kind];
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
      {children}
    </label>
  );
}

export function ExploracionesPage() {
  const { showError, showSuccess } = useToast();
  const { user } = useAuth();
  const [registerType, setRegisterType] = useState<RegisterType>("interior");
  const [sampleForm, setSampleForm] = useState<SampleForm>(() => initialSampleForm());
  const [catalogForm, setCatalogForm] = useState<CatalogForm>(() => initialCatalogForm());
  const [results, setResults] = useState<ResultRow[]>(() => []);
  const [modalKind, setModalKind] = useState<ModalKind | null>(null);
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<SamplePriority | "">("");
  const [resultStatusFilter, setResultStatusFilter] = useState<ResultStatusFilter>("all");
  const [onlyMine, setOnlyMine] = useState(false);
  const [defaultsSeeded, setDefaultsSeeded] = useState(false);
  const [editTarget, setEditTarget] = useState<EditTarget>(null);
  const [geoPoint, setGeoPoint] = useState<GeoPoint | null>(null);
  const [geoStatus, setGeoStatus] = useState<string>("");
  const [isLocating, setIsLocating] = useState(false);

  const remoteElements = useSharedElementsQuery();
  const remoteInteriorAreas = useInteriorAreasQuery();
  const remoteInteriorLevels = useInteriorLevelsQuery(sampleForm.interiorAreaId);
  const remoteInteriorLabors = useInteriorLaborsQuery(sampleForm.interiorLevelId);
  const remoteInteriorObjectives = useInteriorObjectivesQuery();
  const remoteInteriorLaboratories = useInteriorLaboratoriesQuery();
  const remoteInteriorSamples = useInteriorSamplesQuery({
    interiorLaborId: sampleForm.interiorLaborId || undefined,
    createdById: onlyMine ? user?.id : undefined,
    priority: priorityFilter || undefined,
    search: search || undefined
  });
  const remoteSurfaceAreas = useSurfaceAreasQuery();
  const remoteSurfaceObjectives = useSurfaceObjectivesQuery();
  const remoteSurfaceLaboratories = useSurfaceLaboratoriesQuery();
  const remoteSurfaceSamples = useSurfaceSamplesQuery({
    surfaceAreaId: sampleForm.surfaceAreaId || undefined,
    createdById: onlyMine ? user?.id : undefined,
    priority: priorityFilter || undefined,
    search: search || undefined
  });
  const offlineCatalogs = useOfflineProposalCatalogsQuery();
  const offlineSamples = useOfflineProposalSamplesQuery();
  const queueCatalog = useQueueProposalCatalogMutation();
  const queueSample = useQueueProposalSampleMutation();
  const updateQueuedSample = useUpdateQueuedProposalSampleMutation();
  const queueRemoteEdit = useQueueRemoteProposalSampleEditMutation();
  const updateInteriorSample = useUpdateInteriorSampleWithResultsMutation();
  const updateSurfaceSample = useUpdateSurfaceSampleWithResultsMutation();
  const assignInteriorVoucher = useAssignInteriorSampleVoucherMutation();
  const assignSurfaceVoucher = useAssignSurfaceSampleVoucherMutation();
  const syncMutation = useSyncProposalSamplesMutation();

  const localCatalogs = offlineCatalogs.data ?? [];
  const localSamples = offlineSamples.data ?? [];

  useEffect(() => {
    if (!offlineCatalogs.data) return;
    if (defaultsSeeded) return;
    setDefaultsSeeded(true);

    const hasLocalSeed = (localId: string) => localCatalogs.some((item) => item.localId === localId);

    async function seedDefaults() {
      for (const area of INTERIOR_DEFAULT_AREAS) {
        if (hasLocalSeed(area.localId)) continue;
        await queueCatalog.mutateAsync({
          module: "interior",
          entity: "area",
          payload: { name: area.name, abbreviation: area.abbreviation },
          catalog: {
            localId: area.localId,
            module: "interior",
            entity: "area",
            name: area.name,
            abbreviation: area.abbreviation
          }
        });
      }

      for (const level of INTERIOR_DEFAULT_LEVELS) {
        if (hasLocalSeed(level.localId)) continue;
        await queueCatalog.mutateAsync({
          module: "interior",
          entity: "level",
          payload: {
            interiorAreaId: level.areaLocalId,
            name: level.name,
            abbreviation: level.abbreviation
          },
          catalog: {
            localId: level.localId,
            module: "interior",
            entity: "level",
            name: level.name,
            abbreviation: level.abbreviation,
            parentLocalId: level.areaLocalId
          }
        });
      }

      for (const labor of INTERIOR_DEFAULT_LABORS) {
        if (hasLocalSeed(labor.localId)) continue;
        await queueCatalog.mutateAsync({
          module: "interior",
          entity: "labor",
          payload: {
            interiorLevelId: labor.levelLocalId,
            name: labor.name,
            abbreviation: labor.abbreviation
          },
          catalog: {
            localId: labor.localId,
            module: "interior",
            entity: "labor",
            name: labor.name,
            abbreviation: labor.abbreviation,
            parentLocalId: labor.levelLocalId
          }
        });
      }

      if (!hasLocalSeed(INTERIOR_OBJECTIVE.localId)) {
        await queueCatalog.mutateAsync({
          module: "interior",
          entity: "objective",
          payload: { name: INTERIOR_OBJECTIVE.name },
          catalog: {
            localId: INTERIOR_OBJECTIVE.localId,
            module: "interior",
            entity: "objective",
            name: INTERIOR_OBJECTIVE.name
          }
        });
      }

      for (const area of SURFACE_DEFAULT_AREAS) {
        if (hasLocalSeed(area.localId)) continue;
        await queueCatalog.mutateAsync({
          module: "surface",
          entity: "area",
          payload: { name: area.name, abbreviation: area.abbreviation },
          catalog: {
            localId: area.localId,
            module: "surface",
            entity: "area",
            name: area.name,
            abbreviation: area.abbreviation
          }
        });
      }

      if (!hasLocalSeed(SURFACE_OBJECTIVE.localId)) {
        await queueCatalog.mutateAsync({
          module: "surface",
          entity: "objective",
          payload: { name: SURFACE_OBJECTIVE.name },
          catalog: {
            localId: SURFACE_OBJECTIVE.localId,
            module: "surface",
            entity: "objective",
            name: SURFACE_OBJECTIVE.name
          }
        });
      }

      for (const module of ["interior", "surface"] as const) {
        for (const lab of DEFAULT_LABORATORIES) {
          const localId = `seed-${module}-laboratory-${lab.abbreviation.toLowerCase()}`;
          if (hasLocalSeed(localId)) continue;
          await queueCatalog.mutateAsync({
            module,
            entity: "laboratory",
            payload: { name: lab.name, abbreviation: lab.abbreviation },
            catalog: {
              localId,
              module,
              entity: "laboratory",
              name: lab.name,
              abbreviation: lab.abbreviation
            }
          });
        }
      }
    }

    void seedDefaults();
  }, [defaultsSeeded, offlineCatalogs.data]);

  const selectedInteriorArea = [
    ...(remoteInteriorAreas.data ?? []),
    ...localCatalogs.filter((item) => item.module === "interior" && item.entity === "area").map(localCatalogToItem)
  ].find((item) => item.id === sampleForm.interiorAreaId);

  const selectedInteriorAreaIds = new Set<string>(sampleForm.interiorAreaId ? [sampleForm.interiorAreaId] : []);
  if (selectedInteriorArea) {
    const selectedName = normalizeCatalogText(selectedInteriorArea.name);
    const selectedAbbreviation = normalizeCatalogText(selectedInteriorArea.abbreviation);
    localCatalogs
      .filter((item) => item.module === "interior" && item.entity === "area")
      .filter(
        (item) =>
          normalizeCatalogText(item.name) === selectedName ||
          normalizeCatalogText(item.abbreviation) === selectedAbbreviation
      )
      .forEach((item) => {
        selectedInteriorAreaIds.add(item.localId);
        if (item.remoteId) selectedInteriorAreaIds.add(item.remoteId);
      });
  }

  const elements = mergeById(
    remoteElements.data ?? [],
    localCatalogs.filter((item) => item.entity === "element").map(localElementToItem)
  );
  const interiorAreas = mergeById(
    remoteInteriorAreas.data ?? [],
    localCatalogs.filter((item) => item.module === "interior" && item.entity === "area").map(localCatalogToItem)
  );
  const interiorLevels = mergeById(
    remoteInteriorLevels.data ?? [],
    localCatalogs
      .filter((item) => item.module === "interior" && item.entity === "level")
      .filter(
        (item) =>
          !sampleForm.interiorAreaId ||
          selectedInteriorAreaIds.has(item.parentRemoteId ?? "") ||
          selectedInteriorAreaIds.has(item.parentLocalId ?? "")
      )
      .map((item) => ({
        ...localCatalogToItem(item),
        interiorAreaId: item.parentRemoteId ?? item.parentLocalId ?? "",
        elevation: item.elevation
      }))
  );

  const selectedInteriorLevel = [
    ...(remoteInteriorLevels.data ?? []),
    ...localCatalogs
      .filter((item) => item.module === "interior" && item.entity === "level")
      .map((item) => ({
        ...localCatalogToItem(item),
        interiorAreaId: item.parentRemoteId ?? item.parentLocalId ?? "",
        elevation: item.elevation
      }))
  ].find((item) => item.id === sampleForm.interiorLevelId);

  const selectedInteriorLevelIds = new Set<string>(sampleForm.interiorLevelId ? [sampleForm.interiorLevelId] : []);
  if (selectedInteriorLevel) {
    const selectedName = normalizeCatalogText(selectedInteriorLevel.name);
    const selectedAbbreviation = normalizeCatalogText(selectedInteriorLevel.abbreviation);
    localCatalogs
      .filter((item) => item.module === "interior" && item.entity === "level")
      .filter(
        (item) =>
          normalizeCatalogText(item.name) === selectedName ||
          normalizeCatalogText(item.abbreviation) === selectedAbbreviation
      )
      .forEach((item) => {
        selectedInteriorLevelIds.add(item.localId);
        if (item.remoteId) selectedInteriorLevelIds.add(item.remoteId);
      });
  }

  const interiorLabors = mergeById(
    remoteInteriorLabors.data ?? [],
    localCatalogs
      .filter((item) => item.module === "interior" && item.entity === "labor")
      .filter(
        (item) =>
          !sampleForm.interiorLevelId ||
          selectedInteriorLevelIds.has(item.parentRemoteId ?? "") ||
          selectedInteriorLevelIds.has(item.parentLocalId ?? "")
      )
      .map((item) => ({
        ...localCatalogToItem(item),
        interiorLevelId: item.parentRemoteId ?? item.parentLocalId ?? ""
      }))
  );
  const interiorObjectives = mergeById(
    remoteInteriorObjectives.data ?? [],
    localCatalogs.filter((item) => item.module === "interior" && item.entity === "objective").map(localCatalogToItem)
  );
  const selectedInteriorLevelOption = interiorLevels.find((item) => item.id === sampleForm.interiorLevelId);
  const selectedInteriorLaborOption = interiorLabors.find((item) => item.id === sampleForm.interiorLaborId);
  const interiorLaboratories = mergeById(
    remoteInteriorLaboratories.data ?? [],
    localCatalogs.filter((item) => item.module === "interior" && item.entity === "laboratory").map(localCatalogToItem)
  );
  const surfaceAreas = mergeById(
    remoteSurfaceAreas.data ?? [],
    localCatalogs.filter((item) => item.module === "surface" && item.entity === "area").map(localCatalogToItem)
  );
  const surfaceObjectives = mergeById(
    remoteSurfaceObjectives.data ?? [],
    localCatalogs.filter((item) => item.module === "surface" && item.entity === "objective").map(localCatalogToItem)
  );
  const surfaceLaboratories = mergeById(
    remoteSurfaceLaboratories.data ?? [],
    localCatalogs.filter((item) => item.module === "surface" && item.entity === "laboratory").map(localCatalogToItem)
  );
  const selectedSurfaceAreaOption = surfaceAreas.find((item) => item.id === sampleForm.surfaceAreaId);

  const activeObjectives = registerType === "interior" ? interiorObjectives : surfaceObjectives;
  const activeLaboratories = registerType === "interior" ? interiorLaboratories : surfaceLaboratories;
  const localVisibleSamples = localSamples.filter((item) => item.module === registerType && !item.synced);
  const remoteVisibleSamples = registerType === "interior" ? remoteInteriorSamples.data ?? [] : remoteSurfaceSamples.data ?? [];
  const interiorNamePrefix = [
    normalizeNameToken(selectedInteriorArea?.abbreviation ?? selectedInteriorArea?.name),
    normalizeNameToken(selectedInteriorLevelOption?.abbreviation ?? selectedInteriorLevelOption?.name),
    normalizeNameToken(selectedInteriorLaborOption?.abbreviation ?? selectedInteriorLaborOption?.name)
  ]
    .filter(Boolean)
    .join("-");
  const surfaceNamePrefix = normalizeNameToken(
    selectedSurfaceAreaOption?.abbreviation ?? selectedSurfaceAreaOption?.name
  );
  const sampleNamePrefix = registerType === "interior" ? interiorNamePrefix : surfaceNamePrefix;
  const normalizedSuffix = normalizeNameToken(sampleForm.sampleNameSuffix);
  const sampleName = [sampleNamePrefix, normalizedSuffix].filter(Boolean).join("-");

  const sampleRows = useMemo<SampleTableRow[]>(() => {
    const elementById = new Map(elements.map((element) => [element.id, element]));
    const localRows = localVisibleSamples.map((item) => ({
      id: item.localId,
      code: item.synced ? item.code : `${item.code} (offline)`,
      name: (item.payload as any).name ?? null,
      voucherNumber: (item.payload as any).voucherNumber ?? null,
      priority: ((item.payload as any).priority ?? "NORMAL") as SamplePriority,
      sampledAt: item.payload.sampledAt,
      objectiveName: "-",
      location: item.module === "interior" ? "Interior Mina" : "Superficie",
      createdByName: user?.nombre ?? "Usuario actual",
      results: flattenAssignmentResults((item.payload as any).labAssignments, (item.payload as any).results).map((result) => ({
        ...result,
        element: elementById.get(result.elementId)
      })),
      labAssignments: (item.payload as any).labAssignments ?? [],
      raw: item,
      source: "local" as const
    }));
    const remoteRows = remoteVisibleSamples.map((sample) => {
      const isInterior = registerType === "interior";
      const interiorSample = sample as InteriorSample;
      const surfaceSample = sample as SurfaceSample;
      return {
        id: sample.id,
        code: sample.code,
        name: sample.name ?? null,
        voucherNumber: sample.voucherNumber ?? null,
        priority: sample.priority ?? "NORMAL",
        sampledAt: sample.sampledAt,
        objectiveName: (isInterior ? interiorSample.objective?.name : surfaceSample.objective?.name) ?? "-",
        location: isInterior ? getLaborPath(interiorSample.labor) || "-" : surfaceSample.area?.name ?? "-",
        createdByName: sample.createdBy?.nombre ?? "-",
        results: flattenAssignmentResults((sample as any).labAssignments, sample.results),
        labAssignments: (sample as any).labAssignments ?? [],
        raw: sample,
        source: "remote" as const
      };
    });
    const rows = [...localRows, ...remoteRows];
    const query = search.trim().toLowerCase();
    return rows
      .filter((row) => (!priorityFilter ? true : row.priority === priorityFilter))
      .filter((row) => {
        if (resultStatusFilter === "all") return true;
        const rowHasResults = hasResults(row.results);
        return resultStatusFilter === "with" ? rowHasResults : !rowHasResults;
      })
      .filter((row) => (!query ? true : row.code.toLowerCase().includes(query)))
      .sort((left, right) => {
        const priorityDiff = PRIORITY_WEIGHT[right.priority] - PRIORITY_WEIGHT[left.priority];
        if (priorityDiff !== 0) return priorityDiff;
        const leftDate = left.sampledAt ? new Date(left.sampledAt).getTime() : 0;
        const rightDate = right.sampledAt ? new Date(right.sampledAt).getTime() : 0;
        return rightDate - leftDate;
      });
  }, [
    elements,
    localVisibleSamples,
    priorityFilter,
    registerType,
    remoteVisibleSamples,
    resultStatusFilter,
    search,
    user?.nombre
  ]);

  useEffect(() => {
    function onOnline() {
      syncMutation.mutate(undefined, {
        onSuccess: (result) => {
          if (result.synced > 0) showSuccess(`${result.synced} registros offline sincronizados.`);
        }
      });
    }
    window.addEventListener("online", onOnline);
    if (navigator.onLine) onOnline();
    return () => window.removeEventListener("online", onOnline);
  }, []);

  useEffect(() => {
    const items: Array<Omit<OfflineProposalCatalog, "id" | "createdAt" | "updatedAt" | "synced">> = [
      ...(remoteElements.data ?? []).map((item) => ({
        localId: `cache-element-${item.id}`,
        remoteId: item.id,
        module: "shared" as const,
        entity: "element" as const,
        name: item.name,
        symbol: item.symbol,
        defaultUnit: item.defaultUnit ?? undefined,
        description: item.description ?? undefined
      })),
      ...(remoteInteriorAreas.data ?? []).map((item) => ({
        localId: `cache-interior-area-${item.id}`,
        remoteId: item.id,
        module: "interior" as const,
        entity: "area" as const,
        name: item.name,
        abbreviation: item.abbreviation ?? undefined,
        description: item.description ?? undefined
      })),
      ...(remoteInteriorLevels.data ?? []).map((item) => ({
        localId: `cache-interior-level-${item.id}`,
        remoteId: item.id,
        module: "interior" as const,
        entity: "level" as const,
        name: item.name,
        abbreviation: item.abbreviation ?? undefined,
        description: item.description ?? undefined,
        parentRemoteId: item.interiorAreaId,
        elevation: item.elevation ?? undefined
      })),
      ...(remoteInteriorLabors.data ?? []).map((item) => ({
        localId: `cache-interior-labor-${item.id}`,
        remoteId: item.id,
        module: "interior" as const,
        entity: "labor" as const,
        name: item.name,
        abbreviation: item.abbreviation ?? undefined,
        description: item.description ?? undefined,
        parentRemoteId: item.interiorLevelId
      })),
      ...(remoteInteriorObjectives.data ?? []).map((item) => ({
        localId: `cache-interior-objective-${item.id}`,
        remoteId: item.id,
        module: "interior" as const,
        entity: "objective" as const,
        name: item.name,
        abbreviation: item.abbreviation ?? undefined,
        description: item.description ?? undefined
      })),
      ...(remoteInteriorLaboratories.data ?? []).map((item) => ({
        localId: `cache-interior-laboratory-${item.id}`,
        remoteId: item.id,
        module: "interior" as const,
        entity: "laboratory" as const,
        name: item.name,
        abbreviation: item.abbreviation ?? undefined,
        description: item.description ?? undefined
      })),
      ...(remoteSurfaceAreas.data ?? []).map((item) => ({
        localId: `cache-surface-area-${item.id}`,
        remoteId: item.id,
        module: "surface" as const,
        entity: "area" as const,
        name: item.name,
        abbreviation: item.abbreviation ?? undefined,
        description: item.description ?? undefined
      })),
      ...(remoteSurfaceObjectives.data ?? []).map((item) => ({
        localId: `cache-surface-objective-${item.id}`,
        remoteId: item.id,
        module: "surface" as const,
        entity: "objective" as const,
        name: item.name,
        abbreviation: item.abbreviation ?? undefined,
        description: item.description ?? undefined
      })),
      ...(remoteSurfaceLaboratories.data ?? []).map((item) => ({
        localId: `cache-surface-laboratory-${item.id}`,
        remoteId: item.id,
        module: "surface" as const,
        entity: "laboratory" as const,
        name: item.name,
        abbreviation: item.abbreviation ?? undefined,
        description: item.description ?? undefined
      }))
];

    if (items.length > 0) void cacheProposalCatalogs(items);
  }, [
    remoteElements.data,
    remoteInteriorAreas.data,
    remoteInteriorLabors.data,
    remoteInteriorLaboratories.data,
    remoteInteriorLevels.data,
    remoteInteriorObjectives.data,
    remoteSurfaceAreas.data,
    remoteSurfaceLaboratories.data,
    remoteSurfaceObjectives.data
  ]);

  function setSampleField(field: keyof SampleForm, value: string) {
    setSampleForm((current) => {
      if (field === "interiorAreaId") {
        return { ...current, interiorAreaId: value, interiorLevelId: "", interiorLaborId: "" };
      }
      if (field === "interiorLevelId") {
        return { ...current, interiorLevelId: value, interiorLaborId: "" };
      }
      return { ...current, [field]: value };
    });
  }

  function getInteriorPrefixFromIds(areaId?: string, levelId?: string, laborId?: string) {
    const area = interiorAreas.find((item) => item.id === areaId);
    const level = interiorLevels.find((item) => item.id === levelId);
    const labor = interiorLabors.find((item) => item.id === laborId);
    return [
      normalizeNameToken(area?.abbreviation ?? area?.name),
      normalizeNameToken(level?.abbreviation ?? level?.name),
      normalizeNameToken(labor?.abbreviation ?? labor?.name)
    ]
      .filter(Boolean)
      .join("-");
  }

  function getSurfacePrefixFromId(areaId?: string) {
    const area = surfaceAreas.find((item) => item.id === areaId);
    return normalizeNameToken(area?.abbreviation ?? area?.name);
  }

  function resetSampleForm() {
    setSampleForm(initialSampleForm());
    setResults([]);
    setEditTarget(null);
    setGeoPoint(null);
    setGeoStatus("");
  }

  function mapResultRows(rawResults?: any[]): ResultRow[] {
    const mapped =
      rawResults
        ?.map((result) => ({
          id: newId(),
          labSlot: (result.labSlot ?? result.labAssignment?.slot ?? "") as LaboratorySlot | "",
          elementId: result.element?.id ?? result.elementId ?? "",
          value: result.value === null || result.value === undefined ? "" : String(result.value),
          unit: result.unit ?? result.element?.defaultUnit ?? "",
          qualifier: result.qualifier ?? "",
          laboratoryId: result.laboratory?.id ?? result.surfaceLaboratoryId ?? ""
        }))
        .filter((row) => row.elementId) ?? [];
    return mapped;
  }

  function startEdit(row: SampleTableRow) {
    if (row.source === "local") {
      const sample = row.raw as OfflineProposalSample;
      setRegisterType(sample.module);
      if (sample.module === "interior") {
        const payload = sample.payload as any;
        const labor = interiorLabors.find((item) => item.id === payload.interiorLaborId);
        const levelId = labor?.interiorLevelId;
        const level = interiorLevels.find((item) => item.id === levelId);
        const areaId = level?.interiorAreaId;
        const prefix = getInteriorPrefixFromIds(areaId, levelId, payload.interiorLaborId);
        setSampleForm({
          ...initialSampleForm(),
          interiorAreaId: areaId ?? "",
          interiorLevelId: levelId ?? "",
          interiorLaborId: payload.interiorLaborId ?? "",
          interiorObjectiveId: payload.interiorObjectiveId ?? "",
          priority: payload.priority ?? "NORMAL",
          sampleNameSuffix: extractEditableSuffix(payload.name, prefix),
          sampledAt: toLocalDatetimeInput(payload.sampledAt ? new Date(payload.sampledAt) : new Date()),
          east: payload.east === undefined ? "" : String(payload.east),
          north: payload.north === undefined ? "" : String(payload.north),
          elevation: payload.elevation === undefined ? "" : String(payload.elevation),
          labL1: payload.labAssignments?.find((item: any) => item.slot === "L1")?.interiorLaboratoryId ?? "",
          labL2: payload.labAssignments?.find((item: any) => item.slot === "L2")?.interiorLaboratoryId ?? "",
          labL3: payload.labAssignments?.find((item: any) => item.slot === "L3")?.interiorLaboratoryId ?? ""
        });
      } else {
        const payload = sample.payload as any;
        const prefix = getSurfacePrefixFromId(payload.surfaceAreaId);
        setSampleForm({
          ...initialSampleForm(),
          surfaceAreaId: payload.surfaceAreaId ?? "",
          surfaceObjectiveId: payload.surfaceObjectiveId ?? "",
          priority: payload.priority ?? "NORMAL",
          sampleNameSuffix: extractEditableSuffix(payload.name, prefix),
          sampledAt: toLocalDatetimeInput(payload.sampledAt ? new Date(payload.sampledAt) : new Date()),
          east: payload.east === undefined ? "" : String(payload.east),
          north: payload.north === undefined ? "" : String(payload.north),
          elevation: payload.elevation === undefined ? "" : String(payload.elevation)
        });
      }
      setResults(mapResultRows(flattenAssignmentResults((sample.payload as any).labAssignments, (sample.payload as any).results)));
      setEditTarget({ source: "local", module: sample.module, localId: sample.localId });
      return;
    }

    const sample = row.raw as any;
    const module = registerType;
    if (module === "interior") {
      const prefix = getInteriorPrefixFromIds(
        sample.labor?.level?.area?.id,
        sample.labor?.level?.id,
        sample.labor?.id
      );
      setSampleForm({
        ...initialSampleForm(),
        interiorAreaId: sample.labor?.level?.area?.id ?? "",
        interiorLevelId: sample.labor?.level?.id ?? "",
        interiorLaborId: sample.labor?.id ?? "",
        interiorObjectiveId: sample.objective?.id ?? "",
        priority: sample.priority ?? "NORMAL",
        sampleNameSuffix: extractEditableSuffix(sample.name, prefix),
        sampledAt: toLocalDatetimeInput(sample.sampledAt ? new Date(sample.sampledAt) : new Date()),
        east: sample.east === undefined || sample.east === null ? "" : String(sample.east),
        north: sample.north === undefined || sample.north === null ? "" : String(sample.north),
        elevation: sample.elevation === undefined || sample.elevation === null ? "" : String(sample.elevation),
        labL1: sample.labAssignments?.find((item: any) => item.slot === "L1")?.laboratory?.id ?? "",
        labL2: sample.labAssignments?.find((item: any) => item.slot === "L2")?.laboratory?.id ?? "",
        labL3: sample.labAssignments?.find((item: any) => item.slot === "L3")?.laboratory?.id ?? ""
      });
    } else {
      const prefix = getSurfacePrefixFromId(sample.area?.id);
      setSampleForm({
        ...initialSampleForm(),
        surfaceAreaId: sample.area?.id ?? "",
        surfaceObjectiveId: sample.objective?.id ?? "",
        priority: sample.priority ?? "NORMAL",
        sampleNameSuffix: extractEditableSuffix(sample.name, prefix),
        sampledAt: toLocalDatetimeInput(sample.sampledAt ? new Date(sample.sampledAt) : new Date()),
        east: sample.east === undefined || sample.east === null ? "" : String(sample.east),
        north: sample.north === undefined || sample.north === null ? "" : String(sample.north),
        elevation: sample.elevation === undefined || sample.elevation === null ? "" : String(sample.elevation)
      });
    }
    setResults(mapResultRows(flattenAssignmentResults(sample.labAssignments, sample.results)));
    setEditTarget({ source: "remote", module, remoteId: sample.id });
  }

  function setCatalogField(field: keyof CatalogForm, value: string) {
    setCatalogForm((current) => ({ ...current, [field]: value }));
  }

  function openModal(kind: ModalKind, parentId = "") {
    setCatalogForm({ ...initialCatalogForm(), parentId });
    setModalKind(kind);
  }

  function fillFromCurrentLocation() {
    if (!("geolocation" in navigator)) {
      showError("Este dispositivo no soporta geolocalización.");
      return;
    }

    setIsLocating(true);
    setGeoStatus("Obteniendo ubicación del dispositivo...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy, altitude } = position.coords;
        const utm = latLonToUtm(latitude, longitude);

        setSampleForm((current) => ({
          ...current,
          east: String(utm.east),
          north: String(utm.north),
          elevation:
            current.elevation.trim() || altitude === null || altitude === undefined || Number.isNaN(altitude)
              ? current.elevation
              : String(Number(altitude.toFixed(2)))
        }));
        setGeoPoint({ latitude, longitude, accuracy });
        setGeoStatus(
          `Ubicación cargada. UTM zona ${utm.zoneNumber}${accuracy ? ` · precisión aprox. ${Math.round(accuracy)} m` : ""}`
        );
        setIsLocating(false);
      },
      (error) => {
        setIsLocating(false);
        const message =
          error.code === error.PERMISSION_DENIED
            ? "No se concedió permiso para acceder a la ubicación."
            : error.code === error.POSITION_UNAVAILABLE
              ? "La ubicación no está disponible en este momento."
              : "Se agotó el tiempo al intentar obtener la ubicación.";
        setGeoStatus(message);
        showError(message);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  }

  function closeModal() {
    setModalKind(null);
    setCatalogForm(initialCatalogForm());
  }

  function buildResultPayload(row: ResultRow) {
    return {
      elementId: row.elementId,
      value: toNumber(row.value),
      unit: row.unit.trim() || undefined,
      qualifier: row.qualifier.trim() || undefined
    };
  }

  function buildInteriorLabAssignmentsPayload() {
    const selectedLabs = [
      { slot: "L1" as LaboratorySlot, interiorLaboratoryId: sampleForm.labL1 },
      { slot: "L2" as LaboratorySlot, interiorLaboratoryId: sampleForm.labL2 },
      { slot: "L3" as LaboratorySlot, interiorLaboratoryId: sampleForm.labL3 }
    ].filter((item) => item.interiorLaboratoryId);

    const resultRows = results.filter((row) => row.elementId);
    const missingSlot = resultRows.find((row) => !row.labSlot);
    if (missingSlot) {
      throw new Error("Cada resultado de Interior Mina debe indicar a qué laboratorio L1, L2 o L3 pertenece.");
    }

    const missingLab = resultRows.find(
      (row) => row.labSlot && !selectedLabs.some((lab) => lab.slot === row.labSlot)
    );
    if (missingLab) {
      throw new Error("Selecciona el laboratorio del slot antes de asignarle resultados.");
    }

    return selectedLabs
      .map((lab) => ({
        ...lab,
        results: resultRows
          .filter((row) => row.labSlot === lab.slot)
          .map(buildResultPayload)
      }))
      .filter((lab) => lab.results.length > 0 || lab.interiorLaboratoryId);
  }

  function buildSurfaceLabAssignmentsPayload() {
    const resultRows = results.filter((row) => row.elementId);
    const missingLab = resultRows.find((row) => !row.laboratoryId);
    if (missingLab) {
      throw new Error("Cada resultado de Superficie debe indicar a qué laboratorio pertenece.");
    }

    const grouped = new Map<string, ReturnType<typeof buildResultPayload>[]>();
    resultRows.forEach((row) => {
      const current = grouped.get(row.laboratoryId) ?? [];
      current.push(buildResultPayload(row));
      grouped.set(row.laboratoryId, current);
    });

    return Array.from(grouped.entries()).map(([surfaceLaboratoryId, labResults]) => ({
      surfaceLaboratoryId,
      results: labResults
    }));
  }

  async function onSubmitSample(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const sampledAt = toIso(sampleForm.sampledAt) ?? new Date().toISOString();
      const normalizedSampleName = sampleName.trim() || undefined;
      const common = {
        name: normalizedSampleName,
        priority: sampleForm.priority,
        east: toNumber(sampleForm.east),
        north: toNumber(sampleForm.north),
        elevation: toNumber(sampleForm.elevation),
        sampledAt
      };
      let payload:
        | (typeof common & {
            interiorLaborId: string;
            interiorObjectiveId: string;
            labAssignments?: ReturnType<typeof buildInteriorLabAssignmentsPayload>;
          })
        | (typeof common & {
            surfaceAreaId: string;
            surfaceObjectiveId: string;
            labAssignments?: ReturnType<typeof buildSurfaceLabAssignmentsPayload>;
          });

      if (registerType === "interior") {
        if (!sampleForm.interiorLaborId || !sampleForm.interiorObjectiveId) {
          showError("Selecciona labor y objetivo para Interior Mina.");
          return;
        }
        const labAssignments = buildInteriorLabAssignmentsPayload();
        payload = {
          ...common,
          interiorLaborId: sampleForm.interiorLaborId,
          interiorObjectiveId: sampleForm.interiorObjectiveId,
          labAssignments
        };
      } else {
        if (!sampleForm.surfaceAreaId || !sampleForm.surfaceObjectiveId) {
          showError("Selecciona área y objetivo para Superficie.");
          return;
        }
        payload = {
          ...common,
          surfaceAreaId: sampleForm.surfaceAreaId,
          surfaceObjectiveId: sampleForm.surfaceObjectiveId,
          labAssignments: buildSurfaceLabAssignmentsPayload()
        };
      }

      if (editTarget?.source === "local") {
        await updateQueuedSample.mutateAsync({ localId: editTarget.localId, payload });
        if (navigator.onLine) {
          const result = await syncMutation.mutateAsync();
          showSuccess(result.synced > 0 ? "Muestra actualizada y sincronizada." : "Muestra actualizada en la cola local.");
        } else {
          showSuccess("Muestra actualizada en la cola local.");
        }
        resetSampleForm();
        return;
      }

      if (editTarget?.source === "remote") {
        const remotePatchPayload =
          registerType === "interior"
            ? (() => {
                const { interiorLaborId: _interiorLaborId, ...patchPayload } = payload as Extract<
                  typeof payload,
                  { interiorLaborId: string }
                >;
                return patchPayload;
              })()
            : (() => {
                const { surfaceAreaId: _surfaceAreaId, ...patchPayload } = payload as Extract<
                  typeof payload,
                  { surfaceAreaId: string }
                >;
                return patchPayload;
              })();

        if (!navigator.onLine) {
          await queueRemoteEdit.mutateAsync({
            module: registerType,
            remoteId: editTarget.remoteId,
            payload: remotePatchPayload
          });
          showSuccess("Edición guardada localmente. Se sincronizará al recuperar conexión.");
          resetSampleForm();
          return;
        }

        try {
          if (registerType === "interior") {
            await updateInteriorSample.mutateAsync({ id: editTarget.remoteId, payload: remotePatchPayload as any });
          } else {
            await updateSurfaceSample.mutateAsync({ id: editTarget.remoteId, payload: remotePatchPayload as any });
          }
          showSuccess("Muestra actualizada.");
          resetSampleForm();
          return;
        } catch (error) {
          if (!isConnectivityIssue(error)) throw error;
          await queueRemoteEdit.mutateAsync({
            module: registerType,
            remoteId: editTarget.remoteId,
            payload: remotePatchPayload
          });
          showSuccess("No se pudo conectar al servidor. La edición quedó en cola local.");
          resetSampleForm();
          return;
        }
      }

      await queueSample.mutateAsync({ module: registerType, payload });
      if (navigator.onLine) {
        const result = await syncMutation.mutateAsync();
        showSuccess(result.synced > 0 ? "Muestra guardada y sincronizada." : "Muestra guardada en cola local.");
      } else {
        showSuccess("Muestra guardada localmente. Se sincronizará cuando haya conexión.");
      }
      resetSampleForm();
    } catch (error) {
      showError(error instanceof Error ? error.message : "No se pudo guardar la muestra.");
    }
  }

  async function handlePrintVoucher(row: SampleTableRow) {
    if (row.source !== "remote") {
      showError("Sincroniza la muestra antes de imprimir el talón.");
      return;
    }

    const isInterior = registerType === "interior";
    const printWindow = window.open("", "_blank", "width=1280,height=560");
    if (!printWindow) {
      showError("El navegador bloqueó la ventana de impresión.");
      return;
    }

    printWindow.document.write("<p style=\"font-family:Arial,sans-serif;padding:24px\">Preparando talón...</p>");
    printWindow.document.close();

    try {
      const assigned =
        row.voucherNumber !== null && row.voucherNumber !== undefined
          ? row.raw
          : isInterior
            ? await assignInteriorVoucher.mutateAsync(row.id)
            : await assignSurfaceVoucher.mutateAsync(row.id);

      const nextRow: SampleTableRow = {
        ...row,
        raw: assigned as InteriorSample | SurfaceSample,
        voucherNumber: (assigned as InteriorSample | SurfaceSample).voucherNumber ?? row.voucherNumber,
        priority: (assigned as InteriorSample | SurfaceSample).priority ?? row.priority
      };
      writeVoucherPrintDocument(printWindow, nextRow);
    } catch (error) {
      printWindow.close();
      showError(error instanceof Error ? error.message : "No se pudo asignar el número de talón.");
    }
  }

  async function onSubmitCatalog(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!modalKind) return;

    try {
      const localId = `${modalKind}-${newId()}`;
      const name = catalogForm.name.trim();
      const abbreviation = catalogForm.abbreviation.trim() || undefined;
      const description = catalogForm.description.trim() || undefined;
      const elevation = toNumber(catalogForm.elevation);

      if (modalKind === "element") {
        await queueCatalog.mutateAsync({
          module: "shared",
          entity: "element",
          payload: {
            name,
            symbol: catalogForm.symbol.trim(),
            defaultUnit: catalogForm.defaultUnit.trim() || undefined,
            description
          },
          catalog: {
            localId,
            module: "shared",
            entity: "element",
            name,
            symbol: catalogForm.symbol.trim(),
            defaultUnit: catalogForm.defaultUnit.trim() || undefined,
            description
          }
        });
      }

      if (modalKind === "interior-area" || modalKind === "surface-area") {
        const module = modalKind === "interior-area" ? "interior" : "surface";
        await queueCatalog.mutateAsync({
          module,
          entity: "area",
          payload: { name, abbreviation, description },
          catalog: { localId, module, entity: "area", name, abbreviation, description }
        });
      }

      if (modalKind === "interior-level") {
        await queueCatalog.mutateAsync({
          module: "interior",
          entity: "level",
          payload: {
            interiorAreaId: catalogForm.parentId,
            name,
            abbreviation,
            elevation,
            description
          },
          catalog: {
            localId,
            module: "interior",
            entity: "level",
            name,
            abbreviation,
            description,
            elevation,
            parentLocalId: catalogForm.parentId,
            parentRemoteId: catalogForm.parentId
          }
        });
      }

      if (modalKind === "interior-labor") {
        await queueCatalog.mutateAsync({
          module: "interior",
          entity: "labor",
          payload: {
            interiorLevelId: catalogForm.parentId,
            name,
            abbreviation,
            description
          },
          catalog: {
            localId,
            module: "interior",
            entity: "labor",
            name,
            abbreviation,
            description,
            parentLocalId: catalogForm.parentId,
            parentRemoteId: catalogForm.parentId
          }
        });
      }

      if (modalKind === "interior-objective" || modalKind === "surface-objective") {
        const module = modalKind === "interior-objective" ? "interior" : "surface";
        await queueCatalog.mutateAsync({
          module,
          entity: "objective",
          payload: { name, description },
          catalog: { localId, module, entity: "objective", name, description }
        });
      }

      if (modalKind === "interior-laboratory" || modalKind === "surface-laboratory") {
        const module = modalKind === "interior-laboratory" ? "interior" : "surface";
        await queueCatalog.mutateAsync({
          module,
          entity: "laboratory",
          payload: { name, abbreviation, description },
          catalog: { localId, module, entity: "laboratory", name, abbreviation, description }
        });
      }

      showSuccess("Registro guardado localmente.");
      closeModal();
      if (navigator.onLine) syncMutation.mutate();
    } catch (error) {
      showError(error instanceof Error ? error.message : "No se pudo guardar el catálogo.");
    }
  }

  const areaOptions = registerType === "interior" ? labelOptions(interiorAreas) : labelOptions(surfaceAreas);
  const levelOptions = labelOptions(interiorLevels);
  const laborOptions = labelOptions(interiorLabors);
  const objectiveOptions = labelOptions(activeObjectives);
  const laboratoryOptions = labelOptions(activeLaboratories);
  const selectedInteriorLabGroups = ([
    ["L1", sampleForm.labL1],
    ["L2", sampleForm.labL2],
    ["L3", sampleForm.labL3]
  ] as Array<[LaboratorySlot, string]>)
    .map(([slot, laboratoryId]) => {
      const laboratory = interiorLaboratories.find((item) => item.id === laboratoryId);
      const label = laboratory ? `${slot} - ${laboratory.name}` : slot;
      return { slot, laboratoryId, label };
    });
  const isEditing = Boolean(editTarget);
  const isEditingRemote = editTarget?.source === "remote";
  const isSaving =
    queueSample.isPending ||
    updateQueuedSample.isPending ||
    queueRemoteEdit.isPending ||
    updateInteriorSample.isPending ||
    updateSurfaceSample.isPending ||
    syncMutation.isPending;

  return (
    <div className={pageShell}>
      <InternalHeader
        eyebrow="Exploraciones"
        title="Registro de muestras"
        description="Captura offline para Interior Mina y Superficie. Los registros se sincronizan al recuperar conexión."
      />

      <section className={`${panelClass} exploraciones-panel p-3`}>
        <div className="exploraciones-mode-grid grid grid-cols-2 gap-2">
          <ModeButton
            active={registerType === "interior"}
            onClick={() => {
              setRegisterType("interior");
              resetSampleForm();
            }}
            icon={Layers3}
          >
            Interior Mina
          </ModeButton>
          <ModeButton
            active={registerType === "surface"}
            onClick={() => {
              setRegisterType("surface");
              resetSampleForm();
            }}
            icon={MapPinned}
          >
            Superficie
          </ModeButton>
        </div>
      </section>

      <section className={`${panelClass} exploraciones-panel p-4`}>
        <div className="exploraciones-catalog-bar flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
              Catálogos
            </h2>
            <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">
              Crea datos auxiliares sin salir del registro. Todo queda disponible offline.
            </p>
          </div>
          <div className="exploraciones-catalog-actions flex flex-wrap gap-2">
            <CatalogButton icon={Microscope} onClick={() => openModal("element")}>Elemento</CatalogButton>
            <CatalogButton
              icon={Landmark}
              onClick={() => openModal(registerType === "interior" ? "interior-area" : "surface-area")}
            >
              Área
            </CatalogButton>
            {registerType === "interior" ? (
              <>
                <CatalogButton icon={MapPinned} onClick={() => openModal("interior-level", sampleForm.interiorAreaId)}>
                  Nivel
                </CatalogButton>
                <CatalogButton icon={Layers3} onClick={() => openModal("interior-labor", sampleForm.interiorLevelId)}>
                  Labor
                </CatalogButton>
              </>
            ) : null}
            <CatalogButton
              icon={Target}
              onClick={() => openModal(registerType === "interior" ? "interior-objective" : "surface-objective")}
            >
              Objetivo
            </CatalogButton>
            <CatalogButton
              icon={Beaker}
              onClick={() => openModal(registerType === "interior" ? "interior-laboratory" : "surface-laboratory")}
            >
              Laboratorio
            </CatalogButton>
            <button
              type="button"
              onClick={() => syncMutation.mutate(undefined, { onSuccess: () => showSuccess("Sincronización revisada.") })}
              className={secondaryButton}
            >
              <RefreshCw size={14} />
              Sincronizar
            </button>
          </div>
        </div>
      </section>

      <section className={`${panelClass} exploraciones-panel p-5`}>
        <form onSubmit={onSubmitSample} className="space-y-5">
          <div className="flex items-center gap-2">
            <FlaskConical size={18} />
            <h2 className="text-lg font-bold">
              {isEditing ? "Editar muestra" : "Nueva muestra"} de{" "}
              {registerType === "interior" ? "Interior Mina" : "Superficie"}
            </h2>
          </div>

          {registerType === "interior" ? (
            <div className="exploraciones-main-grid grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <FormSelect label="Área" value={sampleForm.interiorAreaId} options={areaOptions} onChange={(value) => setSampleField("interiorAreaId", value)} disabled={isEditingRemote} />
              <FormSelect label="Nivel" value={sampleForm.interiorLevelId} options={levelOptions} onChange={(value) => setSampleField("interiorLevelId", value)} disabled={!sampleForm.interiorAreaId || isEditingRemote} />
              <FormSelect label="Labor" value={sampleForm.interiorLaborId} options={laborOptions} onChange={(value) => setSampleField("interiorLaborId", value)} disabled={!sampleForm.interiorLevelId || isEditingRemote} />
              <FormSelect label="Objetivo" value={sampleForm.interiorObjectiveId} options={objectiveOptions} onChange={(value) => setSampleField("interiorObjectiveId", value)} />
            </div>
          ) : (
            <div className="exploraciones-main-grid grid gap-3 md:grid-cols-2">
              <FormSelect label="Área" value={sampleForm.surfaceAreaId} options={areaOptions} onChange={(value) => setSampleField("surfaceAreaId", value)} disabled={isEditingRemote} />
              <FormSelect label="Objetivo" value={sampleForm.surfaceObjectiveId} options={objectiveOptions} onChange={(value) => setSampleField("surfaceObjectiveId", value)} />
            </div>
          )}

          <div className="exploraciones-main-grid grid gap-3 md:grid-cols-2 xl:grid-cols-[1.2fr_0.8fr_0.7fr]">
            <TextField
              label="Nombre"
              value={sampleName}
              onChange={() => undefined}
              disabled
              placeholder="Completa la ubicación y el sufijo"
            />
            <TextField
              label="Sufijo"
              value={sampleForm.sampleNameSuffix}
              onChange={(value) => setSampleField("sampleNameSuffix", value.toUpperCase())}
              placeholder="Ej. T2"
            />
            <FormSelect
              label="Prioridad"
              value={sampleForm.priority}
              options={PRIORITY_OPTIONS}
              onChange={(value) => setSampleField("priority", value as SamplePriority)}
            />
          </div>
          <p className="text-xs text-[var(--color-on-surface-variant)]">
            Base automática: {sampleNamePrefix || "Completa área, nivel y labor para generar la base."}
          </p>

          <div className="exploraciones-main-grid grid gap-3 md:grid-cols-4">
            <TextField
              label="Fecha de muestreo"
              type="datetime-local"
              value={sampleForm.sampledAt}
              onChange={(value) => setSampleField("sampledAt", value)}
              disabled
            />
            <TextField label="Este" value={sampleForm.east} onChange={(value) => setSampleField("east", value)} />
            <TextField label="Norte" value={sampleForm.north} onChange={(value) => setSampleField("north", value)} />
            <TextField label="Elevación" value={sampleForm.elevation} onChange={(value) => setSampleField("elevation", value)} />
          </div>

          <div className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-[var(--color-on-surface)]">Ubicación del dispositivo</p>
                <p className="text-xs text-[var(--color-on-surface-variant)]">
                  Completa Este y Norte usando la geolocalización actual del equipo.
                </p>
              </div>
              <button
                type="button"
                className={secondaryButton}
                onClick={fillFromCurrentLocation}
                disabled={isLocating}
              >
                <MapPinned size={14} />
                {isLocating ? "Ubicando..." : "Usar ubicación actual"}
              </button>
            </div>
            {geoStatus ? (
              <p className="mt-3 text-xs text-[var(--color-on-surface-variant)]">{geoStatus}</p>
            ) : null}
            {geoPoint ? (
              <div className="mt-4 overflow-hidden rounded-xl border border-[var(--color-border-soft)]">
                {navigator.onLine ? (
                  <div className="h-56 w-full">
                    <MapContainer
                      center={[geoPoint.latitude, geoPoint.longitude]}
                      zoom={16}
                      scrollWheelZoom={false}
                      className="h-full w-full"
                    >
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <Marker position={[geoPoint.latitude, geoPoint.longitude]} icon={geoMarkerIcon} />
                    </MapContainer>
                  </div>
                ) : null}
                <div className="grid gap-2 bg-[var(--color-surface-container-low)] px-4 py-3 text-xs text-[var(--color-on-surface-variant)] md:grid-cols-3">
                  <p>Latitud: {geoPoint.latitude.toFixed(6)}</p>
                  <p>Longitud: {geoPoint.longitude.toFixed(6)}</p>
                  <p>Precisión: {geoPoint.accuracy ? `${Math.round(geoPoint.accuracy)} m` : "-"}</p>
                </div>
                {!navigator.onLine ? (
                  <p className="border-t border-[var(--color-border-soft)] px-4 py-3 text-xs text-[var(--color-on-surface-variant)]">
                    Sin conexión: se muestran las coordenadas capturadas, pero no el mapa base.
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          {registerType === "interior" ? (
            <div className="exploraciones-main-grid grid gap-3 md:grid-cols-3">
              {(["labL1", "labL2", "labL3"] as const).map((field, index) => (
                <FormSelect
                  key={field}
                  label={`Laboratorio L${index + 1}`}
                  value={sampleForm[field]}
                  options={laboratoryOptions}
                  onChange={(value) => setSampleField(field, value)}
                />
              ))}
            </div>
          ) : null}

          <ResultsEditor
            registerType={registerType}
            rows={results}
            elements={elements}
            interiorLabGroups={selectedInteriorLabGroups}
            laboratories={surfaceLaboratories}
            onChange={(id, field, value) =>
              setResults((current) => current.map((row) => (row.id === id ? { ...row, [field]: value } : row)))
            }
            onAddForLab={(lab) =>
              setResults((current) => [
                ...current,
                {
                  ...initialResult(),
                  labSlot: lab.slot ?? "",
                  laboratoryId: lab.laboratoryId ?? ""
                }
              ])
            }
            onRemove={(id) => setResults((current) => current.filter((row) => row.id !== id))}
          />

          <div className="exploraciones-form-actions flex flex-wrap items-center justify-end gap-2 border-t border-[var(--color-border-soft)] pt-4">
            {isEditing ? (
              <button
                type="button"
                className={secondaryButton}
                onClick={resetSampleForm}
              >
                Cancelar edición
              </button>
            ) : null}
            <button
              type="button"
              className={secondaryButton}
              onClick={resetSampleForm}
            >
              Limpiar
            </button>
            <button type="submit" className={primaryButton} disabled={isSaving}>
              <Save size={15} />
              {isEditing ? "Actualizar muestra" : "Guardar muestra"}
            </button>
          </div>
        </form>
      </section>

      <SamplesTable
        rows={sampleRows}
        search={search}
        priorityFilter={priorityFilter}
        resultStatusFilter={resultStatusFilter}
        onlyMine={onlyMine}
        onSearch={setSearch}
        onPriorityFilterChange={setPriorityFilter}
        onResultStatusFilterChange={setResultStatusFilter}
        onOnlyMineChange={setOnlyMine}
        onEdit={startEdit}
        onPrintVoucher={handlePrintVoucher}
      />

      {modalKind ? (
        <CatalogModal
          kind={modalKind}
          form={catalogForm}
          areaOptions={labelOptions(interiorAreas)}
          levelOptions={labelOptions(interiorLevels)}
          onChange={setCatalogField}
          onClose={closeModal}
          onSubmit={onSubmitCatalog}
        />
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
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`exploraciones-mode-button inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-bold transition ${
        active
          ? "bg-[var(--color-primary)] text-[var(--color-on-primary)]"
          : "bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]"
      }`}
    >
      <Icon size={16} />
      {children}
    </button>
  );
}

function CatalogButton({
  icon: Icon,
  onClick,
  children
}: {
  icon: typeof Plus;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} className={`exploraciones-catalog-button ${secondaryButton}`}>
      <Icon size={14} />
      {children}
    </button>
  );
}

function FormSelect({
  label,
  value,
  options,
  onChange,
  disabled
}: {
  label: string;
  value: string;
  options: Array<{ id: string; label: string; searchText?: string }>;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <AutocompleteSelect
        value={value}
        options={options}
        onChange={onChange}
        disabled={disabled}
        placeholder={`Seleccionar ${label.toLowerCase()}`}
        className={fieldClass}
      />
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  disabled = false,
  placeholder
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <input
        type={type}
        inputMode={type === "text" ? "decimal" : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className={fieldClass}
      />
    </div>
  );
}

function ResultsEditor({
  registerType,
  rows,
  elements,
  interiorLabGroups,
  laboratories,
  onChange,
  onAddForLab,
  onRemove
}: {
  registerType: RegisterType;
  rows: ResultRow[];
  elements: ElementCatalogItem[];
  interiorLabGroups: Array<{ slot: LaboratorySlot; laboratoryId: string; label: string }>;
  laboratories: CatalogItem[];
  onChange: (id: string, field: keyof ResultRow, value: string) => void;
  onAddForLab: (lab: { slot?: LaboratorySlot; laboratoryId?: string }) => void;
  onRemove: (id: string) => void;
}) {
  const [surfaceLabToAdd, setSurfaceLabToAdd] = useState("");
  const surfaceLabOptions = useMemo(() => labelOptions(laboratories), [laboratories]);
  const surfaceLabMap = useMemo(
    () => new Map(surfaceLabOptions.map((option) => [option.id, option.label])),
    [surfaceLabOptions]
  );
  const groupedRows = useMemo(() => {
    if (registerType === "interior") {
      return interiorLabGroups
        .filter((group) => group.laboratoryId)
        .map((group) => ({
          id: group.slot,
          label: group.label,
          rows: rows.filter((row) => row.labSlot === group.slot)
        }));
    }

    const ids = Array.from(new Set(rows.map((row) => row.laboratoryId).filter(Boolean)));
    return ids.map((laboratoryId) => ({
      id: laboratoryId,
      label: surfaceLabMap.get(laboratoryId) ?? "Laboratorio",
      rows: rows.filter((row) => row.laboratoryId === laboratoryId)
    }));
  }, [interiorLabGroups, registerType, rows, surfaceLabMap]);

  return (
    <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
          Resultados por laboratorio
        </h3>
        {registerType === "surface" ? (
          <div className="flex flex-wrap items-center gap-2">
            <div className="min-w-[240px] flex-1">
              <AutocompleteSelect
                value={surfaceLabToAdd}
                onChange={setSurfaceLabToAdd}
                options={surfaceLabOptions.filter((option) => !groupedRows.some((group) => group.id === option.id))}
                placeholder="Seleccionar laboratorio"
                className={fieldClass}
              />
            </div>
            <button
              type="button"
              className={secondaryButton}
              onClick={() => {
                if (!surfaceLabToAdd) return;
                onAddForLab({ laboratoryId: surfaceLabToAdd });
                setSurfaceLabToAdd("");
              }}
              disabled={!surfaceLabToAdd}
            >
              <Plus size={14} />
              Agregar laboratorio
            </button>
          </div>
        ) : null}
      </div>
      <div className="space-y-3">
        {groupedRows.length > 0 ? (
          groupedRows.map((group) => (
            <section
              key={group.id}
              className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-4"
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-[var(--color-on-surface)]">{group.label}</p>
                  <p className="text-xs text-[var(--color-on-surface-variant)]">
                    {group.rows.length > 0 ? `${group.rows.length} resultado(s)` : "Sin resultados todavía"}
                  </p>
                </div>
                <button
                  type="button"
                  className={secondaryButton}
                  onClick={() =>
                    onAddForLab(
                      registerType === "interior"
                        ? { slot: group.id as LaboratorySlot }
                        : { laboratoryId: group.id }
                    )
                  }
                >
                  <Plus size={14} />
                  Agregar resultado
                </button>
              </div>
              {group.rows.length > 0 ? (
                <div className="space-y-3">
                  {group.rows.map((row) => (
                    <div
                      key={row.id}
                      className="exploraciones-result-row grid gap-2 rounded-lg bg-[var(--color-surface-container-high)] p-3 md:grid-cols-[1.5fr_0.8fr_0.7fr_0.7fr_auto]"
                    >
                      <AutocompleteSelect
                        value={row.elementId}
                        onChange={(value) => {
                          const selected = elements.find((element) => element.id === value);
                          onChange(row.id, "elementId", value);
                          if (selected?.defaultUnit) onChange(row.id, "unit", selected.defaultUnit);
                        }}
                        options={elementOptions(elements)}
                        placeholder="Elemento"
                        className={fieldClass}
                      />
                      <input
                        className={fieldClass}
                        placeholder="Valor"
                        value={row.value}
                        onChange={(event) => onChange(row.id, "value", event.target.value)}
                      />
                      <input
                        className={fieldClass}
                        placeholder="Unidad"
                        value={row.unit}
                        onChange={(event) => onChange(row.id, "unit", event.target.value)}
                      />
                      <input
                        className={fieldClass}
                        placeholder="<, >, ND"
                        value={row.qualifier}
                        onChange={(event) => onChange(row.id, "qualifier", event.target.value)}
                      />
                      <button
                        type="button"
                        className="inline-flex h-[42px] items-center justify-center rounded-lg border border-[var(--color-error)]/45 px-3 text-[var(--color-error)] transition hover:bg-[var(--color-error)]/10"
                        onClick={() => onRemove(row.id)}
                        aria-label="Eliminar resultado"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--color-on-surface-variant)]">
                  Aún no se agregaron elementos para este laboratorio.
                </p>
              )}
            </section>
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-[var(--color-border-soft)] px-4 py-6 text-sm text-[var(--color-on-surface-variant)]">
            {registerType === "interior"
              ? "Selecciona al menos un laboratorio L1, L2 o L3 para registrar sus elementos y resultados."
              : "Agrega un laboratorio para empezar a cargar sus elementos y resultados."}
          </div>
        )}
      </div>
    </article>
  );
}

function formatVoucherNumber(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value) ? `N° ${String(value).padStart(5, "0")}` : "-";
}

function priorityRowClass(priority: SamplePriority) {
  const classes: Record<SamplePriority, string> = {
    URGENT: "bg-red-50/90 hover:bg-red-100/80",
    HIGH: "bg-amber-50/90 hover:bg-amber-100/80",
    NORMAL: "bg-emerald-50/70 hover:bg-emerald-100/70",
    LOW: "bg-sky-50/70 hover:bg-sky-100/70"
  };
  return classes[priority];
}

function priorityMobileClass(priority: SamplePriority) {
  const classes: Record<SamplePriority, string> = {
    URGENT: "bg-red-50/90",
    HIGH: "bg-amber-50/90",
    NORMAL: "bg-emerald-50/70",
    LOW: "bg-sky-50/70"
  };
  return classes[priority];
}

function priorityBadgeClass(priority: SamplePriority) {
  const classes: Record<SamplePriority, string> = {
    URGENT: "inline-flex rounded-full bg-red-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white",
    HIGH: "inline-flex rounded-full bg-amber-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white",
    NORMAL:
      "inline-flex rounded-full bg-emerald-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white",
    LOW: "inline-flex rounded-full bg-sky-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white"
  };
  return classes[priority];
}

function normalizeNameToken(value?: string | null) {
  return (value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\/\s]+/g, "-")
    .replace(/[^A-Z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function extractEditableSuffix(fullName?: string | null, prefix?: string) {
  const normalizedName = normalizeNameToken(fullName);
  const normalizedPrefix = normalizeNameToken(prefix);
  if (!normalizedName) return "";
  if (!normalizedPrefix) return normalizedName;
  if (normalizedName === normalizedPrefix) return "";
  if (normalizedName.startsWith(`${normalizedPrefix}-`)) {
    return normalizedName.slice(normalizedPrefix.length + 1);
  }
  return normalizedName;
}

function latLonToUtm(latitude: number, longitude: number) {
  const a = 6378137;
  const f = 1 / 298.257223563;
  const k0 = 0.9996;
  const eccSquared = 2 * f - f * f;
  const eccPrimeSquared = eccSquared / (1 - eccSquared);
  const zoneNumber = Math.floor((longitude + 180) / 6) + 1;
  const lonOrigin = (zoneNumber - 1) * 6 - 180 + 3;

  const latRad = (latitude * Math.PI) / 180;
  const lonRad = (longitude * Math.PI) / 180;
  const lonOriginRad = (lonOrigin * Math.PI) / 180;

  const N = a / Math.sqrt(1 - eccSquared * Math.sin(latRad) ** 2);
  const T = Math.tan(latRad) ** 2;
  const C = eccPrimeSquared * Math.cos(latRad) ** 2;
  const A = Math.cos(latRad) * (lonRad - lonOriginRad);

  const M =
    a *
    ((1 - eccSquared / 4 - (3 * eccSquared ** 2) / 64 - (5 * eccSquared ** 3) / 256) * latRad -
      ((3 * eccSquared) / 8 + (3 * eccSquared ** 2) / 32 + (45 * eccSquared ** 3) / 1024) *
        Math.sin(2 * latRad) +
      ((15 * eccSquared ** 2) / 256 + (45 * eccSquared ** 3) / 1024) * Math.sin(4 * latRad) -
      ((35 * eccSquared ** 3) / 3072) * Math.sin(6 * latRad));

  let east =
    k0 *
      N *
      (A +
        ((1 - T + C) * A ** 3) / 6 +
        ((5 - 18 * T + T ** 2 + 72 * C - 58 * eccPrimeSquared) * A ** 5) / 120) +
    500000;

  let north =
    k0 *
    (M +
      N *
        Math.tan(latRad) *
        (A ** 2 / 2 +
          ((5 - T + 9 * C + 4 * C ** 2) * A ** 4) / 24 +
          ((61 - 58 * T + T ** 2 + 600 * C - 330 * eccPrimeSquared) * A ** 6) / 720));

  if (latitude < 0) {
    north += 10000000;
  }

  east = Number(east.toFixed(2));
  north = Number(north.toFixed(2));

  return { east, north, zoneNumber };
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatVoucherDate(value?: string | null) {
  if (!value) return "____/____/____";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "____/____/____";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

function lineValue(value?: unknown, minLength = 12) {
  const text = value === null || value === undefined || value === "" ? "" : String(value);
  const underline = "_".repeat(Math.max(minLength, 1));
  return text ? `${escapeHtml(text)}${underline.slice(0, Math.max(2, minLength - text.length))}` : underline;
}

function compactValue(value: unknown, maxLength = 26) {
  const text = String(value ?? "").trim();
  if (text.length <= maxLength) return escapeHtml(text);
  return `${escapeHtml(text.slice(0, Math.max(0, maxLength - 1)))}…`;
}

function writeVoucherPrintDocument(printWindow: Window, row: SampleTableRow) {
  const raw = row.raw as any;
  const payload = row.source === "local" ? raw.payload ?? {} : raw;
  const voucher = formatVoucherNumber(row.voucherNumber).replace("N° ", "");
  const sampleId = row.code || row.name || "";
  const east = compactValue(payload.east, 12);
  const north = compactValue(payload.north, 12);
  const elevation = compactValue(payload.elevation, 10);
  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Talón ${escapeHtml(voucher)}</title>
  <style>
    @page { size: landscape; margin: 8mm; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #fff; color: #171717; font-family: "Courier New", monospace; }
    .voucher-sheet { width: 1188px; height: 302px; padding: 18px 14px 0; }
    .voucher { display: grid; grid-template-columns: 810px 376px; width: 1188px; height: 302px; border: 3px solid #27384a; overflow: hidden; }
    .main { border: 4px solid #27384a; border-right: 0; padding: 17px 16px 8px 14px; position: relative; overflow: hidden; }
    .header { display: grid; grid-template-columns: 142px 1fr 157px; align-items: center; height: 53px; margin-bottom: 4px; }
    .logo { width: 142px; height: 53px; border: 2px solid #8e9ba2; font-family: Arial, sans-serif; line-height: 1; position: relative; overflow: hidden; }
    .logo .small { position: absolute; left: 3px; top: 3px; font-size: 16px; font-weight: 700; color: #374151; }
    .logo .big { position: absolute; left: 3px; bottom: 4px; font-size: 18px; font-weight: 900; color: #111827; letter-spacing: 0; }
    .logo .mark { position: absolute; left: 40px; top: 12px; font-size: 13px; font-weight: 800; color: #111827; opacity: .9; }
    .brand { height: 53px; background: #26384b; padding: 5px 10px 0; }
    .brand-title { color: #ffe31f; font-family: Arial, sans-serif; font-size: 24px; font-weight: 900; line-height: 1.05; }
    .brand-sub { color: #fff; font-family: Arial, sans-serif; font-size: 14px; margin-left: 16px; }
    .number { justify-self: end; width: 150px; height: 38px; background: #d43a2f; color: #fff; border-radius: 4px; display: flex; align-items: center; justify-content: center; gap: 12px; font-family: Arial, sans-serif; font-weight: 900; font-size: 24px; }
    .number span:first-child { font-size: 20px; }
    .form { width: 100%; overflow: hidden; }
    .form-row { display: grid; gap: 10px; height: 27px; align-items: end; font-size: 18px; line-height: 1; white-space: nowrap; }
    .cols-project { grid-template-columns: 1fr 220px; }
    .cols-sampler { grid-template-columns: 1fr 300px; }
    .cols-place { grid-template-columns: 315px 1fr; }
    .field { display: flex; min-width: 0; align-items: end; gap: 4px; }
    .label { flex: 0 0 auto; }
    .fill { flex: 1 1 auto; min-width: 0; height: 18px; border-bottom: 1.7px solid #171717; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding: 0 4px 1px; }
    .coords { display: grid; grid-template-columns: 1fr 1fr .8fr; gap: 5px; min-width: 0; }
    .coord { display: flex; min-width: 0; align-items: end; }
    .coord-label { flex: 0 0 auto; }
    .coord-value { flex: 1 1 auto; min-width: 0; height: 18px; border-bottom: 1.7px solid #171717; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding: 0 3px 1px; }
    .line { font-size: 18px; line-height: 1.5; white-space: nowrap; overflow: hidden; }
    .obs { letter-spacing: 1px; font-size: 18px; line-height: 1.45; }
    .stubs { border-left: 3px dashed #7d8a8e; padding: 8px 10px 8px 18px; display: grid; grid-template-rows: 1fr 1fr 1fr; gap: 8px; }
    .stub { border-top: 3px dashed #7d8a8e; padding-top: 8px; }
    .stub:first-child { border-top: 0; padding-top: 0; }
    .stub-title { height: 32px; border: 2px solid #9fc4d6; border-radius: 3px; display: flex; align-items: center; justify-content: center; color: #788487; font-family: Arial, sans-serif; font-weight: 800; font-size: 12px; }
    .stub-box { height: 45px; margin-top: 4px; border-radius: 3px; background: #e7f1f7; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .voucher-sheet { padding-top: 0; }
    }
  </style>
</head>
<body>
  <div class="voucher-sheet">
    <div class="voucher">
      <section class="main">
        <div class="header">
          <div class="logo"><div class="small">Empresa Minera</div><div class="big">Marte S.R.L.</div></div>
          <div class="brand"><div class="brand-title">EMPRESA MINERA MARTE S.R.L.</div><div class="brand-sub">REGISTRO DE MUESTREO</div></div>
          <div class="number"><span>N°</span><span>${escapeHtml(voucher)}</span></div>
        </div>
        <div class="form">
          <div class="form-row cols-project">
            <div class="field"><span class="label">PROYECTO:</span><span class="fill">LIPEÑA</span></div>
            <div class="field"><span class="label">FECHA:</span><span class="fill">${escapeHtml(formatVoucherDate(row.sampledAt))}</span></div>
          </div>
          <div class="form-row cols-sampler">
            <div class="field"><span class="label">MUESTREADOR:</span><span class="fill">${compactValue(row.createdByName, 34)}</span></div>
            <div class="field"><span class="label">ID DE MUESTRA:</span><span class="fill">${compactValue(sampleId, 24)}</span></div>
          </div>
          <div class="form-row cols-place">
            <div class="field"><span class="label">LUGAR:</span><span class="fill">${compactValue(row.location, 24)}</span></div>
            <div class="field">
              <span class="label">COORDENADAS UTM:</span>
              <span class="coords">
                <span class="coord"><span class="coord-label">X:</span><span class="coord-value">${east}</span></span>
                <span class="coord"><span class="coord-label">Y:</span><span class="coord-value">${north}</span></span>
                <span class="coord"><span class="coord-label">Z:</span><span class="coord-value">${elevation}</span></span>
              </span>
            </div>
          </div>
          <div class="line">TIPO DE MUESTRA: [ ] Testigo&nbsp; [ ] Canal&nbsp; [ ] Chips/Detrito&nbsp; [ ] Grab</div>
          <div class="line">ELEMENTOS A ANALIZAR: [ ]Cu&nbsp; [ ]Au&nbsp; [ ]Ag&nbsp; [ ]ICP Multi&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; OTROS:________</div>
          <div class="line obs">OBSERVACIONES:_____________________________________________________</div>
          <div class="line obs">___________________________________________________________________</div>
          <div class="line obs">___________________________________________________________________</div>
        </div>
      </section>
      <aside class="stubs">
        <div class="stub"><div class="stub-title">EMPRESA MINERA MARTE S.R.L.</div><div class="stub-box"></div></div>
        <div class="stub"><div class="stub-title">EMPRESA MINERA MARTE S.R.L.</div><div class="stub-box"></div></div>
        <div class="stub"><div class="stub-title">EMPRESA MINERA MARTE S.R.L.</div><div class="stub-box"></div></div>
      </aside>
    </div>
  </div>
  <script>
    window.addEventListener("load", () => {
      setTimeout(() => {
        window.focus();
        window.print();
      }, 120);
    });
  </script>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

function SamplesTable({
  rows,
  search,
  priorityFilter,
  resultStatusFilter,
  onlyMine,
  onSearch,
  onPriorityFilterChange,
  onResultStatusFilterChange,
  onOnlyMineChange,
  onEdit,
  onPrintVoucher
}: {
  rows: SampleTableRow[];
  search: string;
  priorityFilter: SamplePriority | "";
  resultStatusFilter: ResultStatusFilter;
  onlyMine: boolean;
  onSearch: (value: string) => void;
  onPriorityFilterChange: (value: SamplePriority | "") => void;
  onResultStatusFilterChange: (value: ResultStatusFilter) => void;
  onOnlyMineChange: (value: boolean) => void;
  onEdit: (row: SampleTableRow) => void;
  onPrintVoucher: (row: SampleTableRow) => void;
}) {
  const [detailRow, setDetailRow] = useState<SampleTableRow | null>(null);

  return (
    <>
      <article className={`${panelClass} exploraciones-panel overflow-hidden`}>
        <div className="border-b border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] px-5 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
              <FlaskConical size={14} />
              Registros recientes
            </h2>
            <label className="exploraciones-search relative min-w-64">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-on-surface-variant)]" />
              <input className={`${fieldClass} pl-9`} value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Buscar por código" />
            </label>
            <select
              className={`${fieldClass} w-auto min-w-40`}
              value={priorityFilter}
              onChange={(event) => onPriorityFilterChange(event.target.value as SamplePriority | "")}
            >
              <option value="">Todas las prioridades</option>
              {PRIORITY_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              className={`${fieldClass} w-auto min-w-40`}
              value={resultStatusFilter}
              onChange={(event) => onResultStatusFilterChange(event.target.value as ResultStatusFilter)}
            >
              <option value="all">Todos los resultados</option>
              <option value="with">Con resultados</option>
              <option value="without">Sin resultados</option>
            </select>
            <button
              type="button"
              className={onlyMine ? primaryButton : secondaryButton}
              onClick={() => onOnlyMineChange(!onlyMine)}
            >
              Mis registros
            </button>
          </div>
        </div>
        <div className="exploraciones-table-wrap overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr>
                {["Código", "Nombre", "Talón", "Prioridad", "Ubicación", "Objetivo", "Registrado por", "Muestreo", "Resultados", "Acciones"].map((heading) => (
                  <th key={heading} className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-soft)]">
              {rows.map((row) => (
                <tr key={row.id} className={`${priorityRowClass(row.priority)} transition hover:brightness-[0.98]`}>
                  <td className="px-4 py-3 text-sm font-bold">{row.code}</td>
                  <td className="px-4 py-3 text-xs">{row.name ?? "-"}</td>
                  <td className="px-4 py-3 text-xs font-bold">{formatVoucherNumber(row.voucherNumber)}</td>
                  <td className="px-4 py-3 text-xs">
                    <span className={priorityBadgeClass(row.priority)}>{PRIORITY_LABELS[row.priority]}</span>
                  </td>
                  <td className="px-4 py-3 text-xs">{row.location}</td>
                  <td className="px-4 py-3 text-xs">{row.objectiveName}</td>
                  <td className="px-4 py-3 text-xs">{row.createdByName}</td>
                  <td className="px-4 py-3 text-xs">{formatDate(row.sampledAt)}</td>
                  <td className="px-4 py-3 text-xs">
                    <ResultStatus results={row.results} />
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className={secondaryButton} onClick={() => setDetailRow(row)}>
                        <Eye size={14} />
                        Ver
                      </button>
                      <button type="button" className={secondaryButton} onClick={() => onEdit(row)}>
                        <Pencil size={14} />
                        Editar
                      </button>
                      <button
                        type="button"
                        className={secondaryButton}
                        onClick={() => onPrintVoucher(row)}
                        disabled={row.source !== "remote"}
                      >
                        <Printer size={14} />
                        Imprimir talón
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-6 text-center text-sm text-[var(--color-on-surface-variant)]">
                    No hay muestras para mostrar.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="exploraciones-mobile-list hidden divide-y divide-[var(--color-border-soft)]">
          {rows.map((row) => (
            <div key={row.id} className={`space-y-2 px-4 py-4 ${priorityMobileClass(row.priority)}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                    Código
                  </p>
                  <p className="mt-1 text-sm font-bold">{row.code}</p>
                  <p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">{row.name ?? "-"}</p>
                  <p className="mt-1 text-xs font-bold">Talón {formatVoucherNumber(row.voucherNumber)}</p>
                </div>
                <p className="shrink-0 text-xs text-[var(--color-on-surface-variant)]">
                  {formatDate(row.sampledAt)}
                </p>
              </div>
              <div className="grid gap-2 text-xs">
                <p>
                  <span className="font-bold text-[var(--color-on-surface-variant)]">Prioridad: </span>
                  <span className={priorityBadgeClass(row.priority)}>{PRIORITY_LABELS[row.priority]}</span>
                </p>
                <p>
                  <span className="font-bold text-[var(--color-on-surface-variant)]">Ubicación: </span>
                  {row.location}
                </p>
                <p>
                  <span className="font-bold text-[var(--color-on-surface-variant)]">Objetivo: </span>
                  {row.objectiveName}
                </p>
                <p>
                  <span className="font-bold text-[var(--color-on-surface-variant)]">Registrado por: </span>
                  {row.createdByName}
                </p>
                <div>
                  <span className="font-bold text-[var(--color-on-surface-variant)]">Resultados: </span>
                  <div className="mt-1">
                    <ResultStatus results={row.results} />
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={secondaryButton} onClick={() => setDetailRow(row)}>
                  <Eye size={14} />
                  Ver
                </button>
                <button type="button" className={secondaryButton} onClick={() => onEdit(row)}>
                  <Pencil size={14} />
                  Editar resultados
                </button>
                <button
                  type="button"
                  className={secondaryButton}
                  onClick={() => onPrintVoucher(row)}
                  disabled={row.source !== "remote"}
                >
                  <Printer size={14} />
                  Imprimir talón
                </button>
              </div>
            </div>
          ))}
          {rows.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-[var(--color-on-surface-variant)]">
              No hay muestras para mostrar.
            </p>
          ) : null}
        </div>
      </article>

      {detailRow ? <SampleDetailModal row={detailRow} onClose={() => setDetailRow(null)} /> : null}
    </>
  );
}

function ResultStatus({ results }: { results: any[] }) {
  const hasAnyResults = hasResults(results);
  return (
    <div className="flex flex-col gap-1">
      <span
        className={`inline-flex w-fit rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
          hasAnyResults
            ? "bg-[var(--color-success)]/18 text-[var(--color-success)]"
            : "bg-[var(--color-error)]/14 text-[var(--color-error)]"
        }`}
      >
        {hasAnyResults ? `Con resultados (${results.length})` : "Sin resultados"}
      </span>
      {hasAnyResults ? (
        <span className="text-xs text-[var(--color-on-surface-variant)]">{getResultText(results)}</span>
      ) : null}
    </div>
  );
}

function SampleDetailModal({ row, onClose }: { row: SampleTableRow; onClose: () => void }) {
  const raw = row.raw as any;
  const payload = row.source === "local" ? raw.payload ?? {} : raw;
  const isInterior =
    row.source === "local"
      ? raw.module === "interior"
      : Boolean(raw.labor);
  const coordinates = [
    ["Este", payload.east],
    ["Norte", payload.north],
    ["Elevación", payload.elevation]
  ];
  const labAssignments = row.labAssignments ?? [];

  return (
    <div className="exploraciones-modal fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4">
      <section className="exploraciones-modal-card flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border-soft)] p-5">
          <div>
            <h3 className="text-xl font-bold">Detalle del registro</h3>
            <p className="mt-1 text-sm font-semibold text-[var(--color-on-surface-variant)]">{row.code}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-[var(--color-outline-variant)] p-2 text-[var(--color-on-surface-variant)]">
            <X size={15} />
          </button>
        </div>

        <div className="overflow-y-auto p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <DetailSection title="Resumen">
              <DetailItem label="Estado" value={row.source === "local" ? "Pendiente local" : "Sincronizado"} />
              <DetailItem label="Tipo" value={isInterior ? "Interior Mina" : "Superficie"} />
              <DetailItem label="Nombre" value={row.name ?? "-"} />
              <DetailItem label="Talón" value={formatVoucherNumber(row.voucherNumber)} />
              <DetailItem label="Prioridad" value={PRIORITY_LABELS[row.priority]} />
              <DetailItem label="Ubicación" value={row.location} />
              <DetailItem label="Objetivo" value={row.objectiveName} />
              <DetailItem label="Registrado por" value={row.createdByName} />
              <DetailItem label="Fecha de muestreo" value={formatDate(row.sampledAt)} />
              <DetailItem label="Resultados" value={hasResults(row.results) ? `${row.results.length} registrados` : "Sin resultados"} />
            </DetailSection>

            <DetailSection title="Coordenadas">
              {coordinates.map(([label, value]) => (
                <DetailItem key={label} label={label} value={value ?? "-"} />
              ))}
            </DetailSection>
          </div>

          <DetailSection title="Laboratorios" className="mt-4">
            {labAssignments.length > 0 ? (
              <div className="grid gap-2 md:grid-cols-3">
                {labAssignments.map((assignment: any, index: number) => (
                  <div key={`${assignment.slot ?? assignment.surfaceLaboratoryId ?? index}-${index}`} className="rounded-lg bg-[var(--color-surface-container-high)] p-3">
                    <p className="text-xs font-bold uppercase text-[var(--color-on-surface-variant)]">
                      {assignment.slot ?? `LAB ${index + 1}`}
                    </p>
                    <p className="mt-1 text-sm">
                      {assignment.laboratory?.name ?? assignment.interiorLaboratoryId ?? assignment.surfaceLaboratoryId ?? "-"}
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">
                      {(assignment.results ?? []).length} resultados
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--color-on-surface-variant)]">Sin laboratorios asignados.</p>
            )}
          </DetailSection>

          <DetailSection title="Resultados" className="mt-4">
            {hasResults(row.results) ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                      <th className="px-3 py-2">Elemento</th>
                      <th className="px-3 py-2">Valor</th>
                      <th className="px-3 py-2">Unidad</th>
                      <th className="px-3 py-2">Calificador</th>
                      <th className="px-3 py-2">Laboratorio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border-soft)]">
                    {row.results.map((result: any, index) => (
                      <tr key={result.id ?? `${result.elementId ?? "result"}-${index}`}>
                        <td className="px-3 py-2">{result.element?.symbol ?? result.element?.name ?? result.elementId ?? "-"}</td>
                        <td className="px-3 py-2">{result.value ?? "-"}</td>
                        <td className="px-3 py-2">{result.unit ?? "-"}</td>
                        <td className="px-3 py-2">{result.qualifier ?? "-"}</td>
                        <td className="px-3 py-2">{result.labAssignmentLabel ?? result.laboratory?.name ?? result.surfaceLaboratoryId ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm font-semibold text-[var(--color-error)]">Este registro aún no tiene resultados.</p>
            )}
          </DetailSection>

          <DetailSection title="Datos completos" className="mt-4">
            <pre className="max-h-72 overflow-auto rounded-lg bg-[var(--color-surface-container-high)] p-3 text-xs text-[var(--color-on-surface-variant)]">
              {stringifyDetail(row.source === "local" ? raw.payload : raw)}
            </pre>
          </DetailSection>
        </div>
      </section>
    </div>
  );
}

function DetailSection({
  title,
  children,
  className = ""
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-4 ${className}`}>
      <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">{title}</h4>
      {children}
    </section>
  );
}

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="mb-2 last:mb-0">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">{label}</p>
      <p className="mt-0.5 text-sm font-semibold">{value}</p>
    </div>
  );
}

function CatalogModal({
  kind,
  form,
  areaOptions,
  levelOptions,
  onChange,
  onClose,
  onSubmit
}: {
  kind: ModalKind;
  form: CatalogForm;
  areaOptions: Array<{ id: string; label: string; searchText?: string }>;
  levelOptions: Array<{ id: string; label: string; searchText?: string }>;
  onChange: (field: keyof CatalogForm, value: string) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const needsAbbreviation = kind.includes("area") || kind === "interior-level" || kind === "interior-labor";
  const isElement = kind === "element";
  const needsAreaParent = kind === "interior-level";
  const needsLevelParent = kind === "interior-labor";

  return (
    <div className="exploraciones-modal fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4">
      <form onSubmit={onSubmit} className="exploraciones-modal-card w-full max-w-lg rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-[var(--color-border-soft)] pb-3">
          <h3 className="text-lg font-bold">{modalTitle(kind)}</h3>
          <button type="button" onClick={onClose} className="rounded-lg border border-[var(--color-outline-variant)] p-2 text-[var(--color-on-surface-variant)]">
            <X size={15} />
          </button>
        </div>
        <div className="space-y-3">
          {needsAreaParent ? (
            <FormSelect label="Área" value={form.parentId} options={areaOptions} onChange={(value) => onChange("parentId", value)} />
          ) : null}
          {needsLevelParent ? (
            <FormSelect label="Nivel" value={form.parentId} options={levelOptions} onChange={(value) => onChange("parentId", value)} />
          ) : null}
          <TextField label="Nombre" value={form.name} onChange={(value) => onChange("name", value)} />
          {isElement ? (
            <div className="exploraciones-modal-grid grid grid-cols-2 gap-3">
              <TextField label="Símbolo" value={form.symbol} onChange={(value) => onChange("symbol", value)} />
              <TextField label="Unidad" value={form.defaultUnit} onChange={(value) => onChange("defaultUnit", value)} />
            </div>
          ) : null}
          {needsAbbreviation || kind.includes("laboratory") ? (
            <TextField label="Abreviatura" value={form.abbreviation} onChange={(value) => onChange("abbreviation", value)} />
          ) : null}
          {kind === "interior-level" ? (
            <TextField label="Elevación" value={form.elevation} onChange={(value) => onChange("elevation", value)} />
          ) : null}
          <TextField label="Descripción" value={form.description} onChange={(value) => onChange("description", value)} />
        </div>
        <div className="exploraciones-modal-actions mt-5 flex justify-end gap-2">
          <button type="button" className={secondaryButton} onClick={onClose}>Cancelar</button>
          <button type="submit" className={primaryButton}>
            <Plus size={15} />
            Guardar
          </button>
        </div>
      </form>
    </div>
  );
}
