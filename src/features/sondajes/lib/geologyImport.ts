import type { DrillingHole } from "@/features/sondajes/model/sondajes.schema";
import type { GeologyReportPayload } from "@/features/sondajes/model/geology.schema";
import { getGeologyLog, getGeologyReports, getHolePhotos } from "@/features/sondajes/api/geologyApi";
import {
  getCachedGeologyLog,
  getCachedGeologyReports,
  getCachedPhotos,
  getGeologyQueue,
  replaceCachedGeologyLog,
  replaceCachedGeologyReports,
  replaceCachedPhotos
} from "@/features/sondajes/db/geologyDb";
import { isConnectivityIssue } from "@/features/sondajes/services/shiftReportsSync";
import { mergeGeologyLog, mergeGeologyReports, mergePhotos, summarizeLog, type GeologyReportView } from "@/features/sondajes/lib/geology";
import { normalizeHoleCode, type ParsedGeologyWorkbook } from "@/features/sondajes/lib/geologyExcel";
import { reportDateToIso } from "@/features/sondajes/lib/shiftReports";

// ─── ¿A qué pozo pertenece el archivo? ───────────────────────────────────────
// certain = el código del resumen coincide exactamente con un pozo. Si no, se propone uno y hay que confirmarlo:
//  · re-perforación: el resumen dice 26-DLP-077b y existe 26DLP077.
//  · el nombre del archivo es de un pozo existente aunque el resumen diga otra cosa.
export type HoleMatch = { hole: DrillingHole; certain: boolean; reason: string } | null;

export function matchHole(parsed: ParsedGeologyWorkbook, holes: DrillingHole[]): HoleMatch {
  const byCode = new Map(holes.map((hole) => [normalizeHoleCode(hole.code), hole]));
  const summary = parsed.holeCode ? normalizeHoleCode(parsed.holeCode) : null;
  const fromFile = parsed.fileHole ? normalizeHoleCode(parsed.fileHole) : null;

  if (summary && byCode.has(summary)) {
    return { hole: byCode.get(summary)!, certain: true, reason: `Sondaje ${parsed.holeCode}` };
  }
  if (summary && /[A-Z]$/.test(summary) && byCode.has(summary.slice(0, -1))) {
    const hole = byCode.get(summary.slice(0, -1))!;
    return { hole, certain: false, reason: `El resumen dice ${parsed.holeCode} y ese pozo no existe. ¿Es la re-perforación del ${hole.code}?` };
  }
  if (fromFile && byCode.has(fromFile)) {
    const hole = byCode.get(fromFile)!;
    return summary
      ? { hole, certain: false, reason: `El resumen dice ${parsed.holeCode}, pero el nombre del archivo es del ${hole.code}.` }
      : { hole, certain: true, reason: "Según el nombre del archivo" };
  }
  return null;
}

// ─── Lo que ya tiene el pozo (servidor o, sin red, la copia del dispositivo + cambios pendientes) ──
export type HoleGeologyContext = {
  reports: GeologyReportView[];
  loggedTo: number;
  logRows: number;
  photoHashes: Set<string>;
};

async function remoteOrCache<T>(remote: () => Promise<T>, save: (value: T) => Promise<void>, cache: () => Promise<T>) {
  try {
    const value = await remote();
    await save(value).catch(() => undefined);
    return value;
  } catch (error) {
    if (isConnectivityIssue(error)) return cache();
    throw error;
  }
}

export async function loadHoleGeologyContext(holeId: string): Promise<HoleGeologyContext> {
  const [reports, rows, photos, queue] = await Promise.all([
    remoteOrCache(() => getGeologyReports(holeId), (value) => replaceCachedGeologyReports(holeId, value), () => getCachedGeologyReports(holeId)),
    remoteOrCache(() => getGeologyLog(holeId), (value) => replaceCachedGeologyLog(holeId, value), () => getCachedGeologyLog(holeId)),
    remoteOrCache(() => getHolePhotos(holeId), (value) => replaceCachedPhotos(holeId, value), () => getCachedPhotos(holeId)),
    getGeologyQueue()
  ]);
  const log = mergeGeologyLog(holeId, rows, queue);
  const summary = summarizeLog(log.rows);
  return {
    reports: mergeGeologyReports(holeId, reports, queue),
    loggedTo: summary.loggedTo,
    logRows: summary.intervals,
    photoHashes: new Set(mergePhotos(holeId, photos, queue).map((photo) => photo.contentHash).filter((hash): hash is string => Boolean(hash)))
  };
}

// ─── Reporte del día tal cual la hoja 01_RESUMEN ─────────────────────────────
export function reportFromWorkbook(parsed: ParsedGeologyWorkbook): GeologyReportPayload | null {
  if (!parsed.date || parsed.fromDepth === null || parsed.toDepth === null || parsed.toDepth < parsed.fromDepth) return null;
  return {
    date: reportDateToIso(parsed.date),
    fromDepth: parsed.fromDepth,
    toDepth: parsed.toDepth,
    plannedEast: parsed.plannedEast,
    plannedNorth: parsed.plannedNorth,
    plannedElevation: parsed.plannedElevation,
    executedEast: parsed.executedEast,
    executedNorth: parsed.executedNorth,
    executedElevation: parsed.executedElevation,
    rigName: parsed.rigName,
    diameter: parsed.diameter,
    casing: parsed.casing,
    azimuth: parsed.azimuth,
    dip: parsed.dip,
    programmedDepth: parsed.programmedDepth,
    startDate: parsed.startDate ? reportDateToIso(parsed.startDate) : null,
    endStatus: parsed.endStatus,
    geologists: parsed.geologists,
    geologySummary: parsed.geologySummary,
    operationalNotes: parsed.operationalNotes
  };
}

export const logReach = (parsed: ParsedGeologyWorkbook) => parsed.logRows.reduce((max, row) => Math.max(max, row.toDepth), 0);
