import type { GeologyQueueItem } from "@/features/sondajes/db/sondajesDb";
import type {
  DrillingPhoto,
  GeologyReport,
  GeologyReportPayload,
  LogInterval,
  LogRowPayload,
  PhotoKind,
  PhotoMeta
} from "@/features/sondajes/model/geology.schema";
import type { SyncState } from "@/features/sondajes/lib/shiftReports";

// ─── Vistas (servidor + cambios pendientes del dispositivo) ──────────────────
export type GeologyReportView = GeologyReportPayload & {
  id: string;
  holeId: string;
  pendingCreate: boolean;
  sync: SyncState;
  syncError?: string;
};

export type PhotoView = PhotoMeta & {
  id: string;
  // null mientras la foto solo está en el dispositivo: el código lo asigna el servidor al subirla.
  code: string | null;
  holeId: string;
  pendingCreate: boolean;
  sync: SyncState;
  syncError?: string;
  sizeBytes?: number;
};

function reportPayload(report: GeologyReport): GeologyReportPayload {
  return {
    date: report.date,
    fromDepth: report.fromDepth,
    toDepth: report.toDepth,
    plannedEast: report.plannedEast ?? null,
    plannedNorth: report.plannedNorth ?? null,
    plannedElevation: report.plannedElevation ?? null,
    executedEast: report.executedEast ?? null,
    executedNorth: report.executedNorth ?? null,
    executedElevation: report.executedElevation ?? null,
    rigName: report.rigName ?? null,
    diameter: report.diameter ?? null,
    casing: report.casing ?? null,
    azimuth: report.azimuth ?? null,
    dip: report.dip ?? null,
    programmedDepth: report.programmedDepth ?? null,
    startDate: report.startDate ?? null,
    endStatus: report.endStatus ?? null,
    geologists: report.geologists ?? null,
    geologySummary: report.geologySummary ?? null,
    operationalNotes: report.operationalNotes ?? null
  };
}

const syncOf = (item?: { syncError?: string }): SyncState => (item ? (item.syncError ? "error" : "pending") : "synced");

export function mergeGeologyReports(holeId: string, server: GeologyReport[], queue: GeologyQueueItem[]): GeologyReportView[] {
  const items = queue.filter((item) => item.holeId === holeId && item.kind === "report");
  const updates = new Map(items.filter((item) => item.action === "update").map((item) => [item.targetId, item]));
  const views: GeologyReportView[] = server.map((report) => {
    const edit = updates.get(report.id);
    return {
      ...(edit && edit.kind === "report" ? edit.payload : reportPayload(report)),
      id: report.id,
      holeId,
      pendingCreate: false,
      sync: syncOf(edit),
      syncError: edit?.syncError
    };
  });
  const serverIds = new Set(server.map((report) => report.id));
  items
    .filter((item) => item.action === "create" && !serverIds.has(item.targetId))
    .forEach((item) => {
      if (item.kind !== "report") return;
      views.push({ ...item.payload, id: item.targetId, holeId, pendingCreate: true, sync: syncOf(item), syncError: item.syncError });
    });
  return views.sort((a, b) => b.date.localeCompare(a.date) || b.toDepth - a.toDepth);
}

export function viewToReportPayload(view: GeologyReportView): GeologyReportPayload {
  const { id: _id, holeId: _holeId, pendingCreate: _pending, sync: _sync, syncError: _error, ...payload } = view;
  return payload;
}

export type LogState = { rows: LogInterval[]; sync: SyncState; syncError?: string };

// Si hay una versión del logueo sin enviar, es la que manda.
export function mergeGeologyLog(holeId: string, server: LogInterval[], queue: GeologyQueueItem[]): LogState {
  const pending = queue.find((item) => item.holeId === holeId && item.kind === "log");
  if (pending && pending.kind === "log") {
    return { rows: sortRows(pending.payload.rows), sync: syncOf(pending), syncError: pending.syncError };
  }
  return { rows: sortRows(server), sync: "synced" };
}

function photoMeta(photo: DrillingPhoto): PhotoMeta {
  return {
    kind: photo.kind,
    reportId: photo.reportId ?? null,
    caption: photo.caption ?? null,
    boxFrom: photo.boxFrom ?? null,
    boxTo: photo.boxTo ?? null,
    fromDepth: photo.fromDepth ?? null,
    toDepth: photo.toDepth ?? null,
    takenAt: photo.takenAt ?? null,
    width: photo.width ?? null,
    height: photo.height ?? null,
    contentHash: photo.contentHash ?? null
  };
}

export function mergePhotos(holeId: string, server: DrillingPhoto[], queue: GeologyQueueItem[]): PhotoView[] {
  const items = queue.filter((item) => item.holeId === holeId && item.kind === "photo");
  const updates = new Map(items.filter((item) => item.action === "update").map((item) => [item.targetId, item]));
  const views: PhotoView[] = server.map((photo) => {
    const edit = updates.get(photo.id);
    return {
      ...photoMeta(photo),
      ...(edit && edit.kind === "photo" ? edit.payload : {}),
      id: photo.id,
      code: photo.code ?? null,
      holeId,
      sizeBytes: photo.sizeBytes,
      pendingCreate: false,
      sync: syncOf(edit),
      syncError: edit?.syncError
    };
  });
  const serverIds = new Set(server.map((photo) => photo.id));
  items
    .filter((item) => item.action === "create" && !serverIds.has(item.targetId))
    .forEach((item) => {
      if (item.kind !== "photo") return;
      views.push({ ...item.payload, id: item.targetId, code: null, holeId, pendingCreate: true, sync: syncOf(item), syncError: item.syncError });
    });
  return views;
}

// ─── Logueo ──────────────────────────────────────────────────────────────────
export function sortRows<T extends { fromDepth: number; toDepth: number }>(rows: T[]) {
  return [...rows].sort((a, b) => a.fromDepth - b.fromDepth || a.toDepth - b.toDepth);
}

const LOG_FIELDS = [
  "fromDepth",
  "toDepth",
  "dataSet",
  "lithology",
  "texture",
  "support",
  "alteration1",
  "alteration1Int",
  "alteration2",
  "alteration2Int",
  "minerals",
  "structures",
  "description",
  "loggedBy",
  "loggedAt"
] as const;

// Solo los campos que acepta la API (la fila del servidor trae id, fechas de auditoría, etc.).
export function toLogPayload(row: LogInterval): LogRowPayload {
  const out: Record<string, unknown> = {};
  for (const key of LOG_FIELDS) if (row[key] !== undefined) out[key] = row[key];
  return out as LogRowPayload;
}

// Control de calidad del logueo (solo avisa: los datos se guardan tal cual vienen del Excel).
// Solape: un tramo empieza antes de que termine otro anterior. Hueco: metros sin ningún tramo.
export type LogIssue = { type: "overlap" | "gap"; from: number; to: number; message: string };

export function findLogIssues(rows: Array<{ fromDepth: number; toDepth: number }>): LogIssue[] {
  const issues: LogIssue[] = [];
  let reach: { fromDepth: number; toDepth: number } | null = null;
  for (const row of sortRows(rows)) {
    if (reach) {
      if (row.fromDepth < reach.toDepth - 1e-6) {
        issues.push({
          type: "overlap",
          from: row.fromDepth,
          to: Math.min(reach.toDepth, row.toDepth),
          message: `Solape: ${fmt(reach.fromDepth)}–${fmt(reach.toDepth)} m y ${fmt(row.fromDepth)}–${fmt(row.toDepth)} m`
        });
      } else if (row.fromDepth > reach.toDepth + 1e-6) {
        issues.push({ type: "gap", from: reach.toDepth, to: row.fromDepth, message: `Hueco: sin logueo entre ${fmt(reach.toDepth)} y ${fmt(row.fromDepth)} m` });
      }
    }
    if (!reach || row.toDepth > reach.toDepth) reach = row;
  }
  return issues;
}

export function summarizeLog(rows: LogInterval[]) {
  return {
    intervals: rows.length,
    loggedTo: rows.reduce((max, row) => Math.max(max, row.toDepth), 0)
  };
}

export const fmt = (value: number) => value.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ─── Diccionario de códigos del quick log (equipo de geología) ───────────────
// Colores de la leyenda "LITOLOGY-COD" de la sección geológica.
export const LITHOLOGY: Record<string, { label: string; color: string }> = {
  ct: { label: "Toba cristalina", color: "#f59e0b" },
  lt: { label: "Toba lítica", color: "#facc15" },
  dc: { label: "dc", color: "#6b7a3a" },
  flt: { label: "Zona de falla", color: "#d946ef" },
  ov: { label: "ov", color: "#f9a8d4" },
  PBLBX: { label: "Brecha PBLBX", color: "#c026d3" },
  QTBx: { label: "Brecha cuarzo-turmalínica", color: "#4f46e5" },
  QTB: { label: "Brecha cuarzo-turmalínica", color: "#4f46e5" }
};

// Códigos sin color oficial (QTTBx, ob…): un color fijo derivado del propio código, para distinguirlos en la columna.
export function lithologyColor(code?: string | null) {
  if (!code) return "#94a3b8";
  const known = LITHOLOGY[code]?.color ?? LITHOLOGY[code.trim()]?.color;
  if (known) return known;
  let hash = 0;
  for (const char of code.trim()) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return `hsl(${hash % 360} 55% 55%)`;
}

export const ALTERATIONS: Record<string, string> = {
  Arg: "Argílica",
  Sil: "Silícica",
  Ser: "Sericítica",
  Prop: "Propilítica",
  Ox: "Oxidación"
};

export const MINERALS: Record<string, string> = {
  Py: "Pirita",
  Spc: "Especularita",
  Hm: "Hematita",
  Lm: "Limonita",
  FeOx: "Óxidos de Fe",
  Mar: "Marcasita",
  Sid: "Siderita",
  Qz: "Cuarzo"
};

export const MINERAL_STYLES: Record<string, string> = {
  DISS: "Diseminado",
  VNLET: "Vetillas",
  VEIN: "Veta",
  CAV: "Cavidades",
  STKW: "Stockwork"
};

export const TEXTURES: Record<string, string> = {
  APH: "Afanítica",
  LAP: "Lapilli",
  FRAG: "Fragmental",
  CRK: "Craquelada",
  BAND: "Bandeada"
};

export const SUPPORTS: Record<string, string> = {
  MTRX: "Matriz",
  CLAST: "Clastos",
  MIX: "Mixto",
  NA: "No aplica"
};

export const STRUCTURES: Record<string, string> = { Fa: "Falla" };

// Cada tipo es un lugar del Excel: la hoja de resumen, la memoria fotográfica y la sección geológica.
export const PHOTO_KINDS: Record<PhotoKind, { label: string; hint: string }> = {
  DETAIL: { label: "Fotografía representativa", hint: "Hoja 01_RESUMEN · 4. Evidencia geológica y fotográfica." },
  CORE_BOX: { label: "Memoria fotográfica", hint: "Hoja 03_FOTOGRAFIAS · Memoria fotográfica de testigos." },
  SECTION: { label: "Sección geológica", hint: "Hoja 04_SECCION_GEOLOGICA · Sección geológica acumulada." },
  OTHER: { label: "Otra", hint: "" }
};

export const label = (dictionary: Record<string, string>, code?: string | null) =>
  code ? dictionary[code] ?? code : "";
