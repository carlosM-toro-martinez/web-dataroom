import { httpClient } from "@/shared/api/core/httpClient";
import { apiEndpoints } from "@/shared/api/endpoints";

export type SampleCodeModule = "interior" | "surface";
export type SampleCodeCategory = "EXPLORATION" | "PRODUCTION";

export type SampleCodeRecord = {
  id: string;
  module: SampleCodeModule;
  category: SampleCodeCategory;
  code: string;
  sequentialNumber: number;
  name: string | null;
  createdAt: string;
};

export type DuplicateSampleCodeGroup = {
  code: string;
  count: number;
  samples: SampleCodeRecord[];
};

export type DuplicateSampleCodeReport = {
  duplicateCount: number;
  affectedSampleCount: number;
  duplicates: DuplicateSampleCodeGroup[];
};

export type SampleCodeCorrection = SampleCodeRecord & {
  previousCode: string;
  previousSequentialNumber: number;
  nextCode: string;
  nextSequentialNumber: number;
};

export type RepairSampleCodesResult = {
  duplicatesBefore: DuplicateSampleCodeReport;
  corrected: SampleCodeCorrection[];
  correctedCount: number;
};

export async function getDuplicateSampleCodes() {
  const response = await httpClient.get<{ data: DuplicateSampleCodeReport }>(apiEndpoints.exploraciones.sampleCodeDuplicates);
  return response.data.data;
}

export async function repairSampleCodes() {
  const response = await httpClient.post<{ data: RepairSampleCodesResult }>(apiEndpoints.exploraciones.sampleCodeRepair);
  return response.data.data;
}
