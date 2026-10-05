import { ApiError } from "@/shared/api/core/apiError";
import { createDrillingShiftReport, updateDrillingShiftReport } from "@/features/sondajes/api/sondajesApi";
import {
  getShiftReportQueue,
  markQueuedShiftReportError,
  markQueuedShiftReportSynced
} from "@/features/sondajes/db/sondajesDb";

export type ShiftReportsSyncResult = { total: number; synced: number; failed: number; errors: string[] };

// Mismo criterio que la sincronización de muestras: sin red no es un error del parte, se reintenta después.
export function isConnectivityIssue(error: unknown) {
  if (typeof navigator !== "undefined" && !navigator.onLine) return true;
  if (error instanceof ApiError) return !error.statusCode || /no se pudo conectar/i.test(error.message);
  if (error instanceof Error) return /network|conectar|connect|timeout|offline/i.test(error.message);
  return false;
}

function toMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return "Error desconocido al sincronizar el parte.";
}

export async function syncPendingShiftReports(options: { retryFailed?: boolean } = {}): Promise<ShiftReportsSyncResult> {
  const queue = await getShiftReportQueue();
  // Los partes con error se reintentan solo cuando el usuario pulsa "Sincronizar".
  const pending = queue.filter((item) => !item.synced && (options.retryFailed || !item.syncError));
  const result: ShiftReportsSyncResult = { total: pending.length, synced: 0, failed: 0, errors: [] };

  for (const item of pending) {
    try {
      const report =
        item.action === "create"
          ? await createDrillingShiftReport(item.holeId, { ...item.payload, id: item.localId })
          : await updateDrillingShiftReport(item.remoteId as string, item.payload);
      await markQueuedShiftReportSynced(item.localId, report);
      result.synced += 1;
    } catch (error) {
      if (isConnectivityIssue(error)) break;
      const message = toMessage(error);
      await markQueuedShiftReportError(item.localId, message);
      result.failed += 1;
      result.errors.push(message);
    }
  }

  return result;
}
