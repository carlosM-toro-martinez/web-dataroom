import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createMiningArea,
  createMiningLabor,
  createMiningLevel,
  createSampleLaboratory,
  createSampleQaqc,
  createSampleResult,
  createSurfaceElement,
  createSurfaceLaboratory,
  createSurfaceSample,
  createSurfaceSampleWithResults,
  getMiningAreas,
  getMiningLabors,
  getMiningLevels,
  getSampleLaboratories,
  getSampleQaqc,
  getSampleResults,
  getSurfaceElements,
  getSurfaceLaboratories,
  getSurfaceSamples
} from "@/features/exploraciones/api/surfaceExplorationApi";

const base = ["exploraciones", "surface"];

export const useMiningAreasQuery = () =>
  useQuery({ queryKey: [...base, "areas"], queryFn: () => getMiningAreas({ page: 1, limit: 200 }) });

export const useMiningLevelsQuery = (miningAreaId?: string) =>
  useQuery({
    queryKey: [...base, "levels", miningAreaId],
    queryFn: () => getMiningLevels({ miningAreaId, page: 1, limit: 200 }),
    enabled: Boolean(miningAreaId)
  });

export const useMiningLaborsQuery = (miningLevelId?: string) =>
  useQuery({
    queryKey: [...base, "labors", miningLevelId],
    queryFn: () => getMiningLabors({ miningLevelId, page: 1, limit: 300 }),
    enabled: Boolean(miningLevelId)
  });

export const useSurfaceSamplesQuery = (miningLaborId?: string, enabled = true) =>
  useQuery({
    queryKey: [...base, "samples", miningLaborId],
    queryFn: () => getSurfaceSamples({ miningLaborId, page: 1, limit: 1500 }),
    enabled
  });

export const useSampleLaboratoriesQuery = (sampleId?: string) =>
  useQuery({
    queryKey: [...base, "sample-laboratories", sampleId],
    queryFn: () => getSampleLaboratories({ sampleId, page: 1, limit: 300 }),
    enabled: Boolean(sampleId)
  });

export const useSampleQaqcQuery = (sampleId?: string) =>
  useQuery({
    queryKey: [...base, "sample-qaqc", sampleId],
    queryFn: () => getSampleQaqc({ sampleId, page: 1, limit: 300 }),
    enabled: Boolean(sampleId)
  });

export const useSampleResultsBySampleQuery = (sampleId?: string) =>
  useQuery({
    queryKey: [...base, "sample-results", sampleId],
    queryFn: () => getSampleResults({ sampleId, page: 1, limit: 500 }),
    enabled: Boolean(sampleId)
  });

export const useSurfaceLaboratoriesQuery = () =>
  useQuery({ queryKey: [...base, "laboratories"], queryFn: () => getSurfaceLaboratories({ page: 1, limit: 200 }) });

export const useSurfaceElementsQuery = () =>
  useQuery({ queryKey: [...base, "elements"], queryFn: () => getSurfaceElements({ page: 1, limit: 500 }) });

function useInvalidateSurface() {
  const queryClient = useQueryClient();
  return async () => {
    await queryClient.invalidateQueries({ queryKey: base });
  };
}

export const useCreateMiningAreaMutation = () => {
  const invalidate = useInvalidateSurface();
  return useMutation({ mutationFn: createMiningArea, onSuccess: invalidate });
};

export const useCreateMiningLevelMutation = () => {
  const invalidate = useInvalidateSurface();
  return useMutation({ mutationFn: createMiningLevel, onSuccess: invalidate });
};

export const useCreateMiningLaborMutation = () => {
  const invalidate = useInvalidateSurface();
  return useMutation({ mutationFn: createMiningLabor, onSuccess: invalidate });
};

export const useCreateSurfaceSampleMutation = () => {
  const invalidate = useInvalidateSurface();
  return useMutation({ mutationFn: createSurfaceSample, onSuccess: invalidate });
};

export const useCreateSurfaceSampleWithResultsMutation = () => {
  const invalidate = useInvalidateSurface();
  return useMutation({ mutationFn: createSurfaceSampleWithResults, onSuccess: invalidate });
};

export const useCreateSurfaceLaboratoryMutation = () => {
  const invalidate = useInvalidateSurface();
  return useMutation({ mutationFn: createSurfaceLaboratory, onSuccess: invalidate });
};

export const useCreateSampleLaboratoryMutation = () => {
  const invalidate = useInvalidateSurface();
  return useMutation({ mutationFn: createSampleLaboratory, onSuccess: invalidate });
};

export const useCreateSurfaceElementMutation = () => {
  const invalidate = useInvalidateSurface();
  return useMutation({ mutationFn: createSurfaceElement, onSuccess: invalidate });
};

export const useCreateSampleResultMutation = () => {
  const invalidate = useInvalidateSurface();
  return useMutation({ mutationFn: createSampleResult, onSuccess: invalidate });
};

export const useCreateSampleQaqcMutation = () => {
  const invalidate = useInvalidateSurface();
  return useMutation({ mutationFn: createSampleQaqc, onSuccess: invalidate });
};
