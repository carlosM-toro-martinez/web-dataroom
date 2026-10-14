import { read, utils, type WorkBook, type WorkSheet } from "xlsx";
import type { LogRowPayload, PhotoKind } from "@/features/sondajes/model/geology.schema";
import { sortRows } from "@/features/sondajes/lib/geology";
import { sha256Hex } from "@/features/sondajes/lib/contentHash";

// Lector del "Reporte diario de perforación diamantina" que llena el equipo de geología:
//   01_RESUMEN → reporte del día · 02_QUICK_LOG → logueo · 03_FOTOGRAFIAS / 04_SECCION → imágenes.
// Las celdas se ubican por su etiqueta (no por coordenada) para tolerar filas movidas.

export type ExcelPhoto = { key: string; name: string; blob: Blob; kind: PhotoKind; sheet: string; caption: string; hash: string | null };

export type ParsedGeologyWorkbook = {
  fileName: string;
  // Pozo y fecha según el nombre del archivo (Reporte_diario_26DLP077_101026.xlsx), para contrastar con el contenido.
  fileHole: string | null;
  fileDate: string | null;
  sheets: string[];
  holeCode: string | null;
  date: string | null;
  fromDepth: number | null;
  toDepth: number | null;
  plannedEast: number | null;
  plannedNorth: number | null;
  plannedElevation: number | null;
  executedEast: number | null;
  executedNorth: number | null;
  executedElevation: number | null;
  rigName: string | null;
  diameter: string | null;
  casing: string | null;
  azimuth: string | null;
  dip: string | null;
  programmedDepth: string | null;
  startDate: string | null;
  endStatus: string | null;
  geologists: string | null;
  geologySummary: string | null;
  operationalNotes: string | null;
  logRows: LogRowPayload[];
  // Fila del Excel y Hole_ID de cada tramo de logRows (mismo orden), para señalar dónde corregir.
  logMeta: LogRowMeta[];
  logSkippedRows: number[];
  logSkipped: number;
  // Códigos de pozo distintos que aparecen en la columna Hole_ID del quick log.
  logHoleIds: string[];
  // Filas cuya fecha Date_Logged viene con el formato roto «2026<10-09T…».
  logBadDates: number;
  // Hojas y celdas de donde salió cada dato del resumen (ej. holeCode → "01_RESUMEN!A6").
  summarySheet: string | null;
  logSheet: string | null;
  cells: Partial<Record<SummaryField, string>>;
  // Títulos de las hojas de fotos (03 / 04), que también llevan el código del sondaje.
  sheetTitles: Array<{ where: string; text: string }>;
  photos: ExcelPhoto[];
  warnings: string[];
};

export type LogRowMeta = { row: number; holeId: string | null };
export type SummaryField =
  | "holeCode"
  | "date"
  | "fromDepth"
  | "toDepth"
  | "plannedEast"
  | "plannedNorth"
  | "plannedElevation"
  | "executedEast"
  | "executedNorth"
  | "executedElevation"
  | "rigName"
  | "diameter"
  | "casing"
  | "azimuth"
  | "dip"
  | "programmedDepth"
  | "startDate"
  | "endStatus"
  | "geologists"
  | "geologySummary"
  | "operationalNotes";

// Reporte_diario_26DLP077_101026.xlsx → { hole: "26DLP077", date: "2026-10-10" }
export function fromFileName(name: string) {
  const match = name.match(/([0-9]{2}[A-Z]{2,4}[0-9]{2,4}[A-Z]?)[_\s-]+([0-9]{2})([0-9]{2})([0-9]{2})(?![0-9])/i);
  if (!match) return { hole: null, date: null };
  return { hole: match[1].toUpperCase(), date: `20${match[4]}-${match[3]}-${match[2]}` };
}

type Grid = unknown[][];

const normalize = (value: unknown) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

const text = (value: unknown) => {
  const result = String(value ?? "").replace(/\s+/g, " ").trim();
  return result || null;
};

export const normalizeHoleCode = (value: string) => value.replace(/[^a-z0-9]/gi, "").toUpperCase();

function numberFrom(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const match = String(value ?? "").replace(",", ".").match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : null;
}

// Fecha de Excel (número de serie o texto dd/mm/aaaa) → YYYY-MM-DD.
function dateFrom(value: unknown): string | null {
  if (typeof value === "number" && value > 20000) {
    return new Date(Math.round((value - 25569) * 86400000)).toISOString().slice(0, 10);
  }
  const raw = String(value ?? "").trim();
  const dmy = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (dmy) {
    const year = dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3];
    return `${year}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  }
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return iso ? `${iso[1]}-${iso[2]}-${iso[3]}` : null;
}

// "2026<10-06T12:02:20.592175" (así exporta la app de logueo) → ISO.
function timestampFrom(value: unknown): string | null {
  const raw = String(value ?? "").trim().replace(/</g, "-");
  if (!raw) return null;
  const date = new Date(raw.replace(/(\.\d{3})\d+/, "$1"));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function grid(sheet: WorkSheet): Grid {
  return utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: "", blankrows: true });
}

// Esquina superior izquierda de la hoja: el índice 0 de grid() corresponde a esa celda.
function origin(sheet: WorkSheet) {
  return sheet["!ref"] ? utils.decode_range(sheet["!ref"]).s : { r: 0, c: 0 };
}

type Loc = { r: number; c: number };

function find(rows: Grid, predicate: (label: string) => boolean) {
  for (let r = 0; r < rows.length; r += 1) {
    for (let c = 0; c < rows[r].length; c += 1) {
      if (predicate(normalize(rows[r][c]))) return { r, c };
    }
  }
  return null;
}

const startsWith = (prefix: string) => (label: string) => label.startsWith(normalize(prefix));

// Valor bajo una etiqueta (las cajas grandes del encabezado). loc = celda del valor (o de la etiqueta si está vacío).
function below(rows: Grid, label: string): { value: unknown; loc: Loc } | undefined {
  const at = find(rows, startsWith(label));
  if (!at) return undefined;
  for (let r = at.r + 1; r < Math.min(rows.length, at.r + 4); r += 1) {
    const value = rows[r]?.[at.c];
    if (value !== "" && value !== undefined) return { value, loc: { r, c: at.c } };
  }
  return { value: undefined, loc: { r: at.r + 1, c: at.c } };
}

// Valores a la derecha de una etiqueta en la misma fila (tabla "Información del sondaje").
function rightOf(rows: Grid, label: string): Array<{ value: unknown; loc: Loc }> {
  const at = find(rows, startsWith(label));
  if (!at) return [];
  return rows[at.r]
    .map((value, c) => ({ value, loc: { r: at.r, c } }))
    .slice(at.c + 1)
    .filter(({ value }) => value !== "" && value !== undefined);
}

// Texto de una sección numerada ("2. RESUMEN...") hasta la siguiente sección.
function sectionText(rows: Grid, heading: string, skip: (label: string) => boolean = () => false) {
  const at = find(rows, startsWith(heading));
  if (!at) return null;
  return sectionLines(rows, at, skip);
}

function sectionLines(rows: Grid, at: Loc, skip: (label: string) => boolean) {
  const lines: string[] = [];
  for (let r = at.r + 1; r < rows.length; r += 1) {
    const first = normalize(rows[r].find((value) => value !== "") ?? "");
    if (/^\d+\.\s/.test(first)) break;
    if (!first || skip(first)) continue;
    const line = rows[r].map((value) => String(value ?? "").trim()).filter(Boolean)[0];
    if (line) lines.push(line);
  }
  return lines.join("\n") || null;
}

// ─── Hoja de resumen ─────────────────────────────────────────────────────────
// Coordenadas: bajo las columnas "Este (m) / Norte (m) / Elev (m)" hay un bloque Programado y otro Ejecutado.
function coordinates(rows: Grid) {
  const at = find(rows, startsWith("COORDENADAS"));
  type Coord = { value: number | null; loc: Loc | null };
  const none: Coord[] = [0, 1, 2].map(() => ({ value: null, loc: null }));
  if (!at) return { planned: none, executed: none };
  const header = rows[at.r];
  const starts = header.map((value, index) => (normalize(value).startsWith("ESTE") ? index : -1)).filter((index) => index >= 0);
  const data = rows[at.r + 1] ?? [];
  const read = (column?: number): Coord[] =>
    column === undefined
      ? none
      : [0, 1, 2].map((offset) => {
          const raw = data[column + offset];
          return { value: raw === "" || raw === undefined ? null : numberFrom(raw), loc: { r: at.r + 1, c: column + offset } };
        });
  return { planned: read(starts[0]), executed: read(starts[1]) };
}

function parseSummary(rows: Grid, sheetName: string, base: Loc) {
  const cells: Partial<Record<SummaryField, string>> = {};
  const ref = (loc: Loc | null | undefined) => (loc ? `${sheetName}!${utils.encode_cell({ r: loc.r + base.r, c: loc.c + base.c })}` : undefined);
  const mark = <T,>(field: SummaryField, loc: Loc | null | undefined, value: T) => {
    const where = ref(loc);
    if (where) cells[field] = where;
    return value;
  };
  const boxed = (field: SummaryField, label: string) => {
    const found = below(rows, label);
    return mark(field, found?.loc, found?.value);
  };
  const info = (field: SummaryField, label: string) => {
    const found = rightOf(rows, label)[0];
    if (!found) {
      const at = find(rows, startsWith(label));
      if (at) mark(field, { r: at.r, c: at.c }, null);
      return null;
    }
    return mark(field, found.loc, text(found.value));
  };
  const section = (field: SummaryField, heading: string, skip?: (label: string) => boolean) => {
    const at = find(rows, startsWith(heading));
    if (!at) return null;
    return mark(field, at, sectionLines(rows, at, skip ?? (() => false)));
  };
  const dates = rightOf(rows, "FECHA DE INICIO");
  const datesLabel = find(rows, startsWith("FECHA DE INICIO"));
  const coords = coordinates(rows);
  const geologistsFooter = find(rows, startsWith("GEOLOGOS:"));
  const coord = (field: SummaryField, item: { value: number | null; loc: Loc | null }) => mark(field, item.loc, item.value);
  return {
    cells,
    holeCode: text(boxed("holeCode", "SONDAJE")),
    date: dateFrom(boxed("date", "FECHA DE REPORTE")),
    fromDepth: numberFrom(boxed("fromDepth", "PROFUNDIDAD ANTERIOR")),
    toDepth: numberFrom(boxed("toDepth", "PROFUNDIDAD ACTUAL")),
    plannedEast: coord("plannedEast", coords.planned[0]),
    plannedNorth: coord("plannedNorth", coords.planned[1]),
    plannedElevation: coord("plannedElevation", coords.planned[2]),
    executedEast: coord("executedEast", coords.executed[0]),
    executedNorth: coord("executedNorth", coords.executed[1]),
    executedElevation: coord("executedElevation", coords.executed[2]),
    rigName: info("rigName", "EQUIPO"),
    diameter: info("diameter", "DIAMETRO"),
    casing: info("casing", "ENCAMIZADO"),
    azimuth: info("azimuth", "AZIMUT"),
    dip: info("dip", "INCLINACION"),
    programmedDepth: info("programmedDepth", "PROFUNDIDAD PROGRAMADA"),
    startDate: dateFrom(mark("startDate", dates[0]?.loc ?? datesLabel, dates[0]?.value)),
    endStatus: text(mark("endStatus", dates[1]?.loc ?? datesLabel, dates[1]?.value)),
    geologists:
      info("geologists", "GEOLOGOS RESPONSABLES") ??
      (geologistsFooter ? text(String(rows[geologistsFooter.r][geologistsFooter.c]).replace(/^ge[oó]logos:\s*/i, "")) : null),
    geologySummary: section("geologySummary", "2. RESUMEN GEOLOGICO", (label) => label.startsWith("INTERVALO REPORTADO")),
    operationalNotes: section("operationalNotes", "3. OBSERVACIONES")
  };
}

// ─── Quick log ───────────────────────────────────────────────────────────────
function parseQuickLog(rows: Grid, base: Loc) {
  const header = rows[0]?.map((value) => String(value ?? "").trim()) ?? [];
  const col = (name: string) => header.findIndex((value) => value.toLowerCase() === name.toLowerCase());
  const at = (row: unknown[], name: string) => {
    const index = col(name);
    return index >= 0 ? row[index] : undefined;
  };
  const code = (row: unknown[], name: string) => text(at(row, name));
  const int = (row: unknown[], name: string) => {
    const value = numberFrom(at(row, name));
    return value === null ? null : Math.round(value);
  };

  const result: Array<{ payload: LogRowPayload; meta: LogRowMeta }> = [];
  const skippedRows: number[] = [];
  let badDates = 0;
  const holeIds = new Set<string>();
  rows.slice(1).forEach((row, index) => {
    const excelRow = base.r + index + 2;
    if (row.every((value) => value === "")) return;
    const fromDepth = numberFrom(at(row, "mFrom"));
    const toDepth = numberFrom(at(row, "mTo"));
    if (fromDepth === null || toDepth === null || !(toDepth > fromDepth)) {
      skippedRows.push(excelRow);
      return;
    }
    const rowHole = text(at(row, "Hole_ID"));
    if (rowHole) holeIds.add(rowHole);
    if (String(at(row, "Date_Logged") ?? "").includes("<")) badDates += 1;
    const minerals = [1, 2, 3, 4]
      .map((n) => ({ mineral: code(row, `Min${n}`), pct: text(at(row, `Min${n}_Pct`)), style: code(row, `Min${n}_Style`) }))
      .filter((mineral): mineral is { mineral: string; pct: string | null; style: string | null } => Boolean(mineral.mineral));
    const structures = [1, 2]
      .map((n) => ({ type: code(row, `Struct${n}`), angle: numberFrom(at(row, `Struct${n}_Ang`)), fracCount: numberFrom(at(row, `Struct${n}_Frac_N`)) }))
      .filter((structure): structure is { type: string; angle: number | null; fracCount: number | null } => Boolean(structure.type));
    result.push({ meta: { row: excelRow, holeId: rowHole }, payload: {
      fromDepth,
      toDepth,
      dataSet: code(row, "DataSet"),
      lithology: code(row, "Lith_Code"),
      texture: code(row, "Texture"),
      support: code(row, "Support"),
      alteration1: code(row, "Alt1"),
      alteration1Int: int(row, "Alt1_Int"),
      alteration2: code(row, "Alt2"),
      alteration2Int: int(row, "Alt2_Int"),
      minerals: minerals.length ? minerals : null,
      structures: structures.length ? structures : null,
      description: text(at(row, "Lith_Obs")),
      loggedBy: text(at(row, "Logged_By")),
      loggedAt: timestampFrom(at(row, "Date_Logged"))
    } });
  });
  const ordered = [...result].sort((a, b) => a.payload.fromDepth - b.payload.fromDepth || a.payload.toDepth - b.payload.toDepth || a.meta.row - b.meta.row);
  return {
    rows: ordered.map((item) => item.payload),
    meta: ordered.map((item) => item.meta),
    skippedRows,
    badDates,
    holeIds: [...holeIds]
  };
}

// ─── Imágenes embebidas ──────────────────────────────────────────────────────
type ZipFile = { content?: unknown };

function bytesOf(file?: ZipFile): Uint8Array | null {
  const content = file?.content;
  if (!content) return null;
  if (content instanceof Uint8Array) return content;
  if (content instanceof ArrayBuffer) return new Uint8Array(content);
  if (Array.isArray(content)) return Uint8Array.from(content as number[]);
  if (typeof content === "string") return Uint8Array.from(content, (char) => char.charCodeAt(0) & 0xff);
  return null;
}

function xmlOf(files: Record<string, ZipFile>, path: string) {
  const bytes = bytesOf(files[path]);
  return bytes ? new DOMParser().parseFromString(new TextDecoder().decode(bytes), "application/xml") : null;
}

function relations(files: Record<string, ZipFile>, path: string) {
  const doc = xmlOf(files, path);
  const map = new Map<string, string>();
  doc?.querySelectorAll("Relationship").forEach((rel) => map.set(rel.getAttribute("Id") ?? "", rel.getAttribute("Target") ?? ""));
  return map;
}

function resolvePath(base: string, target: string) {
  if (target.startsWith("/")) return target.slice(1);
  const parts = base.split("/").slice(0, -1);
  for (const segment of target.split("/")) {
    if (segment === "..") parts.pop();
    else if (segment !== ".") parts.push(segment);
  }
  return parts.join("/");
}

const MIME: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif" };

// La hoja de origen decide el tipo; las fotos se importan sin comentario, igual que en el Excel.
function kindForSheet(name: string): { kind: PhotoKind; caption: string } {
  const label = normalize(name);
  if (label.includes("SECCION")) return { kind: "SECTION", caption: "" };
  if (label.includes("FOTO")) return { kind: "CORE_BOX", caption: "" };
  if (label.includes("RESUMEN")) return { kind: "DETAIL", caption: "" };
  return { kind: "OTHER", caption: "" };
}

function extractPhotos(workbook: WorkBook): ExcelPhoto[] {
  const files = (workbook as unknown as { files?: Record<string, ZipFile> }).files;
  if (!files) return [];
  const workbookDoc = xmlOf(files, "xl/workbook.xml");
  const workbookRels = relations(files, "xl/_rels/workbook.xml.rels");
  type Anchor = { sheet: string; order: number; row: number; col: number; media: string };
  const anchors: Anchor[] = [];

  workbookDoc?.querySelectorAll("sheet").forEach((sheet, order) => {
    const name = sheet.getAttribute("name") ?? `Hoja ${order + 1}`;
    const relId = sheet.getAttribute("r:id") ?? sheet.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id");
    const target = relId ? workbookRels.get(relId) : undefined;
    if (!target) return;
    const sheetPath = resolvePath("xl/workbook.xml", target);
    const sheetRelsPath = sheetPath.replace(/([^/]+)$/, "_rels/$1.rels");
    for (const drawingTarget of relations(files, sheetRelsPath).values()) {
      if (!drawingTarget.includes("drawing")) continue;
      const drawingPath = resolvePath(sheetPath, drawingTarget);
      const drawingRels = relations(files, drawingPath.replace(/([^/]+)$/, "_rels/$1.rels"));
      const drawing = xmlOf(files, drawingPath);
      drawing?.querySelectorAll("twoCellAnchor, oneCellAnchor, absoluteAnchor").forEach((anchor) => {
        const blip = anchor.querySelector("blip");
        const embed = blip?.getAttribute("r:embed") ?? blip?.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "embed");
        const mediaTarget = embed ? drawingRels.get(embed) : undefined;
        if (!mediaTarget) return;
        const from = anchor.querySelector("from");
        anchors.push({
          sheet: name,
          order,
          row: Number(from?.querySelector("row")?.textContent ?? 0),
          col: Number(from?.querySelector("col")?.textContent ?? 0),
          media: resolvePath(drawingPath, mediaTarget)
        });
      });
    }
  });

  // El logo se repite en el encabezado de cada página: una imagen usada más de una vez no es foto.
  const uses = new Map<string, number>();
  anchors.forEach((anchor) => uses.set(anchor.media, (uses.get(anchor.media) ?? 0) + 1));

  const seen = new Set<string>();
  return anchors
    .filter((anchor) => (uses.get(anchor.media) ?? 0) === 1 && anchor.row > 0)
    .sort((a, b) => a.order - b.order || a.row - b.row || a.col - b.col)
    .flatMap((anchor) => {
      if (seen.has(anchor.media)) return [];
      seen.add(anchor.media);
      const bytes = bytesOf(files[anchor.media]);
      const ext = anchor.media.split(".").pop()?.toLowerCase() ?? "";
      if (!bytes || !MIME[ext]) return [];
      const { kind, caption } = kindForSheet(anchor.sheet);
      const copy = new Uint8Array(bytes.byteLength);
      copy.set(bytes);
      return [{ key: anchor.media, name: anchor.media.split("/").pop() ?? anchor.media, blob: new Blob([copy.buffer], { type: MIME[ext] }), kind, sheet: anchor.sheet, caption, hash: null }];
    });
}

// ─── Entrada ─────────────────────────────────────────────────────────────────
export async function parseGeologyWorkbook(file: File): Promise<ParsedGeologyWorkbook> {
  const workbook = read(new Uint8Array(await file.arrayBuffer()), { type: "array", bookFiles: true });
  const warnings: string[] = [];
  const sheetNamed = (fragment: string) => workbook.SheetNames.find((name) => normalize(name).includes(fragment));

  const summarySheet = sheetNamed("RESUMEN");
  const logSheet = sheetNamed("QUICK") ?? sheetNamed("LOG");
  if (!summarySheet && !logSheet) {
    throw new Error("No se encontraron las hojas del reporte (RESUMEN o QUICK_LOG). ¿Es el Excel del reporte diario de geología?");
  }

  const summary = summarySheet ? parseSummary(grid(workbook.Sheets[summarySheet]), summarySheet, origin(workbook.Sheets[summarySheet])) : null;
  if (!summarySheet) warnings.push("No hay hoja de resumen: solo se importará el logueo y las fotos.");
  const log = logSheet
    ? parseQuickLog(grid(workbook.Sheets[logSheet]), origin(workbook.Sheets[logSheet]))
    : { rows: [], meta: [], skippedRows: [] as number[], badDates: 0, holeIds: [] as string[] };
  const fileInfo = fromFileName(file.name);

  const holeCode = summary?.holeCode ?? log.holeIds[0] ?? null;
  // Títulos «MEMORIA FOTOGRÁFICA DE TESTIGOS | 26-DLP-079» de las hojas de fotos.
  const sheetTitles = workbook.SheetNames.filter((name) => name !== summarySheet && name !== logSheet).flatMap((name) => {
    const title = text(workbook.Sheets[name]?.A1?.v);
    return title ? [{ where: `${name}!A1`, text: title }] : [];
  });

  let photos: ExcelPhoto[] = [];
  try {
    photos = await Promise.all(extractPhotos(workbook).map(async (photo) => ({ ...photo, hash: await sha256Hex(photo.blob) })));
  } catch {
    warnings.push("No se pudieron leer las imágenes del Excel.");
  }

  return {
    fileName: file.name,
    fileHole: fileInfo.hole,
    fileDate: fileInfo.date,
    sheets: workbook.SheetNames,
    holeCode,
    date: summary?.date ?? null,
    fromDepth: summary?.fromDepth ?? null,
    toDepth: summary?.toDepth ?? null,
    rigName: summary?.rigName ?? null,
    diameter: summary?.diameter ?? null,
    casing: summary?.casing ?? null,
    geologists: summary?.geologists ?? null,
    plannedEast: summary?.plannedEast ?? null,
    plannedNorth: summary?.plannedNorth ?? null,
    plannedElevation: summary?.plannedElevation ?? null,
    executedEast: summary?.executedEast ?? null,
    executedNorth: summary?.executedNorth ?? null,
    executedElevation: summary?.executedElevation ?? null,
    azimuth: summary?.azimuth ?? null,
    dip: summary?.dip ?? null,
    programmedDepth: summary?.programmedDepth ?? null,
    startDate: summary?.startDate ?? null,
    endStatus: summary?.endStatus ?? null,
    geologySummary: summary?.geologySummary ?? null,
    operationalNotes: summary?.operationalNotes ?? null,
    logRows: log.rows,
    logMeta: log.meta,
    logSkippedRows: log.skippedRows,
    logSkipped: log.skippedRows.length,
    logHoleIds: log.holeIds,
    logBadDates: log.badDates,
    summarySheet: summarySheet ?? null,
    logSheet: logSheet ?? null,
    cells: summary?.cells ?? {},
    sheetTitles,
    photos,
    warnings
  };
}

