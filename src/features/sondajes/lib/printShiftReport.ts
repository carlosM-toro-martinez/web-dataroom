import type { DrillingCampaign, DrillingHole } from "@/features/sondajes/model/sondajes.schema";
import type { ShiftReportPayload } from "@/features/sondajes/db/sondajesDb";
import { REPORTE_DIARIO } from "@/features/sondajes/config/reporteDiarioFormato";

// Hoja imprimible idéntica al formato en papel "Reporte diario de perforación diamantina".
// Los textos vienen de config/reporteDiarioFormato.ts.

type Context = { hole?: DrillingHole; campaign?: DrillingCampaign };

function esc(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function num(value: unknown, decimals = 2) {
  if (value === null || value === undefined || value === "") return "";
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return esc(value);
  return Number.isInteger(parsed) && decimals > 0 ? parsed.toFixed(decimals) : parsed.toFixed(decimals);
}

function qty(value: unknown) {
  if (value === null || value === undefined || value === "") return "";
  const parsed = Number(value);
  return Number.isFinite(parsed) ? String(parsed) : esc(value);
}

function dateText(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(date.getUTCDate())}/${pad(date.getUTCMonth() + 1)}/${date.getUTCFullYear()}`;
}

const box = (checked: boolean) => `<span class="box">${checked ? "✕" : ""}</span>`;

function line(label: string, value: string, unit = "") {
  return `<div class="line"><span class="lbl">${esc(label)}:</span><span class="val">${value}</span>${unit ? `<span class="unit">${esc(unit)}</span>` : ""}</div>`;
}

export function buildShiftReportHtml(report: ShiftReportPayload, context: Context) {
  const f = REPORTE_DIARIO;
  const hole = context.hole;
  const dip = hole?.dip ?? hole?.plannedDip;
  const advance = report.toDepth - report.fromDepth;
  const hours: Record<string, unknown> = {
    drilling: report.drillingHours,
    standby: report.standbyHours,
    ...(report.timeDetail ?? {})
  };
  const activities = report.activities ?? [];
  const rows = Array.from({ length: Math.max(f.filasActividades, activities.length) }, (_, index) => activities[index]);

  const activityRows = rows
    .map(
      (row) => `<tr>
        <td class="c">${esc(row?.from ?? "")}</td>
        <td class="c">${esc(row?.to ?? "")}</td>
        <td class="c">${num(row?.depthFrom)}</td>
        <td class="c">${num(row?.depthTo)}</td>
        <td>${esc(row?.description ?? "")}</td>
        <td>${esc(row?.lithology ?? "")}</td>
      </tr>`
    )
    .join("");

  const consumables = f.combustibles
    .map((item) => line(item.label, qty(report.consumables?.[item.key]), "Litros."))
    .join("");
  const additives = f.aditivos.map((item) => line(item.label, qty(report.additives?.[item.key]), "Kg.")).join("");
  const hourLines = f.horas.map((item) => line(item.label, qty(hours[item.key]), "Hrs.")).join("");

  // Igual que la hoja: PQ-WL · NQ-WL · RC  /  HQ-WL · BQ-WL · CASING.
  const diameterBox = (diameter?: string) =>
    diameter ? `<span class="opt">${esc(diameter)}: ${box(report.diameter === diameter)}</span>` : "<span></span>";
  const freeLine = (label: string, value: string) =>
    `<div class="line" style="margin:0"><span class="lbl">${esc(label)}:</span><span class="val" style="min-width:58px">${value}</span></div>`;
  const diameterBoxes =
    diameterBox(f.diametros[0]) + diameterBox(f.diametros[1]) + freeLine("RC", esc(report.rcDiameter ?? "")) +
    diameterBox(f.diametros[2]) + diameterBox(f.diametros[3]) + freeLine("Casing", esc(report.casing ?? ""));

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Reporte diario ${esc(hole?.code ?? "")} ${esc(dateText(report.date))} turno ${esc(f.turnos[report.shift])}</title>
<style>
  @page { size: letter portrait; margin: 8mm 9mm; }
  * { box-sizing: border-box; }
  :root { --ink: #1f4fa3; --val: #0b1a3a; }
  body { margin: 0; background: #fff; color: var(--ink); font-family: Arial, Helvetica, sans-serif; font-size: 10px; }
  .sheet { width: 100%; max-width: 780px; margin: 0 auto; border: 1.5px solid var(--ink); }
  table { width: 100%; border-collapse: collapse; }
  td, th { border: 1px solid var(--ink); padding: 2px 4px; vertical-align: top; }
  .head td { border: 0; border-bottom: 1.5px solid var(--ink); }
  .logo { width: 44%; border-right: 1.5px solid var(--ink) !important; padding: 4px 6px; }
  .logo .name { font-family: "Arial Black", Arial, sans-serif; font-size: 19px; font-weight: 900; letter-spacing: .3px; white-space: nowrap; }
  .logo .svc { font-size: 6.5px; font-weight: 700; line-height: 1.25; margin-top: 2px; }
  .title { text-align: center; vertical-align: middle !important; font-size: 13px; font-weight: 800; }
  .hdr th { font-size: 9px; font-weight: 800; text-align: center; padding: 1px; }
  .hdr td { height: 26px; vertical-align: middle; text-align: center; color: var(--val); font-weight: 700; font-size: 11px; }
  .turno { display: inline-flex; gap: 12px; align-items: center; color: var(--ink); font-weight: 700; }
  .box { display: inline-block; width: 22px; height: 15px; border: 1px solid var(--ink); vertical-align: middle; text-align: center; line-height: 14px; color: var(--val); font-weight: 900; }
  .blk td { border-left: 0; border-right: 0; padding: 5px 6px; }
  .blk td + td { border-left: 1.5px solid var(--ink); }
  .line { display: flex; align-items: baseline; gap: 4px; margin: 5px 0; white-space: nowrap; }
  .line .lbl { font-weight: 700; text-transform: uppercase; font-size: 9px; }
  .line .val { flex: 1; border-bottom: 1px dotted var(--ink); color: var(--val); font-weight: 700; font-size: 11px; min-height: 13px; padding-left: 4px; white-space: normal; }
  .line .unit { font-size: 9px; }
  .sub { font-weight: 800; font-size: 9px; margin-bottom: 4px; }
  .opts { display: grid; grid-template-columns: auto auto auto auto; gap: 7px 12px; align-items: center; font-weight: 700; font-size: 9px; }
  .opt { white-space: nowrap; }
  .act th { font-size: 10.5px; font-weight: 800; background: #fff; }
  .act th.small { font-size: 9px; }
  .act td { height: 17px; color: var(--val); font-size: 10px; }
  .act .c { text-align: center; }
  .three td { width: 33.33%; border-left: 0; border-right: 0; padding: 4px 6px; }
  .three td + td { border-left: 1.5px solid var(--ink); }
  .three .line .lbl { text-transform: none; font-size: 10px; }
  .obs { padding: 4px 6px; border-top: 1.5px solid var(--ink); }
  .obs .text { min-height: 74px; color: var(--val); font-weight: 600; font-size: 11px; white-space: pre-wrap;
    background-image: repeating-linear-gradient(to bottom, transparent 0, transparent 17px, rgba(31,79,163,.55) 17px, rgba(31,79,163,.55) 18px);
    line-height: 18px; }
  .signs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 34px; padding: 34px 26px 4px; }
  .sign { border-top: 1px solid var(--ink); text-align: center; padding-top: 3px; font-size: 8.5px; font-weight: 800; }
  .sign .who { display: block; color: var(--val); font-weight: 700; font-size: 10px; min-height: 12px; }
  .foot { border-top: 1.5px solid var(--ink); text-align: center; font-weight: 800; font-size: 9px; padding: 4px; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .sheet { max-width: none; } }
</style>
</head>
<body>
<div class="sheet">
  <table class="head"><tr>
    <td class="logo">
      <div class="name">${esc(f.empresa)}</div>
      <div class="svc">${esc(f.serviciosTitulo)}<br />${f.servicios.map(esc).join("<br />")}</div>
    </td>
    <td class="title">${esc(f.titulo)}</td>
  </tr></table>

  <table class="hdr">
    <tr><th style="width:21%">PROYECTO</th><th style="width:24%">POZO</th><th style="width:13%">BUZAMIENTO</th><th style="width:13%">FECHA</th><th style="width:17%">TURNO</th><th style="width:12%">No.</th></tr>
    <tr>
      <td>${esc(f.proyecto(context.campaign))}</td>
      <td>${esc(hole?.code ?? "")}</td>
      <td>${dip === null || dip === undefined ? "" : `${esc(dip)}°`}</td>
      <td>${esc(dateText(report.date))}</td>
      <td><span class="turno">A ${box(report.shift === "DAY")} B ${box(report.shift === "NIGHT")}</span></td>
      <td>${esc(report.reportNumber ?? "")}</td>
    </tr>
  </table>

  <table class="blk"><tr>
    <td style="width:55%">
      ${line("Profundidad anterior", num(report.fromDepth), f.unidad)}
      ${line("Avance del turno", num(advance), f.unidad)}
      ${line("Profundidad actual", num(report.toDepth), f.unidad)}
      ${line("Recuperación de core", num(report.coreRecovery), f.unidad)}
    </td>
    <td>
      ${line("Retorno de agua", esc(report.waterReturn ?? ""))}
      ${line("Roca atravesada", esc(report.rockType ?? ""))}
      ${line("Máquina de perforación", esc(report.rigName ?? ""))}
      ${line("Nº caja de core", esc(report.coreBoxNumber ?? ""))}
    </td>
  </tr></table>

  <table class="blk"><tr>
    <td style="width:55%">
      <div style="display:flex;gap:18px">
        <div>
          <div class="sub">PERFORACIÓN</div>
          <div class="opts" style="grid-template-columns:auto auto">
            <span class="opt">${esc(f.perforacion.DIAMOND)}:</span>${box(report.drillingMethod === "DIAMOND")}
            <span class="opt">${esc(f.perforacion.REVERSE_AIR)}:</span>${box(report.drillingMethod === "REVERSE_AIR")}
          </div>
        </div>
        <div style="flex:1">
          <div class="sub">DIÁMETRO DE LA PERFORACIÓN</div>
          <div class="opts" style="grid-template-columns:auto auto 1fr">${diameterBoxes}</div>
        </div>
      </div>
    </td>
    <td>
      ${line("Corona Nro.", esc(report.crownNumber ?? ""))}
      ${line("Escareador Nro.", esc(report.reamerNumber ?? ""))}
      ${line("Zapata Nro.", esc(report.shoeNumber ?? ""))}
    </td>
  </tr></table>

  <table class="blk"><tr>
    <td style="width:55%">
      ${line("Perforista", esc(report.operator ?? ""))}
      ${line("Ayte. segunda", esc(report.secondHelper ?? ""))}
    </td>
    <td>
      ${line("Ayte. primera", esc(report.firstHelper ?? ""))}
      ${line("Chofer", esc(report.driver ?? ""))}
    </td>
  </tr></table>

  <table class="act">
    <tr><th colspan="2">Tiempo Hrs.</th><th colspan="2">Profundidad-ml.</th><th rowspan="2" style="width:37%">Descripción</th><th rowspan="2" style="width:20%">Litología</th></tr>
    <tr><th class="small" style="width:9%">Desde</th><th class="small" style="width:9%">Hasta</th><th class="small" style="width:12%">De</th><th class="small" style="width:12%">A</th></tr>
    ${activityRows}
  </table>

  <table class="three"><tr>
    <td><div class="sub">Combustible:</div>${consumables}${line(f.combustibleOtros, esc(report.consumables?.other ?? ""))}</td>
    <td><div class="sub">Aditivos:</div>${additives}</td>
    <td><div class="sub">Detalle:</div>${hourLines}</td>
  </tr></table>

  <div class="obs">
    <div class="sub">Observaciones:</div>
    <div class="text">${esc(report.observations ?? "")}</div>
  </div>

  <div class="signs">
    <div class="sign"><span class="who">${esc(report.supervisor ?? "")}</span>${esc(f.firmas[0])}</div>
    <div class="sign"><span class="who">${esc(report.drillingChief ?? "")}</span>${esc(f.firmas[1])}</div>
    <div class="sign"><span class="who">${esc(report.operator ?? "")}</span>${esc(f.firmas[2])}</div>
  </div>
  <div class="foot">${esc(f.pie)}</div>
</div>
</body>
</html>`;
}

// Abre la hoja lista para imprimir o "Guardar como PDF".
export function printShiftReport(report: ShiftReportPayload, context: Context) {
  const printWindow = window.open("", "_blank", "width=900,height=1100");
  if (!printWindow) throw new Error("El navegador bloqueó la ventana de impresión. Permite ventanas emergentes.");
  const html = buildShiftReportHtml(report, context).replace(
    "</body>",
    `<script>window.addEventListener("load",()=>setTimeout(()=>{window.focus();window.print();},250));</script></body>`
  );
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
