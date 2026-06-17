import Dexie, { type EntityTable } from "dexie";
import type { ExploracionMuestraPayload } from "@/features/exploraciones/model/muestra.schema";
import type { ExploracionElementoPayload } from "@/features/exploraciones/model/muestra.schema";
import type {
  InteriorSampleWithResultsPayload,
  SurfaceSampleWithResultsPayload
} from "@/features/exploraciones/model/proposalSamples.schema";

export interface OfflineExploracionMuestra {
  id?: number;
  localId: string;
  remoteId?: string;
  payload: ExploracionMuestraPayload;
  synced: boolean;
  syncedAt?: string;
  syncError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OfflineExploracionElemento {
  id?: number;
  localId: string;
  remoteId?: string;
  payload: ExploracionElementoPayload;
  synced: boolean;
  syncedAt?: string;
  syncError?: string;
  createdAt: string;
  updatedAt: string;
}

export type ProposalModule = "shared" | "interior" | "surface";
export type ProposalEntity =
  | "element"
  | "area"
  | "level"
  | "labor"
  | "objective"
  | "laboratory"
  | "sample";

export type ProposalPayload =
  | Record<string, unknown>
  | InteriorSampleWithResultsPayload
  | SurfaceSampleWithResultsPayload;

export interface OfflineProposalAction {
  id?: number;
  localId: string;
  remoteId?: string;
  module: ProposalModule;
  entity: ProposalEntity;
  payload: ProposalPayload;
  synced: boolean;
  syncedAt?: string;
  syncError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OfflineProposalCatalog {
  id?: number;
  localId: string;
  remoteId?: string;
  module: ProposalModule;
  entity: Exclude<ProposalEntity, "sample">;
  name: string;
  abbreviation?: string;
  symbol?: string;
  defaultUnit?: string;
  description?: string;
  parentLocalId?: string;
  parentRemoteId?: string;
  elevation?: number;
  synced: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OfflineProposalSample {
  id?: number;
  localId: string;
  remoteId?: string;
  module: Exclude<ProposalModule, "shared">;
  code: string;
  payload: InteriorSampleWithResultsPayload | SurfaceSampleWithResultsPayload;
  synced: boolean;
  syncError?: string;
  createdAt: string;
  updatedAt: string;
}

class ExploracionesDb extends Dexie {
  muestras!: EntityTable<OfflineExploracionMuestra, "id">;
  elementos!: EntityTable<OfflineExploracionElemento, "id">;
  proposalActions!: EntityTable<OfflineProposalAction, "id">;
  proposalCatalogs!: EntityTable<OfflineProposalCatalog, "id">;
  proposalSamples!: EntityTable<OfflineProposalSample, "id">;

  constructor() {
    super("marteExploracionesDb");
    this.version(1).stores({
      muestras: "++id, localId, remoteId, synced, createdAt, updatedAt"
    });
    this.version(2).stores({
      muestras: "++id, localId, remoteId, synced, createdAt, updatedAt",
      elementos: "++id, localId, remoteId, synced, createdAt, updatedAt"
    });
    this.version(3).stores({
      muestras: "++id, localId, remoteId, synced, createdAt, updatedAt",
      elementos: "++id, localId, remoteId, synced, createdAt, updatedAt",
      proposalActions: "++id, localId, remoteId, module, entity, synced, createdAt, updatedAt",
      proposalCatalogs:
        "++id, localId, remoteId, module, entity, parentLocalId, parentRemoteId, synced, createdAt, updatedAt",
      proposalSamples: "++id, localId, remoteId, module, synced, createdAt, updatedAt"
    });
  }
}

export const exploracionesDb = new ExploracionesDb();

function buildLocalId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function saveMuestraOffline(payload: ExploracionMuestraPayload) {
  const now = new Date().toISOString();
  const id = await exploracionesDb.muestras.add({
    localId: buildLocalId(),
    payload,
    synced: false,
    createdAt: now,
    updatedAt: now
  });

  return exploracionesDb.muestras.get(id);
}

export async function saveMuestrasOfflineBatch(payloads: ExploracionMuestraPayload[]) {
  if (payloads.length === 0) return;
  const now = new Date().toISOString();
  await exploracionesDb.muestras.bulkAdd(
    payloads.map((payload) => ({
      localId: buildLocalId(),
      payload,
      synced: false,
      createdAt: now,
      updatedAt: now
    }))
  );
}

export async function getMuestrasOffline() {
  return exploracionesDb.muestras.orderBy("createdAt").reverse().toArray();
}

export async function getPendingMuestras(limit = 50) {
  return exploracionesDb.muestras.filter((item) => !item.synced).limit(limit).toArray();
}

export async function updateMuestraOffline(id: number, payload: ExploracionMuestraPayload) {
  await exploracionesDb.muestras.update(id, {
    payload,
    synced: false,
    syncError: undefined,
    updatedAt: new Date().toISOString()
  });

  return exploracionesDb.muestras.get(id);
}

export async function queueRemoteEditOffline(remoteId: string, payload: ExploracionMuestraPayload) {
  const existing = await exploracionesDb.muestras
    .where("remoteId")
    .equals(remoteId)
    .first();

  if (existing?.id) {
    await exploracionesDb.muestras.update(existing.id, {
      payload,
      synced: false,
      syncError: undefined,
      updatedAt: new Date().toISOString()
    });
    return exploracionesDb.muestras.get(existing.id);
  }

  const now = new Date().toISOString();
  const id = await exploracionesDb.muestras.add({
    localId: buildLocalId(),
    remoteId,
    payload,
    synced: false,
    createdAt: now,
    updatedAt: now
  });

  return exploracionesDb.muestras.get(id);
}

export async function markMuestraAsSynced(id: number, remoteId?: string) {
  await exploracionesDb.muestras.update(id, {
    synced: true,
    remoteId,
    syncedAt: new Date().toISOString(),
    syncError: undefined,
    updatedAt: new Date().toISOString()
  });
}

export async function markMuestraSyncError(id: number, message: string) {
  await exploracionesDb.muestras.update(id, {
    syncError: message,
    updatedAt: new Date().toISOString()
  });
}

export async function saveElementoOffline(payload: ExploracionElementoPayload) {
  const now = new Date().toISOString();
  const id = await exploracionesDb.elementos.add({
    localId: buildLocalId(),
    payload,
    synced: false,
    createdAt: now,
    updatedAt: now
  });
  return exploracionesDb.elementos.get(id);
}

export async function saveElementosOfflineBatch(payloads: ExploracionElementoPayload[]) {
  if (payloads.length === 0) return;
  const now = new Date().toISOString();
  await exploracionesDb.elementos.bulkAdd(
    payloads.map((payload) => ({
      localId: buildLocalId(),
      payload,
      synced: false,
      createdAt: now,
      updatedAt: now
    }))
  );
}

export async function getElementosOffline() {
  return exploracionesDb.elementos.orderBy("createdAt").reverse().toArray();
}

export async function getPendingElementos(limit = 100) {
  return exploracionesDb.elementos.filter((item) => !item.synced).limit(limit).toArray();
}

export async function markElementoAsSynced(id: number, remoteId?: string) {
  await exploracionesDb.elementos.update(id, {
    synced: true,
    remoteId,
    syncedAt: new Date().toISOString(),
    syncError: undefined,
    updatedAt: new Date().toISOString()
  });
}

export async function markElementoSyncError(id: number, message: string) {
  await exploracionesDb.elementos.update(id, {
    syncError: message,
    updatedAt: new Date().toISOString()
  });
}

export function buildProposalLocalId(prefix = "local") {
  return `${prefix}-${buildLocalId()}`;
}

export async function saveProposalAction(action: {
  localId: string;
  remoteId?: string;
  module: ProposalModule;
  entity: ProposalEntity;
  payload: ProposalPayload;
}) {
  const now = new Date().toISOString();
  const id = await exploracionesDb.proposalActions.add({
    ...action,
    synced: false,
    createdAt: now,
    updatedAt: now
  });
  return exploracionesDb.proposalActions.get(id);
}

export async function saveProposalCatalog(item: Omit<OfflineProposalCatalog, "id" | "createdAt" | "updatedAt">) {
  const now = new Date().toISOString();
  const id = await exploracionesDb.proposalCatalogs.add({
    ...item,
    createdAt: now,
    updatedAt: now
  });
  return exploracionesDb.proposalCatalogs.get(id);
}

export async function cacheProposalCatalogs(items: Array<Omit<OfflineProposalCatalog, "id" | "createdAt" | "updatedAt" | "synced">>) {
  const now = new Date().toISOString();
  for (const item of items) {
    const existing = item.remoteId
      ? await exploracionesDb.proposalCatalogs
          .where("remoteId")
          .equals(item.remoteId)
          .and((current) => current.module === item.module && current.entity === item.entity)
          .first()
      : undefined;

    if (existing?.id) {
      await exploracionesDb.proposalCatalogs.update(existing.id, {
        ...item,
        synced: true,
        updatedAt: now
      });
    } else {
      await exploracionesDb.proposalCatalogs.add({
        ...item,
        synced: true,
        createdAt: now,
        updatedAt: now
      });
    }
  }
}

export async function saveProposalSample(item: Omit<OfflineProposalSample, "id" | "createdAt" | "updatedAt">) {
  const now = new Date().toISOString();
  const id = await exploracionesDb.proposalSamples.add({
    ...item,
    createdAt: now,
    updatedAt: now
  });
  return exploracionesDb.proposalSamples.get(id);
}

export async function updateProposalSampleOffline(
  localId: string,
  payload: InteriorSampleWithResultsPayload | SurfaceSampleWithResultsPayload
) {
  const now = new Date().toISOString();
  const sample = await exploracionesDb.proposalSamples.where("localId").equals(localId).first();
  if (sample?.id) {
    await exploracionesDb.proposalSamples.update(sample.id, {
      payload,
      synced: false,
      syncError: undefined,
      updatedAt: now
    });
  }

  const action = await exploracionesDb.proposalActions
    .where("localId")
    .equals(localId)
    .and((item) => item.entity === "sample" && !item.synced)
    .first();
  if (action?.id) {
    await exploracionesDb.proposalActions.update(action.id, {
      payload,
      syncError: undefined,
      updatedAt: now
    });
  }
}

export async function getProposalCatalogs() {
  return exploracionesDb.proposalCatalogs.orderBy("createdAt").toArray();
}

export async function getProposalSamples() {
  return exploracionesDb.proposalSamples.orderBy("createdAt").reverse().toArray();
}

export async function getPendingProposalActions(limit = 500) {
  return exploracionesDb.proposalActions.filter((item) => !item.synced).limit(limit).toArray();
}

export async function markProposalActionAsSynced(id: number, remoteId?: string) {
  await exploracionesDb.proposalActions.update(id, {
    remoteId,
    synced: true,
    syncedAt: new Date().toISOString(),
    syncError: undefined,
    updatedAt: new Date().toISOString()
  });
}

export async function markProposalActionSyncError(id: number, message: string) {
  await exploracionesDb.proposalActions.update(id, {
    syncError: message,
    updatedAt: new Date().toISOString()
  });
}

export async function markProposalCatalogAsSynced(localId: string, remoteId?: string) {
  const item = await exploracionesDb.proposalCatalogs.where("localId").equals(localId).first();
  if (!item?.id) return;
  await exploracionesDb.proposalCatalogs.update(item.id, {
    remoteId,
    synced: true,
    updatedAt: new Date().toISOString()
  });
}

export async function markProposalSampleAsSynced(localId: string, remoteId?: string, code?: string) {
  const item = await exploracionesDb.proposalSamples.where("localId").equals(localId).first();
  if (!item?.id) return;
  await exploracionesDb.proposalSamples.update(item.id, {
    remoteId,
    code: code ?? item.code,
    synced: true,
    syncError: undefined,
    updatedAt: new Date().toISOString()
  });
}
