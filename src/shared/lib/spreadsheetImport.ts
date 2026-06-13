import * as XLSX from "xlsx";

export type SpreadsheetRow = Record<string, unknown>;

export interface SpreadsheetSheet {
  name: string;
  rows: SpreadsheetRow[];
}

export function normalizeImportKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s_-]+/g, "");
}

export function normalizeSpreadsheetRow(row: SpreadsheetRow) {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(row)) {
    const cleanKey = normalizeImportKey(key);
    if (!cleanKey) continue;
    normalized[cleanKey] = value === null || value === undefined ? "" : String(value).trim();
  }
  return normalized;
}

export async function readSpreadsheetSheets(file: File): Promise<SpreadsheetSheet[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });

  return workbook.SheetNames.map((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const rows = sheet ? XLSX.utils.sheet_to_json<SpreadsheetRow>(sheet, { defval: "" }) : [];
    return { name: sheetName, rows };
  });
}

