import { FormEvent, useEffect, useMemo, useRef, useState, type InputHTMLAttributes } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import L from "leaflet";
import * as XLSX from "xlsx";
import {
  Beaker,
  ChevronDown,
  Download,
  Eye,
  FlaskConical,
  Landmark,
  Layers3,
  MapPinned,
  Microscope,
  MoreVertical,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  Save,
  Search,
  Send,
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
  useCreateInteriorDispatchMutation,
  useCreateInteriorSampleResultMutation,
  useCreateSurfaceDispatchMutation,
  useCreateSurfaceSampleResultMutation,
  useDeleteInteriorDispatchMutation,
  useDeleteInteriorSampleMutation,
  useDeleteSurfaceDispatchMutation,
  useDeleteSurfaceSampleMutation,
  useInteriorDispatchesQuery,
  useInteriorAreasQuery,
  useInteriorHierarchyQuery,
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
  useSurfaceDispatchesQuery,
  useSurfaceAreasQuery,
  useSurfaceHierarchyQuery,
  useSurfaceLaborsQuery,
  useSurfaceLaboratoriesQuery,
  useSurfaceLevelsQuery,
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
  InteriorHierarchyArea,
  InteriorLabor,
  InteriorSample,
  LaboratorySlot,
  SampleDispatch,
  SampleCategory,
  SamplePriority,
  SampleStatus,
  SurfaceHierarchyArea,
  SurfaceLabor,
  SurfaceSample
} from "@/features/exploraciones/model/proposalSamples.schema";
import {
  getInteriorAreas,
  getInteriorLabors,
  getInteriorLaboratories,
  getInteriorLevels,
  getInteriorObjectives,
  getSharedElements,
  getSurfaceAreas,
  getSurfaceLabors,
  getSurfaceLaboratories,
  getSurfaceLevels,
  getSurfaceObjectives
} from "@/features/exploraciones/api/proposalSamplesApi";
import type { OfflineProposalCatalog, OfflineProposalSample } from "@/features/exploraciones/db/exploracionesDb";
import { cacheProposalCatalogs, pruneMissingProposalCatalogs } from "@/features/exploraciones/db/exploracionesDb";

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

const MAP_TILE_CACHE_NAME = "minera-marte-map-tiles-v1";
const MAP_TILE_SERVERS = ["a", "b", "c"] as const;
const MAP_TILE_ZOOMS = [13, 14, 15, 16, 17] as const;
const MAP_TILE_RADIUS_BY_ZOOM: Record<(typeof MAP_TILE_ZOOMS)[number], number> = {
  13: 1,
  14: 1,
  15: 1,
  16: 3,
  17: 3
};
const MAP_READY_ZOOM = 16;
const REGIONAL_MAP_CACHE_VERSION = "sud-lipez-v3";
const REGIONAL_MAP_CACHE_KEY = `marte-regional-map-${REGIONAL_MAP_CACHE_VERSION}`;
const CERRO_LIPENA_CENTER = { latitude: -21.735132963511546, longitude: -66.45902922579812 };
const SUD_LIPEZ_BOUNDS = {
  south: -22.9,
  west: -67.9,
  north: -20.8,
  east: -65.2
};
const CERRO_LIPENA_DETAIL_BOUNDS = {
  south: -21.95,
  west: -66.75,
  north: -21.52,
  east: -66.18
};

type RegisterType = "interior" | "surface";
type ResultStatusFilter = "all" | "with" | "without";
type SampleLifecycleFilter = "all" | SampleStatus;
type SyncStatusFilter = "all" | "pending" | "synced";
type RecentRecordsView = "records" | "batches";
type ModalKind =
  | "element"
  | "interior-area"
  | "interior-level"
  | "interior-labor"
  | "interior-objective"
  | "interior-laboratory"
  | "surface-area"
  | "surface-level"
  | "surface-labor"
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
  surfaceLevelId: string;
  surfaceLaborId: string;
  surfaceObjectiveId: string;
  priority: SamplePriority | "";
  sampleNameSuffix: string;
  sampledAt: string;
  east: string;
  north: string;
  elevation: string;
  labL1: string;
  labL2: string;
  labL3: string;
}

interface DispatchForm {
  laboratoryId: string;
  projectName: string;
  sentAt: string;
  notes: string;
}

interface DispatchDraftItem {
  sampleId: string;
  elementIds: string[];
  notes: string;
}

interface DispatchResultTarget {
  dispatch: SampleDispatch;
  item: NonNullable<SampleDispatch["items"]>[number];
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
  voucherCode?: string | null;
  category: SampleCategory;
  status: SampleStatus;
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
const PRIORITY_VALUES = new Set<SamplePriority>(PRIORITY_OPTIONS.map((option) => option.id));

const CATEGORY_OPTIONS: Array<{ id: SampleCategory; label: string }> = [
  { id: "EXPLORATION", label: "Exploración" },
  { id: "PRODUCTION", label: "Producción" }
];
const CATEGORY_VALUES = new Set<SampleCategory>(CATEGORY_OPTIONS.map((option) => option.id));

const CATEGORY_LABELS: Record<SampleCategory, string> = {
  EXPLORATION: "Exploración",
  PRODUCTION: "Producción"
};

const PRIORITY_LABELS: Record<SamplePriority, string> = {
  URGENT: "Urgente",
  HIGH: "Alta",
  NORMAL: "Normal",
  LOW: "Baja"
};

const SAMPLE_STATUS_LABELS: Record<SampleStatus, string> = {
  REGISTERED: "Registrada",
  DISPATCHED: "Despachada",
  COMPLETED: "Completada"
};

const SAMPLE_STATUS_OPTIONS: Array<{ id: SampleLifecycleFilter; label: string }> = [
  { id: "all", label: "Todos los estados" },
  { id: "REGISTERED", label: "Registradas" },
  { id: "DISPATCHED", label: "Despachadas" },
  { id: "COMPLETED", label: "Completadas" }
];

const DISPATCH_STATUS_LABELS: Record<"PENDING" | "COMPLETED", string> = {
  PENDING: "Pendiente",
  COMPLETED: "Completado"
};

const SAMPLE_STATUS_WEIGHT: Record<SampleStatus, number> = {
  DISPATCHED: 3,
  COMPLETED: 2,
  REGISTERED: 1
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

const DEFAULT_ELEMENTS = [
  { name: "Oro", symbol: "Au", defaultUnit: "g/t" },
  { name: "Plata", symbol: "Ag", defaultUnit: "g/t" },
  { name: "Cobre", symbol: "Cu", defaultUnit: "%" },
  { name: "Plomo", symbol: "Pb", defaultUnit: "%" },
  { name: "Zinc", symbol: "Zn", defaultUnit: "%" },
  { name: "Antimonio", symbol: "Sb", defaultUnit: "%" },
  { name: "Bismuto", symbol: "Bi", defaultUnit: "%" }
] as const;

const DEFAULT_LABORATORIES = [
  { name: "LIPEÑA (LIPEÑA)", abbreviation: "LIP" },
  { name: "CHILCOBIJA (CHILCOBIJA)", abbreviation: "CHI" },
  { name: "POTOSI (CONDE ORTEGA)", abbreviation: "POT" },
  { name: "SPECTRO LAB", abbreviation: "SPL" },
  { name: "CASTRO", abbreviation: "CAS" }
] as const;

const SURFACE_DEFAULT_AREAS = [
  { localId: "seed-surface-area-mosa", name: "MOSA", abbreviation: "MS" },
  { localId: "seed-surface-area-central", name: "CENTRAL", abbreviation: "CEN" },
  { localId: "seed-surface-area-lipena", name: "LIPEÑA", abbreviation: "LIP" },
  { localId: "seed-surface-area-ayda", name: "AYDA", abbreviation: "AY" },
  { localId: "seed-surface-area-progreso", name: "EL PROGRESO", abbreviation: "EP" },
  { localId: "seed-surface-area-horizonte", name: "HORIZONTE", abbreviation: "HZ" }
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
    surfaceLevelId: "",
    surfaceLaborId: "",
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

function initialDispatchForm(): DispatchForm {
  return {
    laboratoryId: "",
    projectName: "",
    sentAt: toLocalDatetimeInput(),
    notes: ""
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

function toNumber(value: string, label = "valor") {
  if (!value.trim()) return undefined;
  const parsed = Number(value.trim().replace(",", "."));
  if (!Number.isFinite(parsed)) {
    throw new Error(`${label} debe ser un numero valido.`);
  }
  return parsed;
}

function toIso(value: string) {
  if (!value.trim()) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("La fecha de muestreo no es valida.");
  }
  return date.toISOString();
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

function isUsableCatalog(item: OfflineProposalCatalog) {
  if (!item.localId.startsWith("seed-")) return true;
  return item.entity === "element" || item.entity === "laboratory";
}

function mergeById<T extends { id: string }>(remote: T[], local: T[]) {
  return Array.from(new Map([...remote, ...local].map((item) => [item.id, item])).values());
}

function flattenInteriorHierarchyAreas(items: InteriorHierarchyArea[]): CatalogItem[] {
  return items.map((area) => ({
    id: area.id,
    name: area.name,
    abbreviation: area.abbreviation,
    description: area.description
  }));
}

function flattenInteriorHierarchyLevels(items: InteriorHierarchyArea[]) {
  return items.flatMap((area) =>
    (area.levels ?? []).map((level) => ({
      id: level.id,
      name: level.name,
      abbreviation: level.abbreviation,
      description: level.description,
      interiorAreaId: area.id,
      elevation: level.elevation,
      area: {
        id: area.id,
        name: area.name,
        abbreviation: area.abbreviation,
        description: area.description
      }
    }))
  );
}

function flattenInteriorHierarchyLabors(items: InteriorHierarchyArea[]) {
  return items.flatMap((area) =>
    (area.levels ?? []).flatMap((level) =>
      (level.labors ?? []).map((labor) => ({
        id: labor.id,
        name: labor.name,
        abbreviation: labor.abbreviation,
        description: labor.description,
        interiorLevelId: level.id,
        level: {
          id: level.id,
          name: level.name,
          abbreviation: level.abbreviation,
          description: level.description,
          interiorAreaId: area.id,
          elevation: level.elevation,
          area: {
            id: area.id,
            name: area.name,
            abbreviation: area.abbreviation,
            description: area.description
          }
        }
      }))
    )
  );
}

function flattenSurfaceHierarchyAreas(items: SurfaceHierarchyArea[]): CatalogItem[] {
  return items.map((area) => ({
    id: area.id,
    name: area.name,
    abbreviation: area.abbreviation,
    description: area.description
  }));
}

function flattenSurfaceHierarchyLevels(items: SurfaceHierarchyArea[]) {
  return items.flatMap((area) =>
    (area.levels ?? []).map((level) => ({
      id: level.id,
      name: level.name,
      abbreviation: level.abbreviation,
      description: level.description,
      surfaceAreaId: area.id,
      elevation: level.elevation,
      area: {
        id: area.id,
        name: area.name,
        abbreviation: area.abbreviation,
        description: area.description
      }
    }))
  );
}

function flattenSurfaceHierarchyLabors(items: SurfaceHierarchyArea[]) {
  return items.flatMap((area) =>
    (area.levels ?? []).flatMap((level) =>
      (level.labors ?? []).map((labor) => ({
        id: labor.id,
        name: labor.name,
        abbreviation: labor.abbreviation,
        description: labor.description,
        surfaceLevelId: level.id,
        level: {
          id: level.id,
          name: level.name,
          abbreviation: level.abbreviation,
          description: level.description,
          surfaceAreaId: area.id,
          elevation: level.elevation,
          area: {
            id: area.id,
            name: area.name,
            abbreviation: area.abbreviation,
            description: area.description
          }
        }
      }))
    )
  );
}

const LEGACY_SEEDED_INTERIOR_AREAS = new Set(["MOSA|MS", "CENTRAL|CEN"]);
const LEGACY_SEEDED_SURFACE_AREAS = new Set([
  "MOSA|MS",
  "CENTRAL|CEN",
  "LIPEÑA|LIP",
  "LIPEÑA|LIP/SUP",
  "AYDA|AY",
  "EL PROGRESO|EP",
  "HORIZONTE|HZ"
]);
const LEGACY_SEEDED_LEVELS = new Set([
  "ESPERANZA|ESP",
  "LUZ|LZ",
  "PORVENIR|PV",
  "CUADRO|CD",
  "NIVEL 0|NIV0",
  "NIVEL 40|NIV40",
  "NIVEL80|NIV80",
  "NIVEL 80|NIV80"
]);
const LEGACY_SEEDED_LABORS = new Set([
  "RECORTE_1|R1",
  "CANDELARIA|CAN",
  "RAJO1|RJ1",
  "RAJO2|RJ2",
  "RAJO3|RJ3",
  "RAJO4|RJ4",
  "RECORTE_SUR_1|RS1",
  "RECORTE_SUR_2|RS2",
  "RECORTE_NORTE_1|RN1",
  "BANCA_NORTE|BN",
  "BANCA_CENTRO|BC",
  "BANCA_SUR|BS"
]);

function legacyStructureKey(item: { name?: string | null; abbreviation?: string | null }) {
  return `${(item.name ?? "").trim().toUpperCase()}|${(item.abbreviation ?? "").trim().toUpperCase()}`;
}

function isLegacySeededArea(item: { name?: string | null; abbreviation?: string | null }, module: RegisterType) {
  const key = legacyStructureKey(item);
  return module === "interior" ? LEGACY_SEEDED_INTERIOR_AREAS.has(key) : LEGACY_SEEDED_SURFACE_AREAS.has(key);
}

function isVisibleStructureCatalog(item: OfflineProposalCatalog, category?: SampleCategory) {
  if (!isUsableCatalog(item)) return false;
  if (item.entity === "area" && (item.module === "interior" || item.module === "surface")) {
    if (isLegacySeededArea(item, item.module)) return false;
  } else if (item.entity === "level") {
    if (LEGACY_SEEDED_LEVELS.has(legacyStructureKey(item))) return false;
  } else if (item.entity === "labor") {
    if (LEGACY_SEEDED_LABORS.has(legacyStructureKey(item))) return false;
  }
  if (category && (item.entity === "area" || item.entity === "level" || item.entity === "labor")) {
    return item.category === category;
  }
  return true;
}

function normalizeCatalogText(value?: string | null) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getLaborPath(labor?: InteriorLabor | SurfaceLabor) {
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

function exportCell(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return Number.isFinite(value) ? value : "";
  if (typeof value === "boolean") return value ? "Sí" : "No";
  return String(value);
}

function getSamplePayload(row: SampleTableRow) {
  const raw = row.raw as any;
  return row.source === "local" ? raw.payload ?? {} : raw;
}

function resultElementLabel(result: any) {
  return result.element?.symbol ?? result.element?.name ?? result.elementId ?? "";
}

function resultLaboratoryLabel(result: any) {
  return result.labAssignmentLabel ?? result.laboratory?.name ?? result.surfaceLaboratoryId ?? result.interiorLaboratoryId ?? "";
}

function resultValueLabel(result: any) {
  const value = result.value ?? "";
  const unit = result.unit ? ` ${result.unit}` : "";
  const qualifier = result.qualifier ? `${result.qualifier} ` : "";
  return `${qualifier}${value}${unit}`.trim();
}

function getLabAssignmentsText(row: SampleTableRow) {
  return (row.labAssignments ?? [])
    .map((assignment: any, index: number) => {
      const slot = assignment.slot ?? `LAB ${index + 1}`;
      const laboratory =
        assignment.laboratory?.name ??
        assignment.laboratory?.abbreviation ??
        assignment.interiorLaboratoryId ??
        assignment.surfaceLaboratoryId ??
        "";
      return [slot, laboratory].filter(Boolean).join(" - ");
    })
    .filter(Boolean)
    .join(" | ");
}

function getResultsText(row: SampleTableRow) {
  if (!hasResults(row.results)) return "";
  return row.results
    .map((result: any) => {
      const element = resultElementLabel(result);
      const value = resultValueLabel(result);
      const laboratory = resultLaboratoryLabel(result);
      return [element, value, laboratory ? `(${laboratory})` : ""].filter(Boolean).join(" ");
    })
    .join(" | ");
}

function findDispatchForRow(row: SampleTableRow, dispatches: SampleDispatch[], registerType: RegisterType) {
  const rowCode = row.code.replace(" (offline)", "");
  for (const dispatch of dispatches) {
    const item = (dispatch.items ?? []).find((dispatchItem) => {
      const sampleId =
        registerType === "interior"
          ? dispatchItem.interiorSampleId ?? dispatchItem.sample?.id
          : dispatchItem.surfaceSampleId ?? dispatchItem.sample?.id;
      return sampleId === row.id || dispatchItem.sample?.code === rowCode;
    });
    if (item) return { dispatch, item };
  }
  return undefined;
}

function requestedElementsText(item?: NonNullable<SampleDispatch["items"]>[number]) {
  return (item?.requestedElements ?? [])
    .map((requested) => requested.element?.symbol ?? requested.element?.name ?? requested.elementId)
    .filter(Boolean)
    .join(", ");
}

function sampleExportRow(row: SampleTableRow, dispatches: SampleDispatch[], registerType: RegisterType) {
  const payload = getSamplePayload(row);
  const dispatchMatch = findDispatchForRow(row, dispatches, registerType);
  return {
    "Módulo": registerType === "interior" ? "Interior Mina" : "Superficie",
    "Categoría": CATEGORY_LABELS[row.category],
    "Nombre": exportCell(row.name),
    "Código": exportCell(row.code),
    "Código / Talón": formatVoucherLabel(row),
    "Talón numérico": exportCell(row.voucherNumber),
    "Talón texto": exportCell(row.voucherCode),
    "Estado": row.source === "local" ? "Pendiente local" : SAMPLE_STATUS_LABELS[row.status],
    "Prioridad": PRIORITY_LABELS[row.priority],
    "Ubicación": row.location,
    "Objetivo": row.objectiveName,
    "Registrado por": row.createdByName,
    "Fecha de muestreo": formatDate(row.sampledAt),
    "Fecha ISO": exportCell(row.sampledAt),
    "Este": exportCell(payload.east),
    "Norte": exportCell(payload.north),
    "Elevación": exportCell(payload.elevation),
    "Laboratorios": getLabAssignmentsText(row),
    "Resultados": hasResults(row.results) ? "Con resultados" : "Sin resultados",
    "Cantidad resultados": row.results.length,
    "Detalle resultados": getResultsText(row),
    "Lote / Proyecto": exportCell(dispatchMatch?.dispatch.projectName),
    "Laboratorio de lote": exportCell(dispatchMatch?.dispatch.laboratory?.name),
    "Fecha envío lote": dispatchMatch?.dispatch.sentAt ? formatDate(dispatchMatch.dispatch.sentAt) : "",
    "Estado lote": dispatchMatch?.dispatch.status ? DISPATCH_STATUS_LABELS[dispatchMatch.dispatch.status ?? "PENDING"] : "",
    "Ensayos solicitados": requestedElementsText(dispatchMatch?.item),
    "Sincronización": row.source === "local" ? "Pendiente" : "Sincronizado",
    "Error sincronización": getRowSyncError(row) ?? ""
  };
}

function resultExportRows(rows: SampleTableRow[]) {
  return rows.flatMap((row) =>
    row.results.map((result: any, index) => ({
      "Código / Talón": formatVoucherLabel(row),
      "Nombre muestra": exportCell(row.name),
      "Categoría": CATEGORY_LABELS[row.category],
      "Ubicación": row.location,
      "Elemento": resultElementLabel(result),
      "Valor": exportCell(result.value),
      "Unidad": exportCell(result.unit),
      "Calificador": exportCell(result.qualifier),
      "Laboratorio": resultLaboratoryLabel(result),
      "Comentarios": exportCell(result.comments),
      "Orden resultado": index + 1
    }))
  );
}

function batchExportRows(rows: SampleTableRow[], dispatches: SampleDispatch[], registerType: RegisterType) {
  return buildDispatchGroups(rows, dispatches, registerType).flatMap((group) =>
    group.rows.map((row, index) => {
      const dispatchMatch = findDispatchForRow(row, dispatches, registerType);
      return {
        "Lote / Proyecto": group.title,
        "Laboratorio": group.laboratory,
        "Fecha envío": group.sentAt ? formatDate(group.sentAt) : "",
        "Estado lote": DISPATCH_STATUS_LABELS[group.status],
        "Orden": index + 1,
        "Código / Talón": formatVoucherLabel(row),
        "Nombre": exportCell(row.name),
        "Estado muestra": SAMPLE_STATUS_LABELS[row.status],
        "Prioridad": PRIORITY_LABELS[row.priority],
        "Ubicación": row.location,
        "Objetivo": row.objectiveName,
        "Resultados": hasResults(row.results) ? getResultsText(row) : "Sin resultados",
        "Ensayos solicitados": requestedElementsText(dispatchMatch?.item)
      };
    })
  );
}

function appendJsonSheet(workbook: XLSX.WorkBook, name: string, rows: Record<string, unknown>[]) {
  const sheet = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{ "Sin datos": "No hay registros para los filtros actuales" }]);
  const headers = Object.keys(rows[0] ?? { "Sin datos": "" });
  sheet["!cols"] = headers.map((header) => ({
    wch: Math.min(Math.max(header.length + 4, 14), 42)
  }));
  XLSX.utils.book_append_sheet(workbook, sheet, name);
}

function exportSamplesToExcel(rows: SampleTableRow[], dispatches: SampleDispatch[], registerType: RegisterType, category: SampleCategory) {
  const workbook = XLSX.utils.book_new();
  const sampleRows = rows.map((row) => sampleExportRow(row, dispatches, registerType));
  appendJsonSheet(workbook, "Muestras", sampleRows);
  appendJsonSheet(workbook, "Resultados", resultExportRows(rows));
  appendJsonSheet(workbook, "Lotes", batchExportRows(rows, dispatches, registerType));

  const moduleLabel = registerType === "interior" ? "interior-mina" : "superficie";
  const categoryLabel = category === "EXPLORATION" ? "exploracion" : "produccion";
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "America/La_Paz" }).format(new Date());
  XLSX.writeFile(workbook, `registros-recientes-${moduleLabel}-${categoryLabel}-${date}.xlsx`);
}

function stringifyDetail(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function findCatalogByText(items: CatalogItem[], text: string) {
  const normalized = normalizeCatalogText(text);
  return items.find(
    (item) =>
      normalizeCatalogText(item.name) === normalized ||
      normalizeCatalogText(item.abbreviation) === normalized
  );
}

function getRowSyncError(row: SampleTableRow) {
  if (row.source !== "local") return undefined;
  return (row.raw as OfflineProposalSample).syncError;
}

function getRowCreatedById(row: SampleTableRow) {
  if (row.source !== "remote") return undefined;
  const raw = row.raw as any;
  return raw.createdById ?? raw.createdBy?.id;
}

function isRowOwnedByUser(row: SampleTableRow, userId?: number | string) {
  const createdById = getRowCreatedById(row);
  return userId !== undefined && createdById !== undefined && String(createdById) === String(userId);
}

function canDeleteRow(row: SampleTableRow, user?: { id: number | string; role?: string }) {
  return user?.role === "ADMIN" || isRowOwnedByUser(row, user?.id);
}

function isConnectivityIssue(error: unknown) {
  if (!navigator.onLine) return true;
  if (error instanceof ApiError) return !error.statusCode;
  if (error instanceof Error) {
    return /red|network|conectar|connect|timeout|offline/i.test(error.message);
  }
  return false;
}

let exploracionesOfflineCatalogPreloadStarted = false;

async function preloadExploracionesOfflineCatalogs(disposed: () => boolean) {
  if (exploracionesOfflineCatalogPreloadStarted) return;
  if (!navigator.onLine) return;
  exploracionesOfflineCatalogPreloadStarted = true;

  try {
    const categories: SampleCategory[] = ["EXPLORATION", "PRODUCTION"];
    const [remoteElementItems, interiorObjectiveItems, interiorLaboratoryItems, surfaceObjectiveItems, surfaceLaboratoryItems] =
      await Promise.all([
        getSharedElements({ page: 1, limit: 5000 }),
        getInteriorObjectives({ page: 1, limit: 5000 }),
        getInteriorLaboratories({ page: 1, limit: 5000 }),
        getSurfaceObjectives({ page: 1, limit: 5000 }),
        getSurfaceLaboratories({ page: 1, limit: 5000 })
      ]);

    const items: Array<Omit<OfflineProposalCatalog, "id" | "createdAt" | "updatedAt" | "synced">> = [
      ...remoteElementItems.map((item) => ({
        localId: `cache-element-${item.id}`,
        remoteId: item.id,
        module: "shared" as const,
        entity: "element" as const,
        name: item.name,
        symbol: item.symbol,
        defaultUnit: item.defaultUnit ?? undefined,
        description: item.description ?? undefined
      })),
      ...interiorObjectiveItems.map((item) => ({
        localId: `cache-interior-objective-${item.id}`,
        remoteId: item.id,
        module: "interior" as const,
        entity: "objective" as const,
        name: item.name,
        abbreviation: item.abbreviation ?? undefined,
        description: item.description ?? undefined
      })),
      ...interiorLaboratoryItems.map((item) => ({
        localId: `cache-interior-laboratory-${item.id}`,
        remoteId: item.id,
        module: "interior" as const,
        entity: "laboratory" as const,
        name: item.name,
        abbreviation: item.abbreviation ?? undefined,
        description: item.description ?? undefined
      })),
      ...surfaceObjectiveItems.map((item) => ({
        localId: `cache-surface-objective-${item.id}`,
        remoteId: item.id,
        module: "surface" as const,
        entity: "objective" as const,
        name: item.name,
        abbreviation: item.abbreviation ?? undefined,
        description: item.description ?? undefined
      })),
      ...surfaceLaboratoryItems.map((item) => ({
        localId: `cache-surface-laboratory-${item.id}`,
        remoteId: item.id,
        module: "surface" as const,
        entity: "laboratory" as const,
        name: item.name,
        abbreviation: item.abbreviation ?? undefined,
        description: item.description ?? undefined
      }))
    ];

    const categoryCatalogs = await Promise.all(
      categories.map(async (category) => {
        const [
          interiorAreaItems,
          interiorLevelItems,
          interiorLaborItems,
          surfaceAreaItems,
          surfaceLevelItems,
          surfaceLaborItems
        ] = await Promise.all([
          getInteriorAreas({ category, page: 1, limit: 5000 }),
          getInteriorLevels({ category, page: 1, limit: 5000 }),
          getInteriorLabors({ category, page: 1, limit: 5000 }),
          getSurfaceAreas({ category, page: 1, limit: 5000 }),
          getSurfaceLevels({ category, page: 1, limit: 5000 }),
          getSurfaceLabors({ category, page: 1, limit: 5000 })
        ]);

        return [
          ...interiorAreaItems.map((item) => ({
            localId: `cache-interior-area-${category}-${item.id}`,
            remoteId: item.id,
            module: "interior" as const,
            entity: "area" as const,
            name: item.name,
            abbreviation: item.abbreviation ?? undefined,
            category,
            description: item.description ?? undefined
          })),
          ...interiorLevelItems.map((item) => ({
            localId: `cache-interior-level-${category}-${item.id}`,
            remoteId: item.id,
            module: "interior" as const,
            entity: "level" as const,
            name: item.name,
            abbreviation: item.abbreviation ?? undefined,
            category,
            description: item.description ?? undefined,
            parentRemoteId: item.interiorAreaId ?? (item as any).area?.id,
            elevation: item.elevation ?? undefined
          })),
          ...interiorLaborItems.map((item) => ({
            localId: `cache-interior-labor-${category}-${item.id}`,
            remoteId: item.id,
            module: "interior" as const,
            entity: "labor" as const,
            name: item.name,
            abbreviation: item.abbreviation ?? undefined,
            category,
            description: item.description ?? undefined,
            parentRemoteId: item.interiorLevelId ?? (item as any).level?.id
          })),
          ...surfaceAreaItems.map((item) => ({
            localId: `cache-surface-area-${category}-${item.id}`,
            remoteId: item.id,
            module: "surface" as const,
            entity: "area" as const,
            name: item.name,
            abbreviation: item.abbreviation ?? undefined,
            category,
            description: item.description ?? undefined
          })),
          ...surfaceLevelItems.map((item) => ({
            localId: `cache-surface-level-${category}-${item.id}`,
            remoteId: item.id,
            module: "surface" as const,
            entity: "level" as const,
            name: item.name,
            abbreviation: item.abbreviation ?? undefined,
            category,
            description: item.description ?? undefined,
            parentRemoteId: item.surfaceAreaId ?? (item as any).area?.id,
            elevation: item.elevation ?? undefined
          })),
          ...surfaceLaborItems.map((item) => ({
            localId: `cache-surface-labor-${category}-${item.id}`,
            remoteId: item.id,
            module: "surface" as const,
            entity: "labor" as const,
            name: item.name,
            abbreviation: item.abbreviation ?? undefined,
            category,
            description: item.description ?? undefined,
            parentRemoteId: item.surfaceLevelId ?? (item as any).level?.id
          }))
        ];
      })
    );

    if (disposed()) return;
    const allItems = [...items, ...categoryCatalogs.flat()];
    if (allItems.length > 0) await cacheProposalCatalogs(allItems);
  } catch (error) {
    exploracionesOfflineCatalogPreloadStarted = false;
    if (!isConnectivityIssue(error)) {
      console.warn("No se pudo precargar catálogos offline de exploraciones.", error);
    }
  }
}

function useExploracionesCatalogPreload() {
  useEffect(() => {
    let disposed = false;
    const run = () => void preloadExploracionesOfflineCatalogs(() => disposed);

    run();
    window.addEventListener("online", run);

    return () => {
      disposed = true;
      window.removeEventListener("online", run);
    };
  }, []);
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
    "surface-level": "Crear nivel de superficie",
    "surface-labor": "Crear labor de superficie",
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

export function ExploracionesPage({ category }: { category?: SampleCategory }) {
  useExploracionesCatalogPreload();
  if (!category) return <ExploracionesCategoryLanding />;
  return <ExploracionesRegisterPage sampleCategory={category} />;
}

function ExploracionesCategoryLanding() {
  return (
    <div className={pageShell}>
      <InternalHeader
        eyebrow="Exploraciones"
        title="Registro de muestras"
        description="Selecciona una categoría para continuar al registro de muestras."
      />

      <section className={`${panelClass} exploraciones-panel p-5`}>
        <div className="grid gap-3 md:grid-cols-3">
          <Link
            to="/exploraciones/exploracion"
            className="group rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] p-5 transition hover:border-[var(--color-primary)]"
          >
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--color-primary)] text-[var(--color-on-primary)]">
                <Target size={20} />
              </span>
              <div>
                <h2 className="text-lg font-bold">Exploración</h2>
                <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">
                  Registrar muestras de categoría EXPLORATION.
                </p>
              </div>
            </div>
          </Link>

          <Link
            to="/exploraciones/produccion"
            className="group rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] p-5 transition hover:border-[var(--color-primary)]"
          >
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--color-primary)] text-[var(--color-on-primary)]">
                <Landmark size={20} />
              </span>
              <div>
                <h2 className="text-lg font-bold">Producción</h2>
                <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">
                  Registrar muestras de categoría PRODUCTION.
                </p>
              </div>
            </div>
          </Link>

          <Link
            to="/exploraciones/jerarquia"
            className="group rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] p-5 transition hover:border-[var(--color-primary)]"
          >
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--color-primary)] text-[var(--color-on-primary)]">
                <Layers3 size={20} />
              </span>
              <div>
                <h2 className="text-lg font-bold">Jerarquía</h2>
                <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">
                  Revisar áreas, niveles, labores y conteos por estado.
                </p>
              </div>
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}

function ExploracionesRegisterPage({ sampleCategory }: { sampleCategory: SampleCategory }) {
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
  const [sampleStatusFilter, setSampleStatusFilter] = useState<SampleLifecycleFilter>("all");
  const [syncStatusFilter, setSyncStatusFilter] = useState<SyncStatusFilter>("all");
  const [onlyMine, setOnlyMine] = useState(false);
  const [dispatchForm, setDispatchForm] = useState<DispatchForm>(() => initialDispatchForm());
  const [dispatchItems, setDispatchItems] = useState<DispatchDraftItem[]>([]);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [dispatchSampleSearch, setDispatchSampleSearch] = useState("");
  const [dispatchResultTarget, setDispatchResultTarget] = useState<DispatchResultTarget | null>(null);
  const [catalogExpanded, setCatalogExpanded] = useState(false);
  const [defaultsSeeded, setDefaultsSeeded] = useState(false);
  const [editTarget, setEditTarget] = useState<EditTarget>(null);
  const [geoPoint, setGeoPoint] = useState<GeoPoint | null>(null);
  const [geoStatus, setGeoStatus] = useState<string>("");
  const [isLocating, setIsLocating] = useState(false);
  const [showGeoMap, setShowGeoMap] = useState(false);
  const [isCachingMap, setIsCachingMap] = useState(false);
  const [isCachingRegionalMap, setIsCachingRegionalMap] = useState(false);
  const [mapCacheStatus, setMapCacheStatus] = useState("");
  const [mapTilesReady, setMapTilesReady] = useState(false);
  const [showLabResults, setShowLabResults] = useState(false);
  const autoLocationRequestedRef = useRef(false);
  const autoMapCacheKeyRef = useRef<string | null>(null);
  const autoRegionalMapCacheRequestedRef = useRef(false);
  const sampleFormRef = useRef<HTMLElement | null>(null);
  const syncInFlightRef = useRef(false);
  const lastSilentSyncAtRef = useRef(0);

  const remoteElements = useSharedElementsQuery();
  const remoteInteriorAreas = useInteriorAreasQuery(sampleCategory);
  const remoteInteriorHierarchy = useInteriorHierarchyQuery(sampleCategory);
  const remoteInteriorLevels = useInteriorLevelsQuery(sampleForm.interiorAreaId, sampleCategory);
  const remoteInteriorLabors = useInteriorLaborsQuery(sampleForm.interiorLevelId, sampleCategory);
  const remoteInteriorObjectives = useInteriorObjectivesQuery();
  const remoteInteriorLaboratories = useInteriorLaboratoriesQuery();
  const remoteInteriorSamples = useInteriorSamplesQuery({
    interiorLaborId: sampleForm.interiorLaborId || undefined,
    category: sampleCategory,
    createdById: onlyMine ? user?.id : undefined,
    priority: priorityFilter || undefined,
    status: sampleStatusFilter === "all" ? undefined : sampleStatusFilter,
    search: search.trim() && !/^\d+$/.test(search.trim()) ? search : undefined
  });
  const registeredInteriorSamples = useInteriorSamplesQuery({
    interiorLaborId: sampleForm.interiorLaborId || undefined,
    category: sampleCategory,
    status: "REGISTERED"
  });
  const remoteSurfaceAreas = useSurfaceAreasQuery(sampleCategory);
  const remoteSurfaceHierarchy = useSurfaceHierarchyQuery(sampleCategory);
  const remoteSurfaceLevels = useSurfaceLevelsQuery(sampleForm.surfaceAreaId, sampleCategory);
  const remoteSurfaceLabors = useSurfaceLaborsQuery(sampleForm.surfaceLevelId, sampleCategory);
  const remoteSurfaceObjectives = useSurfaceObjectivesQuery();
  const remoteSurfaceLaboratories = useSurfaceLaboratoriesQuery();
  const remoteSurfaceSamples = useSurfaceSamplesQuery({
    surfaceLaborId: sampleForm.surfaceLaborId || undefined,
    category: sampleCategory,
    createdById: onlyMine ? user?.id : undefined,
    priority: priorityFilter || undefined,
    status: sampleStatusFilter === "all" ? undefined : sampleStatusFilter,
    search: search.trim() && !/^\d+$/.test(search.trim()) ? search : undefined
  });
  const registeredSurfaceSamples = useSurfaceSamplesQuery({
    surfaceLaborId: sampleForm.surfaceLaborId || undefined,
    category: sampleCategory,
    status: "REGISTERED"
  });
  const remoteInteriorDispatches = useInteriorDispatchesQuery({
    interiorLaboratoryId: registerType === "interior" ? dispatchForm.laboratoryId || undefined : undefined
  });
  const remoteSurfaceDispatches = useSurfaceDispatchesQuery({
    surfaceLaboratoryId: registerType === "surface" ? dispatchForm.laboratoryId || undefined : undefined
  });
  const offlineCatalogs = useOfflineProposalCatalogsQuery();
  const offlineSamples = useOfflineProposalSamplesQuery();
  const queueCatalog = useQueueProposalCatalogMutation();
  const queueSample = useQueueProposalSampleMutation();
  const updateQueuedSample = useUpdateQueuedProposalSampleMutation();
  const queueRemoteEdit = useQueueRemoteProposalSampleEditMutation();
  const updateInteriorSample = useUpdateInteriorSampleWithResultsMutation();
  const updateSurfaceSample = useUpdateSurfaceSampleWithResultsMutation();
  const createInteriorDispatch = useCreateInteriorDispatchMutation();
  const createSurfaceDispatch = useCreateSurfaceDispatchMutation();
  const deleteInteriorDispatch = useDeleteInteriorDispatchMutation();
  const deleteSurfaceDispatch = useDeleteSurfaceDispatchMutation();
  const deleteInteriorSample = useDeleteInteriorSampleMutation();
  const deleteSurfaceSample = useDeleteSurfaceSampleMutation();
  const createInteriorResult = useCreateInteriorSampleResultMutation();
  const createSurfaceResult = useCreateSurfaceSampleResultMutation();
  const syncMutation = useSyncProposalSamplesMutation();

  const localCatalogs = offlineCatalogs.data ?? [];
  const localSamples = offlineSamples.data ?? [];
  const pendingOfflineSamples = localSamples.filter((item) => !item.synced).length;
  const hierarchyInteriorAreas = useMemo(
    () => flattenInteriorHierarchyAreas(remoteInteriorHierarchy.data ?? []),
    [remoteInteriorHierarchy.data]
  );
  const hierarchyInteriorLevels = useMemo(
    () => flattenInteriorHierarchyLevels(remoteInteriorHierarchy.data ?? []),
    [remoteInteriorHierarchy.data]
  );
  const hierarchyInteriorLabors = useMemo(
    () => flattenInteriorHierarchyLabors(remoteInteriorHierarchy.data ?? []),
    [remoteInteriorHierarchy.data]
  );
  const hierarchySurfaceAreas = useMemo(
    () => flattenSurfaceHierarchyAreas(remoteSurfaceHierarchy.data ?? []),
    [remoteSurfaceHierarchy.data]
  );
  const hierarchySurfaceLevels = useMemo(
    () => flattenSurfaceHierarchyLevels(remoteSurfaceHierarchy.data ?? []),
    [remoteSurfaceHierarchy.data]
  );
  const hierarchySurfaceLabors = useMemo(
    () => flattenSurfaceHierarchyLabors(remoteSurfaceHierarchy.data ?? []),
    [remoteSurfaceHierarchy.data]
  );

  const runSync = async (options: { silent?: boolean } = {}) => {
    if (syncInFlightRef.current) return;

    const now = Date.now();
    if (options.silent && now - lastSilentSyncAtRef.current < 45_000) return;

    try {
      syncInFlightRef.current = true;
      if (options.silent) lastSilentSyncAtRef.current = now;

      const result = await syncMutation.mutateAsync({ retryFailed: !options.silent });
      const remainingSamples = Math.max(
        result.sampleTotal - result.sampleSynced - result.sampleFailed,
        0
      );

      if (!options.silent) {
        if (result.sampleSynced > 0) {
          showSuccess(`${result.sampleSynced} muestra(s) offline sincronizada(s).`);
        } else if (remainingSamples > 0) {
          showError(
            `${remainingSamples} muestra(s) siguen pendientes. Verifica conexión o vuelve a intentar.`
          );
        } else if (result.sampleFailed > 0) {
          showError(
            result.sampleErrors[0] ??
              `${result.sampleFailed} muestra(s) no pudieron sincronizarse.`
          );
        } else if (result.catalogFailed > 0) {
          showSuccess("La muestra no tiene pendientes visibles. Hay catálogos auxiliares por revisar.");
        } else {
          showSuccess("No hay muestras offline pendientes.");
        }
      }
      return result;
    } catch (error) {
      if (!options.silent) {
        showError(error instanceof Error ? error.message : "No se pudo sincronizar.");
      }
      return undefined;
    } finally {
      syncInFlightRef.current = false;
    }
  };

  useEffect(() => {
    if (!offlineCatalogs.data) return;
    if (defaultsSeeded) return;
    setDefaultsSeeded(true);

    const hasLocalSeed = (localId: string) => localCatalogs.some((item) => item.localId === localId);

    async function seedDefaults() {
      for (const element of DEFAULT_ELEMENTS) {
        const localId = `seed-element-${element.symbol.toLowerCase()}`;
        if (hasLocalSeed(localId)) continue;
        await queueCatalog.mutateAsync({
          module: "shared",
          entity: "element",
          payload: {
            name: element.name,
            symbol: element.symbol,
            defaultUnit: element.defaultUnit
          },
          queueAction: false,
          catalog: {
            localId,
            module: "shared",
            entity: "element",
            name: element.name,
            symbol: element.symbol,
            defaultUnit: element.defaultUnit,
            synced: true
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
            queueAction: false,
            catalog: {
              localId,
              module,
              entity: "laboratory",
              name: lab.name,
              abbreviation: lab.abbreviation,
              synced: true
            }
          });
        }
      }
    }

    void seedDefaults();
  }, [defaultsSeeded, offlineCatalogs.data]);

  const selectedInteriorArea = [
    ...(remoteInteriorAreas.data ?? []),
    ...hierarchyInteriorAreas,
    ...localCatalogs.filter((item) => isVisibleStructureCatalog(item, sampleCategory)).filter((item) => item.module === "interior" && item.entity === "area").map(localCatalogToItem)
  ].find((item) => item.id === sampleForm.interiorAreaId);

  const selectedInteriorAreaIds = new Set<string>(sampleForm.interiorAreaId ? [sampleForm.interiorAreaId] : []);
  if (selectedInteriorArea) {
    const selectedName = normalizeCatalogText(selectedInteriorArea.name);
    const selectedAbbreviation = normalizeCatalogText(selectedInteriorArea.abbreviation);
    localCatalogs
      .filter((item) => isVisibleStructureCatalog(item, sampleCategory))
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
    localCatalogs
      .filter(isUsableCatalog)
      .filter((item) => item.module === "shared" && item.entity === "element")
      .map(localElementToItem)
  );
  const interiorAreas = mergeById(
    mergeById(remoteInteriorAreas.data ?? [], hierarchyInteriorAreas),
    localCatalogs.filter((item) => isVisibleStructureCatalog(item, sampleCategory)).filter((item) => item.module === "interior" && item.entity === "area").map(localCatalogToItem)
  );
  const interiorLevels = mergeById(
    mergeById(remoteInteriorLevels.data ?? [], hierarchyInteriorLevels).filter(
      (item) => !sampleForm.interiorAreaId || selectedInteriorAreaIds.has(item.interiorAreaId ?? "")
    ),
    localCatalogs
      .filter((item) => isVisibleStructureCatalog(item, sampleCategory))
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
    ...hierarchyInteriorLevels,
    ...localCatalogs
      .filter((item) => isVisibleStructureCatalog(item, sampleCategory))
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
      .filter((item) => isVisibleStructureCatalog(item, sampleCategory))
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
    mergeById(remoteInteriorLabors.data ?? [], hierarchyInteriorLabors).filter(
      (item) => !sampleForm.interiorLevelId || selectedInteriorLevelIds.has(item.interiorLevelId ?? "")
    ),
    localCatalogs
      .filter((item) => isVisibleStructureCatalog(item, sampleCategory))
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
    localCatalogs.filter(isUsableCatalog).filter((item) => item.module === "interior" && item.entity === "objective").map(localCatalogToItem)
  );
  const selectedInteriorLevelOption = interiorLevels.find((item) => item.id === sampleForm.interiorLevelId);
  const selectedInteriorLaborOption = interiorLabors.find((item) => item.id === sampleForm.interiorLaborId);
  const interiorLaboratories = mergeById(
    remoteInteriorLaboratories.data ?? [],
    localCatalogs
      .filter(isUsableCatalog)
      .filter((item) => item.module === "interior" && item.entity === "laboratory")
      .map(localCatalogToItem)
  );
  const surfaceAreas = mergeById(
    mergeById(remoteSurfaceAreas.data ?? [], hierarchySurfaceAreas),
    localCatalogs.filter((item) => isVisibleStructureCatalog(item, sampleCategory)).filter((item) => item.module === "surface" && item.entity === "area").map(localCatalogToItem)
  );

  const selectedSurfaceArea = surfaceAreas.find((item) => item.id === sampleForm.surfaceAreaId);
  const selectedSurfaceAreaIds = new Set<string>(sampleForm.surfaceAreaId ? [sampleForm.surfaceAreaId] : []);
  if (selectedSurfaceArea) {
    const selectedName = normalizeCatalogText(selectedSurfaceArea.name);
    const selectedAbbreviation = normalizeCatalogText(selectedSurfaceArea.abbreviation);
    localCatalogs
      .filter((item) => isVisibleStructureCatalog(item, sampleCategory))
      .filter((item) => item.module === "surface" && item.entity === "area")
      .filter(
        (item) =>
          normalizeCatalogText(item.name) === selectedName ||
          normalizeCatalogText(item.abbreviation) === selectedAbbreviation
      )
      .forEach((item) => {
        selectedSurfaceAreaIds.add(item.localId);
        if (item.remoteId) selectedSurfaceAreaIds.add(item.remoteId);
      });
  }

  const surfaceLevels = mergeById(
    mergeById(remoteSurfaceLevels.data ?? [], hierarchySurfaceLevels).filter(
      (item) => !sampleForm.surfaceAreaId || selectedSurfaceAreaIds.has(item.surfaceAreaId ?? "")
    ),
    localCatalogs
      .filter((item) => isVisibleStructureCatalog(item, sampleCategory))
      .filter((item) => item.module === "surface" && item.entity === "level")
      .filter(
        (item) =>
          !sampleForm.surfaceAreaId ||
          selectedSurfaceAreaIds.has(item.parentRemoteId ?? "") ||
          selectedSurfaceAreaIds.has(item.parentLocalId ?? "")
      )
      .map((item) => ({
        ...localCatalogToItem(item),
        surfaceAreaId: item.parentRemoteId ?? item.parentLocalId ?? "",
        elevation: item.elevation
      }))
  );

  const selectedSurfaceLevel = [
    ...(remoteSurfaceLevels.data ?? []),
    ...hierarchySurfaceLevels,
    ...localCatalogs
      .filter((item) => isVisibleStructureCatalog(item, sampleCategory))
      .filter((item) => item.module === "surface" && item.entity === "level")
      .map((item) => ({
        ...localCatalogToItem(item),
        surfaceAreaId: item.parentRemoteId ?? item.parentLocalId ?? "",
        elevation: item.elevation
      }))
  ].find((item) => item.id === sampleForm.surfaceLevelId);

  const selectedSurfaceLevelIds = new Set<string>(sampleForm.surfaceLevelId ? [sampleForm.surfaceLevelId] : []);
  if (selectedSurfaceLevel) {
    const selectedName = normalizeCatalogText(selectedSurfaceLevel.name);
    const selectedAbbreviation = normalizeCatalogText(selectedSurfaceLevel.abbreviation);
    localCatalogs
      .filter((item) => isVisibleStructureCatalog(item, sampleCategory))
      .filter((item) => item.module === "surface" && item.entity === "level")
      .filter(
        (item) =>
          normalizeCatalogText(item.name) === selectedName ||
          normalizeCatalogText(item.abbreviation) === selectedAbbreviation
      )
      .forEach((item) => {
        selectedSurfaceLevelIds.add(item.localId);
        if (item.remoteId) selectedSurfaceLevelIds.add(item.remoteId);
      });
  }

  const surfaceLabors = mergeById(
    mergeById(remoteSurfaceLabors.data ?? [], hierarchySurfaceLabors).filter(
      (item) => !sampleForm.surfaceLevelId || selectedSurfaceLevelIds.has(item.surfaceLevelId ?? "")
    ),
    localCatalogs
      .filter((item) => isVisibleStructureCatalog(item, sampleCategory))
      .filter((item) => item.module === "surface" && item.entity === "labor")
      .filter(
        (item) =>
          !sampleForm.surfaceLevelId ||
          selectedSurfaceLevelIds.has(item.parentRemoteId ?? "") ||
          selectedSurfaceLevelIds.has(item.parentLocalId ?? "")
      )
      .map((item) => ({
        ...localCatalogToItem(item),
        surfaceLevelId: item.parentRemoteId ?? item.parentLocalId ?? ""
      }))
  );
  const surfaceObjectives = mergeById(
    remoteSurfaceObjectives.data ?? [],
    localCatalogs.filter(isUsableCatalog).filter((item) => item.module === "surface" && item.entity === "objective").map(localCatalogToItem)
  );
  const selectedSurfaceLevelOption = surfaceLevels.find((item) => item.id === sampleForm.surfaceLevelId);
  const selectedSurfaceLaborOption = surfaceLabors.find((item) => item.id === sampleForm.surfaceLaborId);
  const surfaceLaboratories = mergeById(
    remoteSurfaceLaboratories.data ?? [],
    localCatalogs
      .filter(isUsableCatalog)
      .filter((item) => item.module === "surface" && item.entity === "laboratory")
      .map(localCatalogToItem)
  );
  const selectedSurfaceAreaOption = surfaceAreas.find((item) => item.id === sampleForm.surfaceAreaId);

  const activeLaboratories = registerType === "interior" ? interiorLaboratories : surfaceLaboratories;
  const localVisibleSamples = localSamples.filter(
    (item) =>
      item.module === registerType &&
      !item.synced &&
      (((item.payload as any).category ?? "EXPLORATION") as SampleCategory) === sampleCategory
  );
  const remoteVisibleSamples = registerType === "interior" ? remoteInteriorSamples.data ?? [] : remoteSurfaceSamples.data ?? [];
  const interiorNamePrefix = [
    normalizeNameToken(selectedInteriorArea?.abbreviation ?? selectedInteriorArea?.name),
    normalizeNameToken(selectedInteriorLevelOption?.abbreviation ?? selectedInteriorLevelOption?.name),
    normalizeNameToken(selectedInteriorLaborOption?.abbreviation ?? selectedInteriorLaborOption?.name)
  ]
    .filter(Boolean)
    .join("-");
  const surfaceNamePrefix = [
    normalizeNameToken(selectedSurfaceAreaOption?.abbreviation ?? selectedSurfaceAreaOption?.name),
    normalizeNameToken(selectedSurfaceLevelOption?.abbreviation ?? selectedSurfaceLevelOption?.name),
    normalizeNameToken(selectedSurfaceLaborOption?.abbreviation ?? selectedSurfaceLaborOption?.name)
  ]
    .filter(Boolean)
    .join("-");
  const sampleNamePrefix = registerType === "interior" ? interiorNamePrefix : surfaceNamePrefix;
  const normalizedSuffix = normalizeNameToken(sampleForm.sampleNameSuffix);
  const sampleName = [sampleNamePrefix, normalizedSuffix].filter(Boolean).join("-");

  const sampleRows = useMemo<SampleTableRow[]>(() => {
    const elementById = new Map(elements.map((element) => [element.id, element]));
    const localRows = localVisibleSamples.map((item) => ({
      id: item.localId,
      code: item.synced && item.code ? item.code : "Pendiente de sincronizar",
      name: (item.payload as any).name ?? null,
      voucherNumber: (item.payload as any).voucherNumber ?? null,
      voucherCode: (item.payload as any).voucherCode ?? null,
      category: (((item.payload as any).category ?? "EXPLORATION") as SampleCategory),
      status: ((item.payload as any).status ?? "REGISTERED") as SampleStatus,
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
        voucherCode: sample.voucherCode ?? null,
        category: sample.category ?? "EXPLORATION",
        status: sample.status ?? "REGISTERED",
        priority: sample.priority ?? "NORMAL",
        sampledAt: sample.sampledAt,
        objectiveName: (isInterior ? interiorSample.objective?.name : surfaceSample.objective?.name) ?? "-",
        location: isInterior ? getLaborPath(interiorSample.labor) || "-" : getLaborPath(surfaceSample.labor) || "-",
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
      .filter((row) => (sampleStatusFilter === "all" ? true : row.status === sampleStatusFilter))
      .filter((row) => {
        if (syncStatusFilter === "all") return true;
        return syncStatusFilter === "pending" ? row.source === "local" : row.source === "remote";
      })
      .filter((row) => {
        if (resultStatusFilter === "all") return true;
        const rowHasResults = hasResults(row.results);
        return resultStatusFilter === "with" ? rowHasResults : !rowHasResults;
      })
      .filter((row) => {
        if (!query) return true;
        const voucher = row.voucherNumber === null || row.voucherNumber === undefined
          ? ""
          : String(row.voucherNumber);
        const voucherCode = row.voucherCode?.toLowerCase() ?? "";
        const formattedVoucher = formatVoucherLabel(row).toLowerCase();
        return (
          row.code.toLowerCase().includes(query) ||
          voucher.includes(query) ||
          voucherCode.includes(query) ||
          formattedVoucher.includes(query)
        );
      })
      .sort((left, right) => {
        const statusDiff = SAMPLE_STATUS_WEIGHT[right.status] - SAMPLE_STATUS_WEIGHT[left.status];
        if (statusDiff !== 0) return statusDiff;
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
    sampleStatusFilter,
    syncStatusFilter,
    sampleCategory,
    search,
    user?.nombre
  ]);

  useEffect(() => {
    if (pendingOfflineSamples === 0) return;

    const syncSilently = () => {
      if (navigator.onLine) void runSync({ silent: true });
    };
    const onVisibilityChange = () => {
      if (!document.hidden) syncSilently();
    };
    const intervalId = window.setInterval(syncSilently, 60_000);

    window.addEventListener("online", syncSilently);
    document.addEventListener("visibilitychange", onVisibilityChange);
    syncSilently();

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("online", syncSilently);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [pendingOfflineSamples]);

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
        category: item.category ?? sampleCategory,
        description: item.description ?? undefined
      })),
      ...hierarchyInteriorAreas.map((item) => ({
        localId: `cache-interior-area-${item.id}`,
        remoteId: item.id,
        module: "interior" as const,
        entity: "area" as const,
        name: item.name,
        abbreviation: item.abbreviation ?? undefined,
        category: sampleCategory,
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
        elevation: item.elevation ?? undefined,
        category: sampleCategory
      })),
      ...hierarchyInteriorLevels.map((item) => ({
        localId: `cache-interior-level-${item.id}`,
        remoteId: item.id,
        module: "interior" as const,
        entity: "level" as const,
        name: item.name,
        abbreviation: item.abbreviation ?? undefined,
        description: item.description ?? undefined,
        parentRemoteId: item.interiorAreaId,
        elevation: item.elevation ?? undefined,
        category: sampleCategory
      })),
      ...(remoteInteriorLabors.data ?? []).map((item) => ({
        localId: `cache-interior-labor-${item.id}`,
        remoteId: item.id,
        module: "interior" as const,
        entity: "labor" as const,
        name: item.name,
        abbreviation: item.abbreviation ?? undefined,
        description: item.description ?? undefined,
        parentRemoteId: item.interiorLevelId,
        category: sampleCategory
      })),
      ...hierarchyInteriorLabors.map((item) => ({
        localId: `cache-interior-labor-${item.id}`,
        remoteId: item.id,
        module: "interior" as const,
        entity: "labor" as const,
        name: item.name,
        abbreviation: item.abbreviation ?? undefined,
        description: item.description ?? undefined,
        parentRemoteId: item.interiorLevelId,
        category: sampleCategory
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
        category: item.category ?? sampleCategory,
        description: item.description ?? undefined
      })),
      ...hierarchySurfaceAreas.map((item) => ({
        localId: `cache-surface-area-${item.id}`,
        remoteId: item.id,
        module: "surface" as const,
        entity: "area" as const,
        name: item.name,
        abbreviation: item.abbreviation ?? undefined,
        category: sampleCategory,
        description: item.description ?? undefined
      })),
      ...(remoteSurfaceLevels.data ?? []).map((item) => ({
        localId: `cache-surface-level-${item.id}`,
        remoteId: item.id,
        module: "surface" as const,
        entity: "level" as const,
        name: item.name,
        abbreviation: item.abbreviation ?? undefined,
        description: item.description ?? undefined,
        parentRemoteId: item.surfaceAreaId,
        elevation: item.elevation ?? undefined,
        category: sampleCategory
      })),
      ...(remoteSurfaceLabors.data ?? []).map((item) => ({
        localId: `cache-surface-labor-${item.id}`,
        remoteId: item.id,
        module: "surface" as const,
        entity: "labor" as const,
        name: item.name,
        abbreviation: item.abbreviation ?? undefined,
        description: item.description ?? undefined,
        parentRemoteId: item.surfaceLevelId,
        category: sampleCategory
      })),
      ...hierarchySurfaceLevels.map((item) => ({
        localId: `cache-surface-level-${item.id}`,
        remoteId: item.id,
        module: "surface" as const,
        entity: "level" as const,
        name: item.name,
        abbreviation: item.abbreviation ?? undefined,
        description: item.description ?? undefined,
        parentRemoteId: item.surfaceAreaId,
        elevation: item.elevation ?? undefined,
        category: sampleCategory
      })),
      ...hierarchySurfaceLabors.map((item) => ({
        localId: `cache-surface-labor-${item.id}`,
        remoteId: item.id,
        module: "surface" as const,
        entity: "labor" as const,
        name: item.name,
        abbreviation: item.abbreviation ?? undefined,
        description: item.description ?? undefined,
        parentRemoteId: item.surfaceLevelId,
        category: sampleCategory
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

    if (remoteInteriorHierarchy.isSuccess) {
      const hierarchy = remoteInteriorHierarchy.data ?? [];
      const levelIds = hierarchy.flatMap((area) => (area.levels ?? []).map((level) => level.id));
      const laborIds = hierarchy.flatMap((area) =>
        (area.levels ?? []).flatMap((level) => (level.labors ?? []).map((labor) => labor.id))
      );
      void pruneMissingProposalCatalogs("interior", "level", levelIds, sampleCategory);
      void pruneMissingProposalCatalogs("interior", "labor", laborIds, sampleCategory);
    }
    if (remoteInteriorHierarchy.isSuccess && remoteInteriorAreas.isSuccess) {
      const areaIds = Array.from(
        new Set([
          ...(remoteInteriorHierarchy.data ?? []).map((area) => area.id),
          ...(remoteInteriorAreas.data ?? []).map((area) => area.id)
        ])
      );
      void pruneMissingProposalCatalogs("interior", "area", areaIds, sampleCategory);
    }
    if (remoteSurfaceHierarchy.isSuccess) {
      const hierarchy = remoteSurfaceHierarchy.data ?? [];
      const levelIds = hierarchy.flatMap((area) => (area.levels ?? []).map((level) => level.id));
      const laborIds = hierarchy.flatMap((area) =>
        (area.levels ?? []).flatMap((level) => (level.labors ?? []).map((labor) => labor.id))
      );
      void pruneMissingProposalCatalogs("surface", "level", levelIds, sampleCategory);
      void pruneMissingProposalCatalogs("surface", "labor", laborIds, sampleCategory);
    }
    if (remoteSurfaceHierarchy.isSuccess && remoteSurfaceAreas.isSuccess) {
      const areaIds = Array.from(
        new Set([
          ...(remoteSurfaceHierarchy.data ?? []).map((area) => area.id),
          ...(remoteSurfaceAreas.data ?? []).map((area) => area.id)
        ])
      );
      void pruneMissingProposalCatalogs("surface", "area", areaIds, sampleCategory);
    }
  }, [
    remoteElements.data,
    remoteInteriorAreas.data,
    remoteInteriorAreas.isSuccess,
    remoteInteriorHierarchy.data,
    remoteInteriorHierarchy.isSuccess,
    hierarchyInteriorAreas,
    hierarchyInteriorLabors,
    hierarchyInteriorLevels,
    remoteInteriorLabors.data,
    remoteInteriorLaboratories.data,
    remoteInteriorLevels.data,
    remoteInteriorObjectives.data,
    remoteSurfaceAreas.data,
    remoteSurfaceAreas.isSuccess,
    remoteSurfaceHierarchy.data,
    remoteSurfaceHierarchy.isSuccess,
    remoteSurfaceLabors.data,
    remoteSurfaceLevels.data,
    hierarchySurfaceAreas,
    hierarchySurfaceLabors,
    hierarchySurfaceLevels,
    remoteSurfaceLaboratories.data,
    remoteSurfaceObjectives.data,
    sampleCategory
  ]);

  function setSampleField(field: keyof SampleForm, value: string) {
    setSampleForm((current) => {
      if (field === "interiorAreaId") {
        return { ...current, interiorAreaId: value, interiorLevelId: "", interiorLaborId: "" };
      }
      if (field === "interiorLevelId") {
        return { ...current, interiorLevelId: value, interiorLaborId: "" };
      }
      if (field === "surfaceAreaId") {
        return { ...current, surfaceAreaId: value, surfaceLevelId: "", surfaceLaborId: "" };
      }
      if (field === "surfaceLevelId") {
        return { ...current, surfaceLevelId: value, surfaceLaborId: "" };
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

  function getSurfacePrefixFromIds(areaId?: string, levelId?: string, laborId?: string) {
    const area = surfaceAreas.find((item) => item.id === areaId);
    const level = surfaceLevels.find((item) => item.id === levelId);
    const labor = surfaceLabors.find((item) => item.id === laborId);
    return [
      normalizeNameToken(area?.abbreviation ?? area?.name),
      normalizeNameToken(level?.abbreviation ?? level?.name),
      normalizeNameToken(labor?.abbreviation ?? labor?.name)
    ]
      .filter(Boolean)
      .join("-");
  }

  function resetSampleForm() {
    setSampleForm(initialSampleForm());
    setResults([]);
    setEditTarget(null);
    setShowGeoMap(false);
    setShowLabResults(false);
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
    setShowLabResults(true);
    const objectiveTextFromId = (module: RegisterType, id?: string) => {
      const objectives = module === "interior" ? interiorObjectives : surfaceObjectives;
      const objective = objectives.find((item) => item.id === id);
      return objective?.name ?? id ?? "";
    };

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
          interiorObjectiveId: objectiveTextFromId("interior", payload.interiorObjectiveId),
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
        const labor = surfaceLabors.find((item) => item.id === payload.surfaceLaborId);
        const levelId = labor?.surfaceLevelId;
        const level = surfaceLevels.find((item) => item.id === levelId);
        const areaId = level?.surfaceAreaId;
        const prefix = getSurfacePrefixFromIds(areaId, levelId, payload.surfaceLaborId);
        setSampleForm({
          ...initialSampleForm(),
          surfaceAreaId: areaId ?? "",
          surfaceLevelId: levelId ?? "",
          surfaceLaborId: payload.surfaceLaborId ?? "",
          surfaceObjectiveId: objectiveTextFromId("surface", payload.surfaceObjectiveId),
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
      window.setTimeout(() => {
        sampleFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 0);
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
        interiorObjectiveId: sample.objective?.name ?? "",
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
      const prefix = getSurfacePrefixFromIds(
        sample.labor?.level?.area?.id,
        sample.labor?.level?.id,
        sample.labor?.id
      );
      setSampleForm({
        ...initialSampleForm(),
        surfaceAreaId: sample.labor?.level?.area?.id ?? "",
        surfaceLevelId: sample.labor?.level?.id ?? "",
        surfaceLaborId: sample.labor?.id ?? "",
        surfaceObjectiveId: sample.objective?.name ?? "",
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
    window.setTimeout(() => {
      sampleFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }

  function setCatalogField(field: keyof CatalogForm, value: string) {
    setCatalogForm((current) => ({ ...current, [field]: value }));
  }

  function openModal(kind: ModalKind, parentId = "") {
    setCatalogForm({ ...initialCatalogForm(), parentId });
    setModalKind(kind);
  }

  function applyGeoCoordinates(input: {
    latitude: number;
    longitude: number;
    altitude?: number | null;
    accuracy?: number | null;
  }) {
    const utm = latLonToUtm(input.latitude, input.longitude);
    setSampleForm((current) => ({
      ...current,
      east: String(utm.east),
      north: String(utm.north),
      elevation:
        current.elevation.trim() ||
        input.altitude === null ||
        input.altitude === undefined ||
        Number.isNaN(input.altitude)
          ? current.elevation
          : String(Number(input.altitude.toFixed(2)))
    }));
    setGeoPoint({
      latitude: input.latitude,
      longitude: input.longitude,
      accuracy: input.accuracy ?? undefined
    });
    return utm;
  }

  function adjustGeoMarker(latitude: number, longitude: number) {
    const utm = applyGeoCoordinates({ latitude, longitude });
    setGeoStatus(`Ubicación ajustada. UTM zona ${utm.zoneNumber}`);
  }

  async function cacheMapForCurrentPoint(options: { silent?: boolean } = {}) {
    if (!geoPoint) {
      if (!options.silent) showError("Primero captura o ajusta una ubicación para descargar el mapa.");
      return;
    }
    if (!("caches" in window)) {
      if (!options.silent) showError("Este navegador no permite guardar mapas offline.");
      return;
    }
    if (!navigator.onLine) {
      if (!options.silent) showError("Necesitas internet para descargar el mapa de esta zona.");
      return;
    }

    setIsCachingMap(true);
    setMapCacheStatus("Descargando mapa de la zona...");

    try {
      const cache = await caches.open(MAP_TILE_CACHE_NAME);
      const tiles = buildOfflineMapTiles(geoPoint.latitude, geoPoint.longitude);
      let saved = 0;

      for (const tile of tiles) {
        const cached = await cache.match(tile.url);
        if (!cached) {
          const response = await fetch(tile.url, { mode: "no-cors", cache: "force-cache" });
          if (!response.ok && response.type !== "opaque") {
            throw new Error("Una tesela del mapa no se pudo descargar.");
          }
          await cache.put(tile.url, response.clone());
        }
        saved += 1;
        if (saved % 12 === 0 || saved === tiles.length) {
          setMapCacheStatus(`Guardando mapa offline ${saved}/${tiles.length}...`);
        }
      }

      setMapCacheStatus(`Mapa offline listo para esta zona (${tiles.length} mosaicos).`);
      setMapTilesReady(true);
      if (!options.silent) showSuccess("Mapa offline guardado para esta zona.");
    } catch (error) {
      setMapCacheStatus("No se pudo descargar el mapa offline.");
      const cacheStatus = await getOfflineMapCacheStatus(geoPoint.latitude, geoPoint.longitude).catch(() => null);
      setMapTilesReady(Boolean(cacheStatus?.ready));
      if (!options.silent) {
        showError(error instanceof Error ? error.message : "No se pudo descargar el mapa offline.");
      }
    } finally {
      setIsCachingMap(false);
    }
  }

  async function cacheRegionalExplorationMap(options: { silent?: boolean } = {}) {
    if (!("caches" in window)) {
      if (!options.silent) showError("Este navegador no permite guardar mapas offline.");
      return;
    }
    if (!navigator.onLine) {
      if (!options.silent) showError("Necesitas internet para descargar el mapa regional.");
      return;
    }

    setIsCachingRegionalMap(true);
    setMapCacheStatus("Descargando base offline de Sud Lípez / Cerro Lipeña...");

    try {
      const cache = await caches.open(MAP_TILE_CACHE_NAME);
      const tiles = buildRegionalOfflineMapTiles();
      let saved = 0;

      for (const tile of tiles) {
        const cached = await cache.match(tile.url);
        if (!cached) {
          const response = await fetch(tile.url, { mode: "no-cors", cache: "force-cache" });
          if (!response.ok && response.type !== "opaque") {
            throw new Error("Una tesela regional no se pudo descargar.");
          }
          await cache.put(tile.url, response.clone());
        }
        saved += 1;
        if (saved % 50 === 0 || saved === tiles.length) {
          setMapCacheStatus(`Guardando base regional ${saved}/${tiles.length}...`);
        }
        if (saved % 24 === 0) {
          await waitForMapCacheBreath();
        }
      }

      window.localStorage.setItem(REGIONAL_MAP_CACHE_KEY, new Date().toISOString());
      setMapCacheStatus(`Base offline de Sud Lípez lista (${tiles.length} mosaicos).`);
      if (!options.silent) showSuccess("Base offline de Sud Lípez guardada.");
    } catch (error) {
      setMapCacheStatus("No se pudo descargar el mapa regional offline.");
      if (!options.silent) {
        showError(error instanceof Error ? error.message : "No se pudo descargar el mapa regional.");
      }
    } finally {
      setIsCachingRegionalMap(false);
    }
  }

  function readDevicePosition(options: PositionOptions) {
    return new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });
  }

  async function fillFromCurrentLocation() {
    if (!("geolocation" in navigator)) {
      showError("Este dispositivo no soporta geolocalización.");
      return;
    }

    setIsLocating(true);
    setGeoStatus("Obteniendo ubicación del dispositivo...");

    try {
      const position = await readDevicePosition({
        enableHighAccuracy: false,
        timeout: 18000,
        maximumAge: 300000
      });
      const { latitude, longitude, accuracy, altitude } = position.coords;
      const utm = applyGeoCoordinates({ latitude, longitude, altitude, accuracy });
      setShowGeoMap(false);
      setGeoStatus(`Ubicación cargada. UTM zona ${utm.zoneNumber}`);
    } catch (firstError) {
      const error = firstError as GeolocationPositionError;
      if (error.code === error.PERMISSION_DENIED) {
        const message = "No se concedió permiso para acceder a la ubicación.";
        setGeoStatus(message);
        showError(message);
        setIsLocating(false);
        return;
      }

      setGeoStatus("El GPS está tardando. Intentando una lectura más precisa...");

      try {
        const position = await readDevicePosition({
          enableHighAccuracy: true,
          timeout: 45000,
          maximumAge: 600000
        });
        const { latitude, longitude, accuracy, altitude } = position.coords;
        const utm = applyGeoCoordinates({ latitude, longitude, altitude, accuracy });
        setShowGeoMap(false);
        setGeoStatus(`Ubicación cargada. UTM zona ${utm.zoneNumber}`);
      } catch (secondError) {
        const finalError = secondError as GeolocationPositionError;
        const message =
          finalError.code === finalError.POSITION_UNAVAILABLE
            ? "La ubicación no está disponible en este momento. Revisa que el GPS del dispositivo esté activo."
            : "No se pudo obtener la ubicación a tiempo. Intenta acercarte a una zona con señal o ajusta el punto en el mapa.";
        setGeoStatus(message);
        showError(message);
      }
    } finally {
      setIsLocating(false);
    }
  }

  useEffect(() => {
    if (autoLocationRequestedRef.current) return;
    autoLocationRequestedRef.current = true;
    fillFromCurrentLocation();
  }, []);

  useEffect(() => {
    if (!("caches" in window) || !navigator.onLine) return;
    if (window.localStorage.getItem(REGIONAL_MAP_CACHE_KEY)) return;
    if (autoRegionalMapCacheRequestedRef.current) return;
    autoRegionalMapCacheRequestedRef.current = true;

    const timeoutId = window.setTimeout(() => {
      const run = () => void cacheRegionalExplorationMap({ silent: true });
      if ("requestIdleCallback" in window) {
        (window as any).requestIdleCallback(run, { timeout: 8_000 });
        return;
      }
      run();
    }, 4_500);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!geoPoint || !("caches" in window)) {
      setMapCacheStatus("");
      setMapTilesReady(false);
      return;
    }

    let cancelled = false;
    const centerTile = latLonToTile(geoPoint.latitude, geoPoint.longitude, MAP_READY_ZOOM);
    const cacheKey = `${MAP_READY_ZOOM}/${centerTile.x}/${centerTile.y}`;

    getOfflineMapCacheStatus(geoPoint.latitude, geoPoint.longitude)
      .then((status) => {
        if (cancelled) return;
        setMapTilesReady(status.ready);
        if (status.ready) {
          setMapCacheStatus("Mapa offline disponible para esta zona.");
          autoMapCacheKeyRef.current = cacheKey;
          return;
        }
        setMapCacheStatus(status.cached > 0 ? `Mapa offline parcial (${status.cached}/${status.required} mosaicos).` : "");
        if (navigator.onLine && autoMapCacheKeyRef.current !== cacheKey) {
          autoMapCacheKeyRef.current = cacheKey;
          void cacheMapForCurrentPoint({ silent: true });
        }
      })
      .catch(() => {
        setMapTilesReady(false);
        if (!cancelled) setMapCacheStatus("");
      });

    return () => {
      cancelled = true;
    };
  }, [geoPoint]);

  useEffect(() => {
    if (!geoPoint) return;

    const cacheWhenOnline = () => {
      if (navigator.onLine) void cacheMapForCurrentPoint({ silent: true });
    };

    window.addEventListener("online", cacheWhenOnline);
    return () => window.removeEventListener("online", cacheWhenOnline);
  }, [geoPoint]);

  function closeModal() {
    setModalKind(null);
    setCatalogForm(initialCatalogForm());
  }

  function buildResultPayload(row: ResultRow) {
    return {
      elementId: row.elementId,
      value: toNumber(row.value, "El valor del resultado"),
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

  function validateInteriorLocationSelection() {
    if (
      !sampleForm.interiorAreaId ||
      !sampleForm.interiorLevelId ||
      !sampleForm.interiorLaborId ||
      !sampleForm.interiorObjectiveId.trim()
    ) {
      showError("Completa area, nivel, labor y objetivo para Interior Mina.");
      return false;
    }

    if (!selectedInteriorArea) {
      showError("El area seleccionada ya no es valida. Vuelve a seleccionar el area.");
      return false;
    }

    if (!selectedInteriorLevelOption || !selectedInteriorAreaIds.has(selectedInteriorLevelOption.interiorAreaId ?? "")) {
      showError("El nivel no corresponde al area seleccionada. Vuelve a seleccionar nivel.");
      setSampleForm((current) => ({ ...current, interiorLevelId: "", interiorLaborId: "" }));
      return false;
    }

    if (!selectedInteriorLaborOption || !selectedInteriorLevelIds.has(selectedInteriorLaborOption.interiorLevelId ?? "")) {
      showError("La labor no corresponde al nivel seleccionado. Vuelve a seleccionar labor.");
      setSampleForm((current) => ({ ...current, interiorLaborId: "" }));
      return false;
    }

    return true;
  }

  function validateSurfaceLocationSelection() {
    if (!sampleForm.surfaceAreaId || !sampleForm.surfaceLevelId || !sampleForm.surfaceLaborId || !sampleForm.surfaceObjectiveId.trim()) {
      showError("Completa area, nivel, labor y objetivo para Superficie.");
      return false;
    }

    if (!selectedSurfaceAreaOption) {
      showError("El area seleccionada ya no es valida. Vuelve a seleccionar el area.");
      return false;
    }

    if (!selectedSurfaceLevelOption || !selectedSurfaceAreaIds.has(selectedSurfaceLevelOption.surfaceAreaId ?? "")) {
      showError("El nivel no corresponde al area seleccionada. Vuelve a seleccionar nivel.");
      setSampleForm((current) => ({ ...current, surfaceLevelId: "", surfaceLaborId: "" }));
      return false;
    }

    if (!selectedSurfaceLaborOption || !selectedSurfaceLevelIds.has(selectedSurfaceLaborOption.surfaceLevelId ?? "")) {
      showError("La labor no corresponde al nivel seleccionado. Vuelve a seleccionar labor.");
      setSampleForm((current) => ({ ...current, surfaceLaborId: "" }));
      return false;
    }

    return true;
  }

  async function resolveObjectiveId(module: RegisterType, objectiveText: string) {
    const name = objectiveText.trim().toUpperCase();
    if (!name) throw new Error("El objetivo es obligatorio.");

    const objectives = module === "interior" ? interiorObjectives : surfaceObjectives;
    const existing = findCatalogByText(objectives, name);
    if (existing) return existing.id;

    const localId = `${module}-objective-${newId()}`;
    await queueCatalog.mutateAsync({
      module,
      entity: "objective",
      payload: { name },
      catalog: {
        localId,
        module,
        entity: "objective",
        name
      }
    });
    return localId;
  }

  async function onSubmitSample(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const priority = sampleForm.priority || "NORMAL";
      if (!PRIORITY_VALUES.has(priority)) {
        showError("Selecciona una prioridad valida.");
        return;
      }
      if (!CATEGORY_VALUES.has(sampleCategory)) {
        showError("Selecciona una categoria valida.");
        return;
      }
      const sampledAt = toIso(sampleForm.sampledAt) ?? new Date().toISOString();
      const normalizedSampleName = sampleName.trim() || undefined;
      const common = {
        name: normalizedSampleName,
        category: sampleCategory,
        priority,
        east: toNumber(sampleForm.east, "Este"),
        north: toNumber(sampleForm.north, "Norte"),
        elevation: toNumber(sampleForm.elevation, "Elevacion"),
        sampledAt
      };
      let payload:
        | (typeof common & {
            interiorLaborId: string;
            interiorObjectiveId: string;
            labAssignments?: ReturnType<typeof buildInteriorLabAssignmentsPayload>;
          })
        | (typeof common & {
            surfaceLaborId: string;
            surfaceObjectiveId: string;
            labAssignments?: ReturnType<typeof buildSurfaceLabAssignmentsPayload>;
          });

      if (registerType === "interior") {
        if (!validateInteriorLocationSelection()) return;
        const labAssignments = buildInteriorLabAssignmentsPayload();
        const interiorObjectiveId = await resolveObjectiveId("interior", sampleForm.interiorObjectiveId);
        payload = {
          ...common,
          interiorLaborId: sampleForm.interiorLaborId,
          interiorObjectiveId,
          labAssignments
        };
      } else {
        if (!validateSurfaceLocationSelection()) return;
        const surfaceObjectiveId = await resolveObjectiveId("surface", sampleForm.surfaceObjectiveId);
        payload = {
          ...common,
          surfaceLaborId: sampleForm.surfaceLaborId,
          surfaceObjectiveId,
          labAssignments: buildSurfaceLabAssignmentsPayload()
        };
      }

      if (editTarget?.source === "local") {
        await updateQueuedSample.mutateAsync({ localId: editTarget.localId, payload });
        if (navigator.onLine) {
          const result = await runSync({ silent: true });
          showSuccess(result?.sampleSynced ? "Muestra actualizada y sincronizada." : "Muestra actualizada en la cola local.");
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
                const { surfaceLaborId: _surfaceLaborId, ...patchPayload } = payload as Extract<
                  typeof payload,
                  { surfaceLaborId: string }
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
        const result = await runSync({ silent: true });
        showSuccess(result?.sampleSynced ? "Muestra guardada y sincronizada." : "Muestra guardada en cola local.");
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

    const printWindow = window.open("", "_blank", "width=1280,height=560");
    if (!printWindow) {
      showError("El navegador bloqueó la ventana de impresión.");
      return;
    }

    printWindow.document.write("<p style=\"font-family:Arial,sans-serif;padding:24px\">Preparando talón...</p>");
    printWindow.document.close();
    writeVoucherPrintDocument(printWindow, row);
  }

  async function deleteSample(row: SampleTableRow) {
    if (row.source !== "remote") {
      showError("Sincroniza la muestra antes de eliminarla.");
      return;
    }
    if (!canDeleteRow(row, user ?? undefined)) {
      showError("Solo ADMIN o la persona que registró la muestra puede eliminarla.");
      return;
    }
    const confirmed = window.confirm(
      `¿Eliminar la muestra ${formatVoucherLabel(row)}? Los códigos posteriores se ajustarán.`
    );
    if (!confirmed) return;

    try {
      if (registerType === "interior") {
        await deleteInteriorSample.mutateAsync(row.id);
      } else {
        await deleteSurfaceSample.mutateAsync(row.id);
      }
      showSuccess("Muestra eliminada. La secuencia de códigos fue actualizada.");
    } catch (error) {
      showError(error instanceof Error ? error.message : "No se pudo eliminar la muestra.");
    }
  }

  function setDispatchField(field: keyof DispatchForm, value: string) {
    setDispatchForm((current) => ({ ...current, [field]: value }));
  }

  function toggleDispatchSample(sampleId: string) {
    setDispatchItems((current) =>
      current.some((item) => item.sampleId === sampleId)
        ? current.filter((item) => item.sampleId !== sampleId)
        : [...current, { sampleId, elementIds: [], notes: "" }]
    );
  }

  function toggleDispatchElement(sampleId: string, elementId: string) {
    setDispatchItems((current) =>
      current.map((item) => {
        if (item.sampleId !== sampleId) return item;
        const hasElement = item.elementIds.includes(elementId);
        return {
          ...item,
          elementIds: hasElement
            ? item.elementIds.filter((id) => id !== elementId)
            : [...item.elementIds, elementId]
        };
      })
    );
  }

  function setDispatchItemNotes(sampleId: string, notes: string) {
    setDispatchItems((current) =>
      current.map((item) => (item.sampleId === sampleId ? { ...item, notes } : item))
    );
  }

  async function submitDispatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      if (!dispatchForm.laboratoryId) {
        showError("Selecciona el laboratorio del lote.");
        return;
      }
      if (dispatchItems.length === 0) {
        showError("Selecciona al menos una muestra para el lote.");
        return;
      }
      const emptyElements = dispatchItems.find((item) => item.elementIds.length === 0);
      if (emptyElements) {
        showError("Cada muestra del lote debe tener al menos un elemento solicitado.");
        return;
      }
      const sentAt = toIso(dispatchForm.sentAt) ?? new Date().toISOString();
      const payload = {
        laboratoryId: dispatchForm.laboratoryId,
        projectName: dispatchForm.projectName.trim() || undefined,
        sentAt,
        notes: dispatchForm.notes.trim() || undefined,
        items: dispatchItems.map((item) => ({
          sampleId: item.sampleId,
          elementIds: item.elementIds,
          notes: item.notes.trim() || undefined
        }))
      };

      if (registerType === "interior") {
        await createInteriorDispatch.mutateAsync(payload);
      } else {
        await createSurfaceDispatch.mutateAsync(payload);
      }
      showSuccess("Lote enviado al laboratorio. Las muestras pasan a despachadas.");
      setDispatchForm(initialDispatchForm());
      setDispatchItems([]);
      setSampleStatusFilter("DISPATCHED");
    } catch (error) {
      showError(error instanceof Error ? error.message : "No se pudo crear el lote.");
    }
  }

  async function deleteDispatch(dispatch: SampleDispatch) {
    try {
      if (dispatch.status === "COMPLETED") {
        showError("No se puede eliminar un lote completado.");
        return;
      }
      if (registerType === "interior") {
        await deleteInteriorDispatch.mutateAsync(dispatch.id);
      } else {
        await deleteSurfaceDispatch.mutateAsync(dispatch.id);
      }
      showSuccess("Lote eliminado. El servidor ajustó el estado de las muestras según sus resultados.");
    } catch (error) {
      showError(error instanceof Error ? error.message : "No se pudo eliminar el lote.");
    }
  }

  async function submitDispatchResults(input: {
    sampleId: string;
    laboratoryId?: string;
    results: Array<{ elementId: string; value: number; unit?: string; qualifier?: string; comments?: string }>;
  }) {
    try {
      if (input.results.length === 0) {
        showError("Registra al menos un resultado.");
        return;
      }
      for (const result of input.results) {
        const payload = {
          sampleId: input.sampleId,
          laboratoryId: input.laboratoryId,
          ...result
        };
        if (registerType === "interior") {
          await createInteriorResult.mutateAsync(payload);
        } else {
          await createSurfaceResult.mutateAsync(payload);
        }
      }
      showSuccess("Resultados registrados. El backend actualizará muestra, ítem y lote automáticamente.");
      setDispatchResultTarget(null);
      setSampleStatusFilter("COMPLETED");
    } catch (error) {
      showError(error instanceof Error ? error.message : "No se pudieron registrar los resultados.");
    }
  }

  function printDispatchRemission(dispatch: SampleDispatch) {
    const printWindow = window.open("", "_blank", "width=920,height=1100");
    if (!printWindow) {
      showError("El navegador bloqueó la ventana de impresión.");
      return;
    }
    printWindow.document.write("<p style=\"font-family:Arial,sans-serif;padding:24px\">Preparando nota de remisión...</p>");
    printWindow.document.close();
    writeDispatchRemissionDocument(printWindow, dispatch);
  }

  function printDispatchVouchers(dispatch: SampleDispatch) {
    const printWindow = window.open("", "_blank", "width=1280,height=900");
    if (!printWindow) {
      showError("El navegador bloqueó la ventana de impresión.");
      return;
    }
    printWindow.document.write("<p style=\"font-family:Arial,sans-serif;padding:24px\">Preparando talones del lote...</p>");
    printWindow.document.close();
    writeDispatchVouchersDocument(printWindow, dispatch, registerType, sampleRows);
  }

  async function onSubmitCatalog(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!modalKind) return;

    try {
      const localId = `${modalKind}-${newId()}`;
      const name = catalogForm.name.trim();
      const abbreviation = catalogForm.abbreviation.trim() || undefined;
      const description = catalogForm.description.trim() || undefined;
      const elevation = toNumber(catalogForm.elevation, "Elevacion");

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
          payload: { name, abbreviation, category: sampleCategory, description },
          catalog: { localId, module, entity: "area", name, abbreviation, category: sampleCategory, description }
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
            category: sampleCategory,
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
            category: sampleCategory,
            parentLocalId: catalogForm.parentId,
            parentRemoteId: catalogForm.parentId
          }
        });
      }

      if (modalKind === "surface-level") {
        await queueCatalog.mutateAsync({
          module: "surface",
          entity: "level",
          payload: {
            surfaceAreaId: catalogForm.parentId,
            name,
            abbreviation,
            elevation,
            description
          },
          catalog: {
            localId,
            module: "surface",
            entity: "level",
            name,
            abbreviation,
            description,
            elevation,
            category: sampleCategory,
            parentLocalId: catalogForm.parentId,
            parentRemoteId: catalogForm.parentId
          }
        });
      }

      if (modalKind === "surface-labor") {
        await queueCatalog.mutateAsync({
          module: "surface",
          entity: "labor",
          payload: {
            surfaceLevelId: catalogForm.parentId,
            name,
            abbreviation,
            description
          },
          catalog: {
            localId,
            module: "surface",
            entity: "labor",
            name,
            abbreviation,
            description,
            category: sampleCategory,
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
      if (navigator.onLine) void runSync({ silent: true });
    } catch (error) {
      showError(error instanceof Error ? error.message : "No se pudo guardar el catálogo.");
    }
  }

  const areaOptions = registerType === "interior" ? labelOptions(interiorAreas) : labelOptions(surfaceAreas);
  const levelOptions = registerType === "interior" ? labelOptions(interiorLevels) : labelOptions(surfaceLevels);
  const laborOptions = registerType === "interior" ? labelOptions(interiorLabors) : labelOptions(surfaceLabors);
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
  const registeredSamplesForDispatch =
    registerType === "interior"
      ? registeredInteriorSamples.data ?? []
      : registeredSurfaceSamples.data ?? [];
  const activeDispatches =
    registerType === "interior"
      ? remoteInteriorDispatches.data ?? []
      : remoteSurfaceDispatches.data ?? [];
  const isSaving =
    queueSample.isPending ||
    updateQueuedSample.isPending ||
    queueRemoteEdit.isPending ||
    updateInteriorSample.isPending ||
    updateSurfaceSample.isPending ||
    syncMutation.isPending;
  const isDispatchSaving =
    createInteriorDispatch.isPending ||
    createSurfaceDispatch.isPending ||
    deleteInteriorDispatch.isPending ||
    deleteSurfaceDispatch.isPending ||
    createInteriorResult.isPending ||
    createSurfaceResult.isPending;

  return (
    <div className={pageShell}>
      <InternalHeader
        eyebrow="Exploraciones"
        title="Registro de muestras"
        description="Captura offline para exploración y producción en Interior Mina o Superficie. Los registros se sincronizan al recuperar conexión."
      />

      <section className={`${panelClass} exploraciones-panel p-4`}>
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
          Categoría seleccionada
        </p>
        <h2 className="mt-1 text-2xl font-extrabold text-[var(--color-on-surface)]">
          {CATEGORY_LABELS[sampleCategory]}
        </h2>
      </section>

      <section className={`${panelClass} exploraciones-panel p-3`}>
        <div className="mb-3 px-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
            Tipo de registro
          </h2>
        </div>
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

      <section className={`${panelClass} exploraciones-panel exploraciones-catalog-section p-3 sm:p-4`}>
        <div className="exploraciones-catalog-bar flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            className="exploraciones-catalog-toggle flex flex-1 items-center justify-between gap-3 text-left"
            onClick={() => setCatalogExpanded((current) => !current)}
            aria-expanded={catalogExpanded}
          >
            <span>
              <span className="block text-sm font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                Catálogos
              </span>
              <span className="mt-1 block text-sm text-[var(--color-on-surface-variant)]">
                Crea datos auxiliares sin salir del registro. Todo queda disponible offline.
              </span>
            </span>
            <ChevronDown
              size={18}
              className={`exploraciones-catalog-chevron shrink-0 transition ${catalogExpanded ? "rotate-180" : ""}`}
            />
          </button>
          <div className={`exploraciones-catalog-actions flex flex-wrap gap-2 ${catalogExpanded ? "" : "exploraciones-catalog-actions--collapsed"}`}>
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
            ) : (
              <>
                <CatalogButton icon={MapPinned} onClick={() => openModal("surface-level", sampleForm.surfaceAreaId)}>
                  Nivel
                </CatalogButton>
                <CatalogButton icon={Layers3} onClick={() => openModal("surface-labor", sampleForm.surfaceLevelId)}>
                  Labor
                </CatalogButton>
              </>
            )}
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
              onClick={() => void runSync()}
              className={secondaryButton}
              disabled={syncMutation.isPending}
            >
              <RefreshCw size={14} className={syncMutation.isPending ? "animate-spin" : ""} />
              {pendingOfflineSamples > 0
                ? `Sincronizar (${pendingOfflineSamples})`
                : "Sincronizar"}
            </button>
          </div>
        </div>
      </section>

      <section ref={sampleFormRef} className={`${panelClass} exploraciones-panel exploraciones-form-panel scroll-mt-4 p-4 sm:p-5`}>
        <form onSubmit={onSubmitSample} className="space-y-5">
          <div className="exploraciones-form-header flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <FlaskConical size={18} />
              <h2 className="text-lg font-bold">
                {isEditing ? "Editar muestra" : "Nueva muestra"} de {CATEGORY_LABELS[sampleCategory]} en{" "}
                {registerType === "interior" ? "Interior Mina" : "Superficie"}
              </h2>
            </div>
            <div className="exploraciones-form-summary grid w-full gap-2 sm:w-auto sm:min-w-[420px] sm:grid-cols-2">
              <div className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                  Nombre generado
                </p>
                <p className="mt-0.5 truncate text-sm font-semibold text-[var(--color-on-surface)]">
                  {sampleName || "Completa ubicación y sufijo"}
                </p>
              </div>
              <div className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] px-3 py-2 text-left sm:text-right">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                  Fecha y hora
                </p>
                <p className="mt-0.5 text-sm font-semibold text-[var(--color-on-surface)]">
                  {formatDate(toIso(sampleForm.sampledAt) ?? new Date().toISOString())}
                </p>
              </div>
            </div>
          </div>

          {registerType === "interior" ? (
            <div className="exploraciones-main-grid grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <FormSelect label="Área" value={sampleForm.interiorAreaId} options={areaOptions} onChange={(value) => setSampleField("interiorAreaId", value)} disabled={isEditingRemote} />
              <FormSelect label="Nivel" value={sampleForm.interiorLevelId} options={levelOptions} onChange={(value) => setSampleField("interiorLevelId", value)} disabled={!sampleForm.interiorAreaId || isEditingRemote} />
              <FormSelect label="Labor" value={sampleForm.interiorLaborId} options={laborOptions} onChange={(value) => setSampleField("interiorLaborId", value)} disabled={!sampleForm.interiorLevelId || isEditingRemote} />
              <TextField label="Objetivo" value={sampleForm.interiorObjectiveId} onChange={(value) => setSampleField("interiorObjectiveId", value.toUpperCase())} placeholder="Escribe el objetivo" />
            </div>
          ) : (
            <div className="exploraciones-main-grid grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <FormSelect label="Área" value={sampleForm.surfaceAreaId} options={areaOptions} onChange={(value) => setSampleField("surfaceAreaId", value)} disabled={isEditingRemote} />
              <FormSelect label="Nivel" value={sampleForm.surfaceLevelId} options={levelOptions} onChange={(value) => setSampleField("surfaceLevelId", value)} disabled={!sampleForm.surfaceAreaId || isEditingRemote} />
              <FormSelect label="Labor" value={sampleForm.surfaceLaborId} options={laborOptions} onChange={(value) => setSampleField("surfaceLaborId", value)} disabled={!sampleForm.surfaceLevelId || isEditingRemote} />
              <TextField label="Objetivo" value={sampleForm.surfaceObjectiveId} onChange={(value) => setSampleField("surfaceObjectiveId", value.toUpperCase())} placeholder="Escribe el objetivo" />
            </div>
          )}

          <div className="exploraciones-main-grid grid gap-3 md:grid-cols-2">
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

          <div className="exploraciones-main-grid grid gap-3 md:grid-cols-3">
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
              <div className="mt-4 overflow-hidden rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)]">
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="grid gap-1 text-xs text-[var(--color-on-surface-variant)] md:grid-cols-2 md:gap-4">
                    <p>Latitud: {geoPoint.latitude.toFixed(6)}</p>
                    <p>Longitud: {geoPoint.longitude.toFixed(6)}</p>
                    {mapCacheStatus ? (
                      <p className="md:col-span-2">{mapCacheStatus}</p>
                    ) : null}
                  </div>
                  <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                    <button
                      type="button"
                      className={`${secondaryButton} flex-1 sm:flex-none`}
                      onClick={() => cacheMapForCurrentPoint()}
                      disabled={isCachingMap || isCachingRegionalMap || !navigator.onLine}
                    >
                      <Layers3 size={14} />
                      {isCachingMap ? "Guardando..." : "Guardar mapa"}
                    </button>
                    <button
                      type="button"
                      className={`${secondaryButton} flex-1 sm:flex-none`}
                      onClick={() => cacheRegionalExplorationMap()}
                      disabled={isCachingMap || isCachingRegionalMap || !navigator.onLine}
                    >
                      <Layers3 size={14} />
                      {isCachingRegionalMap ? "Regional..." : "Sud Lípez"}
                    </button>
                    <button
                      type="button"
                      className={`${secondaryButton} flex-1 sm:flex-none`}
                      onClick={() => setShowGeoMap((current) => !current)}
                    >
                      <MapPinned size={14} />
                      {showGeoMap ? "Ocultar mapa" : "Ver mapa"}
                    </button>
                  </div>
                </div>
                {showGeoMap && (navigator.onLine || mapTilesReady) ? (
                  <div className="h-56 w-full">
                    <MapContainer
                      center={[geoPoint.latitude, geoPoint.longitude]}
                      zoom={16}
                      scrollWheelZoom={false}
                      className="h-full w-full"
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        eventHandlers={{
                          tileerror: () => {
                            if (!navigator.onLine) setMapTilesReady(false);
                          }
                        }}
                      />
                      <Marker
                        position={[geoPoint.latitude, geoPoint.longitude]}
                        icon={geoMarkerIcon}
                        draggable
                        eventHandlers={{
                          dragend: (event) => {
                            const marker = event.target as L.Marker;
                            const nextPosition = marker.getLatLng();
                            adjustGeoMarker(nextPosition.lat, nextPosition.lng);
                          }
                        }}
                      />
                    </MapContainer>
                  </div>
                ) : null}
                {showGeoMap && !navigator.onLine && !mapTilesReady ? (
                  <OfflineGeoMap geoPoint={geoPoint} />
                ) : null}
              </div>
            ) : null}
          </div>

          <section className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)]">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
              onClick={() => setShowLabResults((current) => !current)}
            >
              <div>
                <p className="text-sm font-bold text-[var(--color-on-surface)]">
                  Laboratorios y resultados
                </p>
                <p className="mt-0.5 text-xs text-[var(--color-on-surface-variant)]">
                  Opcional al registrar la muestra. Puedes abrirlo si ya tienes datos de laboratorio.
                </p>
              </div>
              <span className="rounded-lg border border-[var(--color-outline-variant)] px-3 py-1 text-xs font-bold text-[var(--color-on-surface-variant)]">
                {showLabResults ? "Contraer" : "Desplegar"}
              </span>
            </button>

            {showLabResults ? (
              <div className="space-y-4 border-t border-[var(--color-border-soft)] p-4">
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
              </div>
            ) : null}
          </section>

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

      <section className={`${panelClass} exploraciones-panel p-4`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <Send size={18} />
              Lote / Nota de remisión
            </h2>
            <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">
              Crea lotes, imprime notas y registra resultados desde una pantalla emergente.
            </p>
          </div>
          <button type="button" className={`${primaryButton} w-full sm:w-auto`} onClick={() => setShowDispatchModal(true)}>
            <Send size={15} />
            Abrir lotes
          </button>
        </div>
      </section>

      {showDispatchModal ? (
        <DispatchPanel
          registerType={registerType}
          form={dispatchForm}
          items={dispatchItems}
          samples={registeredSamplesForDispatch}
          elements={elements}
          laboratories={activeLaboratories}
          dispatches={activeDispatches}
          isSaving={isDispatchSaving}
          sampleSearch={dispatchSampleSearch}
          onSampleSearchChange={setDispatchSampleSearch}
          onFormChange={setDispatchField}
          onToggleSample={toggleDispatchSample}
          onToggleElement={toggleDispatchElement}
          onItemNotesChange={setDispatchItemNotes}
          onSubmit={submitDispatch}
          onClose={() => setShowDispatchModal(false)}
          onDeleteDispatch={deleteDispatch}
          onRegisterResults={(dispatch, item) => setDispatchResultTarget({ dispatch, item })}
          onPrintDispatch={printDispatchRemission}
          onPrintVouchers={printDispatchVouchers}
        />
      ) : null}

      <SamplesTable
        rows={sampleRows}
        dispatches={activeDispatches}
        registerType={registerType}
        sampleCategory={sampleCategory}
        search={search}
        priorityFilter={priorityFilter}
        resultStatusFilter={resultStatusFilter}
        sampleStatusFilter={sampleStatusFilter}
        syncStatusFilter={syncStatusFilter}
        onlyMine={onlyMine}
        onSearch={setSearch}
        onPriorityFilterChange={setPriorityFilter}
        onResultStatusFilterChange={setResultStatusFilter}
        onSampleStatusFilterChange={setSampleStatusFilter}
        onSyncStatusFilterChange={setSyncStatusFilter}
        onOnlyMineChange={setOnlyMine}
        onEdit={startEdit}
        onPrintVoucher={handlePrintVoucher}
        onDelete={deleteSample}
        currentUser={user ?? undefined}
      />

      {modalKind ? (
        <CatalogModal
          kind={modalKind}
          form={catalogForm}
          areaOptions={modalKind.startsWith("surface") ? labelOptions(surfaceAreas) : labelOptions(interiorAreas)}
          levelOptions={modalKind.startsWith("surface") ? labelOptions(surfaceLevels) : labelOptions(interiorLevels)}
          onChange={setCatalogField}
          onClose={closeModal}
          onSubmit={onSubmitCatalog}
        />
      ) : null}
      {dispatchResultTarget ? (
        <DispatchResultsModal
          target={dispatchResultTarget}
          registerType={registerType}
          laboratoryId={
            registerType === "interior"
              ? dispatchResultTarget.dispatch.interiorLaboratoryId ?? undefined
              : dispatchResultTarget.dispatch.surfaceLaboratoryId ?? undefined
          }
          onClose={() => setDispatchResultTarget(null)}
          onSubmit={submitDispatchResults}
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
  placeholder,
  inputMode
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  disabled?: boolean;
  placeholder?: string;
  inputMode?: InputHTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <input
        type={type}
        inputMode={inputMode}
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

function formatVoucherLabel(row: Pick<SampleTableRow, "code" | "voucherCode" | "voucherNumber">) {
  return row.code?.trim() || row.voucherCode?.trim() || formatVoucherNumber(row.voucherNumber);
}

function sampleStatusBadgeClass(status: SampleStatus) {
  const classes: Record<SampleStatus, string> = {
    REGISTERED:
      "inline-flex rounded-full bg-sky-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white",
    DISPATCHED:
      "inline-flex rounded-full bg-amber-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white",
    COMPLETED:
      "inline-flex rounded-full bg-emerald-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white"
  };
  return classes[status];
}

function priorityRowClass(priority: SamplePriority) {
  void priority;
  return "bg-[var(--color-surface-container-low)] text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container)]";
}

function priorityMobileClass(priority: SamplePriority) {
  void priority;
  return "bg-[var(--color-surface-container-low)] text-[var(--color-on-surface)]";
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

function elementSymbol(value: unknown) {
  return String(value ?? "").trim();
}

function requestedElementSymbols(item?: NonNullable<SampleDispatch["items"]>[number]) {
  return (item?.requestedElements ?? [])
    .map((requested) => elementSymbol(requested.element?.symbol ?? requested.element?.name ?? requested.elementId))
    .filter(Boolean);
}

function voucherElementsLine(symbols: string[] = []) {
  const normalized = new Set(symbols.map((symbol) => symbol.toLowerCase()));
  const hasCu = normalized.has("cu") || normalized.has("cobre");
  const hasAu = normalized.has("au") || normalized.has("oro");
  const hasAg = normalized.has("ag") || normalized.has("plata");
  const known = new Set(["cu", "cobre", "au", "oro", "ag", "plata"]);
  const otherSymbols = symbols.filter((symbol) => !known.has(symbol.toLowerCase()));
  const hasIcp = otherSymbols.some((symbol) => /icp|multi/i.test(symbol)) || otherSymbols.length > 1;
  const others = otherSymbols.filter((symbol) => !/icp|multi/i.test(symbol)).join(", ");

  return `ELEMENTOS A ANALIZAR: [${hasCu ? "X" : " "}]Cu&nbsp; [${hasAu ? "X" : " "}]Au&nbsp; [${hasAg ? "X" : " "}]Ag&nbsp; [${hasIcp ? "X" : " "}]ICP Multi&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; OTROS:${others ? ` ${escapeHtml(others)}` : "________"}`;
}

function sampleIdFromDispatchItem(item: NonNullable<SampleDispatch["items"]>[number], registerType: RegisterType) {
  return registerType === "interior"
    ? item.interiorSampleId ?? item.sample?.id
    : item.surfaceSampleId ?? item.sample?.id;
}

function dispatchItemToSampleRow(
  item: NonNullable<SampleDispatch["items"]>[number],
  registerType: RegisterType,
  rows: SampleTableRow[]
) {
  const sampleId = sampleIdFromDispatchItem(item, registerType);
  const sampleCode = item.sample?.code;
  const row =
    (sampleId ? rows.find((candidate) => candidate.id === sampleId) : undefined) ??
    (sampleCode ? rows.find((candidate) => candidate.code === sampleCode) : undefined);

  if (row) return row;

  const sample = (item.sample ?? {}) as any;
  return {
    id: sampleId ?? item.id,
    code: sample.code ?? sampleId ?? item.id,
    name: sample.name ?? null,
    voucherNumber: sample.voucherNumber ?? null,
    voucherCode: sample.voucherCode ?? null,
    category: (sample.category ?? "EXPLORATION") as SampleCategory,
    status: (sample.status ?? "DISPATCHED") as SampleStatus,
    priority: (sample.priority ?? "NORMAL") as SamplePriority,
    sampledAt: sample.sampledAt,
    objectiveName: sample.objective?.name ?? "-",
    location: getLaborPath(sample.labor) || sample.location || "-",
    createdByName: sample.createdBy?.nombre ?? "-",
    results: sample.results ?? [],
    labAssignments: sample.labAssignments ?? [],
    raw: sample,
    source: "remote" as const
  };
}

function renderVoucherMarkup(row: SampleTableRow, symbols: string[] = []) {
  const raw = row.raw as any;
  const payload = row.source === "local" ? raw.payload ?? {} : raw;
  const voucher = formatVoucherLabel(row).replace(/^N°\s*/, "");
  const sampleId = row.code || row.name || "";
  const east = compactValue(payload.east, 18);
  const north = compactValue(payload.north, 18);
  const elevation = compactValue(payload.elevation, 16);
  return `
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
          <div class="form-row cols-location">
            <div class="field"><span class="label">LUGAR:</span><span class="fill">${compactValue(row.location, 24)}</span></div>
            <div class="field"><span class="label">MUESTRA:</span><span class="fill">${compactValue(row.name, 26)}</span></div>
          </div>
          <div class="form-row cols-coords">
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
          <div class="line">${voucherElementsLine(symbols)}</div>
          <div class="line obs">OBSERVACIONES:_____________________________________________________</div>
          <div class="line obs">___________________________________________________________________</div>
          <div class="line obs">___________________________________________________________________</div>
        </div>
      </section>
      <aside class="stubs">
        <div class="stub"><div class="stub-title">EMPRESA MINERA MARTE S.R.L.</div><div class="stub-box">${escapeHtml(voucher)}</div></div>
        <div class="stub"><div class="stub-title">EMPRESA MINERA MARTE S.R.L.</div><div class="stub-box">${escapeHtml(voucher)}</div></div>
        <div class="stub"><div class="stub-title">EMPRESA MINERA MARTE S.R.L.</div><div class="stub-box">${escapeHtml(voucher)}</div></div>
      </aside>
    </div>
  </div>`;
}

function voucherPrintStyles() {
  return `
    @page { size: landscape; margin: 8mm; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #fff; color: #171717; font-family: "Courier New", monospace; }
    .voucher-sheet { width: 1188px; height: 302px; padding: 18px 14px 0; page-break-inside: avoid; break-inside: avoid; }
    .voucher { display: grid; grid-template-columns: 810px 376px; width: 1188px; height: 302px; border: 3px solid #27384a; overflow: hidden; }
    .main { border: 4px solid #27384a; border-right: 0; padding: 14px 16px 6px 14px; position: relative; overflow: hidden; }
    .header { display: grid; grid-template-columns: 142px 1fr 157px; align-items: center; height: 53px; margin-bottom: 2px; }
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
    .form-row { display: grid; gap: 10px; height: 23px; align-items: end; font-size: 17px; line-height: 1; white-space: nowrap; }
    .cols-project { grid-template-columns: 1fr 220px; }
    .cols-sampler { grid-template-columns: 1fr 300px; }
    .cols-location { grid-template-columns: 1fr 1fr; }
    .cols-coords { grid-template-columns: 1fr; }
    .field { display: flex; min-width: 0; align-items: end; gap: 4px; }
    .label { flex: 0 0 auto; }
    .fill { flex: 1 1 auto; min-width: 0; height: 18px; border-bottom: 1.7px solid #171717; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding: 0 4px 1px; }
    .coords { display: grid; grid-template-columns: 1fr 1fr .85fr; gap: 12px; min-width: 0; }
    .coord { display: flex; min-width: 0; align-items: end; }
    .coord-label { flex: 0 0 auto; }
    .coord-value { flex: 1 1 auto; min-width: 0; height: 18px; border-bottom: 1.7px solid #171717; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding: 0 3px 1px; }
    .line { font-size: 17px; line-height: 1.32; white-space: nowrap; overflow: hidden; }
    .obs { letter-spacing: 1px; font-size: 17px; line-height: 1.32; }
    .stubs { border-left: 3px dashed #7d8a8e; padding: 8px 10px 8px 18px; display: grid; grid-template-rows: 1fr 1fr 1fr; gap: 8px; }
    .stub { border-top: 3px dashed #7d8a8e; padding-top: 8px; }
    .stub:first-child { border-top: 0; padding-top: 0; }
    .stub-title { height: 32px; border: 2px solid #9fc4d6; border-radius: 3px; display: flex; align-items: center; justify-content: center; color: #788487; font-family: Arial, sans-serif; font-weight: 800; font-size: 12px; }
    .stub-box { height: 45px; margin-top: 4px; border-radius: 3px; background: #e7f1f7; display: flex; align-items: center; justify-content: center; color: #d43a2f; font-family: Arial, sans-serif; font-weight: 900; font-size: 22px; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .voucher-sheet { padding-top: 0; }
    }`;
}

function writeVoucherPrintDocument(printWindow: Window, row: SampleTableRow) {
  const voucher = formatVoucherLabel(row).replace(/^N°\s*/, "");
  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Talón ${escapeHtml(voucher)}</title>
  <style>
    ${voucherPrintStyles()}
  </style>
</head>
<body>
  ${renderVoucherMarkup(row)}
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

function writeDispatchVouchersDocument(
  printWindow: Window,
  dispatch: SampleDispatch,
  registerType: RegisterType,
  rows: SampleTableRow[]
) {
  const title = dispatch.projectName || dispatch.laboratory?.name || dispatch.id;
  const vouchers = dispatch.items
    .map((item) => renderVoucherMarkup(dispatchItemToSampleRow(item, registerType, rows), requestedElementSymbols(item)))
    .join("");

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Talones lote ${escapeHtml(title)}</title>
  <style>
    ${voucherPrintStyles()}
    .voucher-sheet:nth-of-type(n + 2) { margin-top: 8px; }
  </style>
</head>
<body>
  ${vouchers || "<p>No hay muestras en este lote.</p>"}
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

function formatRemissionDate(value?: string | null) {
  if (!value) return "__ / __ / ____";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "__ / __ / ____";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${pad(date.getDate())} / ${pad(date.getMonth() + 1)} / ${date.getFullYear()}`;
}

function dispatchItemSampleCode(item: NonNullable<SampleDispatch["items"]>[number]) {
  return item.sample?.code ?? item.interiorSampleId ?? item.surfaceSampleId ?? "-";
}

function dispatchItemSector(item: NonNullable<SampleDispatch["items"]>[number]) {
  const sample = item.sample as any;
  const candidates = [
    sample?.labor?.level?.area?.name,
    sample?.area?.name,
    sample?.labor?.level?.area?.abbreviation,
    sample?.area?.abbreviation,
    sample?.sector
  ];
  const explicit = candidates.find((value) => typeof value === "string" && value.trim());
  if (explicit) return String(explicit).trim().toUpperCase();

  const nameParts = String(sample?.name ?? "")
    .split(/[\/-]/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (nameParts.length >= 1) return nameParts[0].toUpperCase();

  const code = dispatchItemSampleCode(item);
  const parts = code.split(/[\/-]/).map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 1) return parts[0].toUpperCase();
  return "";
}

function dispatchItemName(item: NonNullable<SampleDispatch["items"]>[number]) {
  return item.sample?.name ?? dispatchItemSampleCode(item);
}

function dispatchItemPriority(item: NonNullable<SampleDispatch["items"]>[number]) {
  const priority = (item.sample as any)?.priority as SamplePriority | undefined;
  return priority && PRIORITY_LABELS[priority] ? PRIORITY_LABELS[priority] : (priority ?? "-");
}

function dispatchItemAssays(item: NonNullable<SampleDispatch["items"]>[number]) {
  return (item.requestedElements ?? [])
    .map((requested) => requested.element?.symbol ?? requested.element?.name ?? requested.elementId)
    .filter(Boolean)
    .join("-");
}

function writeDispatchRemissionDocument(printWindow: Window, dispatch: SampleDispatch) {
  const projectName = (dispatch.projectName || "LA LIPEÑA").toUpperCase();
  const laboratory = dispatch.laboratory?.name ?? "________________";
  const rows = dispatch.items.length > 0 ? dispatch.items : [];
  const tableRows = rows
    .map((item, index) => {
      const assays = dispatchItemAssays(item);
      return `
        <tr>
          <td class="number-cell">${index + 1}</td>
          <td><mark>${escapeHtml(dispatchItemSampleCode(item))}</mark></td>
          <td><mark>${escapeHtml(dispatchItemSector(item))}</mark></td>
          <td><mark>${escapeHtml(dispatchItemName(item))}</mark></td>
          <td class="priority"><mark>${escapeHtml(dispatchItemPriority(item))}</mark></td>
          <td class="assays"><mark>${escapeHtml(assays)}</mark></td>
        </tr>`;
    })
    .join("");

  const emptyRows = Array.from({ length: Math.max(0, 8 - rows.length) })
    .map(
      (_, index) => `
        <tr>
          <td class="number-cell">${rows.length + index + 1}</td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
        </tr>`
    )
    .join("");

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Nota de remisión ${escapeHtml(projectName)}</title>
  <style>
    @page { size: letter portrait; margin: 10mm 13mm; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #fff; color: #000; font-family: Arial, Helvetica, sans-serif; font-size: 12px; }
    .sheet { width: 100%; max-width: 760px; margin: 0 auto; padding-top: 2px; }
    .header { display: grid; grid-template-columns: 170px 1fr 120px; align-items: center; border-bottom: 1px solid #777; padding-bottom: 3px; }
    .word-logo { color: #9a9a9a; line-height: .92; font-weight: 800; }
    .word-logo .small { font-size: 14px; font-weight: 700; }
    .word-logo .big { display: block; font-size: 30px; letter-spacing: -1px; }
    .word-logo .srl { font-size: 17px; }
    .center-title { text-align: center; color: #666; font-size: 11px; line-height: 1.35; }
    .helmet-logo { justify-self: center; width: 82px; height: 58px; color: #8d8d8d; position: relative; text-align: center; font-weight: 900; }
    .helmet-logo:before { content: "⚒"; display: block; font-size: 35px; line-height: 30px; transform: rotate(-12deg); }
    .helmet-logo:after { content: "MARTE"; display: block; border-top: 2px solid #8d8d8d; border-bottom: 2px solid #8d8d8d; margin: 0 auto; width: 62px; font-size: 10px; }
    .gray { background: #c6c6c6; }
    .title-band { display: inline-flex; align-items: center; gap: 5px; margin: 10px 0 14px 32px; padding: 5px 8px; font-weight: 800; font-size: 12px; }
    .meta { margin-left: 32px; line-height: 1.6; }
    .meta b { font-weight: 800; }
    .meta span { background: #d0d0d0; padding: 2px 4px; }
    .rule { height: 1px; background: #777; margin: 10px 4px 14px 32px; }
    .section-label { display: inline-flex; min-width: 220px; align-items: center; gap: 7px; margin-left: 32px; padding: 8px 10px 12px 7px; font-weight: 800; }
    .project-name { width: 120px; margin-left: 80px; padding: 6px 4px 12px; background: #fff; }
    .detail-label { display: inline-flex; align-items: center; gap: 7px; margin: 14px 0 0 32px; padding: 8px 10px; font-weight: 800; }
    table { width: calc(100% - 18px); margin-top: -2px; border-collapse: separate; border-spacing: 0; table-layout: fixed; }
    th, td { background: #c6c6c6; border-right: 2px solid #fff; border-bottom: 4px solid #fff; padding: 4px 3px; height: 38px; vertical-align: top; font-size: 12px; }
    th { height: 34px; text-align: left; font-weight: 800; }
    th:nth-child(1), td:nth-child(1) { width: 36px; }
    th:nth-child(2), td:nth-child(2) { width: 138px; }
    th:nth-child(3), td:nth-child(3) { width: 88px; }
    th:nth-child(4), td:nth-child(4) { width: auto; }
    th:nth-child(5), td:nth-child(5) { width: 86px; }
    th:nth-child(6), td:nth-child(6) { width: 124px; }
    .number-cell { font-weight: 800; }
    mark { background: #d6dd00; color: #000; padding: 0 1px; }
    .priority { text-align: center; font-weight: 800; }
    .assays { text-align: center; font-weight: 800; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 72px; margin: 46px 68px 0; text-align: center; color: #111; }
    .signature-line { border-top: 1px solid #333; padding-top: 6px; font-size: 11px; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .sheet { max-width: none; }
    }
  </style>
</head>
<body>
  <main class="sheet">
    <header class="header">
      <div class="word-logo"><span class="small">Empresa Minera</span><span class="big">MARTE<span class="srl">S.R.L.</span></span></div>
      <div class="center-title">
        EMPRESA MINERA MARTE S.R.L.<br />
        MINA LIPEÑA<br />
        DEPARTAMENTO DE GEOLOGIA Y MINA
      </div>
      <div class="helmet-logo"></div>
    </header>

    <div class="title-band gray">⛰️ NOTA DE REMISIÓN DE MUESTRAS GEOLÓGICAS</div>

    <div class="meta">
      <div><b>EMPRESA / INSTITUCIÓN REMITENTE:</b> <span>EMPRESA MINERA MARTE S.R.L.</span></div>
      <div><b>Laboratorio destinatario:</b> <span>${escapeHtml(laboratory)}</span></div>
      <div><b>Fecha de envío:</b> <span>${escapeHtml(formatRemissionDate(dispatch.sentAt))}</span></div>
    </div>

    <div class="rule"></div>
    <div class="section-label gray">📍 INFORMACIÓN DEL PROYECTO</div>
    <div class="project-name">${escapeHtml(projectName)}</div>
    <div class="rule"></div>
    <div class="detail-label gray">🧪 DETALLE DE MUESTRAS ENVIADAS</div>

    <table>
      <thead>
        <tr>
          <th>Nº</th>
          <th>Código de muestra</th>
          <th>Sector</th>
          <th>Nombre</th>
          <th>Prioridad</th>
          <th>Ensayos solicitados</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
        ${emptyRows}
      </tbody>
    </table>

    <section class="signatures">
      <div class="signature-line">Entregué conforme</div>
      <div class="signature-line">Recibí conforme</div>
    </section>
  </main>
  <script>
    window.addEventListener("load", () => {
      setTimeout(() => {
        window.focus();
        window.print();
      }, 160);
    });
  </script>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

function buildOfflineMapTiles(latitude: number, longitude: number) {
  const tiles: Array<{ url: string; zoom: number; x: number; y: number }> = [];
  const seen = new Set<string>();

  MAP_TILE_ZOOMS.forEach((zoom) => {
    const center = latLonToTile(latitude, longitude, zoom);
    const radius = MAP_TILE_RADIUS_BY_ZOOM[zoom];
    const maxTile = 2 ** zoom;

    for (let x = center.x - radius; x <= center.x + radius; x += 1) {
      for (let y = center.y - radius; y <= center.y + radius; y += 1) {
        if (y < 0 || y >= maxTile) continue;
        const wrappedX = ((x % maxTile) + maxTile) % maxTile;
        const server = MAP_TILE_SERVERS[Math.abs(wrappedX + y + zoom) % MAP_TILE_SERVERS.length];
        const key = `${zoom}/${wrappedX}/${y}`;
        if (seen.has(key)) continue;
        seen.add(key);
        tiles.push({
          url: `https://${server}.tile.openstreetmap.org/${zoom}/${wrappedX}/${y}.png`,
          zoom,
          x: wrappedX,
          y
        });
      }
    }
  });

  return tiles;
}

function buildRegionalOfflineMapTiles() {
  return uniqueTiles([
    ...buildTilesForBounds(SUD_LIPEZ_BOUNDS, [9, 10, 11]),
    ...buildTilesForBounds(CERRO_LIPENA_DETAIL_BOUNDS, [12, 13]),
    ...buildOfflineMapTiles(CERRO_LIPENA_CENTER.latitude, CERRO_LIPENA_CENTER.longitude)
  ]);
}

function waitForMapCacheBreath() {
  return new Promise<void>((resolve) => window.setTimeout(resolve, 120));
}

function buildTilesForBounds(
  bounds: { south: number; west: number; north: number; east: number },
  zooms: number[]
) {
  const tiles: Array<{ url: string; zoom: number; x: number; y: number }> = [];

  zooms.forEach((zoom) => {
    const northWest = latLonToTile(bounds.north, bounds.west, zoom);
    const southEast = latLonToTile(bounds.south, bounds.east, zoom);
    const maxTile = 2 ** zoom;

    for (let x = northWest.x; x <= southEast.x; x += 1) {
      for (let y = northWest.y; y <= southEast.y; y += 1) {
        if (y < 0 || y >= maxTile) continue;
        const wrappedX = ((x % maxTile) + maxTile) % maxTile;
        const server = MAP_TILE_SERVERS[Math.abs(wrappedX + y + zoom) % MAP_TILE_SERVERS.length];
        tiles.push({
          url: `https://${server}.tile.openstreetmap.org/${zoom}/${wrappedX}/${y}.png`,
          zoom,
          x: wrappedX,
          y
        });
      }
    }
  });

  return uniqueTiles(tiles);
}

function uniqueTiles(tiles: Array<{ url: string; zoom: number; x: number; y: number }>) {
  const seen = new Set<string>();
  return tiles.filter((tile) => {
    const key = `${tile.zoom}/${tile.x}/${tile.y}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function getOfflineMapCacheStatus(latitude: number, longitude: number) {
  if (!("caches" in window)) {
    return { ready: false, cached: 0, required: 0 };
  }

  const cache = await caches.open(MAP_TILE_CACHE_NAME);
  const requiredTiles = buildOfflineMapTiles(latitude, longitude).filter((tile) => tile.zoom === MAP_READY_ZOOM);
  let cached = 0;

  for (const tile of requiredTiles) {
    const match = await cache.match(tile.url);
    if (match) cached += 1;
  }

  return {
    ready: requiredTiles.length > 0 && cached === requiredTiles.length,
    cached,
    required: requiredTiles.length
  };
}

function latLonToTile(latitude: number, longitude: number, zoom: number) {
  const latRad = (latitude * Math.PI) / 180;
  const scale = 2 ** zoom;
  return {
    x: Math.floor(((longitude + 180) / 360) * scale),
    y: Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * scale)
  };
}

function OfflineGeoMap({ geoPoint }: { geoPoint: GeoPoint }) {
  return (
    <div className="border-t border-[var(--color-border-soft)]">
      <div className="relative h-56 overflow-hidden bg-[var(--color-surface-container)]">
        <div
          className="absolute inset-0 opacity-75"
          style={{
            backgroundImage:
              "linear-gradient(var(--color-border-soft) 1px, transparent 1px), linear-gradient(90deg, var(--color-border-soft) 1px, transparent 1px)",
            backgroundSize: "32px 32px"
          }}
        />
        <div className="absolute inset-x-0 top-1/2 border-t border-[var(--color-outline-variant)]/55" />
        <div className="absolute inset-y-0 left-1/2 border-l border-[var(--color-outline-variant)]/55" />
        <div className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-[var(--color-primary)] shadow-lg shadow-black/30" />
        <div className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--color-primary)]/35" />
        <div className="absolute bottom-3 left-3 rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)]/95 px-3 py-2 text-xs text-[var(--color-on-surface)] shadow">
          <p className="font-bold">Mapa offline</p>
          <p className="mt-1 text-[var(--color-on-surface-variant)]">
            Lat {geoPoint.latitude.toFixed(6)} · Lon {geoPoint.longitude.toFixed(6)}
          </p>
          {geoPoint.accuracy ? (
            <p className="text-[var(--color-on-surface-variant)]">Precisión aprox. {Math.round(geoPoint.accuracy)} m</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SamplesTable({
  rows,
  dispatches,
  registerType,
  sampleCategory,
  search,
  priorityFilter,
  resultStatusFilter,
  sampleStatusFilter,
  syncStatusFilter,
  onlyMine,
  currentUser,
  onSearch,
  onPriorityFilterChange,
  onResultStatusFilterChange,
  onSampleStatusFilterChange,
  onSyncStatusFilterChange,
  onOnlyMineChange,
  onEdit,
  onPrintVoucher,
  onDelete
}: {
  rows: SampleTableRow[];
  dispatches: SampleDispatch[];
  registerType: RegisterType;
  sampleCategory: SampleCategory;
  search: string;
  priorityFilter: SamplePriority | "";
  resultStatusFilter: ResultStatusFilter;
  sampleStatusFilter: SampleLifecycleFilter;
  syncStatusFilter: SyncStatusFilter;
  onlyMine: boolean;
  currentUser?: { id: number | string; role?: string };
  onSearch: (value: string) => void;
  onPriorityFilterChange: (value: SamplePriority | "") => void;
  onResultStatusFilterChange: (value: ResultStatusFilter) => void;
  onSampleStatusFilterChange: (value: SampleLifecycleFilter) => void;
  onSyncStatusFilterChange: (value: SyncStatusFilter) => void;
  onOnlyMineChange: (value: boolean) => void;
  onEdit: (row: SampleTableRow) => void;
  onPrintVoucher: (row: SampleTableRow) => void;
  onDelete: (row: SampleTableRow) => void;
}) {
  const [detailRow, setDetailRow] = useState<SampleTableRow | null>(null);
  const [voucherConfirmRow, setVoucherConfirmRow] = useState<SampleTableRow | null>(null);
  const [openActionsId, setOpenActionsId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<RecentRecordsView>("records");
  const [page, setPage] = useState(1);
  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const dispatchGroups = useMemo(
    () => buildDispatchGroups(rows, dispatches, registerType),
    [dispatches, registerType, rows]
  );
  const totalGroupPages = Math.max(1, Math.ceil(dispatchGroups.length / pageSize));
  const currentGroupPage = Math.min(page, totalGroupPages);
  const paginatedGroups = dispatchGroups.slice((currentGroupPage - 1) * pageSize, currentGroupPage * pageSize);
  const activeTotalPages = viewMode === "records" ? totalPages : totalGroupPages;
  const activeCurrentPage = viewMode === "records" ? currentPage : currentGroupPage;

  useEffect(() => {
    setPage(1);
    setOpenActionsId(null);
  }, [rows, dispatches, viewMode]);

  const confirmVoucherPrint = () => {
    if (!voucherConfirmRow) return;
    const row = voucherConfirmRow;
    setVoucherConfirmRow(null);
    onPrintVoucher(row);
  };
  const showRowActions = (row: SampleTableRow, scope: string) => {
    const actionId = `${scope}:${row.id}`;
    return (
    <RowActionsMenu
      row={row}
      isOpen={openActionsId === actionId}
      onToggle={() => setOpenActionsId((current) => (current === actionId ? null : actionId))}
      onClose={() => setOpenActionsId(null)}
      onView={() => {
        setOpenActionsId(null);
        setDetailRow(row);
      }}
      onEdit={() => {
        setOpenActionsId(null);
        onEdit(row);
      }}
      onPrintVoucher={() => {
        setOpenActionsId(null);
        setVoucherConfirmRow(row);
      }}
      onDelete={() => {
        setOpenActionsId(null);
        onDelete(row);
      }}
      canDelete={canDeleteRow(row, currentUser)}
    />
    );
  };

  return (
    <>
      <article className={`${panelClass} exploraciones-panel overflow-visible`}>
        <div className="border-b border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] px-5 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
              <FlaskConical size={14} />
              Registros recientes
            </h2>
            <div className="flex w-full overflow-hidden rounded-lg border border-[var(--color-outline-variant)] sm:w-auto">
              <button
                type="button"
                className={`flex-1 px-3 py-2 text-xs font-bold sm:flex-none ${
                  viewMode === "records"
                    ? "bg-[var(--color-primary)] text-[var(--color-on-primary)]"
                    : "text-[var(--color-on-surface-variant)]"
                }`}
                onClick={() => setViewMode("records")}
              >
                Registros
              </button>
              <button
                type="button"
                className={`flex-1 px-3 py-2 text-xs font-bold sm:flex-none ${
                  viewMode === "batches"
                    ? "bg-[var(--color-primary)] text-[var(--color-on-primary)]"
                    : "text-[var(--color-on-surface-variant)]"
                }`}
                onClick={() => setViewMode("batches")}
              >
                Por lote
              </button>
            </div>
            <label className="exploraciones-search relative ml-auto w-full sm:w-56">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-on-surface-variant)]" />
              <input
                className={`${fieldClass} py-2 pl-9`}
                value={search}
                onChange={(event) => onSearch(event.target.value)}
                placeholder="Código / talón"
              />
            </label>
            <select
              className={`${fieldClass} w-full py-2 sm:w-44`}
              value={sampleStatusFilter}
              onChange={(event) => onSampleStatusFilterChange(event.target.value as SampleLifecycleFilter)}
            >
              {SAMPLE_STATUS_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              className={`${fieldClass} w-full py-2 sm:w-36`}
              value={priorityFilter}
              onChange={(event) => onPriorityFilterChange(event.target.value as SamplePriority | "")}
            >
              <option value="">Prioridad</option>
              {PRIORITY_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              className={`${fieldClass} w-full py-2 sm:w-36`}
              value={resultStatusFilter}
              onChange={(event) => onResultStatusFilterChange(event.target.value as ResultStatusFilter)}
            >
              <option value="all">Resultados</option>
              <option value="with">Con resultado</option>
              <option value="without">Sin resultado</option>
            </select>
            <select
              className={`${fieldClass} w-full py-2 sm:w-44`}
              value={syncStatusFilter}
              onChange={(event) => onSyncStatusFilterChange(event.target.value as SyncStatusFilter)}
            >
              <option value="all">Sincronización</option>
              <option value="pending">Pendientes sync</option>
              <option value="synced">Sincronizados</option>
            </select>
            <button
              type="button"
              className={`${onlyMine ? primaryButton : secondaryButton} px-3 py-2`}
              onClick={() => onOnlyMineChange(!onlyMine)}
            >
              Mis registros
            </button>
            <button
              type="button"
              className={`${secondaryButton} px-3 py-2`}
              onClick={() => exportSamplesToExcel(rows, dispatches, registerType, sampleCategory)}
              disabled={rows.length === 0}
            >
              <Download size={14} />
              Exportar Excel
            </button>
          </div>
        </div>
        {viewMode === "records" ? (
        <div className="exploraciones-table-wrap overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr>
                {["Nombre", "Código / Talón", "Estado", "Prioridad", "Ubicación", "Objetivo", "Registrado por", "Muestreo", "Resultados", "Acciones"].map((heading) => (
                  <th key={heading} className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-soft)]">
              {paginatedRows.map((row) => (
                <tr key={row.id} className={`${priorityRowClass(row.priority)} transition hover:brightness-[0.98]`}>
                  <td className="px-4 py-3 text-xs">{row.name ?? "-"}</td>
                  <td className="px-4 py-3 text-xs font-bold">{formatVoucherLabel(row)}</td>
                  <td className="px-4 py-3 text-xs">
                    <span className={sampleStatusBadgeClass(row.status)}>{SAMPLE_STATUS_LABELS[row.status]}</span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <span className={priorityBadgeClass(row.priority)}>{PRIORITY_LABELS[row.priority]}</span>
                  </td>
                  <td className="px-4 py-3 text-xs">{row.location}</td>
                  <td className="px-4 py-3 text-xs">{row.objectiveName}</td>
                  <td className="px-4 py-3 text-xs">{row.createdByName}</td>
                  <td className="px-4 py-3 text-xs">{formatDate(row.sampledAt)}</td>
                  <td className="px-4 py-3 text-xs">
                    <ResultStatus results={row.results} />
                    {getRowSyncError(row) ? (
                      <p className="mt-2 max-w-xs text-xs font-semibold text-[var(--color-error)]">
                        {getRowSyncError(row)}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {showRowActions(row, "records-desktop")}
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
        ) : null}
        {viewMode === "records" ? (
        <div className="exploraciones-mobile-list hidden divide-y divide-[var(--color-border-soft)]">
          {paginatedRows.map((row) => (
            <div key={row.id} className={`px-4 py-3 ${priorityMobileClass(row.priority)}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-extrabold">{formatVoucherLabel(row)}</p>
                  <p className="mt-0.5 truncate text-xs font-semibold text-[var(--color-on-surface-variant)]">
                    {row.name ?? row.location}
                  </p>
                </div>
                {showRowActions(row, "records-mobile")}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className={sampleStatusBadgeClass(row.status)}>{SAMPLE_STATUS_LABELS[row.status]}</span>
                <span className={priorityBadgeClass(row.priority)}>{PRIORITY_LABELS[row.priority]}</span>
                <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                  row.source === "local"
                    ? "bg-[var(--color-tertiary)] text-black"
                    : "bg-[var(--color-success)] text-black"
                }`}>
                  {row.source === "local" ? "Pendiente sync" : "Sync"}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-[var(--color-on-surface-variant)]">
                <p className="truncate"><span className="font-bold">Ubicación: </span>{row.location}</p>
                <p className="truncate"><span className="font-bold">Muestreo: </span>{formatDate(row.sampledAt)}</p>
                <p className="truncate"><span className="font-bold">Objetivo: </span>{row.objectiveName}</p>
                <p className="truncate"><span className="font-bold">Usuario: </span>{row.createdByName}</p>
              </div>
              {getRowSyncError(row) ? (
                <p className="mt-2 text-xs font-semibold text-[var(--color-error)]">{getRowSyncError(row)}</p>
              ) : null}
            </div>
          ))}
          {rows.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-[var(--color-on-surface-variant)]">
              No hay muestras para mostrar.
            </p>
          ) : null}
        </div>
        ) : null}
        {viewMode === "batches" ? (
          <div className="divide-y divide-[var(--color-border-soft)]">
            {paginatedGroups.map((group) => (
              <section key={group.id} className="p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-extrabold">{group.title}</h3>
                      <span className={dispatchStatusBadgeClass(group.status)}>
                        {DISPATCH_STATUS_LABELS[group.status]}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">
                      {group.laboratory} · {formatDate(group.sentAt)} · {group.rows.length} muestra{group.rows.length === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[760px] border-collapse text-left">
                    <thead>
                      <tr>
                        {["Código / Talón", "Nombre", "Estado", "Prioridad", "Ubicación", "Resultados", "Acciones"].map((heading) => (
                          <th key={heading} className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border-soft)]">
                      {group.rows.map((row) => (
                        <tr key={`${group.id}-${row.id}`} className={`${priorityRowClass(row.priority)} transition hover:brightness-[0.98]`}>
                          <td className="px-3 py-2 text-xs font-bold">{formatVoucherLabel(row)}</td>
                          <td className="px-3 py-2 text-xs">{row.name ?? "-"}</td>
                          <td className="px-3 py-2 text-xs">
                            <span className={sampleStatusBadgeClass(row.status)}>{SAMPLE_STATUS_LABELS[row.status]}</span>
                          </td>
                          <td className="px-3 py-2 text-xs">
                            <span className={priorityBadgeClass(row.priority)}>{PRIORITY_LABELS[row.priority]}</span>
                          </td>
                          <td className="px-3 py-2 text-xs">{row.location}</td>
                          <td className="px-3 py-2 text-xs"><ResultStatus results={row.results} /></td>
                          <td className="px-3 py-2 text-xs">{showRowActions(row, `batch-${group.id}`)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}
            {dispatchGroups.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-[var(--color-on-surface-variant)]">
                No hay lotes para mostrar con los filtros actuales.
              </p>
            ) : null}
          </div>
        ) : null}
        <div className="flex flex-col gap-3 border-t border-[var(--color-border-soft)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-[var(--color-on-surface-variant)]">
            {viewMode === "records"
              ? `${rows.length} registro${rows.length === 1 ? "" : "s"}`
              : `${dispatchGroups.length} lote${dispatchGroups.length === 1 ? "" : "s"}`} · Página {activeCurrentPage} de {activeTotalPages}
          </p>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <button
              type="button"
              className={secondaryButton}
              disabled={activeCurrentPage <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Anterior
            </button>
            <button
              type="button"
              className={secondaryButton}
              disabled={activeCurrentPage >= activeTotalPages}
              onClick={() => setPage((current) => Math.min(activeTotalPages, current + 1))}
            >
              Siguiente
            </button>
          </div>
        </div>
      </article>

      {detailRow ? <SampleDetailModal row={detailRow} onClose={() => setDetailRow(null)} /> : null}
      {voucherConfirmRow ? (
        <ConfirmVoucherModal
          row={voucherConfirmRow}
          onCancel={() => setVoucherConfirmRow(null)}
          onConfirm={confirmVoucherPrint}
        />
      ) : null}
    </>
  );
}

function RowActionsMenu({
  row,
  isOpen,
  canDelete,
  onToggle,
  onClose,
  onView,
  onEdit,
  onPrintVoucher,
  onDelete
}: {
  row: SampleTableRow;
  isOpen: boolean;
  canDelete: boolean;
  onToggle: () => void;
  onClose: () => void;
  onView: () => void;
  onEdit: () => void;
  onPrintVoucher: () => void;
  onDelete: () => void;
}) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      const button = buttonRef.current;
      if (!button) return;
      const rect = button.getBoundingClientRect();
      const menuWidth = 176;
      const menuTop = Math.min(rect.bottom + 6, window.innerHeight - 168);
      const menuLeft = Math.min(Math.max(8, rect.right - menuWidth), window.innerWidth - menuWidth - 8);
      setMenuPosition({ top: Math.max(8, menuTop), left: menuLeft });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      onClose();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen, onClose]);

  const menu = isOpen && menuPosition && typeof document !== "undefined"
    ? createPortal(
        <div
          ref={menuRef}
          className="fixed z-[1000] min-w-44 overflow-hidden rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] shadow-xl"
          style={{ top: menuPosition.top, left: menuPosition.left }}
        >
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold hover:bg-[var(--color-surface-bright)]"
            onClick={onView}
          >
            <Eye size={14} />
            Ver
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold hover:bg-[var(--color-surface-bright)]"
            onClick={onEdit}
          >
            <Pencil size={14} />
            Editar
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold hover:bg-[var(--color-surface-bright)] disabled:opacity-50"
            onClick={onPrintVoucher}
            disabled={row.source !== "remote"}
          >
            <Printer size={14} />
            Imprimir talón
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-[var(--color-error)] hover:bg-[var(--color-error)]/10 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={onDelete}
            disabled={!canDelete}
            title={canDelete ? "Eliminar muestra" : "Solo ADMIN o quien la registró puede eliminarla"}
          >
            <Trash2 size={14} />
            Eliminar muestra
          </button>
        </div>,
        document.body
      )
    : null;

  return (
    <div className="relative inline-flex shrink-0">
      <button
        ref={buttonRef}
        type="button"
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-outline-variant)] text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)]"
        onClick={onToggle}
        aria-label="Abrir acciones"
      >
        <MoreVertical size={17} />
      </button>
      {menu}
    </div>
  );
}

function dispatchStatusBadgeClass(status: "PENDING" | "COMPLETED") {
  return status === "COMPLETED"
    ? "inline-flex rounded-full bg-[var(--color-success)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-black"
    : "inline-flex rounded-full bg-[var(--color-warning)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-black";
}

function buildDispatchGroups(rows: SampleTableRow[], dispatches: SampleDispatch[], registerType: RegisterType) {
  const rowsById = new Map(rows.map((row) => [row.id, row]));
  const rowsByCode = new Map(rows.map((row) => [row.code.replace(" (offline)", ""), row]));
  const usedRowIds = new Set<string>();
  const groups = dispatches
    .map((dispatch) => {
      const groupRows = dispatch.items
        .map((item) => {
          const sampleId =
            registerType === "interior"
              ? item.interiorSampleId ?? item.sample?.id
              : item.surfaceSampleId ?? item.sample?.id;
          const sampleCode = item.sample?.code;
          const row = (sampleId ? rowsById.get(sampleId) : undefined) ?? (sampleCode ? rowsByCode.get(sampleCode) : undefined);
          if (row) usedRowIds.add(row.id);
          return row;
        })
        .filter((row): row is SampleTableRow => Boolean(row))
        .sort(compareSampleRows);

      return {
        id: dispatch.id,
        title: dispatch.projectName || "Lote sin proyecto",
        laboratory: dispatch.laboratory?.name ?? "Laboratorio",
        sentAt: dispatch.sentAt,
        status: dispatch.status ?? "PENDING",
        rows: groupRows
      };
    })
    .filter((group) => group.rows.length > 0)
    .sort((left, right) => {
      const leftStatus = left.rows.some((row) => row.status === "DISPATCHED") ? 1 : 0;
      const rightStatus = right.rows.some((row) => row.status === "DISPATCHED") ? 1 : 0;
      if (leftStatus !== rightStatus) return rightStatus - leftStatus;
      const leftDate = left.sentAt ? new Date(left.sentAt).getTime() : 0;
      const rightDate = right.sentAt ? new Date(right.sentAt).getTime() : 0;
      return rightDate - leftDate;
    });

  const unbatchedRows = rows.filter((row) => !usedRowIds.has(row.id));
  if (unbatchedRows.length > 0) {
    groups.push({
      id: "unbatched",
      title: "Sin lote",
      laboratory: "Muestras registradas sin despacho",
      sentAt: "",
      status: "PENDING" as const,
      rows: unbatchedRows.sort(compareSampleRows)
    });
  }

  return groups;
}

function compareSampleRows(left: SampleTableRow, right: SampleTableRow) {
  const statusDiff = SAMPLE_STATUS_WEIGHT[right.status] - SAMPLE_STATUS_WEIGHT[left.status];
  if (statusDiff !== 0) return statusDiff;
  const priorityDiff = PRIORITY_WEIGHT[right.priority] - PRIORITY_WEIGHT[left.priority];
  if (priorityDiff !== 0) return priorityDiff;
  const leftDate = left.sampledAt ? new Date(left.sampledAt).getTime() : 0;
  const rightDate = right.sampledAt ? new Date(right.sampledAt).getTime() : 0;
  return rightDate - leftDate;
}

function DispatchPanel({
  registerType,
  form,
  items,
  samples,
  elements,
  laboratories,
  dispatches,
  isSaving,
  sampleSearch,
  onSampleSearchChange,
  onFormChange,
  onToggleSample,
  onToggleElement,
  onItemNotesChange,
  onSubmit,
  onClose,
  onDeleteDispatch,
  onRegisterResults,
  onPrintDispatch,
  onPrintVouchers
}: {
  registerType: RegisterType;
  form: DispatchForm;
  items: DispatchDraftItem[];
  samples: Array<InteriorSample | SurfaceSample>;
  elements: ElementCatalogItem[];
  laboratories: CatalogItem[];
  dispatches: SampleDispatch[];
  isSaving: boolean;
  sampleSearch: string;
  onSampleSearchChange: (value: string) => void;
  onFormChange: (field: keyof DispatchForm, value: string) => void;
  onToggleSample: (sampleId: string) => void;
  onToggleElement: (sampleId: string, elementId: string) => void;
  onItemNotesChange: (sampleId: string, notes: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
  onDeleteDispatch: (dispatch: SampleDispatch) => void;
  onRegisterResults: (dispatch: SampleDispatch, item: NonNullable<SampleDispatch["items"]>[number]) => void;
  onPrintDispatch: (dispatch: SampleDispatch) => void;
  onPrintVouchers: (dispatch: SampleDispatch) => void;
}) {
  const selectedBySample = new Map(items.map((item) => [item.sampleId, item]));
  const labOptions = labelOptions(laboratories);
  const normalizedSampleSearch = normalizeCatalogText(sampleSearch);
  const visibleSamples = normalizedSampleSearch
    ? samples.filter((sample) =>
        normalizeCatalogText(`${sample.code ?? ""} ${sample.name ?? ""}`).includes(normalizedSampleSearch)
      )
    : samples;

  return (
    <div className="exploraciones-modal fixed inset-0 z-[100] flex items-end justify-center bg-black/55 p-0 sm:items-center sm:p-4">
      <section className="exploraciones-modal-card flex h-[94vh] w-full flex-col overflow-hidden rounded-t-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] shadow-2xl sm:h-auto sm:max-h-[92vh] sm:max-w-6xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border-soft)] p-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <Send size={18} />
              Lote / Nota de remisión
            </h2>
            <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">
              Agrupa muestras registradas, elige laboratorio y solicita los elementos a analizar.
            </p>
          </div>
          <button type="button" className="rounded-lg p-2 text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-high)]" onClick={onClose} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-bold">Nuevo lote</h3>
                <p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">
                  Selecciona el laboratorio y las muestras que irán juntas.
                </p>
              </div>
              <button type="submit" className={`${primaryButton} w-full sm:w-auto`} disabled={isSaving}>
                <Send size={15} />
                Crear lote
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <FormSelect label="Laboratorio" value={form.laboratoryId} options={labOptions} onChange={(value) => onFormChange("laboratoryId", value)} />
              <TextField label="Proyecto" value={form.projectName} onChange={(value) => onFormChange("projectName", value)} />
              <TextField label="Fecha de envío" type="datetime-local" value={form.sentAt} onChange={(value) => onFormChange("sentAt", value)} />
              <TextField label="Notas" value={form.notes} onChange={(value) => onFormChange("notes", value)} />
            </div>

            <div className="grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                    Muestras registradas
                  </h3>
                  <span className="text-xs text-[var(--color-on-surface-variant)]">
                    {visibleSamples.length} de {samples.length}
                  </span>
                </div>
                <div className="relative mt-3">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-on-surface-variant)]" size={16} />
                  <input
                    className={`${fieldClass} py-2 pl-9`}
                    value={sampleSearch}
                    onChange={(event) => onSampleSearchChange(event.target.value)}
                    placeholder="Buscar por código o nombre"
                  />
                </div>
                <div className="mt-3 max-h-[42vh] space-y-2 overflow-y-auto pr-1 sm:max-h-72">
                  {visibleSamples.map((sample) => {
                    const selected = selectedBySample.has(sample.id);
                    return (
                      <label
                        key={sample.id}
                        className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
                          selected
                            ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10"
                            : "border-[var(--color-border-soft)]"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => onToggleSample(sample.id)}
                          className="mt-1"
                        />
                        <span className="min-w-0">
                          <span className="block truncate font-bold">{sample.code}</span>
                          <span className="block break-words text-xs text-[var(--color-on-surface-variant)]">
                            {sample.name ?? "-"} · {SAMPLE_STATUS_LABELS[sample.status ?? "REGISTERED"]}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                  {samples.length === 0 ? (
                    <p className="text-sm text-[var(--color-on-surface-variant)]">
                      No hay muestras registradas disponibles para despachar en este filtro.
                    </p>
                  ) : null}
                  {samples.length > 0 && visibleSamples.length === 0 ? (
                    <p className="text-sm text-[var(--color-on-surface-variant)]">
                      No hay muestras que coincidan con la búsqueda.
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] p-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                  Elementos solicitados por muestra
                </h3>
                <div className="mt-3 max-h-[42vh] space-y-3 overflow-y-auto pr-1 sm:max-h-72">
                  {items.map((item) => {
                    const sample = samples.find((candidate) => candidate.id === item.sampleId);
                    return (
                      <div key={item.sampleId} className="rounded-lg border border-[var(--color-border-soft)] p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-bold">{sample?.code ?? item.sampleId}</p>
                          <button type="button" className={secondaryButton} onClick={() => onToggleSample(item.sampleId)}>
                            <Trash2 size={13} />
                            Quitar
                          </button>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {elements.map((element) => (
                            <label key={element.id} className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[var(--color-border-soft)] px-2 py-1 text-xs">
                              <input
                                type="checkbox"
                                checked={item.elementIds.includes(element.id)}
                                onChange={() => onToggleElement(item.sampleId, element.id)}
                              />
                              {element.symbol}
                            </label>
                          ))}
                        </div>
                        <input
                          className={`${fieldClass} mt-3`}
                          value={item.notes}
                          onChange={(event) => onItemNotesChange(item.sampleId, event.target.value)}
                          placeholder="Notas de la muestra en este lote"
                        />
                      </div>
                    );
                  })}
                  {items.length === 0 ? (
                    <p className="text-sm text-[var(--color-on-surface-variant)]">
                      Selecciona muestras para indicar qué elementos debe revisar el laboratorio.
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </form>

          <div className="mt-5 border-t border-[var(--color-border-soft)] pt-4">
            <h3 className="text-sm font-bold">Lotes enviados</h3>
            <div className="mt-3 space-y-3">
              {dispatches.map((dispatch) => (
                <div key={dispatch.id} className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold">
                        {dispatch.projectName || "Sin proyecto"} · {dispatch.laboratory?.name ?? "Laboratorio"}
                      </p>
                      <p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">
                        Enviado: {formatDate(dispatch.sentAt)} · {DISPATCH_STATUS_LABELS[dispatch.status ?? "PENDING"]}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className={secondaryButton}
                        onClick={() => onPrintDispatch(dispatch)}
                      >
                        <Printer size={14} />
                        Imprimir nota
                      </button>
                      <button
                        type="button"
                        className={secondaryButton}
                        onClick={() => onPrintVouchers(dispatch)}
                      >
                        <Printer size={14} />
                        Imprimir talones
                      </button>
                      <button
                        type="button"
                        className={secondaryButton}
                        disabled={dispatch.status === "COMPLETED" || isSaving}
                        onClick={() => onDeleteDispatch(dispatch)}
                      >
                        <Trash2 size={14} />
                        Eliminar
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    {dispatch.items.map((item) => (
                      <div key={item.id} className="rounded-lg border border-[var(--color-border-soft)] p-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-bold">{item.sample?.code ?? item.interiorSampleId ?? item.surfaceSampleId}</p>
                            <p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">
                              {DISPATCH_STATUS_LABELS[item.status ?? "PENDING"]} · {(item.requestedElements ?? []).map((requested) => requested.element?.symbol ?? requested.elementId).join(", ")}
                            </p>
                          </div>
                          <button
                            type="button"
                            className={secondaryButton}
                            disabled={item.status === "COMPLETED"}
                            onClick={() => onRegisterResults(dispatch, item)}
                          >
                            <Plus size={14} />
                            Resultados
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {dispatches.length === 0 ? (
                <p className="text-sm text-[var(--color-on-surface-variant)]">
                  Aún no hay lotes para {registerType === "interior" ? "Interior Mina" : "Superficie"}.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function DispatchResultsModal({
  target,
  registerType,
  laboratoryId,
  onClose,
  onSubmit
}: {
  target: DispatchResultTarget;
  registerType: RegisterType;
  laboratoryId?: string;
  onClose: () => void;
  onSubmit: (input: {
    sampleId: string;
    laboratoryId?: string;
    results: Array<{ elementId: string; value: number; unit?: string; qualifier?: string; comments?: string }>;
  }) => void;
}) {
  const sampleId =
    registerType === "interior"
      ? target.item.interiorSampleId
      : target.item.surfaceSampleId;
  const requestedElements = target.item.requestedElements ?? [];
  const [values, setValues] = useState<Record<string, { value: string; unit: string; qualifier: string; comments: string }>>(
    () =>
      Object.fromEntries(
        requestedElements.map((requested) => [
          requested.elementId,
          {
            value: "",
            unit: requested.element?.defaultUnit ?? "",
            qualifier: "",
            comments: ""
          }
        ])
      )
  );

  const setField = (elementId: string, field: "value" | "unit" | "qualifier" | "comments", value: string) => {
    setValues((current) => {
      const previous = current[elementId] ?? { value: "", unit: "", qualifier: "", comments: "" };
      return {
        ...current,
        [elementId]: {
          ...previous,
          [field]: value
        }
      };
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!sampleId) return;
    const results = requestedElements
      .map((requested) => {
        const row = values[requested.elementId];
        if (!row?.value.trim()) return null;
        return {
          elementId: requested.elementId,
          value: toNumber(row.value, `Resultado ${requested.element?.symbol ?? requested.elementId}`) as number,
          unit: row.unit.trim() || undefined,
          qualifier: row.qualifier.trim() || undefined,
          comments: row.comments.trim() || undefined
        };
      })
      .filter(Boolean) as Array<{ elementId: string; value: number; unit?: string; qualifier?: string; comments?: string }>;
    onSubmit({ sampleId, laboratoryId, results });
  };

  return (
    <div className="exploraciones-modal fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4">
      <form onSubmit={handleSubmit} className="exploraciones-modal-card flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border-soft)] p-5">
          <div>
            <h3 className="text-xl font-bold">Registrar resultados</h3>
            <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">
              {target.item.sample?.code ?? sampleId}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-[var(--color-outline-variant)] p-2 text-[var(--color-on-surface-variant)]">
            <X size={15} />
          </button>
        </div>
        <div className="overflow-y-auto p-5">
          <div className="space-y-3">
            {requestedElements.map((requested) => {
              const row = values[requested.elementId] ?? { value: "", unit: "", qualifier: "", comments: "" };
              return (
                <div key={requested.elementId} className="grid gap-3 rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] p-3 md:grid-cols-[0.7fr_1fr_0.8fr_0.8fr]">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">Elemento</p>
                    <p className="mt-2 text-sm font-bold">{requested.element?.symbol ?? requested.elementId}</p>
                  </div>
                  <TextField label="Valor" value={row.value} onChange={(value) => setField(requested.elementId, "value", value)} />
                  <TextField label="Unidad" value={row.unit} onChange={(value) => setField(requested.elementId, "unit", value)} />
                  <TextField label="Calificador" value={row.qualifier} onChange={(value) => setField(requested.elementId, "qualifier", value)} />
                  <div className="md:col-span-4">
                    <TextField label="Comentario" value={row.comments} onChange={(value) => setField(requested.elementId, "comments", value)} />
                  </div>
                </div>
              );
            })}
            {requestedElements.length === 0 ? (
              <p className="text-sm text-[var(--color-on-surface-variant)]">
                Este ítem no tiene elementos solicitados.
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-[var(--color-border-soft)] p-4">
          <button type="button" className={secondaryButton} onClick={onClose}>Cancelar</button>
          <button type="submit" className={primaryButton}>
            <Save size={15} />
            Guardar resultados
          </button>
        </div>
      </form>
    </div>
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

function ConfirmVoucherModal({
  row,
  onCancel,
  onConfirm
}: {
  row: SampleTableRow;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="exploraciones-modal fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4">
      <section className="w-full max-w-sm rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5 shadow-2xl">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary)] text-[var(--color-on-primary)]">
            <Printer size={18} />
          </span>
          <div>
            <h3 className="text-lg font-bold">¿Imprimir talonario?</h3>
            <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">
              Se imprimirá el talón con el código de la muestra: {formatVoucherLabel(row)}.
            </p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className={secondaryButton} onClick={onCancel}>
            Cancelar
          </button>
          <button type="button" className={primaryButton} onClick={onConfirm}>
            <Printer size={15} />
            Imprimir
          </button>
        </div>
      </section>
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
              <DetailItem
                label="Estado"
                value={row.source === "local" ? "Pendiente local" : SAMPLE_STATUS_LABELS[row.status]}
              />
              {getRowSyncError(row) ? (
                <DetailItem label="Error de sincronización" value={getRowSyncError(row)} />
              ) : null}
              <DetailItem label="Tipo" value={isInterior ? "Interior Mina" : "Superficie"} />
              <DetailItem label="Categoría" value={CATEGORY_LABELS[(payload.category ?? "EXPLORATION") as SampleCategory]} />
              <DetailItem label="Nombre" value={row.name ?? "-"} />
              <DetailItem label="Código / Talón" value={formatVoucherLabel(row)} />
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
  const needsAbbreviation =
    kind.includes("area") || kind === "interior-level" || kind === "interior-labor" || kind === "surface-level" || kind === "surface-labor";
  const isElement = kind === "element";
  const needsAreaParent = kind === "interior-level" || kind === "surface-level";
  const needsLevelParent = kind === "interior-labor" || kind === "surface-labor";

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
          {kind === "interior-level" || kind === "surface-level" ? (
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
