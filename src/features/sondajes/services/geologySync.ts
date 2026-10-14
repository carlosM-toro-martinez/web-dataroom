import {
  createGeologyReport,
  replaceGeologyLog,
  updateGeologyReport,
  updateHolePhoto,
  uploadHolePhoto
} from "@/features/sondajes/api/geologyApi";
import {
  completeLogItem,
  completePhotoItem,
  completeReportItem,
  getGeologyQueue,
  getPhotoBlob,
  markGeologyItemError
} from "@/features/sondajes/db/geologyDb";
import type { GeologyQueueItem } from "@/features/sondajes/db/sondajesDb";
import { isConnectivityIssue, type ShiftReportsSyncResult } from "@/features/sondajes/services/shiftReportsSync";

export type GeologySyncResult = ShiftReportsSyncResult;

function toMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return "Error desconocido al sincronizar.";
}

async function send(item: GeologyQueueItem) {
  if (item.kind === "report") {
    const report =
      item.action === "create"
        ? await createGeologyReport(item.holeId, { ...item.payload, id: item.targetId })
        : await updateGeologyReport(item.targetId, item.payload);
    await completeReportItem(item.localId, report);
    return;
  }
  if (item.kind === "log") {
    const rows = await replaceGeologyLog(item.holeId, item.payload.rows);
    await completeLogItem(item.localId, item.holeId, rows);
    return;
  }
  if (item.action === "create") {
    const [full, thumb] = await Promise.all([getPhotoBlob(item.targetId, "full"), getPhotoBlob(item.targetId, "thumb")]);
    if (!full || !thumb) throw new Error("La imagen ya no está en este dispositivo. Vuelve a agregarla.");
    const photo = await uploadHolePhoto(item.holeId, item.targetId, item.payload, full, thumb);
    await completePhotoItem(item.localId, photo, item.targetId);
    return;
  }
  const photo = await updateHolePhoto(item.targetId, item.payload);
  await completePhotoItem(item.localId, photo);
}

// En orden de creación: un reporte nuevo llega antes que las fotos que lo referencian.
export async function syncPendingGeology(options: { retryFailed?: boolean } = {}): Promise<GeologySyncResult> {
  const queue = await getGeologyQueue();
  const pending = queue.filter((item) => options.retryFailed || !item.syncError);
  const result: GeologySyncResult = { total: pending.length, synced: 0, failed: 0, errors: [] };

  for (const item of pending) {
    try {
      await send(item);
      result.synced += 1;
    } catch (error) {
      if (isConnectivityIssue(error)) break;
      const message = toMessage(error);
      await markGeologyItemError(item.localId, message);
      result.failed += 1;
      result.errors.push(message);
    }
  }
  return result;
}
