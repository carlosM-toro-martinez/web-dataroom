import type { DrillingCampaign, DrillingHole } from "@/features/sondajes/model/sondajes.schema";
import type { GeologyReportPayload } from "@/features/sondajes/model/geology.schema";
import type { PhotoView } from "@/features/sondajes/lib/geology";
import logo from "@/assets/marte-logo-reporte.jpeg?inline";

// Hoja imprimible idéntica al Excel "Reporte diario de perforación diamantina" del equipo de geología:
//   Página 1 = 01_RESUMEN · Página 2 = 03_FOTOGRAFIAS · Página 3 = 04_SECCION_GEOLOGICA.
// El logueo (02_QUICK_LOG) es una tabla de datos y no forma parte de la hoja impresa, igual que en el Excel.

export const REPORTE_GEOLOGICO = {
  empresa: "Empresa Minera MARTE S.R.L.",
  titulo: (year: string) => `REPORTE DIARIO DE PERFORACIÓN DIAMANTINA DDH ${year}`,
  memoria: (code: string) => `MEMORIA FOTOGRÁFICA DE TESTIGOS | ${code}`,
  seccion: (code: string) => `SECCIÓN GEOLÓGICA ACUMULADA | ${code}`,
  proyecto: (campaign?: DrillingCampaign) => campaign?.area || campaign?.name || ""
};

export type PrintPhoto = PhotoView & { src: string };
type Context = { hole?: DrillingHole; campaign?: DrillingCampaign; photos: PrintPhoto[] };

function esc(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Números como se ven en el Excel: sin ceros sobrantes (177, 4994.89).
function plain(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return "";
  return String(Math.round(value * 100) / 100);
}

function dateText(iso?: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(date.getUTCDate())}/${pad(date.getUTCMonth() + 1)}/${date.getUTCFullYear()}`;
}

const titleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();

function paragraphs(value?: string | null) {
  if (!value?.trim()) return "";
  return value
    .split(/\n+/)
    .map((line) => `<p>${esc(line.trim())}</p>`)
    .join("");
}

function photoGrid(photos: PrintPhoto[], columns: number) {
  if (photos.length === 0) return "";
  return `<div class="photos c${columns}">${photos
    .map((photo) => `<figure><img src="${photo.src}" alt="" />${photo.caption ? `<figcaption>${esc(photo.caption)}</figcaption>` : ""}</figure>`)
    .join("")}</div>`;
}

export function buildGeologyReportHtml(report: GeologyReportPayload, { hole, campaign, photos }: Context) {
  const year = report.date.slice(0, 4);
  const code = hole?.code ?? "";
  const project = REPORTE_GEOLOGICO.proyecto(campaign);
  const advance = report.toDepth - report.fromDepth;
  const representative = photos.filter((photo) => photo.kind === "DETAIL");
  const memory = photos.filter((photo) => photo.kind === "CORE_BOX" || photo.kind === "OTHER");
  const section = photos.filter((photo) => photo.kind === "SECTION");
  const footerSheets = `Proyecto ${titleCase(project)} | ${REPORTE_GEOLOGICO.empresa} | DDH ${year}`;
  const header = `<header><img src="${logo}" alt="${esc(REPORTE_GEOLOGICO.empresa)}" /></header>`;

  const info = (label: string, value: string, columns = 6) => `<tr><td class="l">${esc(label)}</td><td colspan="${columns}">${esc(value)}</td></tr>`;

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Reporte diario ${esc(code)} ${esc(dateText(report.date))}</title>
<style>
  @page { size: letter portrait; margin: 10mm; }
  * { box-sizing: border-box; }
  :root { --ink: #12324f; --line: #94a3b8; --soft: #eef2f7; }
  body { margin: 0; background: #e5e7eb; color: #0f172a; font-family: Calibri, Arial, Helvetica, sans-serif; font-size: 11px; }
  .page { width: 780px; max-width: 100%; margin: 12px auto; padding: 18px 22px; background: #fff; display: flex; flex-direction: column; min-height: 1000px; }
  header img { height: 46px; display: block; }
  h1 { margin: 10px 0 12px; text-align: center; color: var(--ink); font-size: 16px; letter-spacing: .3px; }
  .boxes { display: grid; gap: 8px; margin-bottom: 8px; }
  .boxes.two { grid-template-columns: 2fr 1fr; }
  .boxes.three { grid-template-columns: repeat(3, 1fr); }
  .box { border: 1.5px solid var(--ink); border-radius: 4px; padding: 5px 9px; }
  .box span { display: block; font-size: 8.5px; font-weight: 800; color: #475569; letter-spacing: .5px; }
  .box b { display: block; font-size: 17px; color: var(--ink); margin-top: 2px; }
  .box.accent { background: var(--ink); }
  .box.accent span { color: #cbd5e1; } .box.accent b { color: #fff; }
  h2 { margin: 14px 0 6px; font-size: 11px; color: #fff; background: var(--ink); padding: 4px 8px; letter-spacing: .4px; }
  h3 { margin: 10px 0 6px; font-size: 10px; color: var(--ink); letter-spacing: .4px; }
  table { width: 100%; border-collapse: collapse; }
  .info td, .info th { border: 1px solid var(--line); padding: 3px 6px; text-align: left; }
  .info th { background: var(--soft); font-size: 9.5px; color: #334155; text-align: center; }
  .info td.l { font-weight: 700; color: #334155; width: 29%; }
  .info td.n { text-align: right; font-variant-numeric: tabular-nums; }
  .interval { font-weight: 800; color: var(--ink); margin: 2px 0 6px; }
  p { margin: 0 0 5px; line-height: 1.45; text-align: justify; white-space: pre-wrap; }
  .photos { display: grid; gap: 8px; }
  .photos.c3 { grid-template-columns: repeat(3, 1fr); }
  .photos.c2 { grid-template-columns: repeat(2, 1fr); }
  .photos.c1 { grid-template-columns: 1fr; }
  figure { margin: 0; break-inside: avoid; }
  figure img { display: block; width: 100%; height: auto; border: 1px solid var(--line); }
  figcaption { padding-top: 2px; font-size: 9px; color: #334155; }
  .grow { flex: 1; }
  footer { margin-top: 14px; border-top: 2px solid var(--ink); padding-top: 5px; display: flex; justify-content: space-between; font-size: 9.5px; font-weight: 700; color: #334155; }
  footer.center { justify-content: center; }
  .sheet-title { text-align: left; margin-top: 8px; }
  @media print {
    body { background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { width: auto; margin: 0; padding: 0; min-height: 0; box-shadow: none; page-break-after: always; break-after: page; }
    .page:last-child { page-break-after: auto; break-after: auto; }
  }
</style>
</head>
<body>
<section class="page">
  ${header}
  <h1>${esc(REPORTE_GEOLOGICO.titulo(year))}</h1>

  <div class="boxes two">
    <div class="box"><span>SONDAJE</span><b>${esc(code)}</b></div>
    <div class="box"><span>FECHA DE REPORTE</span><b>${esc(dateText(report.date))}</b></div>
  </div>
  <div class="boxes three">
    <div class="box"><span>PROFUNDIDAD ANTERIOR</span><b>${plain(report.fromDepth)}</b></div>
    <div class="box"><span>PROFUNDIDAD ACTUAL</span><b>${plain(report.toDepth)}</b></div>
    <div class="box accent"><span>AVANCE EN 24 HORAS</span><b>${plain(advance)}</b></div>
  </div>

  <h2>1. INFORMACIÓN DEL SONDAJE</h2>
  <table class="info">
    <tr><th rowspan="2">Coordenadas UTM WGS84, zona 19S;Cota</th><th colspan="3">Programado</th><th colspan="3">Ejecutado</th></tr>
    <tr><th>Este (m)</th><th>Norte (m)</th><th>Elev (m)</th><th>Este (m)</th><th>Norte (m)</th><th>Elev (m)</th></tr>
    <tr><td class="l">&nbsp;</td>
      <td class="n">${plain(report.plannedEast)}</td><td class="n">${plain(report.plannedNorth)}</td><td class="n">${plain(report.plannedElevation)}</td>
      <td class="n">${plain(report.executedEast)}</td><td class="n">${plain(report.executedNorth)}</td><td class="n">${plain(report.executedElevation)}</td></tr>
    ${info("Equipo", report.rigName ?? "")}
    ${info("Diámetro", report.diameter ?? "")}
    ${info("Encamizado", report.casing ?? "")}
    ${info("Azimut", report.azimuth ?? "")}
    ${info("Inclinación", report.dip ?? "")}
    ${info("Profundidad programada", report.programmedDepth ?? "")}
    <tr><td class="l">Fecha de Inicio / Fecha de finalización</td><td colspan="3">${esc(dateText(report.startDate))}</td><td colspan="3">${esc(report.endStatus ?? "")}</td></tr>
    ${info("Geólogos responsables", report.geologists ?? "")}
  </table>

  <h2>2. RESUMEN GEOLÓGICO DEL AVANCE</h2>
  <p class="interval">INTERVALO REPORTADO: ${plain(report.fromDepth)} a ${plain(report.toDepth)} metros</p>
  ${paragraphs(report.geologySummary)}

  <h2>3. OBSERVACIONES OPERATIVAS</h2>
  ${paragraphs(report.operationalNotes)}

  <h2>4. EVIDENCIA GEOLÓGICA Y FOTOGRÁFICA</h2>
  <h3>FOTOGRAFÍA REPRESENTATIVA DEL TESTIGO</h3>
  ${photoGrid(representative, 3)}

  <div class="grow"></div>
  <footer><span>Geólogos: ${esc(report.geologists ?? "")}</span><span>DDH ${esc(year)} &nbsp;|&nbsp; ${esc(project)}</span></footer>
</section>

${
  memory.length
    ? `<section class="page">
  ${header}
  <h1 class="sheet-title">${esc(REPORTE_GEOLOGICO.memoria(code))}</h1>
  ${photoGrid(memory, 2)}
  <div class="grow"></div>
  <footer class="center"><span>${esc(footerSheets)}</span></footer>
</section>`
    : ""
}
${
  section.length
    ? `<section class="page">
  ${header}
  <h1 class="sheet-title">${esc(REPORTE_GEOLOGICO.seccion(code))}</h1>
  ${photoGrid(section, 1)}
  <div class="grow"></div>
  <footer class="center"><span>${esc(footerSheets)}</span></footer>
</section>`
    : ""
}
</body>
</html>`;
}

export function printGeologyReport(html: string) {
  const printWindow = window.open("", "_blank", "width=900,height=1100");
  if (!printWindow) throw new Error("El navegador bloqueó la ventana de impresión. Permite ventanas emergentes.");
  printWindow.document.open();
  printWindow.document.write(
    html.replace("</body>", `<script>window.addEventListener("load",()=>setTimeout(()=>{window.focus();window.print();},300));</script></body>`)
  );
  printWindow.document.close();
}

export function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
