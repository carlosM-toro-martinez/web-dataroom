import { read, utils, writeFile } from "xlsx";
import type { DrillingHole, DrillingShiftReport } from "@/features/sondajes/model/sondajes.schema";
import { getDrillingRigs, getDrillingShiftReports } from "@/features/sondajes/api/sondajesApi";
import { formatReportDate, isoToReportDate } from "@/features/sondajes/lib/shiftReports";

// Respaldo de partes diarios de perforación en Excel.
//  - Exportar: un parte por fila, con columnas legibles y una columna «Datos» con el parte completo
//    (actividades, consumibles, aditivos, horas, incidentes…).
//  - Importar: solo se cargan los partes que faltan en este sistema; los que ya están se omiten.
//    Se reconoce el pozo por su código y un parte como «ya existe» por su id o por pozo + fecha + turno.

const DATA_COLUMN = "Datos (no editar)";
const SHEET = "Partes";
const FORMAT = "partes-perforacion-v1";

// Campos que acepta la API al crear un parte (el resto lo calcula el servidor).
const PAYLOAD_KEYS = [
  "date", "shift", "fromDepth", "toDepth", "drillingHours", "standbyHours", "diameter", "operator", "observations",
  "reportNumber", "coreRecovery", "waterReturn", "rockType", "rigName", "coreBoxNumber", "drillingMethod", "rcDiameter",
  "casing", "crownNumber", "reamerNumber", "shoeNumber", "firstHelper", "secondHelper", "driver", "supervisor",
  "drillingChief", "activities", "consumables", "additives", "timeDetail", "incidents", "reviewStatus", "reviewedBy",
  "reviewedAt", "reviewNotes"
] as const;

type BackupRecord = { format: string; id: string; holeCode: string; rigCode: string | null; payload: Record<string, unknown> };

export const SHIFT_NAME: Record<string, string> = { DAY: "Turno A", NIGHT: "Turno B" };
// Solo para mostrar: el parte guarda la profundidad exacta (en «Datos» va sin redondear).
export const roundDepth = (value: number) => Math.round(value * 100) / 100;

const order = (a: { date: string; shift: string }, b: { date: string; shift: string }) =>
  a.date.localeCompare(b.date) || (a.shift === b.shift ? 0 : a.shift === "DAY" ? -1 : 1);

function toRecord(hole: DrillingHole, report: DrillingShiftReport): BackupRecord {
  const source = report as Record<string, unknown>;
  const payload: Record<string, unknown> = {};
  for (const key of PAYLOAD_KEYS) if (source[key] !== undefined && source[key] !== null) payload[key] = source[key];
  const rig = source.rig as { code?: string } | null | undefined;
  return { format: FORMAT, id: report.id, holeCode: hole.code, rigCode: rig?.code ?? null, payload };
}

// ─── Exportar ────────────────────────────────────────────────────────────────
export async function exportShiftReports(holes: DrillingHole[], onProgress?: (done: number, total: number) => void) {
  const rows: Array<Record<string, unknown>> = [];
  const sorted = [...holes].sort((a, b) => a.code.localeCompare(b.code, "es", { numeric: true }));
  for (const [index, hole] of sorted.entries()) {
    onProgress?.(index, sorted.length);
    const reports = (await getDrillingShiftReports(hole.id)).sort(order);
    for (const report of reports) {
      rows.push({
        Pozo: hole.code,
        "Parte No.": report.reportNumber ?? "",
        Fecha: formatReportDate(report.date, "short"),
        Turno: SHIFT_NAME[report.shift] ?? report.shift,
        "De (m)": roundDepth(report.fromDepth),
        "A (m)": roundDepth(report.toDepth),
        Metros: roundDepth(report.metersDrilled),
        Perforista: report.operator ?? "",
        Equipo: report.rigName ?? "",
        Observaciones: report.observations ?? "",
        [DATA_COLUMN]: JSON.stringify(toRecord(hole, report))
      });
    }
  }
  onProgress?.(sorted.length, sorted.length);
  const sheet = utils.json_to_sheet(rows);
  sheet["!cols"] = [{ wch: 12 }, { wch: 9 }, { wch: 12 }, { wch: 9 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 22 }, { wch: 12 }, { wch: 40 }, { wch: 30 }];
  const help = utils.aoa_to_sheet([
    ["Respaldo de partes diarios de perforación"],
    [],
    ["1. Puedes borrar filas completas de la hoja «Partes» si no quieres cargarlas."],
    ["2. No modifiques la columna «Datos (no editar)»: ahí va el parte completo (actividades, consumibles, incidentes…)."],
    ["3. Al importar, el sistema carga solo los partes que le faltan; los que ya tiene se omiten."],
    [],
    [`Exportado el ${new Date().toLocaleString("es-BO")} · ${rows.length} parte(s)`]
  ]);
  help["!cols"] = [{ wch: 110 }];
  const book = utils.book_new();
  utils.book_append_sheet(book, sheet, SHEET);
  utils.book_append_sheet(book, help, "Léeme");
  const stamp = new Date().toISOString().slice(0, 10);
  writeFile(book, `Partes_perforacion_${stamp}.xlsx`);
  return rows.length;
}

// ─── Importar: leer y comparar con lo que ya hay ─────────────────────────────
export type BackupRowStatus = "new" | "exists" | "error";
export type BackupRow = {
  excelRow: number;
  holeCode: string;
  hole: DrillingHole | null;
  id: string | null;
  payload: Record<string, unknown> | null;
  rigCode: string | null;
  date: string;
  shift: string;
  reportNumber: string;
  fromDepth: number | null;
  toDepth: number | null;
  status: BackupRowStatus;
  reason?: string;
  warning?: string;
};

export async function readBackupFile(file: File): Promise<Array<{ excelRow: number; record: BackupRecord | null; error?: string }>> {
  const book = read(await file.arrayBuffer());
  const sheet = book.Sheets[SHEET] ?? book.Sheets[book.SheetNames[0]];
  const rows = utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  if (!rows.length || !(DATA_COLUMN in rows[0])) {
    throw new Error(`El archivo no es un respaldo de partes: falta la columna «${DATA_COLUMN}». Usa un Excel generado con «Exportar partes».`);
  }
  return rows.map((row, index) => {
    const excelRow = index + 2;
    try {
      const record = JSON.parse(String(row[DATA_COLUMN])) as BackupRecord;
      if (record.format !== FORMAT || !record.holeCode || !record.payload?.date) throw new Error();
      return { excelRow, record };
    } catch {
      return { excelRow, record: null, error: "La columna «Datos» está vacía o fue modificada." };
    }
  });
}

const sameCode = (a: string, b: string) => a.replace(/[\s-]/g, "").toUpperCase() === b.replace(/[\s-]/g, "").toUpperCase();

export async function planBackupImport(file: File, holes: DrillingHole[]) {
  const parsed = await readBackupFile(file);
  const holeByCode = (code: string) => holes.find((hole) => sameCode(hole.code, code)) ?? null;
  const involved = [...new Set(parsed.map((item) => item.record && holeByCode(item.record.holeCode)).filter((hole): hole is DrillingHole => Boolean(hole)))];
  const existing = new Map<string, DrillingShiftReport[]>();
  for (const hole of involved) existing.set(hole.id, await getDrillingShiftReports(hole.id));

  const seen = new Set<string>();
  const rows: BackupRow[] = parsed.map(({ excelRow, record, error }) => {
    const empty = { excelRow, holeCode: "", hole: null, id: null, payload: null, rigCode: null, date: "", shift: "", reportNumber: "", fromDepth: null, toDepth: null };
    if (!record) return { ...empty, status: "error", reason: error };
    const payload = record.payload;
    const base = {
      ...empty,
      holeCode: record.holeCode,
      id: record.id,
      payload,
      rigCode: record.rigCode,
      date: isoToReportDate(String(payload.date)),
      shift: String(payload.shift ?? "DAY"),
      reportNumber: String(payload.reportNumber ?? ""),
      fromDepth: typeof payload.fromDepth === "number" ? payload.fromDepth : null,
      toDepth: typeof payload.toDepth === "number" ? payload.toDepth : null
    };
    const hole = holeByCode(record.holeCode);
    if (!hole) return { ...base, status: "error", reason: `El pozo ${record.holeCode} no existe en este sistema.` };
    const key = `${hole.id}|${base.date}|${base.shift}`;
    const match = (existing.get(hole.id) ?? []).find((report) => report.id === record.id || (isoToReportDate(report.date) === base.date && report.shift === base.shift));
    if (match) {
      const sameNumber = !match.reportNumber || match.reportNumber === base.reportNumber;
      return { ...base, hole, status: "exists", reason: sameNumber ? undefined : `Ese día y turno ya tiene el Parte No. ${match.reportNumber}: se omite.` };
    }
    if (seen.has(key)) return { ...base, hole, status: "exists", reason: "Repetido en el archivo: se omite." };
    seen.add(key);
    return { ...base, hole, status: "new" };
  });

  // Empalme de profundidades: cada parte nuevo debería empezar donde terminó el anterior del pozo.
  for (const hole of involved) {
    const timeline = [
      ...(existing.get(hole.id) ?? []).map((report) => ({ date: isoToReportDate(report.date), shift: report.shift, toDepth: report.toDepth, row: null as BackupRow | null })),
      ...rows.filter((row) => row.hole?.id === hole.id && row.status === "new").map((row) => ({ date: row.date, shift: row.shift, toDepth: row.toDepth ?? 0, row }))
    ].sort(order);
    timeline.forEach((item, index) => {
      if (!item.row || index === 0 || item.row.fromDepth === null) return;
      const previous = timeline[index - 1];
      if (Math.abs(previous.toDepth - item.row.fromDepth) > 0.01) {
        item.row.warning = `Empieza en ${roundDepth(item.row.fromDepth)} m y el parte anterior (${formatReportDate(`${previous.date}T00:00:00.000Z`, "short")} ${SHIFT_NAME[previous.shift] ?? ""}) terminó en ${roundDepth(previous.toDepth)} m.`;
      }
    });
  }
  return rows;
}

// Equipo: el id cambia entre sistemas, se busca por código; si no está, el parte queda sin equipo vinculado
// (el nombre del equipo escrito en el parte se conserva igual).
export async function loadRigIds() {
  try {
    const rigs = await getDrillingRigs({ limit: 500 });
    return new Map(rigs.map((rig) => [String((rig as { code?: string }).code ?? ""), String((rig as { id: string }).id)]));
  } catch {
    return new Map<string, string>();
  }
}

export function createPayload(row: BackupRow, rigIds: Map<string, string>) {
  const rigId = row.rigCode ? rigIds.get(row.rigCode) ?? null : null;
  return { id: row.id, ...row.payload, ...(rigId ? { rigId } : {}) };
}
