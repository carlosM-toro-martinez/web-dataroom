import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/queryKeys";
import {
  createAlteration,
  createAssay,
  createAssayValue,
  createDensity,
  createDrillHole,
  createDrillHoleSurvey,
  createGeologicalStructure,
  createInterval,
  createLithology,
  createMagneticSusceptibility,
  createMineralization,
  createProject,
  createQaqc,
  createRecovery,
  createResource,
  createSignificantIntercept,
  createZone,
  executeMiningExcelImport,
  getAssayById,
  getAssays,
  getAssayValues,
  getAlterations,
  getDensities,
  getDrillHoleById,
  getDrillHoles,
  getDrillHoleSurveys,
  getExplorationHierarchy,
  getGeologicalStructures,
  getIntervalById,
  getIntervals,
  getLithologies,
  getMagneticSusceptibilities,
  getMineralizations,
  getProjectById,
  getProjects,
  getQaqc,
  getRecoveries,
  getResources,
  getSignificantIntercepts,
  getZoneById,
  getZones,
  validateMiningExcelImport,
  updateAlteration,
  updateAssay,
  updateAssayValue,
  updateDensity,
  updateDrillHole,
  updateDrillHoleSurvey,
  updateGeologicalStructure,
  updateInterval,
  updateLithology,
  updateMagneticSusceptibility,
  updateMineralization,
  updateProject,
  updateQaqc,
  updateRecovery,
  updateResource,
  updateSignificantIntercept,
  updateZone
} from "@/features/exploraciones/api/exploracionMineraApi";
import type {
  CreateAlterationPayload,
  CreateAssayPayload,
  CreateAssayValuePayload,
  CreateDensityPayload,
  CreateDrillHolePayload,
  CreateDrillHoleSurveyPayload,
  CreateGeologicalStructurePayload,
  CreateIntervalPayload,
  CreateLithologyPayload,
  CreateMagneticSusceptibilityPayload,
  CreateMineralizationPayload,
  CreateProjectPayload,
  CreateQaqcPayload,
  CreateRecoveryPayload,
  CreateResourcePayload,
  CreateSignificantInterceptPayload,
  CreateZonePayload,
  UpdateAlterationPayload,
  UpdateAssayPayload,
  UpdateAssayValuePayload,
  UpdateDensityPayload,
  UpdateDrillHolePayload,
  UpdateDrillHoleSurveyPayload,
  UpdateGeologicalStructurePayload,
  UpdateIntervalPayload,
  UpdateLithologyPayload,
  UpdateMagneticSusceptibilityPayload,
  UpdateMineralizationPayload,
  UpdateProjectPayload,
  UpdateQaqcPayload,
  UpdateRecoveryPayload,
  UpdateResourcePayload,
  UpdateSignificantInterceptPayload,
  UpdateZonePayload
} from "@/features/exploraciones/model/exploracionMinera.schema";

export function useExplorationHierarchyQuery(params: { search?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: queryKeys.exploraciones.hierarchy(params),
    queryFn: async () => {
      try {
        return await getExplorationHierarchy(params);
      } catch {
        return {
          projects: [],
          zones: [],
          drillHoles: [],
          intervals: [],
          assays: [],
          lithologies: [],
          qaqc: [],
          resources: [],
          drillHoleSurveys: [],
          assayValues: [],
          alterations: [],
          mineralizations: [],
          geologicalStructures: [],
          recoveries: [],
          densities: [],
          magneticSusceptibilities: [],
          significantIntercepts: []
        };
      }
    },
    retry: false,
    refetchOnWindowFocus: false
  });
}

export function useProjectsQuery(params: { search?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: [...queryKeys.exploraciones.all, "projects", params],
    queryFn: () => getProjects(params),
    retry: false
  });
}

export function useProjectDetailQuery(projectId?: number) {
  return useQuery({
    queryKey: [...queryKeys.exploraciones.all, "project", projectId],
    queryFn: () => getProjectById(projectId as number),
    enabled: Boolean(projectId),
    retry: false
  });
}

export function useZonesByProjectQuery(projectId?: number) {
  return useQuery({
    queryKey: [...queryKeys.exploraciones.all, "zones", projectId],
    queryFn: () => getZones({ projectId, page: 1, limit: 100 }),
    enabled: Boolean(projectId),
    retry: false
  });
}

export function useZoneDetailQuery(zoneId?: number) {
  return useQuery({
    queryKey: [...queryKeys.exploraciones.all, "zone", zoneId],
    queryFn: () => getZoneById(zoneId as number),
    enabled: Boolean(zoneId),
    retry: false
  });
}

export function useDrillHolesByZoneQuery(zoneId?: number) {
  return useQuery({
    queryKey: [...queryKeys.exploraciones.all, "drillholes", zoneId],
    queryFn: () => getDrillHoles({ zoneId, page: 1, limit: 100 }),
    enabled: Boolean(zoneId),
    retry: false
  });
}

export function useDrillHoleDetailQuery(drillHoleId?: number) {
  return useQuery({
    queryKey: [...queryKeys.exploraciones.all, "drillhole", drillHoleId],
    queryFn: () => getDrillHoleById(drillHoleId as number),
    enabled: Boolean(drillHoleId),
    retry: false
  });
}

export function useIntervalsByDrillHoleQuery(drillHoleId?: number) {
  return useQuery({
    queryKey: [...queryKeys.exploraciones.all, "intervals", drillHoleId],
    queryFn: () => getIntervals({ drillHoleId, page: 1, limit: 100 }),
    enabled: Boolean(drillHoleId),
    retry: false
  });
}

export function useIntervalDetailQuery(intervalId?: number) {
  return useQuery({
    queryKey: [...queryKeys.exploraciones.all, "interval", intervalId],
    queryFn: () => getIntervalById(intervalId as number),
    enabled: Boolean(intervalId),
    retry: false
  });
}

export function useAssaysByIntervalQuery(intervalId?: number) {
  return useQuery({
    queryKey: [...queryKeys.exploraciones.all, "assays", intervalId],
    queryFn: () => getAssays({ intervalId, page: 1, limit: 100 }),
    enabled: Boolean(intervalId),
    retry: false
  });
}

export function useLithologiesByIntervalQuery(intervalId?: number) {
  return useQuery({
    queryKey: [...queryKeys.exploraciones.all, "lithologies", intervalId],
    queryFn: () => getLithologies({ intervalId, page: 1, limit: 100 }),
    enabled: Boolean(intervalId),
    retry: false
  });
}

export function useAssayDetailQuery(assayId?: number) {
  return useQuery({
    queryKey: [...queryKeys.exploraciones.all, "assay", assayId],
    queryFn: () => getAssayById(assayId as number),
    enabled: Boolean(assayId),
    retry: false
  });
}

export function useQaqcByAssayQuery(assayId?: number) {
  return useQuery({
    queryKey: [...queryKeys.exploraciones.all, "qaqc", assayId],
    queryFn: () => getQaqc({ assayId, page: 1, limit: 100 }),
    enabled: Boolean(assayId),
    retry: false
  });
}

export function useResourcesByProjectQuery(projectId?: number) {
  return useQuery({
    queryKey: [...queryKeys.exploraciones.all, "resources", projectId],
    queryFn: () => getResources({ projectId, page: 1, limit: 100 }),
    enabled: Boolean(projectId),
    retry: false
  });
}

export function useSignificantInterceptsByZoneQuery(zoneId?: number) {
  return useQuery({
    queryKey: [...queryKeys.exploraciones.all, "significant-intercepts", "zone", zoneId],
    queryFn: () => getSignificantIntercepts({ zoneId, page: 1, limit: 100 }),
    enabled: Boolean(zoneId),
    retry: false
  });
}

export function useSignificantInterceptsByDrillHoleQuery(drillHoleId?: number) {
  return useQuery({
    queryKey: [...queryKeys.exploraciones.all, "significant-intercepts", "drillhole", drillHoleId],
    queryFn: () => getSignificantIntercepts({ drillHoleId, page: 1, limit: 100 }),
    enabled: Boolean(drillHoleId),
    retry: false
  });
}

export function useDrillHoleSurveysByDrillHoleQuery(drillHoleId?: number) {
  return useQuery({
    queryKey: [...queryKeys.exploraciones.all, "drill-hole-surveys", drillHoleId],
    queryFn: () => getDrillHoleSurveys({ drillHoleId, page: 1, limit: 100 }),
    enabled: Boolean(drillHoleId),
    retry: false
  });
}

export function useAssayValuesByAssayQuery(assayId?: number) {
  return useQuery({
    queryKey: [...queryKeys.exploraciones.all, "assay-values", assayId],
    queryFn: () => getAssayValues({ assayId, page: 1, limit: 100 }),
    enabled: Boolean(assayId),
    retry: false
  });
}

export function useAlterationsByIntervalQuery(intervalId?: number) {
  return useQuery({
    queryKey: [...queryKeys.exploraciones.all, "alterations", intervalId],
    queryFn: () => getAlterations({ intervalId, page: 1, limit: 100 }),
    enabled: Boolean(intervalId),
    retry: false
  });
}

export function useMineralizationsByIntervalQuery(intervalId?: number) {
  return useQuery({
    queryKey: [...queryKeys.exploraciones.all, "mineralizations", intervalId],
    queryFn: () => getMineralizations({ intervalId, page: 1, limit: 100 }),
    enabled: Boolean(intervalId),
    retry: false
  });
}

export function useGeologicalStructuresByIntervalQuery(intervalId?: number) {
  return useQuery({
    queryKey: [...queryKeys.exploraciones.all, "geological-structures", intervalId],
    queryFn: () => getGeologicalStructures({ intervalId, page: 1, limit: 100 }),
    enabled: Boolean(intervalId),
    retry: false
  });
}

export function useRecoveriesByIntervalQuery(intervalId?: number) {
  return useQuery({
    queryKey: [...queryKeys.exploraciones.all, "recoveries", intervalId],
    queryFn: () => getRecoveries({ intervalId, page: 1, limit: 100 }),
    enabled: Boolean(intervalId),
    retry: false
  });
}

export function useDensitiesByIntervalQuery(intervalId?: number) {
  return useQuery({
    queryKey: [...queryKeys.exploraciones.all, "densities", intervalId],
    queryFn: () => getDensities({ intervalId, page: 1, limit: 100 }),
    enabled: Boolean(intervalId),
    retry: false
  });
}

export function useMagneticSusceptibilitiesByIntervalQuery(intervalId?: number) {
  return useQuery({
    queryKey: [...queryKeys.exploraciones.all, "magnetic-susceptibilities", intervalId],
    queryFn: () => getMagneticSusceptibilities({ intervalId, page: 1, limit: 100 }),
    enabled: Boolean(intervalId),
    retry: false
  });
}

function useInvalidateExplorationHierarchy() {
  const queryClient = useQueryClient();
  return async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.exploraciones.all });
  };
}

export function useCreateProjectMutation() {
  const invalidate = useInvalidateExplorationHierarchy();
  return useMutation({
    mutationFn: (payload: CreateProjectPayload) => createProject(payload),
    onSuccess: invalidate
  });
}

export function useUpdateProjectMutation() {
  const invalidate = useInvalidateExplorationHierarchy();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateProjectPayload }) =>
      updateProject(id, payload),
    onSuccess: invalidate
  });
}

export function useCreateZoneMutation() {
  const invalidate = useInvalidateExplorationHierarchy();
  return useMutation({
    mutationFn: (payload: CreateZonePayload) => createZone(payload),
    onSuccess: invalidate
  });
}

export function useUpdateZoneMutation() {
  const invalidate = useInvalidateExplorationHierarchy();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateZonePayload }) => updateZone(id, payload),
    onSuccess: invalidate
  });
}

export function useCreateDrillHoleMutation() {
  const invalidate = useInvalidateExplorationHierarchy();
  return useMutation({
    mutationFn: (payload: CreateDrillHolePayload) => createDrillHole(payload),
    onSuccess: invalidate
  });
}

export function useUpdateDrillHoleMutation() {
  const invalidate = useInvalidateExplorationHierarchy();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateDrillHolePayload }) =>
      updateDrillHole(id, payload),
    onSuccess: invalidate
  });
}

export function useCreateIntervalMutation() {
  const invalidate = useInvalidateExplorationHierarchy();
  return useMutation({
    mutationFn: (payload: CreateIntervalPayload) => createInterval(payload),
    onSuccess: invalidate
  });
}

export function useUpdateIntervalMutation() {
  const invalidate = useInvalidateExplorationHierarchy();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateIntervalPayload }) =>
      updateInterval(id, payload),
    onSuccess: invalidate
  });
}

export function useCreateAssayMutation() {
  const invalidate = useInvalidateExplorationHierarchy();
  return useMutation({
    mutationFn: (payload: CreateAssayPayload) => createAssay(payload),
    onSuccess: invalidate
  });
}

export function useUpdateAssayMutation() {
  const invalidate = useInvalidateExplorationHierarchy();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateAssayPayload }) => updateAssay(id, payload),
    onSuccess: invalidate
  });
}

export function useCreateLithologyMutation() {
  const invalidate = useInvalidateExplorationHierarchy();
  return useMutation({
    mutationFn: (payload: CreateLithologyPayload) => createLithology(payload),
    onSuccess: invalidate
  });
}

export function useUpdateLithologyMutation() {
  const invalidate = useInvalidateExplorationHierarchy();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateLithologyPayload }) =>
      updateLithology(id, payload),
    onSuccess: invalidate
  });
}

export function useCreateQaqcMutation() {
  const invalidate = useInvalidateExplorationHierarchy();
  return useMutation({
    mutationFn: (payload: CreateQaqcPayload) => createQaqc(payload),
    onSuccess: invalidate
  });
}

export function useUpdateQaqcMutation() {
  const invalidate = useInvalidateExplorationHierarchy();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateQaqcPayload }) => updateQaqc(id, payload),
    onSuccess: invalidate
  });
}

export function useCreateResourceMutation() {
  const invalidate = useInvalidateExplorationHierarchy();
  return useMutation({
    mutationFn: (payload: CreateResourcePayload) => createResource(payload),
    onSuccess: invalidate
  });
}

export function useUpdateResourceMutation() {
  const invalidate = useInvalidateExplorationHierarchy();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateResourcePayload }) =>
      updateResource(id, payload),
    onSuccess: invalidate
  });
}

export function useCreateSignificantInterceptMutation() {
  const invalidate = useInvalidateExplorationHierarchy();
  return useMutation({
    mutationFn: (payload: CreateSignificantInterceptPayload) => createSignificantIntercept(payload),
    onSuccess: invalidate
  });
}

export function useUpdateSignificantInterceptMutation() {
  const invalidate = useInvalidateExplorationHierarchy();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateSignificantInterceptPayload }) =>
      updateSignificantIntercept(id, payload),
    onSuccess: invalidate
  });
}

export function useCreateDrillHoleSurveyMutation() {
  const invalidate = useInvalidateExplorationHierarchy();
  return useMutation({
    mutationFn: (payload: CreateDrillHoleSurveyPayload) => createDrillHoleSurvey(payload),
    onSuccess: invalidate
  });
}

export function useUpdateDrillHoleSurveyMutation() {
  const invalidate = useInvalidateExplorationHierarchy();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateDrillHoleSurveyPayload }) =>
      updateDrillHoleSurvey(id, payload),
    onSuccess: invalidate
  });
}

export function useCreateAssayValueMutation() {
  const invalidate = useInvalidateExplorationHierarchy();
  return useMutation({
    mutationFn: (payload: CreateAssayValuePayload) => createAssayValue(payload),
    onSuccess: invalidate
  });
}

export function useUpdateAssayValueMutation() {
  const invalidate = useInvalidateExplorationHierarchy();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateAssayValuePayload }) =>
      updateAssayValue(id, payload),
    onSuccess: invalidate
  });
}

export function useCreateAlterationMutation() {
  const invalidate = useInvalidateExplorationHierarchy();
  return useMutation({
    mutationFn: (payload: CreateAlterationPayload) => createAlteration(payload),
    onSuccess: invalidate
  });
}

export function useUpdateAlterationMutation() {
  const invalidate = useInvalidateExplorationHierarchy();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateAlterationPayload }) =>
      updateAlteration(id, payload),
    onSuccess: invalidate
  });
}

export function useCreateMineralizationMutation() {
  const invalidate = useInvalidateExplorationHierarchy();
  return useMutation({
    mutationFn: (payload: CreateMineralizationPayload) => createMineralization(payload),
    onSuccess: invalidate
  });
}

export function useUpdateMineralizationMutation() {
  const invalidate = useInvalidateExplorationHierarchy();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateMineralizationPayload }) =>
      updateMineralization(id, payload),
    onSuccess: invalidate
  });
}

export function useCreateGeologicalStructureMutation() {
  const invalidate = useInvalidateExplorationHierarchy();
  return useMutation({
    mutationFn: (payload: CreateGeologicalStructurePayload) => createGeologicalStructure(payload),
    onSuccess: invalidate
  });
}

export function useUpdateGeologicalStructureMutation() {
  const invalidate = useInvalidateExplorationHierarchy();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateGeologicalStructurePayload }) =>
      updateGeologicalStructure(id, payload),
    onSuccess: invalidate
  });
}

export function useCreateRecoveryMutation() {
  const invalidate = useInvalidateExplorationHierarchy();
  return useMutation({
    mutationFn: (payload: CreateRecoveryPayload) => createRecovery(payload),
    onSuccess: invalidate
  });
}

export function useUpdateRecoveryMutation() {
  const invalidate = useInvalidateExplorationHierarchy();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateRecoveryPayload }) =>
      updateRecovery(id, payload),
    onSuccess: invalidate
  });
}

export function useCreateDensityMutation() {
  const invalidate = useInvalidateExplorationHierarchy();
  return useMutation({
    mutationFn: (payload: CreateDensityPayload) => createDensity(payload),
    onSuccess: invalidate
  });
}

export function useUpdateDensityMutation() {
  const invalidate = useInvalidateExplorationHierarchy();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateDensityPayload }) =>
      updateDensity(id, payload),
    onSuccess: invalidate
  });
}

export function useCreateMagneticSusceptibilityMutation() {
  const invalidate = useInvalidateExplorationHierarchy();
  return useMutation({
    mutationFn: (payload: CreateMagneticSusceptibilityPayload) => createMagneticSusceptibility(payload),
    onSuccess: invalidate
  });
}

export function useUpdateMagneticSusceptibilityMutation() {
  const invalidate = useInvalidateExplorationHierarchy();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateMagneticSusceptibilityPayload }) =>
      updateMagneticSusceptibility(id, payload),
    onSuccess: invalidate
  });
}

export function useValidateMiningExcelImportMutation() {
  return useMutation({
    mutationFn: validateMiningExcelImport
  });
}

export function useExecuteMiningExcelImportMutation() {
  const invalidate = useInvalidateExplorationHierarchy();
  return useMutation({
    mutationFn: executeMiningExcelImport,
    onSuccess: invalidate
  });
}
