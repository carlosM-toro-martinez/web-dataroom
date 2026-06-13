import Dexie, { type EntityTable } from "dexie";
import type { ExploracionMuestraPayload } from "@/features/exploraciones/model/muestra.schema";
import type { ExploracionElementoPayload } from "@/features/exploraciones/model/muestra.schema";

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

class ExploracionesDb extends Dexie {
  muestras!: EntityTable<OfflineExploracionMuestra, "id">;
  elementos!: EntityTable<OfflineExploracionElemento, "id">;

  constructor() {
    super("marteExploracionesDb");
    this.version(1).stores({
      muestras: "++id, localId, remoteId, synced, createdAt, updatedAt"
    });
    this.version(2).stores({
      muestras: "++id, localId, remoteId, synced, createdAt, updatedAt",
      elementos: "++id, localId, remoteId, synced, createdAt, updatedAt"
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
