import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createInteriorDispatch,
  createInteriorArea,
  createInteriorLabor,
  createInteriorLaboratory,
  createInteriorLevel,
  createInteriorObjective,
  createInteriorSampleResult,
  createInteriorSampleWithResults,
  createSurfaceDispatch,
  createSharedElement,
  createSurfaceArea,
  createSurfaceLabor,
  createSurfaceLaboratory,
  createSurfaceLevel,
  createSurfaceObjective,
  createSurfaceSampleResult,
  createSurfaceSampleWithResults,
  deleteInteriorArea,
  deleteInteriorDispatch,
  deleteInteriorLabor,
  deleteInteriorLevel,
  deleteInteriorSample,
  deleteSurfaceArea,
  deleteSurfaceDispatch,
  deleteSurfaceLabor,
  deleteSurfaceLevel,
  deleteSurfaceSample,
  getInteriorDispatches,
  getInteriorAreas,
  getInteriorHierarchy,
  getInteriorLabors,
  getInteriorLaboratories,
  getInteriorLevels,
  getInteriorObjectives,
  getInteriorSamples,
  getSharedElements,
  getSurfaceDispatches,
  getSurfaceAreas,
  getSurfaceHierarchy,
  getSurfaceLabors,
  getSurfaceLaboratories,
  getSurfaceLevels,
  getSurfaceObjectives,
  getSurfaceSamples,
  updateInteriorArea,
  updateInteriorDispatch,
  updateInteriorLabor,
  updateInteriorLevel,
  updateInteriorSampleWithResults,
  updateSurfaceArea,
  updateSurfaceDispatch,
  updateSurfaceLabor,
  updateSurfaceLevel,
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
import {
  syncPendingProposalSamples,
  type SyncProposalSamplesOptions
} from "@/features/exploraciones/services/proposalSamplesSync.service";
import type {
  InteriorSampleWithResultsPayload,
  CreateDispatchPayload,
  CreateSampleResultPayload,
  DispatchStatus,
  SampleCategory,
  SamplePriority,
  SampleStatus,
  SurfaceSampleWithResultsPayload
} from "@/features/exploraciones/model/proposalSamples.schema";

const base = ["exploraciones", "proposal-samples"] as const;
const catalogQueryOptions = {
  staleTime: 30 * 60_000,
  gcTime: 24 * 60 * 60_000,
  refetchOnWindowFocus: false
} as const;

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
  return useMutation({
    mutationFn: (options?: SyncProposalSamplesOptions) => syncPendingProposalSamples(options),
    onSuccess: (result) => {
      if (result.synced > 0 || result.failed > 0) {
        void invalidate();
      }
    }
  });
}

export function useQueueProposalCatalogMutation() {
  const invalidate = useInvalidateProposalSamples();
  return useMutation({
    mutationFn: async (input: {
      module: ProposalModule;
      entity: Exclude<ProposalEntity, "sample">;
      payload: Record<string, unknown>;
      queueAction?: boolean;
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
      if (input.queueAction !== false) {
        await saveProposalAction({
          localId,
          module: input.module,
          entity: input.entity,
          payload: input.payload as ProposalPayload
        });
      }
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
    queryFn: () => getSharedElements({ page: 1, limit: 500 }),
    ...catalogQueryOptions
  });
}

export function useInteriorAreasQuery(category?: SampleCategory) {
  return useQuery({
    queryKey: [...base, "interior", "areas", category],
    queryFn: () => getInteriorAreas({ category, page: 1, limit: 300 }),
    ...catalogQueryOptions
  });
}

export function useInteriorHierarchyQuery(category?: SampleCategory) {
  return useQuery({
    queryKey: [...base, "interior", "hierarchy", category],
    queryFn: () => getInteriorHierarchy({ category }),
    ...catalogQueryOptions
  });
}

export function useInteriorLevelsQuery(interiorAreaId?: string, category?: SampleCategory) {
  return useQuery({
    queryKey: [...base, "interior", "levels", interiorAreaId, category],
    queryFn: () => getInteriorLevels({ interiorAreaId, category, page: 1, limit: 300 }),
    enabled: Boolean(interiorAreaId),
    ...catalogQueryOptions
  });
}

export function useInteriorLaborsQuery(interiorLevelId?: string, category?: SampleCategory) {
  return useQuery({
    queryKey: [...base, "interior", "labors", interiorLevelId, category],
    queryFn: () => getInteriorLabors({ interiorLevelId, category, page: 1, limit: 300 }),
    enabled: Boolean(interiorLevelId),
    ...catalogQueryOptions
  });
}

export function useInteriorObjectivesQuery() {
  return useQuery({
    queryKey: [...base, "interior", "objectives"],
    queryFn: () => getInteriorObjectives({ page: 1, limit: 300 }),
    ...catalogQueryOptions
  });
}

export function useInteriorLaboratoriesQuery() {
  return useQuery({
    queryKey: [...base, "interior", "laboratories"],
    queryFn: () => getInteriorLaboratories({ page: 1, limit: 300 }),
    ...catalogQueryOptions
  });
}

export function useInteriorSamplesQuery(params: {
  interiorLaborId?: string;
  createdById?: number;
  category?: SampleCategory;
  status?: SampleStatus;
  priority?: SamplePriority;
  search?: string;
}) {
  return useQuery({
    queryKey: [...base, "interior", "samples", params],
    queryFn: () => getInteriorSamples({ ...params, page: 1, limit: 200 })
  });
}

export function useSurfaceAreasQuery(category?: SampleCategory) {
  return useQuery({
    queryKey: [...base, "surface", "areas", category],
    queryFn: () => getSurfaceAreas({ category, page: 1, limit: 300 }),
    ...catalogQueryOptions
  });
}

export function useSurfaceHierarchyQuery(category?: SampleCategory) {
  return useQuery({
    queryKey: [...base, "surface", "hierarchy", category],
    queryFn: () => getSurfaceHierarchy({ category }),
    ...catalogQueryOptions
  });
}

export function useSurfaceObjectivesQuery() {
  return useQuery({
    queryKey: [...base, "surface", "objectives"],
    queryFn: () => getSurfaceObjectives({ page: 1, limit: 300 }),
    ...catalogQueryOptions
  });
}

export function useSurfaceLevelsQuery(surfaceAreaId?: string, category?: SampleCategory) {
  return useQuery({
    queryKey: [...base, "surface", "levels", surfaceAreaId, category],
    queryFn: () => getSurfaceLevels({ surfaceAreaId, category, page: 1, limit: 300 }),
    enabled: Boolean(surfaceAreaId),
    ...catalogQueryOptions
  });
}

export function useSurfaceLaborsQuery(surfaceLevelId?: string, category?: SampleCategory) {
  return useQuery({
    queryKey: [...base, "surface", "labors", surfaceLevelId, category],
    queryFn: () => getSurfaceLabors({ surfaceLevelId, category, page: 1, limit: 300 }),
    enabled: Boolean(surfaceLevelId),
    ...catalogQueryOptions
  });
}

export function useSurfaceLaboratoriesQuery() {
  return useQuery({
    queryKey: [...base, "surface", "laboratories"],
    queryFn: () => getSurfaceLaboratories({ page: 1, limit: 300 }),
    ...catalogQueryOptions
  });
}

export function useSurfaceSamplesQuery(params: {
  surfaceLaborId?: string;
  createdById?: number;
  category?: SampleCategory;
  status?: SampleStatus;
  priority?: SamplePriority;
  search?: string;
}) {
  return useQuery({
    queryKey: [...base, "surface", "samples", params],
    queryFn: () => getSurfaceSamples({ ...params, page: 1, limit: 200 })
  });
}

export function useInteriorDispatchesQuery(params: {
  interiorLaboratoryId?: string;
  status?: DispatchStatus;
}) {
  return useQuery({
    queryKey: [...base, "interior", "dispatches", params],
    queryFn: () => getInteriorDispatches({ ...params, page: 1, limit: 100 })
  });
}

export function useSurfaceDispatchesQuery(params: {
  surfaceLaboratoryId?: string;
  status?: DispatchStatus;
}) {
  return useQuery({
    queryKey: [...base, "surface", "dispatches", params],
    queryFn: () => getSurfaceDispatches({ ...params, page: 1, limit: 100 })
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

export function useUpdateInteriorAreaMutation() {
  const invalidate = useInvalidateProposalSamples();
  return useMutation({
    mutationFn: ({
      id,
      payload
    }: {
      id: string;
      payload: Partial<{ name: string; abbreviation: string; category: SampleCategory; description?: string }>;
    }) => updateInteriorArea(id, payload),
    onSuccess: invalidate
  });
}

export function useDeleteInteriorAreaMutation() {
  const invalidate = useInvalidateProposalSamples();
  return useMutation({ mutationFn: deleteInteriorArea, onSuccess: invalidate });
}

export function useCreateInteriorLevelMutation() {
  const invalidate = useInvalidateProposalSamples();
  return useMutation({ mutationFn: createInteriorLevel, onSuccess: invalidate });
}

export function useUpdateInteriorLevelMutation() {
  const invalidate = useInvalidateProposalSamples();
  return useMutation({
    mutationFn: ({
      id,
      payload
    }: {
      id: string;
      payload: Partial<{ interiorAreaId: string; name: string; abbreviation: string; elevation?: number; description?: string }>;
    }) => updateInteriorLevel(id, payload),
    onSuccess: invalidate
  });
}

export function useDeleteInteriorLevelMutation() {
  const invalidate = useInvalidateProposalSamples();
  return useMutation({ mutationFn: deleteInteriorLevel, onSuccess: invalidate });
}

export function useCreateInteriorLaborMutation() {
  const invalidate = useInvalidateProposalSamples();
  return useMutation({ mutationFn: createInteriorLabor, onSuccess: invalidate });
}

export function useUpdateInteriorLaborMutation() {
  const invalidate = useInvalidateProposalSamples();
  return useMutation({
    mutationFn: ({
      id,
      payload
    }: {
      id: string;
      payload: Partial<{ interiorLevelId: string; name: string; abbreviation: string; description?: string }>;
    }) => updateInteriorLabor(id, payload),
    onSuccess: invalidate
  });
}

export function useDeleteInteriorLaborMutation() {
  const invalidate = useInvalidateProposalSamples();
  return useMutation({ mutationFn: deleteInteriorLabor, onSuccess: invalidate });
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

export function useUpdateSurfaceAreaMutation() {
  const invalidate = useInvalidateProposalSamples();
  return useMutation({
    mutationFn: ({
      id,
      payload
    }: {
      id: string;
      payload: Partial<{ name: string; abbreviation: string; category: SampleCategory; description?: string }>;
    }) => updateSurfaceArea(id, payload),
    onSuccess: invalidate
  });
}

export function useDeleteSurfaceAreaMutation() {
  const invalidate = useInvalidateProposalSamples();
  return useMutation({ mutationFn: deleteSurfaceArea, onSuccess: invalidate });
}

export function useCreateSurfaceLevelMutation() {
  const invalidate = useInvalidateProposalSamples();
  return useMutation({ mutationFn: createSurfaceLevel, onSuccess: invalidate });
}

export function useUpdateSurfaceLevelMutation() {
  const invalidate = useInvalidateProposalSamples();
  return useMutation({
    mutationFn: ({
      id,
      payload
    }: {
      id: string;
      payload: Partial<{ surfaceAreaId: string; name: string; abbreviation: string; elevation?: number; description?: string }>;
    }) => updateSurfaceLevel(id, payload),
    onSuccess: invalidate
  });
}

export function useDeleteSurfaceLevelMutation() {
  const invalidate = useInvalidateProposalSamples();
  return useMutation({ mutationFn: deleteSurfaceLevel, onSuccess: invalidate });
}

export function useCreateSurfaceLaborMutation() {
  const invalidate = useInvalidateProposalSamples();
  return useMutation({ mutationFn: createSurfaceLabor, onSuccess: invalidate });
}

export function useUpdateSurfaceLaborMutation() {
  const invalidate = useInvalidateProposalSamples();
  return useMutation({
    mutationFn: ({
      id,
      payload
    }: {
      id: string;
      payload: Partial<{ surfaceLevelId: string; name: string; abbreviation: string; description?: string }>;
    }) => updateSurfaceLabor(id, payload),
    onSuccess: invalidate
  });
}

export function useDeleteSurfaceLaborMutation() {
  const invalidate = useInvalidateProposalSamples();
  return useMutation({ mutationFn: deleteSurfaceLabor, onSuccess: invalidate });
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
      payload: Partial<Omit<SurfaceSampleWithResultsPayload, "surfaceLaborId">>;
    }) => updateSurfaceSampleWithResults(id, payload),
    onSuccess: invalidate
  });
}

export function useDeleteInteriorSampleMutation() {
  const invalidate = useInvalidateProposalSamples();
  return useMutation({ mutationFn: deleteInteriorSample, onSuccess: invalidate });
}

export function useDeleteSurfaceSampleMutation() {
  const invalidate = useInvalidateProposalSamples();
  return useMutation({ mutationFn: deleteSurfaceSample, onSuccess: invalidate });
}

export function useCreateInteriorDispatchMutation() {
  const invalidate = useInvalidateProposalSamples();
  return useMutation({ mutationFn: (payload: CreateDispatchPayload) => createInteriorDispatch(payload), onSuccess: invalidate });
}

export function useCreateSurfaceDispatchMutation() {
  const invalidate = useInvalidateProposalSamples();
  return useMutation({ mutationFn: (payload: CreateDispatchPayload) => createSurfaceDispatch(payload), onSuccess: invalidate });
}

export function useUpdateInteriorDispatchMutation() {
  const invalidate = useInvalidateProposalSamples();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { projectName?: string; sentAt?: string; notes?: string; status?: DispatchStatus } }) =>
      updateInteriorDispatch(id, payload),
    onSuccess: invalidate
  });
}

export function useUpdateSurfaceDispatchMutation() {
  const invalidate = useInvalidateProposalSamples();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { projectName?: string; sentAt?: string; notes?: string; status?: DispatchStatus } }) =>
      updateSurfaceDispatch(id, payload),
    onSuccess: invalidate
  });
}

export function useDeleteInteriorDispatchMutation() {
  const invalidate = useInvalidateProposalSamples();
  return useMutation({ mutationFn: deleteInteriorDispatch, onSuccess: invalidate });
}

export function useDeleteSurfaceDispatchMutation() {
  const invalidate = useInvalidateProposalSamples();
  return useMutation({ mutationFn: deleteSurfaceDispatch, onSuccess: invalidate });
}

export function useCreateInteriorSampleResultMutation() {
  const invalidate = useInvalidateProposalSamples();
  return useMutation({
    mutationFn: (payload: CreateSampleResultPayload) => createInteriorSampleResult(payload),
    onSuccess: invalidate
  });
}

export function useCreateSurfaceSampleResultMutation() {
  const invalidate = useInvalidateProposalSamples();
  return useMutation({
    mutationFn: (payload: CreateSampleResultPayload) => createSurfaceSampleResult(payload),
    onSuccess: invalidate
  });
}
