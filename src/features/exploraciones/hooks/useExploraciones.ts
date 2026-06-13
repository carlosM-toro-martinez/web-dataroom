import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/queryKeys";
import {
  getElementosOffline,
  getMuestrasOffline,
  queueRemoteEditOffline,
  saveMuestraOffline,
  saveMuestrasOfflineBatch,
  saveElementosOfflineBatch,
  updateMuestraOffline
} from "@/features/exploraciones/db/exploracionesDb";
import { syncPendingExploraciones } from "@/features/exploraciones/services/exploracionesSync.service";
import { syncPendingExploracionesElementos } from "@/features/exploraciones/services/exploracionesElementosSync.service";
import type {
  ExploracionElementoPayload,
  ExploracionMuestraPayload
} from "@/features/exploraciones/model/muestra.schema";
import {
  getExploracionesElementos,
  getExploracionesLaboratorios,
  getExploracionesMuestrasTodas,
  updateExploracionMuestra
} from "@/features/exploraciones/api/exploracionesApi";

export function useExploracionesOfflineQuery() {
  return useQuery({
    queryKey: queryKeys.exploraciones.offline(),
    queryFn: getMuestrasOffline
  });
}

export function useExploracionesElementosOfflineQuery() {
  return useQuery({
    queryKey: queryKeys.exploraciones.elementosOffline(),
    queryFn: getElementosOffline
  });
}

export function useExploracionesRemotasQuery() {
  return useQuery({
    queryKey: queryKeys.exploraciones.remotas(),
    queryFn: getExploracionesMuestrasTodas,
    refetchInterval: 45_000
  });
}

export function useExploracionesElementosQuery() {
  return useQuery({
    queryKey: queryKeys.exploraciones.elementos(),
    queryFn: getExploracionesElementos
  });
}

export function useExploracionesLaboratoriosQuery() {
  return useQuery({
    queryKey: queryKeys.exploraciones.laboratorios(),
    queryFn: getExploracionesLaboratorios
  });
}

export function useSaveMuestraOfflineMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ExploracionMuestraPayload) => saveMuestraOffline(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.exploraciones.offline() });
    }
  });
}

export function useSaveMuestrasOfflineBatchMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payloads: ExploracionMuestraPayload[]) => saveMuestrasOfflineBatch(payloads),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.exploraciones.offline() });
    }
  });
}

export function useUpdateMuestraOfflineMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: ExploracionMuestraPayload }) =>
      updateMuestraOffline(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.exploraciones.offline() });
    }
  });
}

export function useSaveElementosOfflineBatchMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payloads: ExploracionElementoPayload[]) => saveElementosOfflineBatch(payloads),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.exploraciones.elementosOffline() });
    }
  });
}

export function useQueueRemoteEditOfflineMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ remoteId, payload }: { remoteId: string; payload: ExploracionMuestraPayload }) =>
      queueRemoteEditOffline(remoteId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.exploraciones.offline() });
      await queryClient.invalidateQueries({ queryKey: queryKeys.exploraciones.remotas() });
    }
  });
}

export function useUpdateMuestraRemotaMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ExploracionMuestraPayload }) =>
      updateExploracionMuestra(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.exploraciones.remotas() });
      await queryClient.invalidateQueries({ queryKey: queryKeys.exploraciones.offline() });
    }
  });
}

export function useSyncExploracionesMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: syncPendingExploraciones,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.exploraciones.offline() });
      await queryClient.invalidateQueries({ queryKey: queryKeys.exploraciones.remotas() });
    }
  });
}

export function useSyncExploracionesElementosMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: syncPendingExploracionesElementos,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.exploraciones.elementosOffline() });
      await queryClient.invalidateQueries({ queryKey: queryKeys.exploraciones.elementos() });
    }
  });
}
