import type { DrillingPhoto, GeologyReport, LogInterval } from "@/features/sondajes/model/geology.schema";
import type { GeologyObservation } from "@/features/sondajes/api/geologyApi";
import { normalizeHoleCode, type ParsedGeologyWorkbook } from "@/features/sondajes/lib/geologyExcel";

// Compara lo que dicen los Excel de reporte diario con lo que hay guardado en el sistema. No corrige nada.

const REPORT_FIELDS: Array<[string, string]> = [
  ["fromDepth", "Desde"],
  ["toDepth", "Hasta"],
  ["plannedEast", "Este planificado"],
  ["plannedNorth", "Norte planificado"],
  ["plannedElevation", "Cota planificada"],
  ["executedEast", "Este ejecutado"],
  ["executedNorth", "Norte ejecutado"],
  ["executedElevation", "Cota ejecutada"],
  ["rigName", "Equipo"],
  ["diameter", "Diámetro"],
  ["casing", "Casing"],
  ["azimuth", "Azimut"],
  ["dip", "Inclinación"],
  ["programmedDepth", "Profundidad programada"],
  ["startDate", "Fecha de inicio"],
  ["endStatus", "Estado al cierre"],
  ["geologists", "Geólogos"],
  ["geologySummary", "Resumen geológico"],
  ["operationalNotes", "Notas operativas"]
];

const LOG_FIELDS: Array<[string, string]> = [
  ["lithology", "Litología"],
  ["dataSet", "DataSet"],
  ["texture", "Textura"],
  ["support", "Soporte"],
  ["alteration1", "Alteración 1"],
  ["alteration1Int", "Intensidad alt. 1"],
  ["alteration2", "Alteración 2"],
  ["alteration2Int", "Intensidad alt. 2"],
  ["minerals", "Minerales"],
  ["structures", "Estructuras"],
  ["description", "Observación"],
  ["loggedBy", "Logueado por"]
];

const clean = (value: unknown): string => {
  if (value == null || value === "") return "";
  if (typeof value === "number") return String(+value.toFixed(4));
  if (Array.isArray(value)) {
    return value.length
      ? JSON.stringify(value.map((item) => Object.fromEntries(Object.entries(item as object).filter(([, v]) => v != null && v !== "").sort(([a], [b]) => a.localeCompare(b)))))
      : "";
  }
  return String(value).replace(/\s+/g, " ").trim();
};
const field = (key: string, value: unknown) => (key === "startDate" ? clean(value).slice(0, 10) : clean(value));
const shortText = (value: string, max = 220) => (!value ? "(vacío)" : value.length > max ? `${value.slice(0, max)}…` : value);
const dayLabel = (iso: string) => iso.split("-").reverse().join("/");
const meters = (n: number) => `${String(+n.toFixed(2)).replace(".", ",")} m`;
const dateOf = (value?: string | null) => (value ?? "").slice(0, 10);
const get = (target: unknown, key: string) => (target as Record<string, unknown>)[key];

type Input = {
  files: ParsedGeologyWorkbook[];
  holes: Array<{ id: string; code: string }>;
  data: Map<string, { reports: GeologyReport[]; log: LogInterval[]; photos: DrillingPhoto[] }>;
};

export function compareWorkbooks({ files, holes, data }: Input): GeologyObservation[] {
  const items: GeologyObservation[] = [];
  const holeFor = (code: string | null) => {
    if (!code) return undefined;
    const normalized = normalizeHoleCode(code);
    // «26DLP077b» es el mismo pozo 26DLP077 con una letra de reperforación.
    return holes.find((hole) => normalizeHoleCode(hole.code) === normalized) ?? holes.find((hole) => normalized.startsWith(normalizeHoleCode(hole.code)));
  };

  const byHole = new Map<string, ParsedGeologyWorkbook[]>();
  for (const file of files) {
    const hole = holeFor(file.holeCode) ?? holeFor(file.fileHole);
    if (!hole) {
      items.push({
        id: `excel:${file.fileName}:nohole`,
        severity: "warning",
        category: "Excel",
        hole: file.holeCode ?? file.fileHole ?? "?",
        holeId: "",
        title: `${file.fileName}: el pozo ${file.holeCode ?? file.fileHole ?? "?"} no existe en el sistema`,
        detail: "El código de pozo del Excel no coincide con ningún pozo creado, así que no se puede comparar.",
        suggestion: "Crea el pozo o revisa el código en el Excel.",
        evidence: [],
        target: { tab: "reports" }
      });
      continue;
    }
    byHole.set(hole.id, [...(byHole.get(hole.id) ?? []), file]);
  }

  for (const [holeId, list] of byHole) {
    const hole = holes.find((item) => item.id === holeId)!;
    const { reports, log, photos } = data.get(holeId) ?? { reports: [], log: [], photos: [] };
    const add = (o: Omit<GeologyObservation, "hole" | "holeId" | "category">) => items.push({ ...o, hole: hole.code, holeId, category: "Excel" });

    const mixedCodes = new Set<string>();
    const mixedFiles: string[] = [];
    for (const file of list) {
      const tag = file.fileName;
      if (file.fileHole && file.holeCode && normalizeHoleCode(file.fileHole) !== normalizeHoleCode(file.holeCode)) {
        add({
          id: `excel:${tag}:holename`,
          severity: "info",
          title: `${tag}: el nombre del archivo dice ${file.fileHole} y el contenido dice ${file.holeCode}`,
          detail: "El código del pozo en el nombre del archivo no es el mismo que dentro de la hoja de resumen.",
          suggestion: "Confirma cuál es el correcto. El sistema usó el del contenido.",
          evidence: [],
          target: { tab: "reports" }
        });
      }
      const other = file.logHoleIds.filter((code) => normalizeHoleCode(code) !== normalizeHoleCode(file.holeCode ?? ""));
      if (other.length) {
        mixedCodes.add([file.holeCode, ...other].join(", "));
        mixedFiles.push(tag);
      }
      if (file.fileDate && file.date && file.fileDate !== file.date) {
        add({
          id: `excel:${tag}:date`,
          severity: "warning",
          title: `${tag}: el nombre dice ${dayLabel(file.fileDate)} pero el contenido dice ${dayLabel(file.date)}`,
          detail: "La fecha del nombre del archivo no coincide con la fecha escrita dentro del reporte. El sistema usa la fecha del contenido.",
          suggestion: "Confirma la fecha correcta en el Excel y en el reporte.",
          evidence: [
            { label: "Nombre", value: dayLabel(file.fileDate) },
            { label: "Contenido", value: dayLabel(file.date) }
          ],
          target: { tab: "reports" }
        });
      }
      if (!file.date) continue;
      const report = reports.find((item) => dateOf(item.date) === file.date);
      if (!report) {
        add({
          id: `excel:${tag}:noreport`,
          severity: "warning",
          title: `${tag}: el reporte del ${dayLabel(file.date)} no está en el sistema`,
          detail: "Este Excel tiene un reporte que todavía no se cargó.",
          suggestion: "Impórtalo desde «Importar Excel».",
          evidence: [{ label: "Desde / hasta", value: `${meters(file.fromDepth ?? 0)} – ${meters(file.toDepth ?? 0)}` }],
          target: { tab: "reports" }
        });
        continue;
      }
      const diffs = REPORT_FIELDS.flatMap(([key, label]) => {
        const excel = field(key, get(file, key));
        const system = field(key, get(report, key));
        return excel === system ? [] : [{ label, excel, system }];
      });
      if (diffs.length) {
        add({
          id: `excel:${tag}:fields`,
          severity: "warning",
          title: `${tag}: ${diffs.length} dato(s) del reporte del ${dayLabel(file.date)} distinto(s) al sistema`,
          detail: "El Excel y el sistema dicen cosas diferentes en estos campos. Puede que el Excel sea una versión más vieja, o que alguien haya editado en el sistema. Revisa cuál es la correcta.",
          suggestion: "Edita el reporte en el sistema si el Excel es el correcto.",
          evidence: diffs.flatMap((d) => [
            { label: `${d.label} · Excel`, value: shortText(d.excel) },
            { label: `${d.label} · Sistema`, value: shortText(d.system) }
          ]),
          target: { tab: "reports", reportId: report.id }
        });
      }
    }

    if (mixedFiles.length) {
      add({
        id: `excel:logholes:${hole.code}`,
        severity: "info",
        title: `${hole.code}: el logueo de ${mixedFiles.length} Excel usa más de un código de pozo (${[...mixedCodes].join(" / ")})`,
        detail: "En la columna Hole_ID del logueo aparecen códigos distintos al del resumen (por ejemplo «26DLP077b»). El sistema guarda todo en el mismo pozo.",
        suggestion: "Si «b» es otra perforación, hay que decidir si debe ser un pozo aparte; si no, unifica el código en los Excel.",
        evidence: mixedFiles.slice(0, 20).map((name) => ({ label: "Archivo", value: name })),
        target: { tab: "log" }
      });
    }

    // Duplicados: dos archivos para el mismo día con contenido distinto.
    const perDate = new Map<string, ParsedGeologyWorkbook[]>();
    for (const file of list) if (file.date) perDate.set(file.date, [...(perDate.get(file.date) ?? []), file]);
    for (const [date, group] of perDate) {
      if (group.length < 2) continue;
      const base = group[0]!;
      for (const file of group.slice(1)) {
        const different = REPORT_FIELDS.filter(([key]) => field(key, get(base, key)) !== field(key, get(file, key))).map(([, label]) => label);
        const logDiff = base.logRows.length !== file.logRows.length;
        const differs = different.length > 0 || logDiff;
        add({
          id: `excel:dup:${hole.code}:${date}:${file.fileName}`,
          severity: differs ? "warning" : "info",
          title: `Dos archivos para el ${dayLabel(date)}: ${base.fileName} y ${file.fileName}`,
          detail: differs
            ? `Los dos archivos no son iguales (difieren en: ${[...different, ...(logDiff ? [`logueo ${base.logRows.length} vs ${file.logRows.length} tramos`] : [])].join(", ")}).`
            : "Los dos archivos tienen el mismo contenido.",
          suggestion: "Quédate con la versión correcta y descarta la otra.",
          evidence: [],
          target: { tab: "reports" }
        });
      }
    }

    // Logueo: se compara con el Excel más reciente, que trae el logueo acumulado del pozo.
    const latest = [...list]
      .filter((file) => file.date)
      .sort((a, b) => (a.date! < b.date! ? 1 : a.date! > b.date! ? -1 : b.logRows.length - a.logRows.length))[0];
    if (latest && latest.logRows.length) {
      const key = (row: { fromDepth: number; toDepth: number }) => `${row.fromDepth}|${row.toDepth}`;
      const system = new Map(log.map((row) => [key(row), row]));
      const excel = new Map(latest.logRows.map((row) => [key(row), row]));
      const onlyExcel = latest.logRows.filter((row) => !system.has(key(row)));
      const onlySystem = log.filter((row) => !excel.has(key(row)));
      const changed: Array<{ at: string; label: string; excel: string; system: string }> = [];
      for (const row of latest.logRows) {
        const match = system.get(key(row));
        if (!match) continue;
        for (const [fieldKey, label] of LOG_FIELDS) {
          const a = field(fieldKey, get(row, fieldKey));
          const b = field(fieldKey, get(match, fieldKey));
          if (a !== b) changed.push({ at: `${meters(row.fromDepth)} a ${meters(row.toDepth)}`, label, excel: a, system: b });
        }
      }
      const total = onlyExcel.length + onlySystem.length + changed.length;
      if (!total) {
        add({
          id: `excel:log:${hole.code}:ok`,
          severity: "info",
          title: `Logueo de ${hole.code}: coincide con ${latest.fileName}`,
          detail: `Los ${latest.logRows.length} tramos del Excel están en el sistema, campo por campo, sin diferencias.`,
          suggestion: "No hay nada que corregir.",
          evidence: [],
          target: { tab: "log" }
        });
      } else {
        add({
          id: `excel:log:${hole.code}`,
          severity: "warning",
          title: `Logueo de ${hole.code}: ${total} diferencia(s) con ${latest.fileName}`,
          detail: `Se comparó con el Excel más reciente del pozo (${dayLabel(latest.date!)}, ${latest.logRows.length} tramos). Sistema: ${log.length} tramos. ${onlyExcel.length} tramo(s) solo están en el Excel, ${onlySystem.length} solo en el sistema y ${changed.length} campo(s) tienen valores distintos.`,
          suggestion: "Revisa los tramos en la pestaña Logueo. Si el sistema tiene tramos de un reporte posterior al Excel, es normal.",
          evidence: [
            ...onlyExcel.slice(0, 15).map((row) => ({ label: "Solo en el Excel", value: `${meters(row.fromDepth)} a ${meters(row.toDepth)}` })),
            ...onlySystem.slice(0, 25).map((row) => ({ label: "Solo en el sistema", value: `${meters(row.fromDepth)} a ${meters(row.toDepth)}` })),
            ...changed.slice(0, 30).map((d) => ({ label: `${d.at} · ${d.label}`, value: `Excel: ${shortText(d.excel, 80)}  →  Sistema: ${shortText(d.system, 80)}` }))
          ],
          target: { tab: "log" }
        });
      }
    }

    // Fotos: las que traen los Excel frente a las registradas (se ignora el logo de la hoja de resumen).
    const excelPhotos = new Map<string, { file: string; sheet: string }>();
    for (const file of list) {
      for (const photo of file.photos) {
        if (photo.hash && photo.sheet !== file.summarySheet && !excelPhotos.has(photo.hash)) excelPhotos.set(photo.hash, { file: file.fileName, sheet: photo.sheet });
      }
    }
    const registered = new Set(photos.map((photo) => photo.contentHash).filter(Boolean));
    const notLoaded = [...excelPhotos].filter(([hash]) => !registered.has(hash));
    if (notLoaded.length) {
      add({
        id: `excel:photos:${hole.code}:missing`,
        severity: "warning",
        title: `${notLoaded.length} imagen(es) de los Excel no están en el sistema`,
        detail: "Estas imágenes vienen dentro de los Excel que elegiste, pero ninguna foto registrada coincide con ellas.",
        suggestion: "Impórtalas desde «Importar Excel».",
        evidence: notLoaded.slice(0, 20).map(([, info]) => ({ label: info.file, value: info.sheet })),
        target: { tab: "photos" }
      });
    }
    const notInExcel = photos.filter((photo) => photo.contentHash && !excelPhotos.has(photo.contentHash));
    if (notInExcel.length && excelPhotos.size) {
      add({
        id: `excel:photos:${hole.code}:extra`,
        severity: "info",
        title: `${notInExcel.length} foto(s) del sistema no vienen en los Excel que elegiste`,
        detail: "Están registradas pero no aparecen en ninguno de los archivos elegidos. Es normal si se subieron desde el celular o vienen de un Excel que no elegiste.",
        suggestion: "Si esperabas que estuvieran, elige también ese Excel.",
        evidence: notInExcel.slice(0, 20).map((photo) => ({ label: photo.code ?? photo.id, value: dateOf(photo.takenAt) ? dayLabel(dateOf(photo.takenAt)) : "" })),
        target: { tab: "photos" }
      });
    }
  }
  const order = { error: 0, warning: 1, info: 2 } as const;
  return items.sort((a, b) => order[a.severity] - order[b.severity] || a.hole.localeCompare(b.hole));
}
