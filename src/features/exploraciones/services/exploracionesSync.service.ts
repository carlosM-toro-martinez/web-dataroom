import { ApiError } from "@/shared/api/core/apiError";
import {
  createExploracionMuestra,
  updateExploracionMuestra
} from "@/features/exploraciones/api/exploracionesApi";
import {
  getPendingMuestras,
  markMuestraAsSynced,
  markMuestraSyncError
} from "@/features/exploraciones/db/exploracionesDb";

export interface SyncExploracionesResult {
  total: number;
  synced: number;
  failed: number;
}

function isConnectivityIssue(error: unknown) {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return true;
  }

  if (error instanceof ApiError) {
    if (!error.statusCode) {
      return true;
    }
    if (error.message.toLowerCase().includes("no se pudo conectar")) {
      return true;
    }
  }

  return false;
}

function toErrorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Error desconocido al sincronizar la muestra.";
}

export async function syncPendingExploraciones(): Promise<SyncExploracionesResult> {
  const pending = await getPendingMuestras(200);
  let synced = 0;
  let failed = 0;

  for (const item of pending) {
    if (!item.id) continue;

    try {
      if (item.remoteId) {
        await updateExploracionMuestra(item.remoteId, item.payload);
        await markMuestraAsSynced(item.id, item.remoteId);
      } else {
        const response = await createExploracionMuestra(item.payload);
        await markMuestraAsSynced(item.id, response.data?.id);
      }
      synced += 1;
    } catch (error) {
      if (isConnectivityIssue(error)) {
        continue;
      }
      failed += 1;
      await markMuestraSyncError(item.id, toErrorMessage(error));
    }
  }

  return {
    total: pending.length,
    synced,
    failed
  };
}
