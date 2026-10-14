import { newLocalId, sondajesDb, type GeologyQueueItem } from "@/features/sondajes/db/sondajesDb";
import type {
  DrillingPhoto,
  GeologyReport,
  GeologyReportPayload,
  LogInterval,
  LogRowPayload,
  PhotoMeta
} from "@/features/sondajes/model/geology.schema";

// Geología funciona igual que los partes: copia local de lo último descargado + cola de cambios
// hechos en el dispositivo que se envían cuando hay conexión (las fotos viajan como Blob).

const now = () => new Date().toISOString();
const blobKey = (photoId: string, variant: "full" | "thumb") => `${photoId}:${variant}`;

// ─── Copia local ─────────────────────────────────────────────────────────────
export async function replaceCachedGeologyReports(holeId: string, reports: GeologyReport[]) {
  await sondajesDb.transaction("rw", sondajesDb.geologyReports, async () => {
    await sondajesDb.geologyReports.where("holeId").equals(holeId).delete();
    await sondajesDb.geologyReports.bulkPut(reports.map((data) => ({ id: data.id, holeId, data })));
  });
}

export async function getCachedGeologyReports(holeId: string) {
  return (await sondajesDb.geologyReports.where("holeId").equals(holeId).toArray()).map((row) => row.data);
}

export async function replaceCachedGeologyLog(holeId: string, rows: LogInterval[]) {
  await sondajesDb.geologyLogs.put({ holeId, rows });
}

export async function getCachedGeologyLog(holeId: string) {
  return (await sondajesDb.geologyLogs.get(holeId))?.rows ?? [];
}

export async function replaceCachedPhotos(holeId: string, photos: DrillingPhoto[]) {
  await sondajesDb.transaction("rw", sondajesDb.photos, async () => {
    await sondajesDb.photos.where("holeId").equals(holeId).delete();
    await sondajesDb.photos.bulkPut(photos.map((data) => ({ id: data.id, holeId, data })));
  });
}

export async function getCachedPhotos(holeId: string) {
  return (await sondajesDb.photos.where("holeId").equals(holeId).toArray()).map((row) => row.data);
}

export async function getPhotoBlob(photoId: string, variant: "full" | "thumb") {
  return (await sondajesDb.photoBlobs.get(blobKey(photoId, variant)))?.blob;
}

export async function putPhotoBlob(photoId: string, variant: "full" | "thumb", blob: Blob) {
  await sondajesDb.photoBlobs.put({ key: blobKey(photoId, variant), photoId, blob });
}

async function deletePhotoBlobs(photoId: string) {
  await sondajesDb.photoBlobs.where("photoId").equals(photoId).delete();
}

// ─── Cola ────────────────────────────────────────────────────────────────────
export async function getGeologyQueue() {
  return sondajesDb.geologyQueue.orderBy("createdAt").toArray();
}

async function findItem(targetId: string, kind: GeologyQueueItem["kind"], action: GeologyQueueItem["action"]) {
  return sondajesDb.geologyQueue
    .where("targetId")
    .equals(targetId)
    .filter((item) => item.kind === kind && item.action === action)
    .first();
}

// Crea o edita un reporte. Devuelve su id (el mismo con el que se creará en el servidor).
export async function queueGeologyReport(
  holeId: string,
  payload: GeologyReportPayload,
  target?: { id: string; pendingCreate: boolean }
) {
  const stamp = now();
  if (target) {
    const action = target.pendingCreate ? "create" : "update";
    const existing = await findItem(target.id, "report", action);
    if (existing) {
      await sondajesDb.geologyQueue.update(existing.localId, { payload, syncError: undefined, updatedAt: stamp });
      return target.id;
    }
    await sondajesDb.geologyQueue.add({
      localId: newLocalId(),
      holeId,
      targetId: target.id,
      kind: "report",
      action: "update",
      payload,
      createdAt: stamp,
      updatedAt: stamp
    });
    return target.id;
  }
  const id = newLocalId();
  await sondajesDb.geologyQueue.add({ localId: newLocalId(), holeId, targetId: id, kind: "report", action: "create", payload, createdAt: stamp, updatedAt: stamp });
  return id;
}

// El logueo se guarda completo: un solo pendiente por pozo con la última versión.
export async function queueGeologyLog(holeId: string, rows: LogRowPayload[]) {
  const stamp = now();
  const existing = await findItem(holeId, "log", "replace");
  if (existing) {
    await sondajesDb.geologyQueue.update(existing.localId, { payload: { rows }, syncError: undefined, updatedAt: stamp });
    return;
  }
  await sondajesDb.geologyQueue.add({ localId: newLocalId(), holeId, targetId: holeId, kind: "log", action: "replace", payload: { rows }, createdAt: stamp, updatedAt: stamp });
}

export async function queuePhotoCreate(holeId: string, meta: PhotoMeta, full: Blob, thumb: Blob) {
  const id = newLocalId();
  const stamp = now();
  await sondajesDb.transaction("rw", sondajesDb.photoBlobs, sondajesDb.geologyQueue, async () => {
    await sondajesDb.photoBlobs.bulkPut([
      { key: blobKey(id, "full"), photoId: id, blob: full },
      { key: blobKey(id, "thumb"), photoId: id, blob: thumb }
    ]);
    await sondajesDb.geologyQueue.add({ localId: newLocalId(), holeId, targetId: id, kind: "photo", action: "create", payload: meta, createdAt: stamp, updatedAt: stamp });
  });
  return id;
}

export async function queuePhotoUpdate(holeId: string, photoId: string, patch: Partial<PhotoMeta>, pendingCreate: boolean) {
  const stamp = now();
  const action = pendingCreate ? "create" : "update";
  const existing = await findItem(photoId, "photo", action);
  if (existing && existing.kind === "photo") {
    await sondajesDb.geologyQueue.update(existing.localId, { payload: { ...existing.payload, ...patch }, syncError: undefined, updatedAt: stamp });
    return;
  }
  await sondajesDb.geologyQueue.add({
    localId: newLocalId(),
    holeId,
    targetId: photoId,
    kind: "photo",
    action: "update",
    payload: patch as PhotoMeta,
    createdAt: stamp,
    updatedAt: stamp
  });
}

// Descartar lo que aún no llegó al servidor.
export async function discardPendingReport(reportId: string) {
  await sondajesDb.transaction("rw", sondajesDb.geologyQueue, async () => {
    await sondajesDb.geologyQueue.where("targetId").equals(reportId).delete();
    // Las fotos pendientes de ese reporte quedan sueltas en el pozo.
    const linked = await sondajesDb.geologyQueue.filter((item) => item.kind === "photo" && item.payload.reportId === reportId).toArray();
    for (const item of linked) {
      if (item.kind === "photo") await sondajesDb.geologyQueue.update(item.localId, { payload: { ...item.payload, reportId: null } });
    }
  });
}

export async function discardPendingPhoto(photoId: string) {
  await sondajesDb.geologyQueue.where("targetId").equals(photoId).delete();
  await deletePhotoBlobs(photoId);
}

export async function discardPendingLog(holeId: string) {
  const existing = await findItem(holeId, "log", "replace");
  if (existing) await sondajesDb.geologyQueue.delete(existing.localId);
}

export async function markGeologyItemError(localId: string, message: string) {
  await sondajesDb.geologyQueue.update(localId, { syncError: message, updatedAt: now() });
}

// ─── Resultado de la sincronización ──────────────────────────────────────────
export async function completeReportItem(localId: string, report: GeologyReport) {
  await sondajesDb.transaction("rw", sondajesDb.geologyQueue, sondajesDb.geologyReports, async () => {
    await sondajesDb.geologyReports.put({ id: report.id, holeId: report.holeId, data: report });
    await sondajesDb.geologyQueue.delete(localId);
  });
}

export async function completeLogItem(localId: string, holeId: string, rows: LogInterval[]) {
  await sondajesDb.transaction("rw", sondajesDb.geologyQueue, sondajesDb.geologyLogs, async () => {
    await sondajesDb.geologyLogs.put({ holeId, rows });
    await sondajesDb.geologyQueue.delete(localId);
  });
}

// Tras subir una foto se conserva solo la miniatura (para verla sin conexión); el original se libera.
// Si el servidor ya tenía esa misma imagen devuelve la existente (otro id): la copia local se descarta.
export async function completePhotoItem(localId: string, photo: DrillingPhoto, localPhotoId?: string) {
  await sondajesDb.transaction("rw", sondajesDb.geologyQueue, sondajesDb.photos, sondajesDb.photoBlobs, async () => {
    await sondajesDb.photos.put({ id: photo.id, holeId: photo.holeId, data: photo });
    await sondajesDb.geologyQueue.delete(localId);
    await sondajesDb.photoBlobs.delete(blobKey(photo.id, "full"));
    if (localPhotoId && localPhotoId !== photo.id) await sondajesDb.photoBlobs.where("photoId").equals(localPhotoId).delete();
  });
}

export async function removeCachedGeologyReport(reportId: string) {
  await sondajesDb.transaction("rw", sondajesDb.geologyReports, sondajesDb.photos, sondajesDb.geologyQueue, async () => {
    await sondajesDb.geologyReports.delete(reportId);
    await sondajesDb.geologyQueue.where("targetId").equals(reportId).delete();
    const linked = await sondajesDb.photos.filter((row) => row.data.reportId === reportId).toArray();
    for (const row of linked) await sondajesDb.photos.put({ ...row, data: { ...row.data, reportId: null } });
  });
}

export async function removeCachedPhoto(photoId: string) {
  await sondajesDb.photos.delete(photoId);
  await sondajesDb.geologyQueue.where("targetId").equals(photoId).delete();
  await deletePhotoBlobs(photoId);
}
