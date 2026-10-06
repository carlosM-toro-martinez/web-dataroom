import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createDrillingCampaign,
  createDrillingHole,
  deleteDrillingCampaign,
  deleteDrillingShiftReport,
  deleteDrillingHole,
  getDrillingCampaigns,
  getDrillingHole,
  getDrillingHoles,
  getDrillingShiftReports,
  getDrillingSummary,
  importDrillingHoles,
  updateDrillingCampaign,
  updateDrillingHole
} from "@/features/sondajes/api/sondajesApi";
import {
  discardQueuedEditsFor,
  discardQueuedShiftReport,
  getCachedCampaigns,
  getCachedHoles,
  getCachedShiftReports,
  getShiftReportQueue,
  getAllPersonnel,
  savePersonnel,
  deletePersonnel,
  queueNewShiftReport,
  queueShiftReportEdit,
  removeCachedShiftReport,
  replaceCachedCampaigns,
  replaceCachedHoles,
  replaceCachedShiftReports,
  type ShiftReportPayload,
  type DrillingPersonnelLocal
} from "@/features/sondajes/db/sondajesDb";
import { isConnectivityIssue, syncPendingShiftReports } from "@/features/sondajes/services/shiftReportsSync";

const base = ["sondajes"] as const;

// Sondajes funciona sin conexión: las consultas corren siempre (no se pausan offline)
// y, si no hay red, devuelven la última copia guardada en el dispositivo.
const offlineQueryOptions = { networkMode: "always", retry: false } as const;

async function withOfflineCache<T>(remote: () => Promise<T>, save: (value: T) => Promise<void>, readCache: () => Promise<T>) {
  try {
    const value = await remote();
    await save(value).catch(() => undefined);
    return value;
  } catch (error) {
    if (isConnectivityIssue(error)) return readCache();
    throw error;
  }
}

function useInvalidateSondajes() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: base });
}

export function useDrillingSummaryQuery(enabled = true) {
  return useQuery({ queryKey: [...base, "summary"], queryFn: getDrillingSummary, enabled });
}

export function useDrillingCampaignsQuery() {
  return useQuery({
    queryKey: [...base, "campaigns"],
    queryFn: () => withOfflineCache(() => getDrillingCampaigns({ limit: 500 }), replaceCachedCampaigns, getCachedCampaigns),
    ...offlineQueryOptions
  });
}

export function useDrillingHolesQuery() {
  return useQuery({
    queryKey: [...base, "holes"],
    queryFn: () => withOfflineCache(() => getDrillingHoles({ limit: 500 }), replaceCachedHoles, getCachedHoles),
    ...offlineQueryOptions
  });
}

// ─── Partes diarios (offline primero, igual que las muestras) ───────────────
export function useHoleShiftReportsQuery(holeId?: string) {
  return useQuery({
    queryKey: [...base, "shift-reports", holeId],
    queryFn: () =>
      withOfflineCache(
        () => getDrillingShiftReports(holeId as string),
        (reports) => replaceCachedShiftReports(holeId as string, reports),
        () => getCachedShiftReports(holeId as string)
      ),
    enabled: Boolean(holeId),
    ...offlineQueryOptions
  });
}

export function useShiftReportQueueQuery() {
  return useQuery({ queryKey: [...base, "queue"], queryFn: getShiftReportQueue, ...offlineQueryOptions });
}

export function useQueueShiftReportMutation() {
  const invalidate = useInvalidateSondajes();
  return useMutation({
    mutationFn: async (input: {
      holeId: string;
      payload: ShiftReportPayload;
      edit?: { localId?: string; remoteId?: string };
    }) => {
      if (input.edit) return queueShiftReportEdit({ ...input.edit, holeId: input.holeId }, input.payload);
      return (await queueNewShiftReport(input.holeId, input.payload)).localId;
    },
    networkMode: "always",
    onSuccess: invalidate
  });
}

export function useSyncShiftReportsMutation() {
  const invalidate = useInvalidateSondajes();
  return useMutation({
    mutationFn: (options?: { retryFailed?: boolean }) => syncPendingShiftReports(options),
    networkMode: "always",
    onSuccess: invalidate
  });
}

// Eliminar: un parte que solo está en el dispositivo se descarta; uno del servidor requiere conexión.
export function useDeleteShiftReportMutation() {
  const invalidate = useInvalidateSondajes();
  return useMutation({
    mutationFn: async (target: { localId?: string; remoteId?: string; pendingCreate: boolean }) => {
      if (target.pendingCreate && target.localId) {
        await discardQueuedShiftReport(target.localId);
        return;
      }
      if (!target.remoteId) return;
      if (!navigator.onLine) throw new Error("Conéctate a internet para eliminar un parte ya sincronizado.");
      await deleteDrillingShiftReport(target.remoteId);
      await discardQueuedEditsFor(target.remoteId);
      await removeCachedShiftReport(target.remoteId);
    },
    networkMode: "always",
    onSuccess: invalidate
  });
}

export function useDrillingHoleQuery(id?: string) {
  return useQuery({
    queryKey: [...base, "hole", id],
    queryFn: () => getDrillingHole(id as string),
    enabled: Boolean(id)
  });
}

export function useCreateDrillingCampaignMutation() {
  const invalidate = useInvalidateSondajes();
  return useMutation({ mutationFn: createDrillingCampaign, onSuccess: invalidate });
}

export function useUpdateDrillingCampaignMutation() {
  const invalidate = useInvalidateSondajes();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) => updateDrillingCampaign(id, payload),
    onSuccess: invalidate
  });
}

export function useDeleteDrillingCampaignMutation() {
  const invalidate = useInvalidateSondajes();
  return useMutation({ mutationFn: deleteDrillingCampaign, onSuccess: invalidate });
}

export function useCreateDrillingHoleMutation() {
  const invalidate = useInvalidateSondajes();
  return useMutation({ mutationFn: createDrillingHole, onSuccess: invalidate });
}

export function useUpdateDrillingHoleMutation() {
  const invalidate = useInvalidateSondajes();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) => updateDrillingHole(id, payload),
    onSuccess: invalidate
  });
}

export function useDeleteDrillingHoleMutation() {
  const invalidate = useInvalidateSondajes();
  return useMutation({ mutationFn: deleteDrillingHole, onSuccess: invalidate });
}

export function useImportDrillingHolesMutation() {
  const invalidate = useInvalidateSondajes();
  return useMutation({ mutationFn: importDrillingHoles, onSuccess: invalidate });
}


// ─── Personal de perforación (IndexedDB local) ────────────────────────────────
export function usePersonnelQuery() {
  return useQuery({
    queryKey: [...base, "personnel"],
    queryFn: getAllPersonnel,
    ...offlineQueryOptions
  });
}

export function useSavePersonnelMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: savePersonnel,
    onSuccess: (_, person) => {
      // Actualiza el cache inmediatamente (sin esperar refetch de IndexedDB).
      qc.setQueryData<DrillingPersonnelLocal[]>([...base, "personnel"], (old = []) =>
        [...old.filter((p) => p.id !== person.id), person].sort((a, b) => a.name.localeCompare(b.name, "es"))
      );
    }
  });
}

export function useDeletePersonnelMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePersonnel(id),
    onSuccess: (_, id) => {
      qc.setQueryData<DrillingPersonnelLocal[]>([...base, "personnel"], (old = []) =>
        old.filter((p) => p.id !== id)
      );
    }
  });
}

export type { DrillingPersonnelLocal };
