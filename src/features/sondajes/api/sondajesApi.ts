import { httpClient } from "@/shared/api/core/httpClient";
import { apiEndpoints } from "@/shared/api/endpoints";
import {
  drillingCampaignSchema,
  drillingCatalogSchema,
  drillingDispatchSchema,
  drillingHoleSchema,
  drillingSampleSchema,
  drillingShiftReportSchema,
  drillingSummarySchema
} from "@/features/sondajes/model/sondajes.schema";

const endpoints = apiEndpoints.sondajes;

// Respuestas del backend: { success, data } y en listados { success, data: { data, meta } }.
function unwrapData(raw: unknown) {
  return raw && typeof raw === "object" && "data" in raw ? (raw as { data: unknown }).data : raw;
}

function parseList<T>(raw: unknown, parser: (value: unknown) => T) {
  const root = unwrapData(raw);
  const nested = unwrapData(root);
  const list = Array.isArray(nested) ? nested : Array.isArray(root) ? root : [];
  return list.map(parser);
}

function parseOne<T>(raw: unknown, parser: (value: unknown) => T) {
  return parser(unwrapData(raw));
}

type ListParams = Record<string, string | number | undefined>;

function cleanParams(params?: ListParams) {
  if (!params) return undefined;
  return Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== ""));
}

export async function getDrillingSummary() {
  const response = await httpClient.get(endpoints.summary);
  return parseOne(response.data, (value) => drillingSummarySchema.parse(value));
}

// ─── Catálogos ───────────────────────────────────────────────────────────────
export async function getDrillingContractors(params?: ListParams) {
  const response = await httpClient.get(endpoints.contractors, { params: cleanParams(params) });
  return parseList(response.data, (value) => drillingCatalogSchema.parse(value));
}

export async function getDrillingRigs(params?: ListParams) {
  const response = await httpClient.get(endpoints.rigs, { params: cleanParams(params) });
  return parseList(response.data, (value) => drillingCatalogSchema.parse(value));
}

export async function getDrillingLaboratories(params?: ListParams) {
  const response = await httpClient.get(endpoints.laboratories, { params: cleanParams(params) });
  return parseList(response.data, (value) => drillingCatalogSchema.parse(value));
}

// ─── Campañas y pozos ────────────────────────────────────────────────────────
export async function getDrillingCampaigns(params?: ListParams) {
  const response = await httpClient.get(endpoints.campaigns, { params: cleanParams(params) });
  return parseList(response.data, (value) => drillingCampaignSchema.parse(value));
}

export async function createDrillingCampaign(payload: Record<string, unknown>) {
  const response = await httpClient.post(endpoints.campaigns, payload);
  return parseOne(response.data, (value) => drillingCampaignSchema.parse(value));
}

export async function updateDrillingCampaign(id: string, payload: Record<string, unknown>) {
  const response = await httpClient.patch(endpoints.campaignById(id), payload);
  return parseOne(response.data, (value) => drillingCampaignSchema.parse(value));
}

export async function deleteDrillingCampaign(id: string) {
  await httpClient.delete(endpoints.campaignById(id));
}

export async function getDrillingHoles(params?: ListParams) {
  const response = await httpClient.get(endpoints.holes, { params: cleanParams(params) });
  return parseList(response.data, (value) => drillingHoleSchema.parse(value));
}

export async function getDrillingHole(id: string) {
  const response = await httpClient.get(endpoints.holeById(id));
  return parseOne(response.data, (value) => drillingHoleSchema.parse(value));
}

export async function createDrillingHole(payload: Record<string, unknown>) {
  const response = await httpClient.post(endpoints.holes, payload);
  return parseOne(response.data, (value) => drillingHoleSchema.parse(value));
}

export async function updateDrillingHole(id: string, payload: Record<string, unknown>) {
  const response = await httpClient.patch(endpoints.holeById(id), payload);
  return parseOne(response.data, (value) => drillingHoleSchema.parse(value));
}

export async function deleteDrillingHole(id: string) {
  await httpClient.delete(endpoints.holeById(id));
}

export async function importDrillingHoles(payload: { campaignId: string; holes: Array<Record<string, unknown>> }) {
  const response = await httpClient.post(endpoints.holesImport, payload);
  return unwrapData(response.data) as { created: number };
}

// ─── Registros del pozo ──────────────────────────────────────────────────────
export async function getDrillingShiftReports(holeId: string) {
  const response = await httpClient.get(endpoints.holeShiftReports(holeId));
  return parseList(response.data, (value) => drillingShiftReportSchema.parse(value));
}

export async function createDrillingShiftReport(holeId: string, payload: Record<string, unknown>) {
  const response = await httpClient.post(endpoints.holeShiftReports(holeId), payload);
  return parseOne(response.data, (value) => drillingShiftReportSchema.parse(value));
}

export async function updateDrillingShiftReport(id: string, payload: Record<string, unknown>) {
  const response = await httpClient.patch(endpoints.shiftReportById(id), payload);
  return parseOne(response.data, (value) => drillingShiftReportSchema.parse(value));
}

export async function deleteDrillingShiftReport(id: string) {
  await httpClient.delete(endpoints.shiftReportById(id));
}

export async function getDrillingHoleSamples(holeId: string) {
  const response = await httpClient.get(endpoints.holeSamples(holeId));
  return parseList(response.data, (value) => drillingSampleSchema.parse(value));
}

export async function createDrillingSample(holeId: string, payload: Record<string, unknown>) {
  const response = await httpClient.post(endpoints.holeSamples(holeId), payload);
  return parseOne(response.data, (value) => drillingSampleSchema.parse(value));
}

// ─── Lotes ───────────────────────────────────────────────────────────────────
export async function getDrillingDispatches(params?: ListParams) {
  const response = await httpClient.get(endpoints.dispatches, { params: cleanParams(params) });
  return parseList(response.data, (value) => drillingDispatchSchema.parse(value));
}

export async function createDrillingDispatch(payload: {
  laboratoryId: string;
  projectName?: string;
  sentAt: string;
  notes?: string;
  items: Array<{ sampleId: string; elementIds: string[]; notes?: string }>;
}) {
  const response = await httpClient.post(endpoints.dispatches, payload);
  return parseOne(response.data, (value) => drillingDispatchSchema.parse(value));
}
