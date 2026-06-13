import { ApiError } from "@/shared/api/core/apiError";
import { createExploracionElemento } from "@/features/exploraciones/api/exploracionesApi";
import {
  getPendingElementos,
  markElementoAsSynced,
  markElementoSyncError
} from "@/features/exploraciones/db/exploracionesDb";

export interface SyncExploracionesElementosResult {
  total: number;
  synced: number;
  failed: number;
}

function isConnectivityIssue(error: unknown) {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return true;
  }

  if (error instanceof ApiError) {
    if (!error.statusCode) return true;
    if (error.message.toLowerCase().includes("no se pudo conectar")) return true;
  }

  return false;
}

function toErrorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Error desconocido al sincronizar el elemento.";
}

export async function syncPendingExploracionesElementos(): Promise<SyncExploracionesElementosResult> {
  const pending = await getPendingElementos(500);
  let synced = 0;
  let failed = 0;

  for (const item of pending) {
    if (!item.id) continue;

    try {
      const response = await createExploracionElemento(item.payload);
      await markElementoAsSynced(item.id, response.data?.id);
      synced += 1;
    } catch (error) {
      if (isConnectivityIssue(error)) continue;
      failed += 1;
      await markElementoSyncError(item.id, toErrorMessage(error));
    }
  }

  return {
    total: pending.length,
    synced,
    failed
  };
}
