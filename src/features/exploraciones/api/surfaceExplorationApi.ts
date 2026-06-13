import { httpClient } from "@/shared/api/core/httpClient";
import { apiEndpoints } from "@/shared/api/endpoints";
import {
  elementSchema,
  laboratorySchema,
  laboratorySlotSchema,
  miningAreaSchema,
  miningLaborSchema,
  miningLevelSchema,
  sampleLaboratorySchema,
  sampleQaqcSchema,
  sampleResultSchema,
  sampleSchema,
  sampleTypeSchema
} from "@/features/exploraciones/model/surfaceExploration.schema";
import { z } from "zod";

function normalizeListResponse<T>(raw: unknown, parser: (value: unknown) => T): T[] {
  const root = raw && typeof raw === "object" && "data" in raw ? (raw as { data: unknown }).data : raw;
  const candidates: unknown[] = [
    root,
    root && typeof root === "object" && "items" in root ? (root as { items?: unknown }).items : undefined,
    root && typeof root === "object" && "rows" in root ? (root as { rows?: unknown }).rows : undefined,
    root && typeof root === "object" && "data" in root ? (root as { data?: unknown }).data : undefined
  ];
  const listRaw = candidates.find((item) => Array.isArray(item));
  return Array.isArray(listRaw) ? listRaw.map(parser) : [];
}

function buildParams(params?: Record<string, string | number | boolean | undefined>) {
  if (!params) return undefined;
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== "")
  );
  return Object.keys(clean).length ? clean : undefined;
}

export const getMiningAreas = async (params?: { search?: string; page?: number; limit?: number }) => {
  const response = await httpClient.get(apiEndpoints.exploraciones.miningAreas, { params: buildParams(params) });
  return normalizeListResponse(response.data, (item) => miningAreaSchema.parse(item));
};

export const getMiningLevels = async (params?: { miningAreaId?: string; page?: number; limit?: number }) => {
  const response = await httpClient.get(apiEndpoints.exploraciones.miningLevels, { params: buildParams(params) });
  return normalizeListResponse(response.data, (item) => miningLevelSchema.parse(item));
};

export const getMiningLabors = async (params?: { miningLevelId?: string; page?: number; limit?: number }) => {
  const response = await httpClient.get(apiEndpoints.exploraciones.miningLabors, { params: buildParams(params) });
  return normalizeListResponse(response.data, (item) => miningLaborSchema.parse(item));
};

export const getSurfaceSamples = async (params?: { miningLaborId?: string; page?: number; limit?: number }) => {
  const response = await httpClient.get(apiEndpoints.exploraciones.surfaceSamples, { params: buildParams(params) });
  return normalizeListResponse(response.data, (item) => sampleSchema.parse(item));
};

export const getSurfaceLaboratories = async (params?: { page?: number; limit?: number }) => {
  const response = await httpClient.get(apiEndpoints.exploraciones.surfaceLaboratories, { params: buildParams(params) });
  return normalizeListResponse(response.data, (item) => laboratorySchema.parse(item));
};

export const getSampleLaboratories = async (params?: { sampleId?: string; laboratoryId?: string; page?: number; limit?: number }) => {
  const response = await httpClient.get(apiEndpoints.exploraciones.sampleLaboratories, { params: buildParams(params) });
  return normalizeListResponse(response.data, (item) => sampleLaboratorySchema.parse(item));
};

export const getSurfaceElements = async (params?: { page?: number; limit?: number }) => {
  const response = await httpClient.get(apiEndpoints.exploraciones.surfaceElements, { params: buildParams(params) });
  return normalizeListResponse(response.data, (item) => elementSchema.parse(item));
};

export const getSampleResults = async (params?: { sampleId?: string; sampleLaboratoryId?: string; elementId?: string; page?: number; limit?: number }) => {
  const response = await httpClient.get(apiEndpoints.exploraciones.sampleResults, { params: buildParams(params) });
  return normalizeListResponse(response.data, (item) => sampleResultSchema.parse(item));
};

export const getSampleQaqc = async (params?: { sampleId?: string; page?: number; limit?: number }) => {
  const response = await httpClient.get(apiEndpoints.exploraciones.sampleQaqc, { params: buildParams(params) });
  return normalizeListResponse(response.data, (item) => sampleQaqcSchema.parse(item));
};

export const createMiningArea = async (payload: { name: string; abbreviation?: string; description?: string }) => {
  const response = await httpClient.post(apiEndpoints.exploraciones.miningAreas, payload);
  return miningAreaSchema.parse(response.data?.data ?? response.data);
};

export const createMiningLevel = async (payload: { miningAreaId: string; name: string; abbreviation?: string; elevation?: number; description?: string }) => {
  const response = await httpClient.post(apiEndpoints.exploraciones.miningLevels, payload);
  return miningLevelSchema.parse(response.data?.data ?? response.data);
};

export const createMiningLabor = async (payload: { miningLevelId: string; name: string; abbreviation?: string; code?: string; description?: string }) => {
  const response = await httpClient.post(apiEndpoints.exploraciones.miningLabors, payload);
  return miningLaborSchema.parse(response.data?.data ?? response.data);
};

export const createSurfaceSample = async (payload: {
  miningLaborId: string;
  number?: number;
  sampledAt?: string;
  name?: string;
  sampleType?: z.infer<typeof sampleTypeSchema>;
  code: string;
  placeReference?: string;
  east?: number;
  north?: number;
  elevation?: number;
  description?: string;
  observations?: string;
}) => {
  const response = await httpClient.post(apiEndpoints.exploraciones.surfaceSamples, payload);
  return sampleSchema.parse(response.data?.data ?? response.data);
};

export const createSurfaceSampleWithResults = async (payload: {
  miningLaborId: string;
  code: string;
  number?: number;
  sampledAt?: string;
  name?: string;
  sampleType?: z.infer<typeof sampleTypeSchema>;
  placeReference?: string;
  east?: number;
  north?: number;
  elevation?: number;
  description?: string;
  observations?: string;
  results?: Array<{
    elementId: string;
    value?: number;
    unit?: string;
    qualifier?: string;
    sampleLaboratoryId?: string;
    sourceColumn?: string;
    comments?: string;
  }>;
  qaqcRecords?: Array<{
    type: string;
    passed?: boolean;
    expectedValue?: number;
    obtainedValue?: number;
    deviationPercent?: number;
    comments?: string;
  }>;
}) => {
  const response = await httpClient.post(apiEndpoints.exploraciones.surfaceSamplesWithResults, payload);
  return sampleSchema.parse(response.data?.data ?? response.data);
};

export const createSurfaceLaboratory = async (payload: { name: string; abbreviation?: string; description?: string }) => {
  const response = await httpClient.post(apiEndpoints.exploraciones.surfaceLaboratories, payload);
  return laboratorySchema.parse(response.data?.data ?? response.data);
};

export const createSampleLaboratory = async (payload: {
  sampleId: string;
  laboratoryId: string;
  slot: z.infer<typeof laboratorySlotSchema>;
}) => {
  const response = await httpClient.post(apiEndpoints.exploraciones.sampleLaboratories, payload);
  return sampleLaboratorySchema.parse(response.data?.data ?? response.data);
};

export const createSurfaceElement = async (payload: { name: string; symbol: string; defaultUnit?: string; description?: string }) => {
  const response = await httpClient.post(apiEndpoints.exploraciones.surfaceElements, payload);
  return elementSchema.parse(response.data?.data ?? response.data);
};

export const createSampleResult = async (payload: {
  sampleId: string;
  sampleLaboratoryId?: string;
  elementId: string;
  value?: number;
  qualifier?: string;
  unit?: string;
  sourceColumn?: string;
  comments?: string;
}) => {
  const response = await httpClient.post(apiEndpoints.exploraciones.sampleResults, payload);
  return sampleResultSchema.parse(response.data?.data ?? response.data);
};

export const createSampleQaqc = async (payload: {
  sampleId: string;
  type: string;
  passed?: boolean;
  expectedValue?: number;
  obtainedValue?: number;
  deviationPercent?: number;
  comments?: string;
}) => {
  const response = await httpClient.post(apiEndpoints.exploraciones.sampleQaqc, payload);
  return sampleQaqcSchema.parse(response.data?.data ?? response.data);
};
