import * as XLSX from "xlsx";

export type SheetRow = Record<string, unknown>;

export function normalizeKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "");
}

export function normalizeIsoFromCell(value: unknown) {
  if (value === null || value === undefined || value === "") return undefined;

  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return undefined;
    const date = new Date(
      Date.UTC(parsed.y, (parsed.m ?? 1) - 1, parsed.d ?? 1, parsed.H ?? 0, parsed.M ?? 0, parsed.S ?? 0)
    );
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
  }

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

export function parsePrefixedNumeric(value: unknown) {
  if (value === null || value === undefined) return undefined;
  const source = String(value).trim().replace(",", ".");
  if (!source) return undefined;

  const numericTail = source.match(/-?\d+(\.\d+)?$/);
  if (!numericTail) return undefined;

  const numericToken = numericTail[0];
  const numeric = Number(numericToken);
  if (Number.isNaN(numeric)) return undefined;

  const prefixRaw = source.slice(0, source.length - numericToken.length).trim();
  return {
    valor: numeric,
    prefijo: prefixRaw || undefined
  };
}

export async function readExcelRows(file: File): Promise<SheetRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];
  const sheet = workbook.Sheets[firstSheetName];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json<SheetRow>(sheet, { defval: "" });
}

export function downloadTemplateXlsx(sheetName: string, rows: SheetRow[], filename: string) {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, filename);
}
