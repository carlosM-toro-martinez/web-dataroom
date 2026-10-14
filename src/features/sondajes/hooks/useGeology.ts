import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteGeologyReport,
  deleteHolePhoto,
  fetchPhotoBlob,
  getGeologyLog,
  getGeologyReports,
  getHolePhotos
} from "@/features/sondajes/api/geologyApi";
import {
  discardPendingPhoto,
  discardPendingReport,
  getCachedGeologyLog,
  getCachedGeologyReports,
  getCachedPhotos,
  getGeologyQueue,
  getPhotoBlob,
  putPhotoBlob,
  queueGeologyLog,
  queueGeologyReport,
  queuePhotoCreate,
  queuePhotoUpdate,
  removeCachedGeologyReport,
  removeCachedPhoto,
  replaceCachedGeologyLog,
  replaceCachedGeologyReports,
  replaceCachedPhotos
} from "@/features/sondajes/db/geologyDb";
import type { GeologyReportPayload, LogRowPayload, PhotoMeta } from "@/features/sondajes/model/geology.schema";
import { offlineQueryOptions, withOfflineCache } from "@/features/sondajes/hooks/useSondajes";
import { useOnlineStatus, useQueueSyncRunner } from "@/features/sondajes/hooks/useShiftReportsSync";
import { syncPendingGeology } from "@/features/sondajes/services/geologySync";
import { processImage } from "@/features/sondajes/lib/imageProcessing";
import { sha256Hex } from "@/features/sondajes/lib/contentHash";
import type { PhotoView } from "@/features/sondajes/lib/geology";

const geologyKey = ["sondajes", "geology"] as const;
const queueKey = ["sondajes", "geology-queue"] as const;

function useInvalidateGeology() {
  const queryClient = useQueryClient();
  return () => Promise.all([queryClient.invalidateQueries({ queryKey: geologyKey }), queryClient.invalidateQueries({ queryKey: queueKey })]);
}

export function useGeologyReportsQuery(holeId: string, enabled = true) {
  return useQuery({
    queryKey: [...geologyKey, "reports", holeId],
    queryFn: () =>
      withOfflineCache(
        () => getGeologyReports(holeId),
        (reports) => replaceCachedGeologyReports(holeId, reports),
        () => getCachedGeologyReports(holeId)
      ),
    enabled: enabled && Boolean(holeId),
    ...offlineQueryOptions
  });
}

export function useGeologyLogQuery(holeId: string, enabled = true) {
  return useQuery({
    queryKey: [...geologyKey, "log", holeId],
    queryFn: () =>
      withOfflineCache(
        () => getGeologyLog(holeId),
        (rows) => replaceCachedGeologyLog(holeId, rows),
        () => getCachedGeologyLog(holeId)
      ),
    enabled: enabled && Boolean(holeId),
    ...offlineQueryOptions
  });
}

export function useHolePhotosQuery(holeId: string, enabled = true) {
  return useQuery({
    queryKey: [...geologyKey, "photos", holeId],
    queryFn: () =>
      withOfflineCache(
        () => getHolePhotos(holeId),
        (photos) => replaceCachedPhotos(holeId, photos),
        () => getCachedPhotos(holeId)
      ),
    enabled: enabled && Boolean(holeId),
    ...offlineQueryOptions
  });
}

export function useGeologyQueueQuery() {
  return useQuery({ queryKey: queueKey, queryFn: getGeologyQueue, ...offlineQueryOptions });
}

export function useGeologySync() {
  const online = useOnlineStatus();
  const queueQuery = useGeologyQueueQuery();
  const invalidate = useInvalidateGeology();
  const syncMutation = useMutation({
    mutationFn: (options: { retryFailed: boolean }) => syncPendingGeology(options),
    networkMode: "always",
    onSettled: invalidate
  });
  const queue = queueQuery.data ?? [];
  const pendingCount = queue.length;
  const errorCount = queue.filter((item) => item.syncError).length;
  const runSync = useQueueSyncRunner(pendingCount, syncMutation.mutateAsync);
  return { online, queue, pendingCount, errorCount, isSyncing: syncMutation.isPending, runSync };
}

// ─── Cambios (siempre a la cola del dispositivo; se envían al sincronizar) ───
export function useSaveGeologyReportMutation() {
  const invalidate = useInvalidateGeology();
  return useMutation({
    mutationFn: (input: { holeId: string; payload: GeologyReportPayload; target?: { id: string; pendingCreate: boolean } }) =>
      queueGeologyReport(input.holeId, input.payload, input.target),
    networkMode: "always",
    onSuccess: invalidate
  });
}

export function useSaveGeologyLogMutation() {
  const invalidate = useInvalidateGeology();
  return useMutation({
    mutationFn: (input: { holeId: string; rows: LogRowPayload[] }) => queueGeologyLog(input.holeId, input.rows),
    networkMode: "always",
    onSuccess: invalidate
  });
}

export type NewPhoto = { source: Blob; meta: PhotoMeta };

// Comprime cada imagen en el dispositivo y la deja en la cola. Una imagen cuyo contenido ya está en el pozo
// (knownHashes) o se repite en el mismo lote no se vuelve a agregar.
export function useAddPhotosMutation() {
  const invalidate = useInvalidateGeology();
  return useMutation({
    mutationFn: async (input: { holeId: string; photos: NewPhoto[]; knownHashes?: Set<string>; onProgress?: (done: number) => void }) => {
      const known = input.knownHashes ?? new Set<string>();
      let added = 0;
      let skipped = 0;
      let done = 0;
      for (const photo of input.photos) {
        const hash = photo.meta.contentHash ?? (await sha256Hex(photo.source));
        if (hash && known.has(hash)) {
          skipped += 1;
        } else {
          const processed = await processImage(photo.source);
          await queuePhotoCreate(
            input.holeId,
            { ...photo.meta, contentHash: hash, width: processed.width, height: processed.height },
            processed.full,
            processed.thumb
          );
          if (hash) known.add(hash);
          added += 1;
        }
        done += 1;
        input.onProgress?.(done);
      }
      return { added, skipped };
    },
    networkMode: "always",
    onSuccess: invalidate
  });
}

export function useUpdatePhotoMutation() {
  const invalidate = useInvalidateGeology();
  return useMutation({
    mutationFn: (input: { photo: PhotoView; patch: Partial<PhotoMeta> }) =>
      queuePhotoUpdate(input.photo.holeId, input.photo.id, input.patch, input.photo.pendingCreate),
    networkMode: "always",
    onSuccess: invalidate
  });
}

// Eliminar: lo que solo está en el dispositivo se descarta; lo del servidor requiere conexión.
export function useDeleteGeologyReportMutation() {
  const invalidate = useInvalidateGeology();
  return useMutation({
    mutationFn: async (report: { id: string; pendingCreate: boolean }) => {
      if (report.pendingCreate) return discardPendingReport(report.id);
      if (!navigator.onLine) throw new Error("Conéctate a internet para eliminar un reporte ya sincronizado.");
      await deleteGeologyReport(report.id);
      await removeCachedGeologyReport(report.id);
    },
    networkMode: "always",
    onSuccess: invalidate
  });
}

export function useDeletePhotoMutation() {
  const invalidate = useInvalidateGeology();
  return useMutation({
    mutationFn: async (photo: { id: string; pendingCreate: boolean }) => {
      if (photo.pendingCreate) return discardPendingPhoto(photo.id);
      if (!navigator.onLine) throw new Error("Conéctate a internet para eliminar una foto ya sincronizada.");
      await deleteHolePhoto(photo.id);
      await removeCachedPhoto(photo.id);
    },
    networkMode: "always",
    onSuccess: invalidate
  });
}

// ─── Imagen de una foto: copia local o descarga (la miniatura queda guardada para ver sin red) ──
export function usePhotoBlob(photo: Pick<PhotoView, "id" | "pendingCreate"> | null | undefined, variant: "thumb" | "full") {
  return useQuery({
    queryKey: ["sondajes", "photo-blob", photo?.id, variant],
    queryFn: async () => {
      const id = photo!.id;
      const local = (await getPhotoBlob(id, variant)) ?? (variant === "full" ? await getPhotoBlob(id, "thumb") : undefined);
      if (local && (variant === "thumb" || photo!.pendingCreate || !navigator.onLine)) return local;
      if (photo!.pendingCreate) return local ?? null;
      // Sin red no se intenta la descarga: queda en error y se reintenta al reconectar.
      if (!navigator.onLine) {
        if (local) return local;
        throw new Error("Sin conexión");
      }
      try {
        const blob = await fetchPhotoBlob(id, variant);
        if (variant === "thumb") await putPhotoBlob(id, "thumb", blob).catch(() => undefined);
        return blob;
      } catch (error) {
        if (local) return local;
        throw error;
      }
    },
    enabled: Boolean(photo?.id),
    staleTime: Infinity,
    gcTime: 10 * 60_000,
    retry: false,
    networkMode: "always"
  });
}

export function useObjectUrl(blob?: Blob | null) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!blob) {
      setUrl(undefined);
      return;
    }
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);
  return url;
}
