import * as XLSX from "xlsx";
import type { DrillingHoleStatus } from "@/features/sondajes/model/sondajes.schema";

// Lee el Excel del "Programa de perforación DDH" (formato de Mosa y Lipeña):
//   fila 1: título combinado, p. ej. "PROGRAMA DE PERFORACION DDH 2026 MOSA (FASE 1)"
//   fila 2: encabezados (Drillhole | X | Y | Z | Azimuth | Dip | Target_Dep | Estado)
//   filas siguientes: un pozo por fila.

export type ProgramRow = {
  rowNumber: number;
  code: string;
  plannedEast?: number;
  plannedNorth?: number;
  plannedElevation?: number;
  plannedAzimuth?: number;
  plannedDip?: number;
  plannedDepth?: number;
  status: DrillingHoleStatus;
  statusText: string;
  errors: string[];
};

export type ParsedProgram = {
  title: string;
  suggestedArea: string;
  suggestedName: string;
  rows: ProgramRow[];
  missingColumns: string[];
};

type ColumnKey = "code" | "x" | "y" | "z" | "azimuth" | "dip" | "depth" | "status";

const COLUMN_ALIASES: Record<ColumnKey, string[]> = {
  code: ["drillhole", "drillhole name", "drill hole", "hole id", "holeid", "pozo", "sondaje", "nombre", "codigo"],
  x: ["x", "este", "east", "easting"],
  y: ["y", "norte", "north", "northing"],
  z: ["z", "cota", "elevacion", "elevation", "rl"],
  azimuth: ["azimuth", "azimut", "az", "azi"],
  dip: ["dip", "inclinacion", "incl"],
  depth: ["target depth", "target_dep", "target dep", "target_depth", "profundidad", "prof", "depth", "profundidad objetivo"],
  status: ["estado", "status", "state"]
};

const REQUIRED_COLUMNS: ColumnKey[] = ["code", "x", "y", "z", "azimuth", "dip", "depth"];

const COLUMN_LABELS: Record<ColumnKey, string> = {
  code: "Drillhole",
  x: "X",
  y: "Y",
  z: "Z",
  azimuth: "Azimuth",
  dip: "Dip",
  depth: "Target Depth",
  status: "Estado"
};

export function normalizeText(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ");
}

// Textos del Excel → estado del sistema. Vacío = Proyectado.
export function parseHoleStatus(value: unknown): DrillingHoleStatus | undefined {
  const text = normalizeText(value);
  if (!text) return "PLANNED";
  if (/(proyect|planific|program|pendiente|planned)/.test(text)) return "PLANNED";
  if (/(proceso|perfor|ejecuci|curso|drilling|activo)/.test(text)) return "DRILLING";
  if (/(paus|parad|paraliz|suspend|stand)/.test(text)) return "PAUSED";
  if (/(termin|conclu|finaliz|complet|ejecutado|done)/.test(text)) return "COMPLETED";
  if (/(abandon|cancel|anulad)/.test(text)) return "ABANDONED";
  return undefined;
}

export function parseNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  const cleaned = String(value).trim().replace(/\s/g, "").replace(",", ".");
  if (!cleaned) return undefined;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function findHeaderRow(rows: unknown[][]) {
  for (let index = 0; index < Math.min(rows.length, 15); index += 1) {
    const cells = (rows[index] ?? []).map(normalizeText);
    const hasCode = cells.some((cell) => COLUMN_ALIASES.code.includes(cell));
    const hasX = cells.includes("x") || cells.includes("este");
    if (hasCode && hasX) return index;
  }
  return -1;
}

function mapColumns(headers: unknown[]) {
  const normalized = headers.map(normalizeText);
  const map: Partial<Record<ColumnKey, number>> = {};
  (Object.keys(COLUMN_ALIASES) as ColumnKey[]).forEach((key) => {
    const index = normalized.findIndex((cell) => COLUMN_ALIASES[key].includes(cell));
    if (index >= 0) map[key] = index;
  });
  return map;
}

// "PROGRAMA DE PERFORACION DDH 2026 MOSA (FASE 1)" → área "MOSA".
function guessArea(title: string, fileName: string) {
  const fromTitle = title.match(/\b(?:19|20)\d{2}\s+(.+?)\s*(?:\(|$)/i)?.[1]?.trim();
  if (fromTitle) return fromTitle.toUpperCase();
  const fromFile = fileName.match(/ddh[_\s-]+([^._]+)/i)?.[1];
  return fromFile ? fromFile.toUpperCase() : "";
}

function cleanTitle(title: string) {
  // Corrige errores de tipeo frecuentes en los títulos ("PROGAMA", "PROGRPAMA").
  return title.replace(/\bPROG\w*MA\b/i, "PROGRAMA").replace(/\s+/g, " ").trim();
}

export async function parseProgramFile(file: File): Promise<ParsedProgram> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("El archivo no tiene hojas.");
  const sheet = workbook.Sheets[sheetName]!;
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: null });

  const headerIndex = findHeaderRow(rows);
  if (headerIndex < 0) {
    throw new Error("No se encontró la fila de encabezados (Drillhole, X, Y, Z, Azimuth, Dip, Target Depth, Estado).");
  }

  const rawTitle = rows
    .slice(0, headerIndex)
    .flat()
    .find((cell) => typeof cell === "string" && cell.trim().length > 0);
  const title = cleanTitle(String(rawTitle ?? ""));
  const columns = mapColumns(rows[headerIndex] ?? []);
  const missingColumns = REQUIRED_COLUMNS.filter((key) => columns[key] === undefined).map((key) => COLUMN_LABELS[key]);

  const cell = (row: unknown[], key: ColumnKey) => (columns[key] === undefined ? undefined : row[columns[key]!]);

  const parsedRows: ProgramRow[] = [];
  rows.slice(headerIndex + 1).forEach((row, offset) => {
    const code = String(cell(row, "code") ?? "").trim();
    const isEmpty = row.every((value) => value === null || String(value).trim() === "");
    if (isEmpty) return;

    const errors: string[] = [];
    if (!code) errors.push("Falta el nombre del pozo");
    const plannedEast = parseNumber(cell(row, "x"));
    const plannedNorth = parseNumber(cell(row, "y"));
    const plannedElevation = parseNumber(cell(row, "z"));
    const plannedAzimuth = parseNumber(cell(row, "azimuth"));
    const plannedDip = parseNumber(cell(row, "dip"));
    const plannedDepth = parseNumber(cell(row, "depth"));
    if (plannedAzimuth !== undefined && (plannedAzimuth < 0 || plannedAzimuth > 360)) errors.push("Azimuth fuera de 0–360");
    if (plannedDip !== undefined && (plannedDip < -90 || plannedDip > 90)) errors.push("Dip fuera de -90–90");
    if (plannedDepth !== undefined && plannedDepth < 0) errors.push("Profundidad negativa");

    const statusText = String(cell(row, "status") ?? "").trim();
    const status = parseHoleStatus(statusText);
    if (!status) errors.push(`Estado no reconocido: "${statusText}"`);

    parsedRows.push({
      rowNumber: headerIndex + offset + 2,
      code,
      plannedEast,
      plannedNorth,
      plannedElevation,
      plannedAzimuth,
      plannedDip,
      plannedDepth,
      status: status ?? "PLANNED",
      statusText: statusText || "Proyectado",
      errors
    });
  });

  const codes = parsedRows.map((row) => row.code.toLowerCase());
  parsedRows.forEach((row) => {
    if (row.code && codes.filter((code) => code === row.code.toLowerCase()).length > 1) {
      row.errors.push("Pozo repetido en el archivo");
    }
  });

  const suggestedArea = guessArea(title, file.name);
  return {
    title,
    suggestedArea,
    suggestedName: title
      ? title.replace(/^PROGRAMA DE PERFORACION\s*/i, "Programa ").replace(/^Programa\s+/i, "Programa ")
      : `Programa DDH ${suggestedArea}`.trim(),
    rows: parsedRows,
    missingColumns
  };
}
