import Dexie, { type EntityTable } from "dexie";
import type { DrillingCampaign, DrillingHole, DrillingShiftReport } from "@/features/sondajes/model/sondajes.schema";

// Base local de Sondajes (separada de la de Exploraciones).
//  - campaigns / holes / shiftReports: copia de lo último descargado, para trabajar sin conexión.
//  - shiftReportQueue: partes creados o editados en el dispositivo que aún no llegan al servidor.

export type CachedCampaign = { id: string; data: DrillingCampaign };
export type CachedHole = { id: string; campaignId: string; data: DrillingHole };
export type CachedShiftReport = { id: string; holeId: string; data: DrillingShiftReport };

export type ShiftActivity = {
  from?: string | null;
  to?: string | null;
  depthFrom?: number | null;
  depthTo?: number | null;
  description?: string | null;
  lithology?: string | null;
};

export type ShiftIncident = {
  id: string;
  category: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  description: string;
  status: "OPEN" | "RESOLVED";
  resolution?: string | null;
  resolvedBy?: string | null;
  resolvedAt?: string | null;
  createdAt?: string | null;
};

// Campos del "Reporte diario de perforación diamantina".
export type ShiftReportPayload = {
  date: string;
  shift: "DAY" | "NIGHT";
  fromDepth: number;
  toDepth: number;
  drillingHours?: number | null;
  standbyHours?: number | null;
  diameter?: string | null;
  operator?: string | null;
  observations?: string | null;
  reportNumber?: string | null;
  coreRecovery?: number | null;
  waterReturn?: string | null;
  rockType?: string | null;
  rigName?: string | null;
  coreBoxNumber?: string | null;
  drillingMethod?: "DIAMOND" | "REVERSE_AIR" | null;
  rcDiameter?: string | null;
  casing?: string | null;
  crownNumber?: string | null;
  reamerNumber?: string | null;
  shoeNumber?: string | null;
  firstHelper?: string | null;
  secondHelper?: string | null;
  driver?: string | null;
  supervisor?: string | null;
  drillingChief?: string | null;
  activities?: ShiftActivity[] | null;
  consumables?: Record<string, number | string | null | undefined> | null;
  additives?: Record<string, number | null | undefined> | null;
  timeDetail?: Record<string, number | null | undefined> | null;
  incidents?: ShiftIncident[] | null;
  reviewStatus?: "PENDING" | "REVIEWED";
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  reviewNotes?: string | null;
};

export interface QueuedShiftReport {
  // En "create" el localId también es el id con el que se crea en el servidor (evita duplicados).
  localId: string;
  holeId: string;
  action: "create" | "update";
  remoteId?: string;
  payload: ShiftReportPayload;
  synced: boolean;
  syncError?: string;
  createdAt: string;
  updatedAt: string;
}

class SondajesDb extends Dexie {
  campaigns!: EntityTable<CachedCampaign, "id">;
  holes!: EntityTable<CachedHole, "id">;
  shiftReports!: EntityTable<CachedShiftReport, "id">;
  shiftReportQueue!: EntityTable<QueuedShiftReport, "localId">;

  constructor() {
    super("marteSondajesDb");
    this.version(1).stores({
      campaigns: "id",
      holes: "id, campaignId",
      shiftReports: "id, holeId",
      shiftReportQueue: "localId, holeId, remoteId, createdAt"
    });
  }
}

export const sondajesDb = new SondajesDb();

export function newLocalId() {
  if (typeof globalThis.crypto?.randomUUID === "function") return globalThis.crypto.randomUUID();
  // Respaldo con formato UUID v4 (el servidor exige UUID).
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    return (char === "x" ? random : (random & 0x3) | 0x8).toString(16);
  });
}

// ─── Copia local de datos del servidor ───────────────────────────────────────
export async function replaceCachedCampaigns(campaigns: DrillingCampaign[]) {
  await sondajesDb.transaction("rw", sondajesDb.campaigns, async () => {
    await sondajesDb.campaigns.clear();
    await sondajesDb.campaigns.bulkPut(campaigns.map((data) => ({ id: data.id, data })));
  });
}

export async function getCachedCampaigns() {
  return (await sondajesDb.campaigns.toArray()).map((row) => row.data);
}

export async function replaceCachedHoles(holes: DrillingHole[]) {
  await sondajesDb.transaction("rw", sondajesDb.holes, async () => {
    await sondajesDb.holes.clear();
    await sondajesDb.holes.bulkPut(holes.map((data) => ({ id: data.id, campaignId: data.campaignId, data })));
  });
}

export async function getCachedHoles() {
  return (await sondajesDb.holes.toArray()).map((row) => row.data);
}

export async function replaceCachedShiftReports(holeId: string, reports: DrillingShiftReport[]) {
  await sondajesDb.transaction("rw", sondajesDb.shiftReports, async () => {
    await sondajesDb.shiftReports.where("holeId").equals(holeId).delete();
    await sondajesDb.shiftReports.bulkPut(reports.map((data) => ({ id: data.id, holeId, data })));
  });
}

export async function getCachedShiftReports(holeId: string) {
  return (await sondajesDb.shiftReports.where("holeId").equals(holeId).toArray()).map((row) => row.data);
}

// ─── Cola de partes pendientes ───────────────────────────────────────────────
export async function getShiftReportQueue() {
  return sondajesDb.shiftReportQueue.orderBy("createdAt").toArray();
}

export async function queueNewShiftReport(holeId: string, payload: ShiftReportPayload) {
  const now = new Date().toISOString();
  const item: QueuedShiftReport = {
    localId: newLocalId(),
    holeId,
    action: "create",
    payload,
    synced: false,
    createdAt: now,
    updatedAt: now
  };
  await sondajesDb.shiftReportQueue.add(item);
  return item;
}

// Editar un parte: si aún está en cola se actualiza ahí; si ya está en el servidor se encola la edición.
// Devuelve el localId del elemento en cola, para saber después si ya se sincronizó.
export async function queueShiftReportEdit(target: { localId?: string; remoteId?: string; holeId: string }, payload: ShiftReportPayload) {
  const now = new Date().toISOString();
  if (target.localId) {
    await sondajesDb.shiftReportQueue.update(target.localId, { payload, synced: false, syncError: undefined, updatedAt: now });
    return target.localId;
  }
  if (!target.remoteId) throw new Error("No se encontró el parte a editar.");
  const pendingEdit = await sondajesDb.shiftReportQueue.where("remoteId").equals(target.remoteId).first();
  if (pendingEdit) {
    await sondajesDb.shiftReportQueue.update(pendingEdit.localId, { payload, synced: false, syncError: undefined, updatedAt: now });
    return pendingEdit.localId;
  }
  const localId = newLocalId();
  await sondajesDb.shiftReportQueue.add({
    localId,
    holeId: target.holeId,
    action: "update",
    remoteId: target.remoteId,
    payload,
    synced: false,
    createdAt: now,
    updatedAt: now
  });
  return localId;
}

export async function getQueuedShiftReport(localId: string) {
  return sondajesDb.shiftReportQueue.get(localId);
}

export async function discardQueuedShiftReport(localId: string) {
  await sondajesDb.shiftReportQueue.delete(localId);
}

export async function discardQueuedEditsFor(remoteId: string) {
  await sondajesDb.shiftReportQueue.where("remoteId").equals(remoteId).delete();
}

export async function markQueuedShiftReportSynced(localId: string, report: DrillingShiftReport) {
  await sondajesDb.transaction("rw", sondajesDb.shiftReportQueue, sondajesDb.shiftReports, async () => {
    await sondajesDb.shiftReports.put({ id: report.id, holeId: report.holeId, data: report });
    await sondajesDb.shiftReportQueue.delete(localId);
  });
}

export async function markQueuedShiftReportError(localId: string, message: string) {
  await sondajesDb.shiftReportQueue.update(localId, { syncError: message, updatedAt: new Date().toISOString() });
}

export async function removeCachedShiftReport(id: string) {
  await sondajesDb.shiftReports.delete(id);
}
