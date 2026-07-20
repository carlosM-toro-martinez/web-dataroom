import { httpClient } from "@/shared/api/core/httpClient";
import { apiEndpoints } from "@/shared/api/endpoints";
import {
  catalogItemSchema,
  elementSchema,
  interiorAreaSchema,
  interiorLaborSchema,
  interiorHierarchyAreaSchema,
  interiorLevelSchema,
  interiorSampleSchema,
  sampleDispatchSchema,
  sampleResultSchema,
  surfaceAreaSchema,
  surfaceHierarchyAreaSchema,
  surfaceSampleSchema,
  type CreateDispatchPayload,
  type CreateSampleResultPayload,
  type InteriorSampleWithResultsPayload,
  type SampleCategory,
  type SamplePriority,
  type SampleStatus,
  type SurfaceSampleWithResultsPayload
} from "@/features/exploraciones/model/proposalSamples.schema";

function unwrapData(raw: unknown) {
  return raw && typeof raw === "object" && "data" in raw ? (raw as { data: unknown }).data : raw;
}

function unwrapList(raw: unknown) {
  const root = unwrapData(raw);
  const nested = unwrapData(root);
  if (Array.isArray(nested)) return nested;
  if (root && typeof root === "object" && "rows" in root && Array.isArray((root as { rows: unknown }).rows)) {
    return (root as { rows: unknown[] }).rows;
  }
  if (root && typeof root === "object" && "items" in root && Array.isArray((root as { items: unknown }).items)) {
    return (root as { items: unknown[] }).items;
  }
  return Array.isArray(root) ? root : [];
}

function parseOne<T>(raw: unknown, parser: (value: unknown) => T) {
  return parser(unwrapData(raw));
}

function parseList<T>(raw: unknown, parser: (value: unknown) => T) {
  return unwrapList(raw).map(parser);
}

function buildParams(params?: Record<string, string | number | undefined>) {
  if (!params) return undefined;
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== "")
  );
  return Object.keys(clean).length ? clean : undefined;
}

export async function getSharedElements(params?: { search?: string; page?: number; limit?: number }) {
  const response = await httpClient.get(apiEndpoints.exploraciones.surfaceElements, {
    params: buildParams(params)
  });
  return parseList(response.data, (item) => elementSchema.parse(item));
}

export async function createSharedElement(payload: {
  name: string;
  symbol: string;
  defaultUnit?: string;
  description?: string;
}) {
  const response = await httpClient.post(apiEndpoints.exploraciones.surfaceElements, payload);
  return parseOne(response.data, (item) => elementSchema.parse(item));
}

export async function getInteriorAreas(params?: { search?: string; page?: number; limit?: number }) {
  const response = await httpClient.get(apiEndpoints.exploraciones.interiorAreas, {
    params: buildParams(params)
  });
  return parseList(response.data, (item) => interiorAreaSchema.parse(item));
}

export async function createInteriorArea(payload: {
  name: string;
  abbreviation: string;
  description?: string;
}) {
  const response = await httpClient.post(apiEndpoints.exploraciones.interiorAreas, payload);
  return parseOne(response.data, (item) => interiorAreaSchema.parse(item));
}

export async function getInteriorLevels(params?: {
  interiorAreaId?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const response = await httpClient.get(apiEndpoints.exploraciones.interiorLevels, {
    params: buildParams(params)
  });
  return parseList(response.data, (item) => interiorLevelSchema.parse(item));
}

export async function createInteriorLevel(payload: {
  interiorAreaId: string;
  name: string;
  abbreviation: string;
  elevation?: number;
  description?: string;
}) {
  const response = await httpClient.post(apiEndpoints.exploraciones.interiorLevels, payload);
  return parseOne(response.data, (item) => interiorLevelSchema.parse(item));
}

export async function getInteriorLabors(params?: {
  interiorLevelId?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const response = await httpClient.get(apiEndpoints.exploraciones.interiorLabors, {
    params: buildParams(params)
  });
  return parseList(response.data, (item) => interiorLaborSchema.parse(item));
}

export async function createInteriorLabor(payload: {
  interiorLevelId: string;
  name: string;
  abbreviation: string;
  description?: string;
}) {
  const response = await httpClient.post(apiEndpoints.exploraciones.interiorLabors, payload);
  return parseOne(response.data, (item) => interiorLaborSchema.parse(item));
}

export async function getInteriorObjectives(params?: { search?: string; page?: number; limit?: number }) {
  const response = await httpClient.get(apiEndpoints.exploraciones.interiorObjectives, {
    params: buildParams(params)
  });
  return parseList(response.data, (item) => catalogItemSchema.parse(item));
}

export async function createInteriorObjective(payload: { name: string; description?: string }) {
  const response = await httpClient.post(apiEndpoints.exploraciones.interiorObjectives, payload);
  return parseOne(response.data, (item) => catalogItemSchema.parse(item));
}

export async function getInteriorLaboratories(params?: { search?: string; page?: number; limit?: number }) {
  const response = await httpClient.get(apiEndpoints.exploraciones.interiorLaboratories, {
    params: buildParams(params)
  });
  return parseList(response.data, (item) => catalogItemSchema.parse(item));
}

export async function createInteriorLaboratory(payload: {
  name: string;
  abbreviation?: string;
  description?: string;
}) {
  const response = await httpClient.post(apiEndpoints.exploraciones.interiorLaboratories, payload);
  return parseOne(response.data, (item) => catalogItemSchema.parse(item));
}

export async function getInteriorHierarchy() {
  const response = await httpClient.get(apiEndpoints.exploraciones.interiorHierarchy);
  return parseList(response.data, (item) => interiorHierarchyAreaSchema.parse(item));
}

export async function getInteriorSamples(params?: {
  interiorLaborId?: string;
  interiorObjectiveId?: string;
  category?: SampleCategory;
  status?: SampleStatus;
  createdById?: number | string;
  priority?: SamplePriority;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const { category, ...restParams } = params ?? {};
  const endpoint =
    category === "EXPLORATION"
      ? apiEndpoints.exploraciones.interiorSamplesExploration
      : category === "PRODUCTION"
        ? apiEndpoints.exploraciones.interiorSamplesProduction
        : apiEndpoints.exploraciones.interiorSamples;
  const response = await httpClient.get(endpoint, {
    params: buildParams(restParams)
  });
  return parseList(response.data, (item) => interiorSampleSchema.parse(item));
}

export async function createInteriorSampleWithResults(payload: InteriorSampleWithResultsPayload) {
  const response = await httpClient.post(apiEndpoints.exploraciones.interiorSamplesWithResults, payload);
  return parseOne(response.data, (item) => interiorSampleSchema.parse(item));
}

export async function updateInteriorSampleWithResults(
  id: string,
  payload: Partial<Omit<InteriorSampleWithResultsPayload, "interiorLaborId">>
) {
  const response = await httpClient.patch(apiEndpoints.exploraciones.interiorSampleWithResultsById(id), payload);
  return parseOne(response.data, (item) => interiorSampleSchema.parse(item));
}

export async function createInteriorSampleResult(payload: CreateSampleResultPayload) {
  const { sampleId, laboratoryId: interiorLaboratoryId, ...rest } = payload;
  const response = await httpClient.post(apiEndpoints.exploraciones.interiorResults, {
    interiorSampleId: sampleId,
    interiorLaboratoryId,
    ...rest
  });
  return parseOne(response.data, (item) => sampleResultSchema.parse(item));
}

export async function getInteriorDispatches(params?: {
  interiorLaboratoryId?: string;
  status?: "PENDING" | "COMPLETED";
  page?: number;
  limit?: number;
}) {
  const response = await httpClient.get(apiEndpoints.exploraciones.interiorDispatches, {
    params: buildParams(params)
  });
  return parseList(response.data, (item) => sampleDispatchSchema.parse(item));
}

export async function createInteriorDispatch(payload: CreateDispatchPayload) {
  const response = await httpClient.post(apiEndpoints.exploraciones.interiorDispatches, {
    interiorLaboratoryId: payload.laboratoryId,
    projectName: payload.projectName,
    sentAt: payload.sentAt,
    notes: payload.notes,
    items: payload.items.map((item) => ({
      interiorSampleId: item.sampleId,
      elementIds: item.elementIds,
      notes: item.notes
    }))
  });
  return parseOne(response.data, (item) => sampleDispatchSchema.parse(item));
}

export async function updateInteriorDispatch(
  id: string,
  payload: { projectName?: string; sentAt?: string; notes?: string; status?: "PENDING" | "COMPLETED" }
) {
  const response = await httpClient.patch(apiEndpoints.exploraciones.interiorDispatchById(id), payload);
  return parseOne(response.data, (item) => sampleDispatchSchema.parse(item));
}

export async function deleteInteriorDispatch(id: string) {
  await httpClient.delete(apiEndpoints.exploraciones.interiorDispatchById(id));
}

export async function getSurfaceAreas(params?: { search?: string; page?: number; limit?: number }) {
  const response = await httpClient.get(apiEndpoints.exploraciones.surfaceSampleAreas, {
    params: buildParams(params)
  });
  return parseList(response.data, (item) => surfaceAreaSchema.parse(item));
}

export async function createSurfaceArea(payload: {
  name: string;
  abbreviation: string;
  description?: string;
}) {
  const response = await httpClient.post(apiEndpoints.exploraciones.surfaceSampleAreas, payload);
  return parseOne(response.data, (item) => surfaceAreaSchema.parse(item));
}

export async function getSurfaceObjectives(params?: { search?: string; page?: number; limit?: number }) {
  const response = await httpClient.get(apiEndpoints.exploraciones.surfaceSampleObjectives, {
    params: buildParams(params)
  });
  return parseList(response.data, (item) => catalogItemSchema.parse(item));
}

export async function createSurfaceObjective(payload: { name: string; description?: string }) {
  const response = await httpClient.post(apiEndpoints.exploraciones.surfaceSampleObjectives, payload);
  return parseOne(response.data, (item) => catalogItemSchema.parse(item));
}

export async function getSurfaceLaboratories(params?: { search?: string; page?: number; limit?: number }) {
  const response = await httpClient.get(apiEndpoints.exploraciones.surfaceSampleLaboratories, {
    params: buildParams(params)
  });
  return parseList(response.data, (item) => catalogItemSchema.parse(item));
}

export async function createSurfaceLaboratory(payload: {
  name: string;
  abbreviation?: string;
  description?: string;
}) {
  const response = await httpClient.post(apiEndpoints.exploraciones.surfaceSampleLaboratories, payload);
  return parseOne(response.data, (item) => catalogItemSchema.parse(item));
}

export async function getSurfaceHierarchy() {
  const response = await httpClient.get(apiEndpoints.exploraciones.surfaceSampleHierarchy);
  return parseList(response.data, (item) => surfaceHierarchyAreaSchema.parse(item));
}

export async function getSurfaceSamples(params?: {
  surfaceAreaId?: string;
  surfaceObjectiveId?: string;
  category?: SampleCategory;
  status?: SampleStatus;
  createdById?: number | string;
  priority?: SamplePriority;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const { category, ...restParams } = params ?? {};
  const endpoint =
    category === "EXPLORATION"
      ? apiEndpoints.exploraciones.surfaceProposalSamplesExploration
      : category === "PRODUCTION"
        ? apiEndpoints.exploraciones.surfaceProposalSamplesProduction
        : apiEndpoints.exploraciones.surfaceProposalSamples;
  const response = await httpClient.get(endpoint, {
    params: buildParams(restParams)
  });
  return parseList(response.data, (item) => surfaceSampleSchema.parse(item));
}

export async function createSurfaceSampleWithResults(payload: SurfaceSampleWithResultsPayload) {
  const response = await httpClient.post(
    apiEndpoints.exploraciones.surfaceProposalSamplesWithResults,
    payload
  );
  return parseOne(response.data, (item) => surfaceSampleSchema.parse(item));
}

export async function updateSurfaceSampleWithResults(
  id: string,
  payload: Partial<Omit<SurfaceSampleWithResultsPayload, "surfaceAreaId">>
) {
  const response = await httpClient.patch(
    apiEndpoints.exploraciones.surfaceProposalSampleWithResultsById(id),
    payload
  );
  return parseOne(response.data, (item) => surfaceSampleSchema.parse(item));
}

export async function createSurfaceSampleResult(payload: CreateSampleResultPayload) {
  const { sampleId, laboratoryId: surfaceLaboratoryId, ...rest } = payload;
  const response = await httpClient.post(apiEndpoints.exploraciones.surfaceProposalResults, {
    surfaceSampleId: sampleId,
    surfaceLaboratoryId,
    ...rest
  });
  return parseOne(response.data, (item) => sampleResultSchema.parse(item));
}

export async function getSurfaceDispatches(params?: {
  surfaceLaboratoryId?: string;
  status?: "PENDING" | "COMPLETED";
  page?: number;
  limit?: number;
}) {
  const response = await httpClient.get(apiEndpoints.exploraciones.surfaceProposalDispatches, {
    params: buildParams(params)
  });
  return parseList(response.data, (item) => sampleDispatchSchema.parse(item));
}

export async function createSurfaceDispatch(payload: CreateDispatchPayload) {
  const response = await httpClient.post(apiEndpoints.exploraciones.surfaceProposalDispatches, {
    surfaceLaboratoryId: payload.laboratoryId,
    projectName: payload.projectName,
    sentAt: payload.sentAt,
    notes: payload.notes,
    items: payload.items.map((item) => ({
      surfaceSampleId: item.sampleId,
      elementIds: item.elementIds,
      notes: item.notes
    }))
  });
  return parseOne(response.data, (item) => sampleDispatchSchema.parse(item));
}

export async function updateSurfaceDispatch(
  id: string,
  payload: { projectName?: string; sentAt?: string; notes?: string; status?: "PENDING" | "COMPLETED" }
) {
  const response = await httpClient.patch(apiEndpoints.exploraciones.surfaceProposalDispatchById(id), payload);
  return parseOne(response.data, (item) => sampleDispatchSchema.parse(item));
}

export async function deleteSurfaceDispatch(id: string) {
  await httpClient.delete(apiEndpoints.exploraciones.surfaceProposalDispatchById(id));
}
