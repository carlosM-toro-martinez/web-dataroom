import { ApiError } from "@/shared/api/core/apiError";
import {
  createInteriorArea,
  createInteriorLabor,
  createInteriorLaboratory,
  createInteriorLevel,
  createInteriorObjective,
  createInteriorSampleWithResults,
  createSharedElement,
  createSurfaceArea,
  createSurfaceLaboratory,
  createSurfaceObjective,
  createSurfaceSampleWithResults,
  updateInteriorSampleWithResults,
  updateSurfaceSampleWithResults
} from "@/features/exploraciones/api/proposalSamplesApi";
import {
  getPendingProposalActions,
  getProposalCatalogs,
  markSeedProposalCatalogActionsAsSynced,
  markProposalActionAsSynced,
  markProposalActionSyncError,
  markProposalCatalogAsSynced,
  markProposalSampleAsSynced,
  markProposalSampleSyncError,
  type OfflineProposalAction,
  type OfflineProposalCatalog,
  type ProposalPayload
} from "@/features/exploraciones/db/exploracionesDb";
import type {
  InteriorSampleWithResultsPayload,
  SampleCategory,
  SamplePriority,
  SampleResultPayload,
  SurfaceSampleWithResultsPayload
} from "@/features/exploraciones/model/proposalSamples.schema";

export interface SyncProposalSamplesResult {
  total: number;
  synced: number;
  failed: number;
  sampleTotal: number;
  sampleSynced: number;
  sampleFailed: number;
  catalogTotal: number;
  catalogSynced: number;
  catalogFailed: number;
  sampleErrors: string[];
}

export interface SyncProposalSamplesOptions {
  retryFailed?: boolean;
}

function isConnectivityIssue(error: unknown) {
  if (typeof navigator !== "undefined" && !navigator.onLine) return true;
  if (error instanceof ApiError) {
    if (!error.statusCode) return true;
    if (error.message.toLowerCase().includes("no se pudo conectar")) return true;
  }
  return false;
}

function toErrorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Error desconocido al sincronizar exploraciones.";
}

function normalizeCatalogText(value?: unknown) {
  return typeof value === "string"
    ? value
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
    : "";
}

function sameCatalogValue(left?: unknown, right?: unknown) {
  const normalizedLeft = normalizeCatalogText(left);
  const normalizedRight = normalizeCatalogText(right);
  return Boolean(normalizedLeft && normalizedRight && normalizedLeft === normalizedRight);
}

function resolveId(value: unknown, idMap: Map<string, string>) {
  return typeof value === "string" && idMap.has(value) ? idMap.get(value) : value;
}

function resolvePayloadIds(payload: ProposalPayload, idMap: Map<string, string>): ProposalPayload {
  if (!payload || typeof payload !== "object") return payload;
  const source = payload as Record<string, unknown>;
  const next: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(source)) {
    if (Array.isArray(value)) {
      next[key] = value.map((item) =>
        item && typeof item === "object"
          ? resolvePayloadIds(item as ProposalPayload, idMap)
          : resolveId(item, idMap)
      );
      continue;
    }

    if (value && typeof value === "object") {
      next[key] = resolvePayloadIds(value as ProposalPayload, idMap);
      continue;
    }

    next[key] = key.endsWith("Id") ? resolveId(value, idMap) : value;
  }

  return next as ProposalPayload;
}

const localIdPrefixes = [
  "seed-",
  "element-",
  "interior-area-",
  "interior-level-",
  "interior-labor-",
  "interior-objective-",
  "interior-laboratory-",
  "surface-area-",
  "surface-objective-",
  "surface-laboratory-"
];

function isLocalOnlyId(value: unknown) {
  return (
    typeof value === "string" &&
    (value.includes("-local-") || localIdPrefixes.some((prefix) => value.startsWith(prefix)))
  );
}

function getFieldLabel(field: string) {
  const labels: Record<string, string> = {
    elementId: "elemento",
    interiorAreaId: "area",
    interiorLevelId: "nivel",
    interiorLaborId: "labor",
    interiorObjectiveId: "objetivo",
    interiorLaboratoryId: "laboratorio",
    surfaceAreaId: "area",
    surfaceObjectiveId: "objetivo",
    surfaceLaboratoryId: "laboratorio"
  };
  return labels[field] ?? field;
}

function findUnresolvedLocalId(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  if (Array.isArray(payload)) {
    for (const item of payload) {
      const unresolved = findUnresolvedLocalId(item);
      if (unresolved) return unresolved;
    }
    return undefined;
  }

  for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
    if (key.endsWith("Id") && isLocalOnlyId(value)) return getFieldLabel(key);
    const unresolved = findUnresolvedLocalId(value);
    if (unresolved) return unresolved;
  }

  return undefined;
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const samplePriorities = new Set(["URGENT", "HIGH", "NORMAL", "LOW"]);
const sampleCategories = new Set(["EXPLORATION", "PRODUCTION"]);
const labSlots = new Set(["L1", "L2", "L3"]);

function isUuid(value: unknown) {
  return typeof value === "string" && uuidPattern.test(value);
}

function assertUuid(value: unknown, field: string) {
  if (!isUuid(value)) {
    throw new Error(`No se pudo sincronizar la muestra porque ${getFieldLabel(field)} no tiene un UUID valido.`);
  }
}

function normalizeOptionalNumber(value: unknown, field: string) {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = typeof value === "number" ? value : Number(String(value).trim().replace(",", "."));
  if (!Number.isFinite(parsed)) {
    throw new Error(`No se pudo sincronizar la muestra porque ${field} debe ser numerico.`);
  }
  return parsed;
}

function normalizeOptionalDate(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") {
    throw new Error("No se pudo sincronizar la muestra porque la fecha de muestreo no es valida.");
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("No se pudo sincronizar la muestra porque la fecha de muestreo no es valida.");
  }
  return date.toISOString();
}

function normalizeLaboratory(value: unknown) {
  if (!value || typeof value !== "object") return undefined;
  const source = value as Record<string, unknown>;
  const name = typeof source.name === "string" ? source.name.trim() : "";
  if (!name) return undefined;
  return {
    name,
    abbreviation: typeof source.abbreviation === "string" && source.abbreviation.trim()
      ? source.abbreviation.trim()
      : undefined,
    description: typeof source.description === "string" && source.description.trim()
      ? source.description.trim()
      : undefined
  };
}

function normalizeResults(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return undefined;
      const source = item as Record<string, unknown>;
      assertUuid(source.elementId, "elementId");
      return {
        elementId: source.elementId as string,
        value: normalizeOptionalNumber(source.value, "valor del resultado"),
        unit: typeof source.unit === "string" && source.unit.trim() ? source.unit.trim() : undefined,
        qualifier: typeof source.qualifier === "string" && source.qualifier.trim() ? source.qualifier.trim() : undefined,
        comments: typeof source.comments === "string" && source.comments.trim() ? source.comments.trim() : undefined
      };
    })
    .filter(Boolean) as SampleResultPayload[];
}

function sanitizeInteriorAssignments(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    if (!item || typeof item !== "object") {
      throw new Error("No se pudo sincronizar la muestra porque un laboratorio asignado no es valido.");
    }
    const source = item as Record<string, unknown>;
    if (typeof source.slot !== "string" || !labSlots.has(source.slot)) {
      throw new Error("No se pudo sincronizar la muestra porque cada laboratorio interior debe tener slot L1, L2 o L3.");
    }
    const laboratory = normalizeLaboratory(source.laboratory);
    if (source.interiorLaboratoryId) assertUuid(source.interiorLaboratoryId, "interiorLaboratoryId");
    if (!source.interiorLaboratoryId && !laboratory?.name) {
      throw new Error("No se pudo sincronizar la muestra porque cada laboratorio asignado requiere laboratorio o nombre nuevo.");
    }
    return {
      slot: source.slot,
      interiorLaboratoryId: source.interiorLaboratoryId as string | undefined,
      laboratory,
      results: normalizeResults(source.results)
    };
  });
}

function sanitizeSurfaceAssignments(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    if (!item || typeof item !== "object") {
      throw new Error("No se pudo sincronizar la muestra porque un laboratorio asignado no es valido.");
    }
    const source = item as Record<string, unknown>;
    const laboratory = normalizeLaboratory(source.laboratory);
    if (source.surfaceLaboratoryId) assertUuid(source.surfaceLaboratoryId, "surfaceLaboratoryId");
    if (!source.surfaceLaboratoryId && !laboratory?.name) {
      throw new Error("No se pudo sincronizar la muestra porque cada laboratorio asignado requiere laboratorio o nombre nuevo.");
    }
    return {
      surfaceLaboratoryId: source.surfaceLaboratoryId as string | undefined,
      laboratory,
      results: normalizeResults(source.results)
    };
  });
}

function sanitizeSamplePayload(action: OfflineProposalAction, payload: ProposalPayload) {
  const source = payload as Record<string, unknown>;
  if (source.priority !== undefined && !samplePriorities.has(String(source.priority))) {
    throw new Error("No se pudo sincronizar la muestra porque la prioridad no es valida.");
  }
  if (source.category !== undefined && !sampleCategories.has(String(source.category))) {
    throw new Error("No se pudo sincronizar la muestra porque la categoria no es valida.");
  }

  const common = {
    name: typeof source.name === "string" && source.name.trim() ? source.name.trim() : undefined,
    category: (source.category as SampleCategory | undefined) ?? "EXPLORATION",
    priority: source.priority as SamplePriority | undefined,
    east: normalizeOptionalNumber(source.east, "este"),
    north: normalizeOptionalNumber(source.north, "norte"),
    elevation: normalizeOptionalNumber(source.elevation, "elevacion"),
    sampledAt: normalizeOptionalDate(source.sampledAt)
  };

  if (action.module === "interior") {
    assertUuid(source.interiorLaborId, "interiorLaborId");
    assertUuid(source.interiorObjectiveId, "interiorObjectiveId");
    return {
      ...common,
      interiorLaborId: source.interiorLaborId,
      interiorObjectiveId: source.interiorObjectiveId,
      labAssignments: sanitizeInteriorAssignments(source.labAssignments)
    } as ProposalPayload;
  }

  if (action.module === "surface") {
    assertUuid(source.surfaceAreaId, "surfaceAreaId");
    assertUuid(source.surfaceObjectiveId, "surfaceObjectiveId");
    return {
      ...common,
      surfaceAreaId: source.surfaceAreaId,
      surfaceObjectiveId: source.surfaceObjectiveId,
      labAssignments: sanitizeSurfaceAssignments(source.labAssignments)
    } as ProposalPayload;
  }

  return payload;
}

function preparePayloadForSync(action: OfflineProposalAction, payload: ProposalPayload) {
  if (action.entity !== "sample") return payload;

  const unresolvedField = findUnresolvedLocalId(payload);
  if (unresolvedField) {
    throw new Error(
      `No se pudo sincronizar la muestra porque el ${unresolvedField} aun es local. Con internet, vuelve a seleccionar ese catalogo y guarda la muestra.`
    );
  }

  return sanitizeSamplePayload(action, payload);
}

function findExistingCatalog(
  action: OfflineProposalAction,
  payload: ProposalPayload,
  catalogs: OfflineProposalCatalog[],
  idMap: Map<string, string>
) {
  if (action.entity === "sample") return undefined;
  const source = payload as Record<string, unknown>;

  return catalogs.find((catalog) => {
    if (!catalog.synced || !catalog.remoteId) return false;
    if (catalog.module !== action.module || catalog.entity !== action.entity) return false;

    if (action.entity === "element") {
      return sameCatalogValue(catalog.symbol, source.symbol) || sameCatalogValue(catalog.name, source.name);
    }

    const sameName = sameCatalogValue(catalog.name, source.name);
    const sameAbbreviation = source.abbreviation
      ? sameCatalogValue(catalog.abbreviation, source.abbreviation)
      : true;
    if (!sameName || !sameAbbreviation) return false;

    if (action.entity === "level") {
      const parentId = resolveId(source.interiorAreaId, idMap);
      return !parentId || catalog.parentRemoteId === parentId || catalog.parentLocalId === parentId;
    }

    if (action.entity === "labor") {
      const parentId = resolveId(source.interiorLevelId, idMap);
      return !parentId || catalog.parentRemoteId === parentId || catalog.parentLocalId === parentId;
    }

    return true;
  });
}

function findExistingCatalogForLocalCatalog(
  localCatalog: OfflineProposalCatalog,
  catalogs: OfflineProposalCatalog[],
  idMap: Map<string, string>
) {
  return findExistingCatalog(
    {
      localId: localCatalog.localId,
      module: localCatalog.module,
      entity: localCatalog.entity,
      payload: {
        name: localCatalog.name,
        abbreviation: localCatalog.abbreviation,
        symbol: localCatalog.symbol,
        interiorAreaId: localCatalog.parentLocalId ?? localCatalog.parentRemoteId,
        interiorLevelId: localCatalog.parentLocalId ?? localCatalog.parentRemoteId
      },
      synced: false,
      createdAt: localCatalog.createdAt,
      updatedAt: localCatalog.updatedAt
    },
    {
      name: localCatalog.name,
      abbreviation: localCatalog.abbreviation,
      symbol: localCatalog.symbol,
      interiorAreaId: localCatalog.parentLocalId ?? localCatalog.parentRemoteId,
      interiorLevelId: localCatalog.parentLocalId ?? localCatalog.parentRemoteId
    },
    catalogs,
    idMap
  );
}

function hydrateCatalogIdMap(catalogs: OfflineProposalCatalog[], idMap: Map<string, string>) {
  let changed = true;
  while (changed) {
    changed = false;
    for (const catalog of catalogs) {
      if (catalog.remoteId || idMap.has(catalog.localId)) continue;
      const existing = findExistingCatalogForLocalCatalog(catalog, catalogs, idMap);
      if (existing?.remoteId) {
        idMap.set(catalog.localId, existing.remoteId);
        changed = true;
      }
    }
  }
}

async function runCreate(action: OfflineProposalAction, payload: ProposalPayload) {
  if (action.module === "shared" && action.entity === "element") {
    return createSharedElement(payload as { name: string; symbol: string; defaultUnit?: string; description?: string });
  }

  if (action.module === "interior") {
    if (action.entity === "area") {
      return createInteriorArea(payload as { name: string; abbreviation: string; description?: string });
    }
    if (action.entity === "level") {
      return createInteriorLevel(
        payload as {
          interiorAreaId: string;
          name: string;
          abbreviation: string;
          elevation?: number;
          description?: string;
        }
      );
    }
    if (action.entity === "labor") {
      return createInteriorLabor(
        payload as { interiorLevelId: string; name: string; abbreviation: string; description?: string }
      );
    }
    if (action.entity === "objective") {
      return createInteriorObjective(payload as { name: string; description?: string });
    }
    if (action.entity === "laboratory") {
      return createInteriorLaboratory(payload as { name: string; abbreviation?: string; description?: string });
    }
    if (action.entity === "sample") {
      if (action.remoteId) {
        return updateInteriorSampleWithResults(action.remoteId, payload as Partial<InteriorSampleWithResultsPayload>);
      }
      return createInteriorSampleWithResults(payload as InteriorSampleWithResultsPayload);
    }
  }

  if (action.module === "surface") {
    if (action.entity === "area") {
      return createSurfaceArea(payload as { name: string; abbreviation: string; description?: string });
    }
    if (action.entity === "objective") {
      return createSurfaceObjective(payload as { name: string; description?: string });
    }
    if (action.entity === "laboratory") {
      return createSurfaceLaboratory(payload as { name: string; abbreviation?: string; description?: string });
    }
    if (action.entity === "sample") {
      if (action.remoteId) {
        return updateSurfaceSampleWithResults(action.remoteId, payload as Partial<SurfaceSampleWithResultsPayload>);
      }
      return createSurfaceSampleWithResults(payload as SurfaceSampleWithResultsPayload);
    }
  }

  throw new Error(`Accion offline no soportada: ${action.module}/${action.entity}`);
}

export async function syncPendingProposalSamples(
  options: SyncProposalSamplesOptions = {}
): Promise<SyncProposalSamplesResult> {
  await markSeedProposalCatalogActionsAsSynced();
  const pending = (await getPendingProposalActions(500)).filter(
    (action) => options.retryFailed || !action.syncError
  );
  const catalogs = await getProposalCatalogs();
  const idMap = new Map<string, string>();
  catalogs.forEach((item) => {
    if (item.remoteId) idMap.set(item.localId, item.remoteId);
  });
  hydrateCatalogIdMap(catalogs, idMap);

  let synced = 0;
  let failed = 0;
  let sampleSynced = 0;
  let sampleFailed = 0;
  let catalogSynced = 0;
  let catalogFailed = 0;
  const sampleErrors: string[] = [];

  for (const action of pending) {
    if (!action.id) continue;
    try {
      const payload = preparePayloadForSync(action, resolvePayloadIds(action.payload, idMap));
      const existingCatalog = findExistingCatalog(action, payload, catalogs, idMap);
      if (existingCatalog?.remoteId) {
        await markProposalActionAsSynced(action.id, existingCatalog.remoteId);
        await markProposalCatalogAsSynced(action.localId, existingCatalog.remoteId);
        idMap.set(action.localId, existingCatalog.remoteId);
        synced += 1;
        catalogSynced += 1;
        continue;
      }

      const response = await runCreate(action, payload);
      const remoteId = response?.id;
      const code = "code" in response && typeof response.code === "string" ? response.code : undefined;

      await markProposalActionAsSynced(action.id, remoteId);
      if (remoteId) idMap.set(action.localId, remoteId);

      if (action.entity === "sample") {
        await markProposalSampleAsSynced(action.localId, remoteId, code);
        sampleSynced += 1;
      } else {
        await markProposalCatalogAsSynced(action.localId, remoteId);
        catalogSynced += 1;
      }
      synced += 1;
    } catch (error) {
      if (isConnectivityIssue(error)) continue;
      failed += 1;
      const message = toErrorMessage(error);
      if (action.entity === "sample") {
        sampleFailed += 1;
        sampleErrors.push(message);
        await markProposalSampleSyncError(action.localId, message);
      } else {
        catalogFailed += 1;
      }
      await markProposalActionSyncError(action.id, message);
    }
  }

  return {
    total: pending.length,
    synced,
    failed,
    sampleTotal: pending.filter((action) => action.entity === "sample").length,
    sampleSynced,
    sampleFailed,
    catalogTotal: pending.filter((action) => action.entity !== "sample").length,
    catalogSynced,
    catalogFailed,
    sampleErrors
  };
}
