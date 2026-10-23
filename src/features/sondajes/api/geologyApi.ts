import { httpClient } from "@/shared/api/core/httpClient";
import { apiEndpoints } from "@/shared/api/endpoints";
import {
  drillingPhotoSchema,
  geologyReportSchema,
  logIntervalSchema,
  type GeologyReportPayload,
  type LogRowPayload,
  type PhotoMeta
} from "@/features/sondajes/model/geology.schema";

const endpoints = apiEndpoints.sondajes;
// Las fotos pesan más que un JSON: más margen en redes lentas del campamento.
const UPLOAD_TIMEOUT = 120_000;

function unwrap(raw: unknown) {
  return raw && typeof raw === "object" && "data" in raw ? (raw as { data: unknown }).data : raw;
}

function list<T>(raw: unknown, parse: (value: unknown) => T): T[] {
  const data = unwrap(raw);
  return Array.isArray(data) ? data.map(parse) : [];
}

// ─── Reporte geológico ───────────────────────────────────────────────────────
export async function getGeologyReports(holeId: string) {
  const response = await httpClient.get(endpoints.holeGeologyReports(holeId));
  return list(response.data, (value) => geologyReportSchema.parse(value));
}

export async function createGeologyReport(holeId: string, payload: GeologyReportPayload & { id: string }) {
  const response = await httpClient.post(endpoints.holeGeologyReports(holeId), payload);
  return geologyReportSchema.parse(unwrap(response.data));
}

export async function updateGeologyReport(id: string, payload: Partial<GeologyReportPayload>) {
  const response = await httpClient.patch(endpoints.geologyReportById(id), payload);
  return geologyReportSchema.parse(unwrap(response.data));
}

export async function deleteGeologyReport(id: string) {
  await httpClient.delete(endpoints.geologyReportById(id));
}

// ─── Logueo ──────────────────────────────────────────────────────────────────
export async function getGeologyLog(holeId: string) {
  const response = await httpClient.get(endpoints.holeGeologyLog(holeId));
  return list(response.data, (value) => logIntervalSchema.parse(value));
}

export async function replaceGeologyLog(holeId: string, rows: LogRowPayload[]) {
  const response = await httpClient.put(endpoints.holeGeologyLog(holeId), { rows }, { timeout: UPLOAD_TIMEOUT });
  return list(response.data, (value) => logIntervalSchema.parse(value));
}

// ─── Fotografías ─────────────────────────────────────────────────────────────
export async function getHolePhotos(holeId: string) {
  const response = await httpClient.get(endpoints.holePhotos(holeId));
  return list(response.data, (value) => drillingPhotoSchema.parse(value));
}

export async function uploadHolePhoto(holeId: string, id: string, meta: PhotoMeta, full: Blob, thumb: Blob) {
  const form = new FormData();
  form.append("id", id);
  for (const [key, value] of Object.entries(meta)) {
    if (value !== null && value !== undefined && value !== "") form.append(key, String(value));
  }
  form.append("file", full, `${id}.jpg`);
  form.append("thumb", thumb, `${id}_thumb.jpg`);
  const response = await httpClient.post(endpoints.holePhotos(holeId), form, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: UPLOAD_TIMEOUT
  });
  return drillingPhotoSchema.parse(unwrap(response.data));
}

export async function updateHolePhoto(id: string, meta: Partial<PhotoMeta>) {
  const { width: _width, height: _height, contentHash: _hash, ...patch } = meta;
  const response = await httpClient.patch(endpoints.photoById(id), patch);
  return drillingPhotoSchema.parse(unwrap(response.data));
}

export async function deleteHolePhoto(id: string) {
  await httpClient.delete(endpoints.photoById(id));
}

export async function fetchPhotoBlob(id: string, variant: "thumb" | "full") {
  const response = await httpClient.get(endpoints.photoFile(id, variant), { responseType: "blob", timeout: UPLOAD_TIMEOUT });
  return response.data as Blob;
}

export type PhotoIntegrity = {
  total: number;
  missingCount: number;
  mediaFolderExists: boolean;
  missing: Array<{ id: string; code: string; hole: string; holeId: string; contentHash: string | null; mimeType: string; createdAt: string; missing: Array<"file" | "thumb"> }>;
};

// Qué fotos tienen registro pero no archivo en el servidor.
export async function getPhotosIntegrity(holeId?: string) {
  const response = await httpClient.get(endpoints.photosIntegrity, { params: holeId ? { holeId } : undefined });
  return (response.data?.data ?? response.data) as PhotoIntegrity;
}

// Devuelve la imagen a un registro de foto que ya existe (se perdió el archivo en el servidor).
export async function restorePhotoFile(id: string, full: Blob, thumb: Blob) {
  const form = new FormData();
  form.append("file", full, `${id}.jpg`);
  form.append("thumb", thumb, `${id}_thumb.jpg`);
  await httpClient.put(endpoints.photoRestore(id), form, { headers: { "Content-Type": "multipart/form-data" }, timeout: UPLOAD_TIMEOUT });
}
