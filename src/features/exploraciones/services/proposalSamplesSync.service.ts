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
  markProposalActionAsSynced,
  markProposalActionSyncError,
  markProposalCatalogAsSynced,
  markProposalSampleAsSynced,
  type OfflineProposalAction,
  type OfflineProposalCatalog,
  type ProposalPayload
} from "@/features/exploraciones/db/exploracionesDb";
import type {
  InteriorSampleWithResultsPayload,
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

  for (const action of pending) {
    if (!action.id) continue;
    try {
      const payload = resolvePayloadIds(action.payload, idMap);
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
      if (action.entity === "sample") {
        sampleFailed += 1;
      } else {
        catalogFailed += 1;
      }
      await markProposalActionSyncError(action.id, toErrorMessage(error));
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
    catalogFailed
  };
}
