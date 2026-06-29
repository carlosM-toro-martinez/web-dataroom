import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  assignInteriorSampleVoucher,
  assignSurfaceSampleVoucher,
  createInteriorArea,
  createInteriorLabor,
  createInteriorLaboratory,
  createInteriorLevel,
  createInteriorObjective,
  createInteriorSampleWithResults,
  createSharedElement,
  createSurfaceArea,
  createSurfaceLaboratory,
  createSurfaceObjective,
  createSurfaceSampleWithResults,
  getInteriorAreas,
  getInteriorLabors,
  getInteriorLaboratories,
  getInteriorLevels,
  getInteriorObjectives,
  getInteriorSamples,
  getSharedElements,
  getSurfaceAreas,
  getSurfaceLaboratories,
  getSurfaceObjectives,
  getSurfaceSamples,
  updateInteriorSampleWithResults,
  updateSurfaceSampleWithResults
} from "@/features/exploraciones/api/proposalSamplesApi";
import {
  buildProposalLocalId,
  getProposalCatalogs,
  getProposalSamples,
  saveProposalAction,
  saveProposalCatalog,
  saveProposalSample,
  updateProposalSampleOffline,
  type OfflineProposalCatalog,
  type OfflineProposalSample,
  type ProposalEntity,
  type ProposalModule,
  type ProposalPayload
} from "@/features/exploraciones/db/exploracionesDb";
import { syncPendingProposalSamples } from "@/features/exploraciones/services/proposalSamplesSync.service";
import type {
  InteriorSampleWithResultsPayload,
  SamplePriority,
  SurfaceSampleWithResultsPayload
} from "@/features/exploraciones/model/proposalSamples.schema";

const base = ["exploraciones", "proposal-samples"] as const;

function useInvalidateProposalSamples() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: base });
}

export function useOfflineProposalCatalogsQuery() {
  return useQuery({
    queryKey: [...base, "offline", "catalogs"],
    queryFn: getProposalCatalogs
  });
}

export function useOfflineProposalSamplesQuery() {
  return useQuery({
    queryKey: [...base, "offline", "samples"],
    queryFn: getProposalSamples
  });
}

export function useSyncProposalSamplesMutation() {
  const invalidate = useInvalidateProposalSamples();
  return useMutation({ mutationFn: syncPendingProposalSamples, onSuccess: invalidate });
}

export function useQueueProposalCatalogMutation() {
  const invalidate = useInvalidateProposalSamples();
  return useMutation({
    mutationFn: async (input: {
      module: ProposalModule;
      entity: Exclude<ProposalEntity, "sample">;
      payload: Record<string, unknown>;
      catalog: Omit<OfflineProposalCatalog, "id" | "createdAt" | "updatedAt" | "synced" | "localId"> & {
        localId?: string;
        synced?: boolean;
      };
    }) => {
      const localId = input.catalog.localId ?? buildProposalLocalId(input.entity);
      await saveProposalCatalog({
        ...input.catalog,
        localId,
        synced: input.catalog.synced ?? false
      });
      await saveProposalAction({
        localId,
        module: input.module,
        entity: input.entity,
        payload: input.payload as ProposalPayload
      });
      return localId;
    },
    onSuccess: invalidate
  });
}

export function useQueueProposalSampleMutation() {
  const invalidate = useInvalidateProposalSamples();
  return useMutation({
    mutationFn: async (input: {
      module: "interior" | "surface";
      payload: InteriorSampleWithResultsPayload | SurfaceSampleWithResultsPayload;
    }) => {
      const localId = buildProposalLocalId("sample");
      const code = `Pendiente/${new Date().toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" })}`;
      await saveProposalSample({
        localId,
        module: input.module,
        code,
        payload: input.payload,
        synced: false
      });
      await saveProposalAction({
        localId,
        module: input.module,
        entity: "sample",
        payload: input.payload
      });
      return localId;
    },
    onSuccess: invalidate
  });
}

export function useUpdateQueuedProposalSampleMutation() {
  const invalidate = useInvalidateProposalSamples();
  return useMutation({
    mutationFn: async (input: {
      localId: string;
      payload: InteriorSampleWithResultsPayload | SurfaceSampleWithResultsPayload;
    }) => {
      await updateProposalSampleOffline(input.localId, input.payload);
    },
    onSuccess: invalidate
  });
}

export function useQueueRemoteProposalSampleEditMutation() {
  const invalidate = useInvalidateProposalSamples();
  return useMutation({
    mutationFn: async (input: {
      module: "interior" | "surface";
      remoteId: string;
      payload: Partial<InteriorSampleWithResultsPayload | SurfaceSampleWithResultsPayload>;
    }) => {
      await saveProposalAction({
        localId: buildProposalLocalId("sample-edit"),
        remoteId: input.remoteId,
        module: input.module,
        entity: "sample",
        payload: input.payload as ProposalPayload
      });
    },
    onSuccess: invalidate
  });
}

export function useSharedElementsQuery() {
  return useQuery({
    queryKey: [...base, "elements"],
    queryFn: () => getSharedElements({ page: 1, limit: 500 })
  });
}

export function useInteriorAreasQuery() {
  return useQuery({
    queryKey: [...base, "interior", "areas"],
    queryFn: () => getInteriorAreas({ page: 1, limit: 300 })
  });
}

export function useInteriorLevelsQuery(interiorAreaId?: string) {
  return useQuery({
    queryKey: [...base, "interior", "levels", interiorAreaId],
    queryFn: () => getInteriorLevels({ interiorAreaId, page: 1, limit: 300 }),
    enabled: Boolean(interiorAreaId)
  });
}

export function useInteriorLaborsQuery(interiorLevelId?: string) {
  return useQuery({
    queryKey: [...base, "interior", "labors", interiorLevelId],
    queryFn: () => getInteriorLabors({ interiorLevelId, page: 1, limit: 300 }),
    enabled: Boolean(interiorLevelId)
  });
}

export function useInteriorObjectivesQuery() {
  return useQuery({
    queryKey: [...base, "interior", "objectives"],
    queryFn: () => getInteriorObjectives({ page: 1, limit: 300 })
  });
}

export function useInteriorLaboratoriesQuery() {
  return useQuery({
    queryKey: [...base, "interior", "laboratories"],
    queryFn: () => getInteriorLaboratories({ page: 1, limit: 300 })
  });
}

export function useInteriorSamplesQuery(params: {
  interiorLaborId?: string;
  createdById?: number;
  priority?: SamplePriority;
  search?: string;
}) {
  return useQuery({
    queryKey: [...base, "interior", "samples", params],
    queryFn: () => getInteriorSamples({ ...params, page: 1, limit: 200 })
  });
}

export function useSurfaceAreasQuery() {
  return useQuery({
    queryKey: [...base, "surface", "areas"],
    queryFn: () => getSurfaceAreas({ page: 1, limit: 300 })
  });
}

export function useSurfaceObjectivesQuery() {
  return useQuery({
    queryKey: [...base, "surface", "objectives"],
    queryFn: () => getSurfaceObjectives({ page: 1, limit: 300 })
  });
}

export function useSurfaceLaboratoriesQuery() {
  return useQuery({
    queryKey: [...base, "surface", "laboratories"],
    queryFn: () => getSurfaceLaboratories({ page: 1, limit: 300 })
  });
}

export function useSurfaceSamplesQuery(params: {
  surfaceAreaId?: string;
  createdById?: number;
  priority?: SamplePriority;
  search?: string;
}) {
  return useQuery({
    queryKey: [...base, "surface", "samples", params],
    queryFn: () => getSurfaceSamples({ ...params, page: 1, limit: 200 })
  });
}

export function useCreateSharedElementMutation() {
  const invalidate = useInvalidateProposalSamples();
  return useMutation({ mutationFn: createSharedElement, onSuccess: invalidate });
}

export function useCreateInteriorAreaMutation() {
  const invalidate = useInvalidateProposalSamples();
  return useMutation({ mutationFn: createInteriorArea, onSuccess: invalidate });
}

export function useCreateInteriorLevelMutation() {
  const invalidate = useInvalidateProposalSamples();
  return useMutation({ mutationFn: createInteriorLevel, onSuccess: invalidate });
}

export function useCreateInteriorLaborMutation() {
  const invalidate = useInvalidateProposalSamples();
  return useMutation({ mutationFn: createInteriorLabor, onSuccess: invalidate });
}

export function useCreateInteriorObjectiveMutation() {
  const invalidate = useInvalidateProposalSamples();
  return useMutation({ mutationFn: createInteriorObjective, onSuccess: invalidate });
}

export function useCreateInteriorLaboratoryMutation() {
  const invalidate = useInvalidateProposalSamples();
  return useMutation({ mutationFn: createInteriorLaboratory, onSuccess: invalidate });
}

export function useCreateInteriorSampleWithResultsMutation() {
  const invalidate = useInvalidateProposalSamples();
  return useMutation({ mutationFn: createInteriorSampleWithResults, onSuccess: invalidate });
}

export function useCreateSurfaceAreaMutation() {
  const invalidate = useInvalidateProposalSamples();
  return useMutation({ mutationFn: createSurfaceArea, onSuccess: invalidate });
}

export function useCreateSurfaceObjectiveMutation() {
  const invalidate = useInvalidateProposalSamples();
  return useMutation({ mutationFn: createSurfaceObjective, onSuccess: invalidate });
}

export function useCreateSurfaceLaboratoryMutation() {
  const invalidate = useInvalidateProposalSamples();
  return useMutation({ mutationFn: createSurfaceLaboratory, onSuccess: invalidate });
}

export function useCreateSurfaceSampleWithResultsMutation() {
  const invalidate = useInvalidateProposalSamples();
  return useMutation({ mutationFn: createSurfaceSampleWithResults, onSuccess: invalidate });
}

export function useUpdateInteriorSampleWithResultsMutation() {
  const invalidate = useInvalidateProposalSamples();
  return useMutation({
    mutationFn: ({
      id,
      payload
    }: {
      id: string;
      payload: Partial<Omit<InteriorSampleWithResultsPayload, "interiorLaborId">>;
    }) => updateInteriorSampleWithResults(id, payload),
    onSuccess: invalidate
  });
}

export function useUpdateSurfaceSampleWithResultsMutation() {
  const invalidate = useInvalidateProposalSamples();
  return useMutation({
    mutationFn: ({
      id,
      payload
    }: {
      id: string;
      payload: Partial<Omit<SurfaceSampleWithResultsPayload, "surfaceAreaId">>;
    }) => updateSurfaceSampleWithResults(id, payload),
    onSuccess: invalidate
  });
}

export function useAssignInteriorSampleVoucherMutation() {
  const invalidate = useInvalidateProposalSamples();
  return useMutation({ mutationFn: assignInteriorSampleVoucher, onSuccess: invalidate });
}

export function useAssignSurfaceSampleVoucherMutation() {
  const invalidate = useInvalidateProposalSamples();
  return useMutation({ mutationFn: assignSurfaceSampleVoucher, onSuccess: invalidate });
}
