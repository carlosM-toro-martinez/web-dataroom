import type { DrillingShiftReport } from "@/features/sondajes/model/sondajes.schema";
import type { QueuedShiftReport, ShiftReportPayload } from "@/features/sondajes/db/sondajesDb";

export type SyncState = "synced" | "pending" | "error";

// Un parte tal como se muestra: venga del servidor o de la cola del dispositivo.
export type ShiftReportView = ShiftReportPayload & {
  key: string;
  holeId: string;
  metersDrilled: number;
  remoteId?: string;
  localId?: string;
  pendingCreate: boolean;
  sync: SyncState;
  syncError?: string;
};


// Fecha del parte en formato YYYY-MM-DD; se guarda a las 00:00 UTC de ese día.
export function reportDateToIso(day: string) {
  return `${day}T00:00:00.000Z`;
}

export function isoToReportDate(iso: string) {
  return iso.slice(0, 10);
}

export function todayInputDate() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

// Se muestra el día tal cual (en UTC) para que no "retroceda" un día por la zona horaria.
export function formatReportDate(iso: string, style: "long" | "short" = "long") {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("es-BO", {
    timeZone: "UTC",
    ...(style === "long" ? { weekday: "short", day: "numeric", month: "short", year: "numeric" } : { day: "2-digit", month: "2-digit", year: "numeric" })
  }).format(date);
}

function fromServer(report: DrillingShiftReport): ShiftReportPayload {
  const text = (value: unknown) => (typeof value === "string" ? value : null);
  return {
    date: report.date,
    shift: report.shift,
    fromDepth: report.fromDepth,
    toDepth: report.toDepth,
    drillingHours: report.drillingHours ?? null,
    standbyHours: report.standbyHours ?? null,
    diameter: text(report.diameter),
    operator: text(report.operator),
    observations: text(report.observations),
    reportNumber: text(report.reportNumber),
    coreRecovery: report.coreRecovery ?? null,
    waterReturn: text(report.waterReturn),
    rockType: text(report.rockType),
    rigName: text(report.rigName),
    coreBoxNumber: text(report.coreBoxNumber),
    drillingMethod: report.drillingMethod ?? null,
    rcDiameter: text(report.rcDiameter),
    casing: text(report.casing),
    crownNumber: text(report.crownNumber),
    reamerNumber: text(report.reamerNumber),
    shoeNumber: text(report.shoeNumber),
    firstHelper: text(report.firstHelper),
    secondHelper: text(report.secondHelper),
    driver: text(report.driver),
    supervisor: text(report.supervisor),
    drillingChief: text(report.drillingChief),
    activities: (report.activities as ShiftReportPayload["activities"]) ?? null,
    consumables: (report.consumables as ShiftReportPayload["consumables"]) ?? null,
    additives: (report.additives as ShiftReportPayload["additives"]) ?? null,
    timeDetail: (report.timeDetail as ShiftReportPayload["timeDetail"]) ?? null,
    incidents: (report.incidents as ShiftReportPayload["incidents"]) ?? null,
    reviewStatus: report.reviewStatus ?? "PENDING",
    reviewedBy: text(report.reviewedBy),
    reviewedAt: text(report.reviewedAt),
    reviewNotes: text(report.reviewNotes)
  };
}

// Payload de un parte ya visible (para editarlo o revisarlo sin perder campos).
export function viewToPayload(view: ShiftReportView): ShiftReportPayload {
  const { key: _key, holeId: _holeId, metersDrilled: _meters, remoteId: _remoteId, localId: _localId, pendingCreate: _pending, sync: _sync, syncError: _error, ...payload } = view;
  return payload;
}

// Siguiente número correlativo de parte para el pozo (el mayor número usado + 1).
export function nextReportNumber(reports: ShiftReportView[]) {
  const numbers = reports.map((report) => Number.parseInt(report.reportNumber ?? "", 10)).filter((value) => Number.isFinite(value));
  return String((numbers.length ? Math.max(...numbers) : 0) + 1);
}

// El último parte del pozo (por fecha y turno): de ahí se copian máquina, diámetro, personal...
export function lastReport(reports: ShiftReportView[]) {
  return reports.filter((report) => report.sync !== "error")[0];
}

export type IncidentView = NonNullable<ShiftReportPayload["incidents"]>[number] & { report: ShiftReportView };

export function collectIncidents(reports: ShiftReportView[]): IncidentView[] {
  return reports.flatMap((report) => (report.incidents ?? []).map((incident) => ({ ...incident, report })));
}

// Lista final de partes de un pozo: lo del servidor + ediciones pendientes + partes nuevos aún sin enviar.
export function mergeShiftReports(holeId: string, server: DrillingShiftReport[], queue: QueuedShiftReport[]): ShiftReportView[] {
  const holeQueue = queue.filter((item) => item.holeId === holeId && !item.synced);
  const editsByRemote = new Map(holeQueue.filter((item) => item.action === "update").map((item) => [item.remoteId, item]));

  const views: ShiftReportView[] = server.map((report) => {
    const edit = editsByRemote.get(report.id);
    const payload = edit ? edit.payload : fromServer(report);
    return {
      ...payload,
      key: report.id,
      holeId,
      metersDrilled: payload.toDepth - payload.fromDepth,
      remoteId: report.id,
      localId: undefined,
      pendingCreate: false,
      sync: edit ? (edit.syncError ? "error" : "pending") : "synced",
      syncError: edit?.syncError
    };
  });

  const serverIds = new Set(server.map((report) => report.id));
  holeQueue
    .filter((item) => item.action === "create" && !serverIds.has(item.localId))
    .forEach((item) => {
      views.push({
        ...item.payload,
        key: item.localId,
        holeId,
        metersDrilled: item.payload.toDepth - item.payload.fromDepth,
        localId: item.localId,
        pendingCreate: true,
        sync: item.syncError ? "error" : "pending",
        syncError: item.syncError
      });
    });

  // Más reciente primero; dentro del mismo día, noche después de día.
  return views.sort((a, b) => {
    const byDate = b.date.localeCompare(a.date);
    if (byDate !== 0) return byDate;
    return a.shift === b.shift ? b.toDepth - a.toDepth : a.shift === "NIGHT" ? -1 : 1;
  });
}

// Los partes rechazados por el servidor no cuentan hasta que se corrigen.
export function summarizeReports(allReports: ShiftReportView[]) {
  const reports = allReports.filter((report) => report.sync !== "error");
  return {
    count: reports.length,
    meters: reports.reduce((sum, report) => sum + report.metersDrilled, 0),
    currentDepth: reports.reduce((max, report) => Math.max(max, report.toDepth), 0),
    drillingHours: reports.reduce((sum, report) => sum + (report.drillingHours ?? 0), 0),
    standbyHours: reports.reduce((sum, report) => sum + (report.standbyHours ?? 0), 0)
  };
}
