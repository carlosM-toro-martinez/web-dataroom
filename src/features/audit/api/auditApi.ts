import { getRequest } from "@/shared/api/core/request";
import { httpClient } from "@/shared/api/core/httpClient";
import {
  auditDetailSchema,
  auditFiltersSchema,
  auditListSchema,
  auditSummarySchema,
  auditVerifySchema,
  type AuditFilters
} from "@/features/audit/model/audit.schema";

const base = "/api/audit";

function params(filters: AuditFilters) {
  return Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== undefined && value !== ""));
}

export async function getAuditList(filters: AuditFilters, page: number, limit: number) {
  return (await getRequest({ url: base, config: { params: { ...params(filters), page, limit } }, schema: auditListSchema })).data;
}

export async function getAuditDetail(seq: number) {
  return (await getRequest({ url: `${base}/${seq}`, schema: auditDetailSchema })).data;
}

export async function getAuditFilters() {
  return (await getRequest({ url: `${base}/filters`, schema: auditFiltersSchema })).data;
}

export async function getAuditSummary() {
  return (await getRequest({ url: `${base}/summary`, schema: auditSummarySchema })).data;
}

export async function verifyAuditChain() {
  return (await getRequest({ url: `${base}/verify`, config: { timeout: 120_000 }, schema: auditVerifySchema })).data;
}

// Descarga el CSV con el token de la sesión (un enlace directo no lo llevaría).
export async function downloadAuditCsv(filters: AuditFilters) {
  const response = await httpClient.get(`${base}/export/csv`, { params: params(filters), responseType: "blob", timeout: 120_000 });
  const url = URL.createObjectURL(response.data as Blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `auditoria_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
