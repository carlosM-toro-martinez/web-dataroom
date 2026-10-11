import type { Borders, Fill, Worksheet } from "exceljs";

export type ReportCell = string | number | Date | null | undefined;

export type ReportColumn = {
  header: string;
  width?: number;
  numFmt?: string;
  align?: "left" | "center" | "right";
  highlight?: boolean;
};

export type ReportSection = { label: string; rows: ReportCell[][] };

export type ReportSheet = {
  name: string;
  title: string;
  subtitle?: string;
  columns: ReportColumn[];
  rows?: ReportCell[][];
  sections?: ReportSection[];
  freezeColumns?: number;
  emptyMessage?: string;
};

export const DATE_FORMAT = "dd/mm/yyyy";
export const DATE_TIME_FORMAT = "dd/mm/yyyy hh:mm";

const COLORS = {
  title: "FF1F3A5F",
  subtitle: "FF5F6B7A",
  header: "FF1F3A5F",
  headerHighlight: "FF2E6B4F",
  headerText: "FFFFFFFF",
  band: "FFF4F6F9",
  section: "FFE3EAF3",
  sectionText: "FF1F3A5F",
  border: "FFD5DBE3",
  empty: "FF8A94A3"
};

const HEADER_ROW = 4;

const solid = (argb: string): Fill => ({ type: "pattern", pattern: "solid", fgColor: { argb } });
const thinBorder: Partial<Borders> = {
  top: { style: "thin", color: { argb: COLORS.border } },
  bottom: { style: "thin", color: { argb: COLORS.border } },
  left: { style: "thin", color: { argb: COLORS.border } },
  right: { style: "thin", color: { argb: COLORS.border } }
};

// Loaded on demand; call early while online so the service worker caches the chunk for offline exports.
export function preloadExcelReport() {
  void import("exceljs").catch(() => undefined);
}

export async function downloadExcelReport(filename: string, sheets: ReportSheet[]) {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Empresa Minera Marte S.R.L.";
  workbook.created = new Date();

  for (const sheet of sheets) {
    const worksheet = workbook.addWorksheet(sheet.name.slice(0, 31), {
      views: [{ state: "frozen", ySplit: HEADER_ROW, xSplit: sheet.freezeColumns ?? 0 }]
    });
    writeSheet(worksheet, sheet);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function writeSheet(worksheet: Worksheet, sheet: ReportSheet) {
  const columnCount = sheet.columns.length;

  worksheet.mergeCells(1, 1, 1, columnCount);
  const title = worksheet.getCell(1, 1);
  title.value = sheet.title;
  title.font = { bold: true, size: 14, color: { argb: COLORS.title } };
  worksheet.getRow(1).height = 24;

  if (sheet.subtitle) {
    worksheet.mergeCells(2, 1, 2, columnCount);
    const subtitle = worksheet.getCell(2, 1);
    subtitle.value = sheet.subtitle;
    subtitle.font = { italic: true, size: 10, color: { argb: COLORS.subtitle } };
  }

  const headerRow = worksheet.getRow(HEADER_ROW);
  sheet.columns.forEach((column, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = column.header;
    cell.font = { bold: true, color: { argb: COLORS.headerText } };
    cell.fill = solid(column.highlight ? COLORS.headerHighlight : COLORS.header);
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = thinBorder;
  });
  const headerLines = Math.max(...sheet.columns.map((column) => column.header.split("\n").length));
  headerRow.height = Math.max(30, headerLines * 15 + 6);

  let rowNumber = HEADER_ROW + 1;
  const writeDataRow = (values: ReportCell[], banded: boolean) => {
    const row = worksheet.getRow(rowNumber);
    sheet.columns.forEach((column, index) => {
      const cell = row.getCell(index + 1);
      const value = values[index];
      cell.value = value === undefined || value === "" ? null : value;
      cell.border = thinBorder;
      cell.alignment = { vertical: "top", horizontal: column.align ?? (typeof value === "number" ? "right" : "left"), wrapText: true };
      if (column.numFmt) cell.numFmt = column.numFmt;
      if (banded) cell.fill = solid(COLORS.band);
    });
    rowNumber += 1;
  };

  const sections = sheet.sections ?? (sheet.rows ? [{ label: "", rows: sheet.rows }] : []);
  const hasData = sections.some((section) => section.rows.length > 0);

  if (!hasData) {
    worksheet.mergeCells(rowNumber, 1, rowNumber, columnCount);
    const cell = worksheet.getCell(rowNumber, 1);
    cell.value = sheet.emptyMessage ?? "No hay registros para los filtros actuales.";
    cell.font = { italic: true, color: { argb: COLORS.empty } };
  } else {
    for (const section of sections) {
      if (section.label) {
        worksheet.mergeCells(rowNumber, 1, rowNumber, columnCount);
        const cell = worksheet.getCell(rowNumber, 1);
        cell.value = section.label;
        cell.font = { bold: true, color: { argb: COLORS.sectionText } };
        cell.fill = solid(COLORS.section);
        cell.alignment = { vertical: "middle" };
        worksheet.getRow(rowNumber).height = 20;
        rowNumber += 1;
      }
      section.rows.forEach((values, index) => writeDataRow(values, index % 2 === 1));
    }
    if (!sheet.sections) {
      worksheet.autoFilter = { from: { row: HEADER_ROW, column: 1 }, to: { row: HEADER_ROW, column: columnCount } };
    }
  }

  const allRows = sections.flatMap((section) => section.rows);
  sheet.columns.forEach((column, index) => {
    const headerWidth = Math.max(...column.header.split("\n").map((line) => line.length)) + 2;
    const contentWidth = allRows.reduce((max, values) => Math.max(max, cellTextLength(values[index])), 0) + 2;
    worksheet.getColumn(index + 1).width = column.width ?? Math.min(Math.max(headerWidth, contentWidth, 8), 48);
  });
}

function cellTextLength(value: ReportCell) {
  if (value === null || value === undefined) return 0;
  if (value instanceof Date) return 16;
  return String(value).length;
}

// Excel stores dates without zone: build the wall-clock time of La Paz so it shows as the user saw it.
export function toExcelDate(value?: string | null, withTime = true) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/La_Paz",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value])
  );
  return new Date(
    Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      withTime ? Number(parts.hour) : 0,
      withTime ? Number(parts.minute) : 0
    )
  );
}

const LOWERCASE_WORDS = new Set(["de", "del", "la", "las", "el", "los", "y", "e", "o", "a", "en"]);

// "LIPEÑA" -> "Lipeña", "BANCO 8, ACOPIO" -> "Banco 8, Acopio".
export function toDisplayName(value?: string | null) {
  const text = (value ?? "").trim();
  if (!text) return "";
  return text
    .toLocaleLowerCase("es")
    .replace(/[\p{L}\p{N}]+/gu, (word, offset: number) =>
      offset > 0 && LOWERCASE_WORDS.has(word) ? word : word.charAt(0).toLocaleUpperCase("es") + word.slice(1)
    );
}
