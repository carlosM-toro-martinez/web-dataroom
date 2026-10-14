import type { DrillingHole } from "@/features/sondajes/model/sondajes.schema";
import { normalizeHoleCode, type ParsedGeologyWorkbook } from "@/features/sondajes/lib/geologyExcel";
import type { HoleMatch } from "@/features/sondajes/lib/geologyImport";
import { ALTERATIONS, LITHOLOGY, MINERALS, MINERAL_STYLES, STRUCTURES, SUPPORTS, TEXTURES, fmt } from "@/features/sondajes/lib/geology";

// Revisión de un Excel de reporte diario ANTES de importarlo: señala qué corregir y en qué celda/fila,
// para que el equipo de geología arregle su archivo. Nada se corrige solo: si se confirma, se importa tal cual.
//   error   → «Corregir»: hay que confirmar para importarlo igual.
//   warning → «Revisar»: probable error o dato incompleto.
//   info    → «Nota»: algo a tener en cuenta (no impide nada).

export type Severity = "error" | "warning" | "info";
export type Finding = { severity: Severity; where: string; message: string };

// Lo que se sabe del día anterior del mismo pozo (en el lote o ya en el sistema).
export type PreviousDay = {
  date: string;
  toDepth: number;
  startDate?: string | null;
  rigName?: string | null;
  diameter?: string | null;
  casing?: string | null;
  source: string;
};

export type ReviewInput = {
  parsed: ParsedGeologyWorkbook;
  hole: DrillingHole | null;
  match: HoleMatch;
  previous: PreviousDay | null;
  // Huella de imagen → día en que ya apareció (para detectar la sección geológica sin actualizar).
  earlierSections: Map<string, string>;
  today: string;
};

const dmy = (iso?: string | null) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "—");
const num = (value: string | null | undefined) => {
  const match = String(value ?? "").replace(",", ".").match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : null;
};
// Como en el Excel: sin ceros de relleno, con coma decimal (763125, 48,9).
const plain = (value: number) => String(Math.round(value * 1000) / 1000).replace(".", ",");
const differs = (a: number | null | undefined, b: number | null | undefined, tolerance: number) =>
  a !== null && a !== undefined && b !== null && b !== undefined && Math.abs(a - b) > tolerance;

function rangeText(rows: number[]) {
  if (!rows.length) return "";
  const sorted = [...rows].sort((a, b) => a - b);
  const parts: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];
  for (const row of [...sorted.slice(1), Number.NaN]) {
    if (row === prev + 1) {
      prev = row;
      continue;
    }
    parts.push(start === prev ? `${start}` : `${start}–${prev}`);
    start = row;
    prev = row;
  }
  return parts.length > 4 ? `${parts.slice(0, 4).join(", ")}…` : parts.join(", ");
}

export function reviewWorkbook({ parsed, hole, match, previous, earlierSections, today }: ReviewInput): Finding[] {
  const out: Finding[] = [];
  const cell = (field: keyof ParsedGeologyWorkbook["cells"], fallback: string) => parsed.cells[field] ?? fallback;
  const summarySheet = parsed.summarySheet ?? "01_RESUMEN";
  const logSheet = parsed.logSheet ?? "02_QUICK_LOG";
  const add = (severity: Severity, where: string, message: string) => out.push({ severity, where, message });

  // ─── Pozo ────────────────────────────────────────────────────────────────
  const code = parsed.holeCode;
  if (!code) add("error", cell("holeCode", `${summarySheet}!A6`), "Falta el código del sondaje.");
  else if (!match) {
    add(
      "error",
      cell("holeCode", `${summarySheet}!A6`),
      hole
        ? `El sondaje «${code}» no existe en Programas. Elegiste importarlo al ${hole.code}: unifica el código en el Excel.`
        : `El sondaje «${code}» no existe en Programas. Corrige el código en el Excel o elige a qué pozo corresponde.`
    );
  }
  else if (hole && hole.id !== match.hole.id) {
    add("error", cell("holeCode", `${summarySheet}!A6`), `El Excel dice «${code}» y lo estás importando al ${hole.code}.`);
  } else if (!match.certain) {
    // ¿El código raro aparece en el quick log como continuación de los tramos del pozo? (re-perforación)
    const base = normalizeHoleCode(match.hole.code);
    const suffixRows = parsed.logRows.filter((_, index) => {
      const id = parsed.logMeta[index]?.holeId;
      return id && normalizeHoleCode(id) !== base && normalizeHoleCode(id).startsWith(base);
    });
    const baseReach = parsed.logRows
      .filter((_, index) => normalizeHoleCode(parsed.logMeta[index]?.holeId ?? base) === base)
      .reduce((max, row) => Math.max(max, row.toDepth), 0);
    const continuation =
      suffixRows.length && Math.abs(Math.min(...suffixRows.map((row) => row.fromDepth)) - baseReach) <= 1
        ? ` En el quick log continúa los tramos del ${match.hole.code} desde ${plain(baseReach)} m, así que es el mismo pozo.`
        : "";
    add(
      "error",
      cell("holeCode", `${summarySheet}!A6`),
      `El sondaje «${code}» no existe en Programas. Se importará al ${match.hole.code}.${continuation} Si es correcto, unifica el código en el Excel.`
    );
  }
  if (parsed.fileHole && hole && normalizeHoleCode(parsed.fileHole) !== normalizeHoleCode(hole.code)) {
    add("warning", "Nombre del archivo", `El nombre del archivo es del pozo ${parsed.fileHole} y se está importando al ${hole.code}.`);
  }
  if (hole) {
    const byId = new Map<string, number[]>();
    const depthById = new Map<string, [number, number]>();
    parsed.logMeta.forEach((meta, index) => {
      const id = meta.holeId ?? "(vacío)";
      if (meta.holeId && normalizeHoleCode(meta.holeId) === normalizeHoleCode(hole.code)) return;
      byId.set(id, [...(byId.get(id) ?? []), meta.row]);
      const row = parsed.logRows[index];
      const span = depthById.get(id);
      depthById.set(id, span ? [Math.min(span[0], row.fromDepth), Math.max(span[1], row.toDepth)] : [row.fromDepth, row.toDepth]);
    });
    for (const [id, rows] of byId) {
      const span = depthById.get(id)!;
      add("warning", `${logSheet} filas ${rangeText(rows)}`, `Hole_ID «${id}» distinto del pozo ${hole.code} (${rows.length} tramo(s), ${fmt(span[0])}–${fmt(span[1])} m).`);
    }
    for (const title of parsed.sheetTitles) {
      const titleCode = title.text.split("|")[1]?.trim();
      if (titleCode && normalizeHoleCode(titleCode) !== normalizeHoleCode(hole.code) && (!code || normalizeHoleCode(titleCode) !== normalizeHoleCode(code))) {
        add("warning", title.where, `El título dice «${titleCode}» y el pozo es ${hole.code}.`);
      }
    }
  }

  // ─── Fechas ──────────────────────────────────────────────────────────────
  if (parsed.summarySheet && !parsed.date) add("error", cell("date", `${summarySheet}!I6`), "Falta la fecha de reporte (o no se reconoce como fecha).");
  if (parsed.date && parsed.fileDate && parsed.date !== parsed.fileDate) {
    add("error", cell("date", `${summarySheet}!I6`), `La fecha de reporte es ${dmy(parsed.date)}, pero el nombre del archivo dice ${dmy(parsed.fileDate)}. ¿Se actualizó la hoja de resumen?`);
  }
  if (parsed.date && parsed.date > today) add("error", cell("date", `${summarySheet}!I6`), `La fecha de reporte ${dmy(parsed.date)} es posterior a hoy.`);
  if (parsed.startDate && parsed.date && parsed.startDate > parsed.date) {
    add("error", cell("startDate", `${summarySheet}!F24`), `La fecha de inicio (${dmy(parsed.startDate)}) es posterior a la del reporte (${dmy(parsed.date)}).`);
  }
  if (previous?.startDate && parsed.startDate && previous.startDate.slice(0, 10) !== parsed.startDate) {
    add("warning", cell("startDate", `${summarySheet}!F24`), `La fecha de inicio cambió: ${dmy(parsed.startDate)} aquí y ${dmy(previous.startDate)} en ${previous.source}.`);
  }

  // ─── Profundidades ───────────────────────────────────────────────────────
  const { fromDepth, toDepth } = parsed;
  if (parsed.summarySheet && fromDepth === null) add("error", cell("fromDepth", `${summarySheet}!A10`), "Falta la profundidad anterior.");
  if (parsed.summarySheet && toDepth === null) add("error", cell("toDepth", `${summarySheet}!E10`), "Falta la profundidad actual.");
  if (fromDepth !== null && toDepth !== null) {
    if (toDepth < fromDepth) add("error", cell("toDepth", `${summarySheet}!E10`), `La profundidad actual (${plain(toDepth)} m) es menor que la anterior (${plain(fromDepth)} m).`);
    else if (toDepth === fromDepth) add("info", cell("toDepth", `${summarySheet}!E10`), `Día sin avance: profundidad anterior y actual son ${plain(toDepth)} m.`);
  }
  if (previous && fromDepth !== null && differs(previous.toDepth, fromDepth, 0.01)) {
    add(
      "warning",
      cell("fromDepth", `${summarySheet}!A10`),
      `La profundidad anterior es ${plain(fromDepth)} m, pero ${previous.source} (${dmy(previous.date)}) terminó en ${plain(previous.toDepth)} m. ${
        fromDepth > previous.toDepth ? `Faltan ${plain(fromDepth - previous.toDepth)} m sin reportar.` : "Los tramos se repiten."
      }`
    );
  }
  const logReach = parsed.logRows.reduce((max, row) => Math.max(max, row.toDepth), 0);
  if (toDepth !== null && logReach > toDepth + 0.01) {
    add("error", logSheet, `El quick log llega a ${fmt(logReach)} m, más que la profundidad actual reportada (${plain(toDepth)} m en ${cell("toDepth", "E10")}).`);
  }

  // ─── Información del sondaje vs Programas ────────────────────────────────
  if (hole) {
    const coords: Array<[keyof ParsedGeologyWorkbook["cells"], string, number | null, number | null | undefined, number]> = [
      ["plannedEast", "Este programado", parsed.plannedEast, hole.plannedEast, 1],
      ["plannedNorth", "Norte programado", parsed.plannedNorth, hole.plannedNorth, 1],
      ["plannedElevation", "Elevación programada", parsed.plannedElevation, hole.plannedElevation, 1]
    ];
    for (const [field, label, excel, system, tolerance] of coords) {
      if (differs(excel, system, tolerance)) {
        add("error", cell(field, summarySheet), `${label}: ${plain(excel!)} en el Excel, pero ${plain(system!)} en Programas. ¿Error de tipeo?`);
      }
    }
    const executed: Array<[keyof ParsedGeologyWorkbook["cells"], string, number | null, number | null | undefined]> = [
      ["executedEast", "Este ejecutado", parsed.executedEast, hole.east],
      ["executedNorth", "Norte ejecutado", parsed.executedNorth, hole.north],
      ["executedElevation", "Elevación ejecutada", parsed.executedElevation, hole.elevation]
    ];
    for (const [field, label, excel, system] of executed) {
      if (differs(excel, system, 1)) add("warning", cell(field, summarySheet), `${label}: ${plain(excel!)} en el Excel y ${plain(system!)} en Programas.`);
    }
    const azimuth = num(parsed.azimuth);
    if (differs(azimuth, hole.plannedAzimuth, 1)) add("error", cell("azimuth", summarySheet), `Azimut «${parsed.azimuth}» en el Excel, pero ${plain(hole.plannedAzimuth!)}° en Programas.`);
    // La inclinación se compara sin signo: Programas la guarda positiva (52) y el Excel negativa (-52°).
    const dip = num(parsed.dip);
    if (dip !== null && hole.plannedDip !== null && hole.plannedDip !== undefined && differs(Math.abs(dip), Math.abs(hole.plannedDip), 1)) {
      add("error", cell("dip", summarySheet), `Inclinación «${parsed.dip}» en el Excel, pero ${plain(hole.plannedDip)}° en Programas.`);
    }
    const programmed = num(parsed.programmedDepth);
    if (differs(programmed, hole.plannedDepth, 0.5)) add("error", cell("programmedDepth", summarySheet), `Profundidad programada «${parsed.programmedDepth}» en el Excel, pero ${plain(hole.plannedDepth!)} m en Programas.`);
    const planned = programmed ?? hole.plannedDepth ?? null;
    if (planned !== null && toDepth !== null && toDepth > planned + 0.01) add("warning", cell("toDepth", `${summarySheet}!E10`), `La profundidad actual (${plain(toDepth)} m) supera la programada (${plain(planned)} m).`);
  }
  if (previous) {
    const changes: Array<[keyof ParsedGeologyWorkbook["cells"], string, string | null, string | null | undefined]> = [
      ["rigName", "Equipo", parsed.rigName, previous.rigName],
      ["diameter", "Diámetro", parsed.diameter, previous.diameter],
      ["casing", "Encamizado", parsed.casing, previous.casing]
    ];
    for (const [field, label, now, before] of changes) {
      if (now && before && now !== before) add("info", cell(field, summarySheet), `${label} cambió: «${now}» (antes «${before}», ${dmy(previous.date)}).`);
    }
  }

  // ─── Textos ──────────────────────────────────────────────────────────────
  if (parsed.summarySheet) {
    if (!parsed.geologists) add("warning", cell("geologists", `${summarySheet}!F25`), "Faltan los geólogos responsables.");
    if (!parsed.geologySummary) add("warning", cell("geologySummary", summarySheet), "El resumen geológico del avance está vacío.");
    if (!parsed.operationalNotes) add("warning", cell("operationalNotes", summarySheet), "Las observaciones operativas están vacías.");
    const described = [...(parsed.geologySummary ?? "").matchAll(/(\d{1,4}[.,]\d{1,2})\s*(?:m\b|[-–])/g)].map((m) => Number(m[1].replace(",", ".")));
    if (described.length && fromDepth !== null && Math.min(...described) < fromDepth - 0.5) {
      add("info", cell("geologySummary", summarySheet), `El resumen describe desde ${plain(Math.min(...described))} m y el intervalo reportado empieza en ${plain(fromDepth)} m.`);
    }
  }

  // ─── Quick log ───────────────────────────────────────────────────────────
  if (parsed.logSheet && parsed.logRows.length === 0) add("warning", logSheet, "El quick log no tiene tramos.");
  if (parsed.logSkippedRows.length) {
    add("warning", `${logSheet} filas ${rangeText(parsed.logSkippedRows)}`, `${parsed.logSkippedRows.length} fila(s) sin mFrom/mTo válidos (o «hasta» no mayor que «desde»): no se importan.`);
  }
  let reach: { row: number; from: number; to: number } | null = null;
  const issues: Finding[] = [];
  parsed.logRows.forEach((row, index) => {
    const meta = parsed.logMeta[index];
    if (reach) {
      if (row.fromDepth < reach.to - 1e-6) {
        issues.push({ severity: "warning", where: `${logSheet} filas ${reach.row} y ${meta.row}`, message: `Solape: ${fmt(reach.from)}–${fmt(reach.to)} m y ${fmt(row.fromDepth)}–${fmt(row.toDepth)} m.` });
      } else if (row.fromDepth > reach.to + 1e-6) {
        issues.push({ severity: "warning", where: `${logSheet} filas ${reach.row} y ${meta.row}`, message: `Hueco: no hay logueo entre ${fmt(reach.to)} y ${fmt(row.fromDepth)} m.` });
      }
    }
    if (!reach || row.toDepth > reach.to) reach = { row: meta.row, from: row.fromDepth, to: row.toDepth };
  });
  out.push(...issues);
  const badIntensity = parsed.logRows
    .map((row, index) => ({ row, meta: parsed.logMeta[index] }))
    .filter(({ row }) => [row.alteration1Int, row.alteration2Int].some((value) => value !== null && value !== undefined && (value < 0 || value > 5)));
  if (badIntensity.length) add("warning", `${logSheet} filas ${rangeText(badIntensity.map((item) => item.meta.row))}`, "Intensidad de alteración fuera de la escala 0–5.");
  if (parsed.logBadDates) {
    add("warning", `${logSheet} columna Date_Logged`, `${parsed.logBadDates} fecha(s) escritas con «<» en lugar de «-» (por ejemplo 2026<10-09): el sistema las lee bien, pero conviene corregirlo en la app de logueo.`);
  }
  if (parsed.logUnreadDates.length) {
    add("warning", `${logSheet} filas ${rangeText(parsed.logUnreadDates)}`, `${parsed.logUnreadDates.length} fecha(s) de logueo (Date_Logged) que no se pudieron leer: el tramo se importa sin fecha.`);
  }

  const unknown: string[] = [];
  const collect = (label: string, dictionary: Record<string, unknown>, values: Array<string | null | undefined>) => {
    const codes = [...new Set(values.filter((value): value is string => Boolean(value)).filter((value) => !(value in dictionary)))];
    if (codes.length) unknown.push(`${label}: ${codes.join(", ")}`);
  };
  collect("Litología", LITHOLOGY, parsed.logRows.map((row) => row.lithology));
  collect("Textura", TEXTURES, parsed.logRows.map((row) => row.texture));
  collect("Soporte", SUPPORTS, parsed.logRows.map((row) => row.support));
  collect("Alteración", ALTERATIONS, parsed.logRows.flatMap((row) => [row.alteration1, row.alteration2]));
  collect("Minerales", MINERALS, parsed.logRows.flatMap((row) => (row.minerals ?? []).map((mineral) => mineral.mineral)));
  collect("Estilo", MINERAL_STYLES, parsed.logRows.flatMap((row) => (row.minerals ?? []).map((mineral) => mineral.style)));
  collect("Estructuras", STRUCTURES, parsed.logRows.flatMap((row) => (row.structures ?? []).map((structure) => structure.type)));
  if (unknown.length) add("info", logSheet, `Códigos sin descripción en el sistema (se guardan tal cual): ${unknown.join(" · ")}.`);

  // ─── Fotos ───────────────────────────────────────────────────────────────
  if (!parsed.photos.length) add("warning", "Fotografías", "El archivo no trae fotografías.");
  for (const photo of parsed.photos.filter((item) => item.kind === "SECTION")) {
    const seen = photo.hash ? earlierSections.get(photo.hash) : undefined;
    if (seen) add("info", `${photo.sheet}`, `La sección geológica es la misma imagen que ${seen}: no se actualizó.`);
  }
  for (const warning of parsed.warnings) add("warning", "Archivo", warning);

  const order: Record<Severity, number> = { error: 0, warning: 1, info: 2 };
  return out.sort((a, b) => order[a.severity] - order[b.severity]);
}

export const SEVERITY_LABEL: Record<Severity, string> = { error: "Corregir", warning: "Revisar", info: "Nota" };
