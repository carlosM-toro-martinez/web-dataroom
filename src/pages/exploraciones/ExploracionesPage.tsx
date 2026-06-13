import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  ChevronDown,
  ChevronUp,
  Eye,
  FileDown,
  FileUp,
  FileSpreadsheet,
  FlaskConical,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
  X
} from "lucide-react";
import { ZodError } from "zod";
import { useNavigate } from "react-router-dom";
import { ApiError } from "@/shared/api/core/apiError";
import {
  exploracionMuestraPayloadSchema,
  type ExploracionMuestraPayload,
  type ExploracionMuestraResponse
} from "@/features/exploraciones/model/muestra.schema";
import {
  useExploracionesElementosQuery,
  useExploracionesLaboratoriosQuery,
  useExploracionesOfflineQuery,
  useQueueRemoteEditOfflineMutation,
  useExploracionesRemotasQuery,
  useSaveMuestraOfflineMutation,
  useSaveMuestrasOfflineBatchMutation,
  useSyncExploracionesMutation,
  useUpdateMuestraOfflineMutation,
  useUpdateMuestraRemotaMutation
} from "@/features/exploraciones/hooks/useExploraciones";
import type { OfflineExploracionMuestra } from "@/features/exploraciones/db/exploracionesDb";
import { useToast } from "@/shared/ui/toast/ToastProvider";
import { InternalHeader } from "@/shared/ui/InternalHeader";
import {
  downloadTemplateXlsx,
  normalizeIsoFromCell,
  normalizeKey,
  parsePrefixedNumeric,
  readExcelRows
} from "@/features/exploraciones/lib/excel.utils";

const inputClassName =
  "w-full rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-4 py-3 text-base text-[var(--color-on-surface)] outline-none transition focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]";

const numberInputClassName = `${inputClassName} [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`;

const filterInputClassName =
  "rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] px-3 py-2 text-sm text-[var(--color-on-surface)] outline-none transition focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]";

interface DynamicResultado {
  id: string;
  elemento: string;
  valor: string;
}

interface FormState {
  nivel: string;
  este: string;
  norte: string;
  elevacion: string;
  referenciaLugar: string;
  nombre: string;
  numero: string;
  tipoMuestra: string;
  sector: string;
  laboratorio1: string;
  laboratorio2: string;
  laboratorio3: string;
  fechaMuestreo: string;
  fechaEntrega: string;
  descripcion: string;
}

type EditTarget = { mode: "local"; id: number } | { mode: "remota"; id: string } | null;
type DetailTarget =
  | { source: "local"; data: OfflineExploracionMuestra }
  | { source: "remota"; data: ExploracionMuestraResponse }
  | null;

type RowStatus = "Sincronizado" | "Pendiente local" | "Error de sincronizacion";
type RowSource = "local" | "remota";

interface TableRow {
  key: string;
  source: RowSource;
  id: number | string;
  nombre: string;
  numero?: number;
  tipoMuestra?: string;
  sector?: string;
  usuarioNombre?: string;
  nivel: string;
  laboratorio1?: string;
  laboratorio2?: string;
  laboratorio3?: string;
  fechaMuestreo?: string;
  fechaEntrega?: string;
  descripcion?: string;
  este?: number;
  norte?: number;
  elevacion?: number;
  referenciaLugar?: string;
  resultadosTexto: string;
  status: RowStatus;
  canEdit: boolean;
}

interface ExportRecord {
  estado: string;
  origen: string;
  nombre: string;
  codigo: string;
  tipoMuestra: string;
  sector: string;
  usuario: string;
  nivel: string;
  este: string;
  norte: string;
  elevacion: string;
  referenciaLugar: string;
  laboratorio1: string;
  laboratorio2: string;
  laboratorio3: string;
  fechaMuestreo: string;
  fechaEntrega: string;
  descripcion: string;
  resultados: string;
}

function mapRowToExportRecord(row: TableRow): ExportRecord {
  return {
    estado: row.status,
    origen: row.source === "local" ? "Local" : "Servidor",
    nombre: row.nombre,
    codigo: row.numero?.toString() ?? "",
    tipoMuestra: row.tipoMuestra ?? "",
    sector: row.sector ?? "",
    usuario: row.usuarioNombre ?? "",
    nivel: row.nivel,
    este: row.este?.toString() ?? "",
    norte: row.norte?.toString() ?? "",
    elevacion: row.elevacion?.toString() ?? "",
    referenciaLugar: row.referenciaLugar ?? "",
    laboratorio1: row.laboratorio1 ?? "",
    laboratorio2: row.laboratorio2 ?? "",
    laboratorio3: row.laboratorio3 ?? "",
    fechaMuestreo: formatDateTime(row.fechaMuestreo),
    fechaEntrega: formatDateTime(row.fechaEntrega),
    descripcion: row.descripcion ?? "",
    resultados: row.resultadosTexto
  };
}

function buildRowId() {
  if (typeof globalThis.crypto?.randomUUID === "function") return globalThis.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function buildInitialState(): FormState {
  return {
    nivel: "",
    este: "",
    norte: "",
    elevacion: "",
    referenciaLugar: "",
    nombre: "",
    numero: "",
    tipoMuestra: "",
    sector: "",
    laboratorio1: "",
    laboratorio2: "",
    laboratorio3: "",
    fechaMuestreo: "",
    fechaEntrega: "",
    descripcion: ""
  };
}

function getNowLaPazIso() {
  // Keep the exact current instant and serialize in canonical ISO (UTC, Z suffix)
  // so Zod/API datetime validation is always valid.
  return new Date().toISOString();
}

function toIsoDatetime(value: string) {
  if (!value.trim()) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function normalizeIsoDatetime(value?: string) {
  if (!value?.trim()) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function toLocalDatetimeInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-BO", {
    timeZone: "America/La_Paz",
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function toOptionalNumber(value: string) {
  return toNumberOrUndefined(value);
}

function parseChemicalValueWithPrefix(value: string) {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return undefined;

  // Read the numeric portion from the tail of the string and keep any
  // preceding text as prefix (examples: "<0.008", "> 2.5", "ND 0.01").
  const numericTailMatch = normalized.match(/-?\d+(\.\d+)?$/);
  if (!numericTailMatch) return undefined;

  const numericToken = numericTailMatch[0];
  const numeric = Number(numericToken);
  if (Number.isNaN(numeric)) return undefined;

  const prefixRaw = normalized.slice(0, normalized.length - numericToken.length).trim();
  const prefix = prefixRaw.length > 0 ? prefixRaw : undefined;

  return {
    valor: numeric,
    prefijo: prefix
  };
}

function normalizeLooseKey(text: string) {
  return normalizeKey(text).replace(/[^a-z0-9]/g, "");
}

function getCellValue(row: Record<string, unknown>, key: string) {
  const normalizedTarget = normalizeLooseKey(key);
  for (const [currentKey, currentValue] of Object.entries(row)) {
    if (normalizeLooseKey(currentKey) === normalizedTarget) {
      return currentValue;
    }
  }
  return undefined;
}

function getCellValueByAliases(row: Record<string, unknown>, aliases: string[]) {
  for (const alias of aliases) {
    const value = getCellValue(row, alias);
    if (value !== undefined) return value;
  }
  return undefined;
}

function toStringOrUndefined(value: unknown) {
  if (value === null || value === undefined) return undefined;
  const text = String(value).trim();
  return text ? text : undefined;
}

function toNumberOrUndefined(value: unknown) {
  if (value === null || value === undefined || value === "") return undefined;
  if (typeof value === "number") return Number.isNaN(value) ? undefined : value;

  const raw = String(value).trim();
  if (!raw) return undefined;

  const compact = raw.replace(/\s+/g, "");
  const lastComma = compact.lastIndexOf(",");
  const lastDot = compact.lastIndexOf(".");
  const decimalSeparatorIndex = Math.max(lastComma, lastDot);

  const normalized =
    decimalSeparatorIndex >= 0
      ? `${compact.slice(0, decimalSeparatorIndex).replace(/[.,]/g, "")}.${compact
          .slice(decimalSeparatorIndex + 1)
          .replace(/[.,]/g, "")}`
      : compact.replace(/[.,]/g, "");

  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? undefined : parsed;
}

const excelMetadataKeys = new Set(
  [
    "nivel",
    "fechaMuestreo",
    "fecha muestreo",
    "fechaEntrega",
    "fecha entrega",
    "nombre",
    "tipoMuestra",
    "tipo de muestra",
    "tipo muestra",
    "codigo",
    "código",
    "numero",
    "nro",
    "referenciaLugar",
    "referencia del lugar",
    "referencia de lugar",
    "sector",
    "este",
    "norte",
    "elevacion",
    "elevación",
    "descripcion",
    "descripción",
    "laboratorio1",
    "laboratorio 1",
    "laboratorio2",
    "laboratorio 2",
    "laboratorio3",
    "laboratorio 3"
  ].map(normalizeLooseKey)
);

function inferElementoFromHeader(header: string) {
  const cleaned = header.trim().replace(/\s+/g, " ");
  const symbolMatch = cleaned.match(/^([A-Za-z]{1,3})\b/);
  if (symbolMatch) {
    const raw = symbolMatch[1];
    return raw.length === 1
      ? raw.toUpperCase()
      : `${raw[0].toUpperCase()}${raw.slice(1).toLowerCase()}`;
  }

  const fallback = cleaned
    .replace(/\(\s*l\s*\d+\s*\)/gi, "")
    .replace(/\bL\s*\d+\b/gi, "")
    .replace(/[%]/g, "")
    .trim();
  return fallback || cleaned;
}

function normalizeElementoMatch(value: string, removeUnits: boolean) {
  const tokens =
    value
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/%/g, " ")
      .replace(/[^a-z0-9]+/g, " ")
      .split(" ")
      .map((token) => token.trim())
      .filter(Boolean) ?? [];

  const filtered = removeUnits
    ? tokens.filter((token) => !["dm", "g", "gr", "tn", "ppm", "ppb", "pct"].includes(token))
    : tokens;

  return filtered.join("");
}

function extractLabToken(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const match = normalized.match(/(?:^|[^a-z0-9])l\s*([1-9])(?:[^a-z0-9]|$)|\(\s*l\s*([1-9])\s*\)/i);
  return match?.[1] ?? match?.[2] ?? undefined;
}

function extractSymbolToken(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const symbol = normalized.match(/[a-z]{1,3}/);
  return symbol?.[0];
}

interface CatalogElementCandidate {
  nombre: string;
  exact: string;
  relaxed: string;
  symbol?: string;
  lab?: string;
}

function buildCatalogElementCandidates(elementNames: string[]): CatalogElementCandidate[] {
  return elementNames
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name) => ({
      nombre: name,
      exact: normalizeElementoMatch(name, false),
      relaxed: normalizeElementoMatch(name, true),
      symbol: extractSymbolToken(name),
      lab: extractLabToken(name)
    }));
}

function pickBestCandidate(
  candidates: CatalogElementCandidate[],
  headerSymbol?: string,
  headerLab?: string
) {
  if (candidates.length === 0) return undefined;

  const withLabPriority =
    headerLab !== undefined
      ? candidates.find((candidate) => candidate.lab === headerLab) ??
        candidates.find((candidate) => candidate.lab === undefined) ??
        candidates[0]
      : candidates[0];

  if (withLabPriority) return withLabPriority;

  if (!headerSymbol) return candidates[0];
  return candidates.find((candidate) => candidate.symbol === headerSymbol) ?? candidates[0];
}

function resolveCatalogElementName(
  rawLabel: string,
  catalog: CatalogElementCandidate[]
): string | undefined {
  const exact = normalizeElementoMatch(rawLabel, false);
  const relaxed = normalizeElementoMatch(rawLabel, true);
  const symbol = extractSymbolToken(rawLabel);
  const lab = extractLabToken(rawLabel);

  const exactMatches = catalog.filter((candidate) => candidate.exact === exact);
  const exactBest = pickBestCandidate(exactMatches, symbol, lab);
  if (exactBest) return exactBest.nombre;

  const relaxedMatches = catalog.filter((candidate) => candidate.relaxed === relaxed);
  const relaxedBest = pickBestCandidate(relaxedMatches, symbol, lab);
  if (relaxedBest) return relaxedBest.nombre;

  const symbolLabMatches = catalog.filter((candidate) => {
    if (!symbol || candidate.symbol !== symbol) return false;
    if (!lab) return true;
    return candidate.lab === lab;
  });
  const symbolLabBest = pickBestCandidate(symbolLabMatches, symbol, lab);
  if (symbolLabBest) return symbolLabBest.nombre;

  if (!symbol) return undefined;
  const symbolOnlyMatches = catalog.filter((candidate) => candidate.symbol === symbol);
  if (symbolOnlyMatches.length === 1) return symbolOnlyMatches[0]?.nombre;

  return undefined;
}

function extractResultadosFromExcelRow(
  row: Record<string, unknown>,
  availableElementNames: string[]
) {
  const results: Array<{ elemento: string; valor: number; prefijo?: string }> = [];
  const unmatchedHeaders = new Set<string>();
  const catalog = buildCatalogElementCandidates(availableElementNames);

  const pushResolvedResult = (
    rawLabel: string,
    parsed: { valor: number; prefijo?: string },
    explicitPrefijo?: string
  ) => {
    const resolvedName = resolveCatalogElementName(rawLabel, catalog);
    if (!resolvedName) {
      unmatchedHeaders.add(rawLabel);
      return;
    }
    results.push({
      elemento: resolvedName,
      valor: parsed.valor,
      prefijo: explicitPrefijo ?? parsed.prefijo
    });
  };

  for (const [rawKey, rawValue] of Object.entries(row)) {
    const key = normalizeKey(rawKey);
    if (!key.startsWith("elemento_")) continue;
    const elemento = rawKey.slice(rawKey.indexOf("_") + 1).trim() || rawKey;
    const parsed = parsePrefixedNumeric(rawValue);
    if (!parsed) continue;
    pushResolvedResult(elemento, parsed);
  }

  for (let index = 1; index <= 100; index += 1) {
    const elemento = toStringOrUndefined(getCellValue(row, `resultado_${index}_elemento`));
    if (!elemento) continue;
    const rawValor = getCellValue(row, `resultado_${index}_valor`);
    const rawPrefijo = toStringOrUndefined(getCellValue(row, `resultado_${index}_prefijo`));
    const parsed = parsePrefixedNumeric(rawValor);
    if (!parsed) continue;
    pushResolvedResult(elemento, parsed, rawPrefijo);
  }

  for (const [rawKey, rawValue] of Object.entries(row)) {
    const looseKey = normalizeLooseKey(rawKey);
    if (!looseKey || looseKey.startsWith("empty")) continue;
    if (excelMetadataKeys.has(looseKey)) continue;
    if (looseKey.startsWith("resultado")) continue;
    if (looseKey.startsWith("elemento")) continue;

    const parsed = parsePrefixedNumeric(rawValue);
    if (!parsed) continue;

    pushResolvedResult(rawKey, parsed);
  }

  const uniqueResults = Array.from(
    new Map(
      results.map((item) => [`${normalizeLooseKey(item.elemento)}|${item.valor}|${item.prefijo ?? ""}`, item])
    ).values()
  );

  return { results: uniqueResults, unmatchedHeaders };
}

function isConnectivityIssue(error: unknown) {
  if (typeof navigator !== "undefined" && !navigator.onLine) return true;
  if (error instanceof ApiError) {
    if (!error.statusCode) return true;
    if (error.message.toLowerCase().includes("no se pudo conectar")) return true;
  }
  return false;
}

function fromPayloadToForm(payload: ExploracionMuestraPayload): FormState {
  return {
    nivel: payload.ubicacion.nivel,
    este: payload.ubicacion.este?.toString() ?? "",
    norte: payload.ubicacion.norte?.toString() ?? "",
    elevacion: payload.ubicacion.elevacion?.toString() ?? "",
    referenciaLugar: payload.ubicacion.referenciaLugar ?? "",
    nombre: payload.nombre,
    numero: payload.numero?.toString() ?? "",
    tipoMuestra: payload.tipoMuestra ?? "",
    sector: payload.sector ?? "",
    laboratorio1: payload.laboratorio1 ?? "",
    laboratorio2: payload.laboratorio2 ?? "",
    laboratorio3: payload.laboratorio3 ?? "",
    fechaMuestreo: payload.fechaMuestreo ?? "",
    fechaEntrega: toLocalDatetimeInput(payload.fechaEntrega),
    descripcion: payload.descripcion ?? ""
  };
}

function fromRemoteToPayload(data: ExploracionMuestraResponse): ExploracionMuestraPayload {
  return {
    nombre: data.nombre,
    numero: data.numero ?? undefined,
    tipoMuestra: data.tipoMuestra ?? undefined,
    sector: data.sector ?? undefined,
    laboratorio1: data.laboratorio1 ?? undefined,
    laboratorio2: data.laboratorio2 ?? undefined,
    laboratorio3: data.laboratorio3 ?? undefined,
    fechaMuestreo: data.fechaMuestreo ?? undefined,
    fechaEntrega: data.fechaEntrega ?? undefined,
    descripcion: data.descripcion ?? undefined,
    ubicacion: {
      nivel: data.ubicacion.nivel,
      este: data.ubicacion.este ?? undefined,
      norte: data.ubicacion.norte ?? undefined,
      elevacion: data.ubicacion.elevacion ?? undefined,
      referenciaLugar: data.ubicacion.referenciaLugar ?? undefined
    },
    resultados: data.resultados?.map((item) => ({
      elemento: item.elemento.nombre,
      valor: item.valor,
      prefijo: item.prefijo ?? undefined
    }))
  };
}

function exportRecordsToCsv(records: ExportRecord[]) {
  if (records.length === 0) return;
  const headers = Object.keys(records[0]);
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const body = records.map((record) =>
    headers.map((key) => escape(record[key as keyof ExportRecord])).join(",")
  );
  const csv = [headers.join(","), ...body].join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `exploraciones-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function exportRecordsToPdf(records: ExportRecord[]) {
  const rowsHtml = records
    .map(
      (row) => `
      <tr>
        <td>${row.estado}</td>
        <td>${row.nombre}</td>
        <td>${row.codigo}</td>
        <td>${row.tipoMuestra}</td>
        <td>${row.sector}</td>
        <td>${row.usuario}</td>
        <td>${row.nivel}</td>
        <td>${row.fechaMuestreo}</td>
        <td>${row.fechaEntrega}</td>
        <td>${row.resultados}</td>
      </tr>
    `
    )
    .join("");

  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Reporte Exploraciones</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; }
          h1 { margin: 0 0 8px; font-size: 20px; }
          p { margin: 0 0 18px; color: #555; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; vertical-align: top; }
          th { background: #f4f4f4; }
        </style>
      </head>
      <body>
        <h1>Reporte de Muestras - Exploraciones</h1>
        <p>Generado: ${new Date().toLocaleString("es-BO", { timeZone: "America/La_Paz" })}</p>
        <table>
          <thead>
            <tr>
              <th>Estado</th>
              <th>Nombre</th>
              <th>Codigo</th>
              <th>Tipo muestra</th>
              <th>Sector</th>
              <th>Usuario</th>
              <th>Nivel</th>
              <th>Fecha Muestreo</th>
              <th>Fecha Entrega</th>
              <th>Resultados</th>
            </tr>
          </thead>
          <tbody>${rowsHtml || '<tr><td colspan="10">Sin registros</td></tr>'}</tbody>
        </table>
      </body>
    </html>
  `;

  const popup = window.open("", "_blank", "width=1000,height=700");
  if (!popup) return;
  popup.document.write(html);
  popup.document.close();
  popup.focus();
  popup.print();
}

interface DetailContentProps {
  nombre: string;
  numero?: number;
  tipoMuestra?: string;
  sector?: string;
  usuarioNombre?: string;
  fechaMuestreo?: string;
  fechaEntrega?: string;
  laboratorio1?: string;
  laboratorio2?: string;
  laboratorio3?: string;
  descripcion?: string;
  nivel: string;
  este?: number;
  norte?: number;
  elevacion?: number;
  referenciaLugar?: string;
  resultados: Array<{ key: string; label: string; value: string }>;
}

function DetailContent(props: DetailContentProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <article className="rounded-xl bg-[var(--color-surface-container-high)] p-4">
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
          Resumen
        </p>
        <div className="space-y-2 text-sm">
          <p>
            <strong>Nombre:</strong> {props.nombre}
          </p>
          <p>
            <strong>Codigo:</strong> {props.numero ?? "-"}
          </p>
          <p>
            <strong>Tipo de muestra:</strong> {props.tipoMuestra ?? "-"}
          </p>
          <p>
            <strong>Sector:</strong> {props.sector ?? "-"}
          </p>
          <p>
            <strong>Usuario:</strong> {props.usuarioNombre ?? "-"}
          </p>
          <p>
            <strong>Fecha muestreo:</strong> {formatDateTime(props.fechaMuestreo)}
          </p>
          <p>
            <strong>Fecha entrega:</strong> {formatDateTime(props.fechaEntrega)}
          </p>
        </div>
      </article>

      <article className="rounded-xl bg-[var(--color-surface-container-high)] p-4">
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
          Laboratorios
        </p>
        <div className="space-y-2 text-sm">
          <p>
            <strong>Laboratorio 1:</strong> {props.laboratorio1 ?? "-"}
          </p>
          <p>
            <strong>Laboratorio 2:</strong> {props.laboratorio2 ?? "-"}
          </p>
          <p>
            <strong>Laboratorio 3:</strong> {props.laboratorio3 ?? "-"}
          </p>
        </div>
      </article>

      <article className="rounded-xl bg-[var(--color-surface-container-high)] p-4 md:col-span-2">
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
          Ubicacion
        </p>
        <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <p>
            <strong>Nivel:</strong> {props.nivel}
          </p>
          <p>
            <strong>Este:</strong> {props.este ?? "-"}
          </p>
          <p>
            <strong>Norte:</strong> {props.norte ?? "-"}
          </p>
          <p>
            <strong>Elevacion:</strong> {props.elevacion ?? "-"}
          </p>
          <p className="sm:col-span-2">
            <strong>Referencia:</strong> {props.referenciaLugar ?? "-"}
          </p>
        </div>
      </article>

      <article className="rounded-xl bg-[var(--color-surface-container-high)] p-4 md:col-span-2">
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
          Descripcion
        </p>
        <p className="text-sm text-[var(--color-on-surface)]">{props.descripcion ?? "-"}</p>
      </article>

      <article className="rounded-xl bg-[var(--color-surface-container-high)] p-4 md:col-span-2">
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
          Resultados quimicos
        </p>
        <div className="text-sm">
          {props.resultados.length === 0 ? (
            <p>Sin resultados.</p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {props.resultados.map((item) => (
                <article
                  key={item.key}
                  className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] px-3 py-2"
                >
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                    {item.label}
                  </p>
                  <p className="mt-1 text-base font-semibold text-[var(--color-on-surface)]">
                    {item.value}
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>
      </article>
    </div>
  );
}

export function ExploracionesPage() {
  const navigate = useNavigate();
  const { showError, showSuccess } = useToast();
  const saveMutation = useSaveMuestraOfflineMutation();
  const saveBatchMutation = useSaveMuestrasOfflineBatchMutation();
  const updateOfflineMutation = useUpdateMuestraOfflineMutation();
  const queueRemoteEditOfflineMutation = useQueueRemoteEditOfflineMutation();
  const updateRemoteMutation = useUpdateMuestraRemotaMutation();
  const syncMutation = useSyncExploracionesMutation();

  const offlineQuery = useExploracionesOfflineQuery();
  const remotasQuery = useExploracionesRemotasQuery();
  const laboratoriosQuery = useExploracionesLaboratoriosQuery();
  const elementosQuery = useExploracionesElementosQuery();

  const [form, setForm] = useState<FormState>(buildInitialState);
  const [resultados, setResultados] = useState<DynamicResultado[]>([
    { id: buildRowId(), elemento: "", valor: "" }
  ]);
  const [editTarget, setEditTarget] = useState<EditTarget>(null);
  const [detailTarget, setDetailTarget] = useState<DetailTarget>(null);
  const [formCollapsed, setFormCollapsed] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"todos" | RowStatus>("todos");
  const [levelFilter, setLevelFilter] = useState("todos");
  const [resultadosFilter, setResultadosFilter] = useState<"todos" | "con" | "sin">("todos");
  const [entregaFilter, setEntregaFilter] = useState<"todos" | "con-entrega" | "sin-entrega">(
    "todos"
  );

  function downloadMuestrasTemplate() {
    downloadTemplateXlsx(
      "Muestras",
      [
        {
          nombre: "N80 VETA S",
          numero: 52,
          tipoMuestra: "Canal",
          sector: "SUR",
          laboratorio1: "INGENIO LITORAL Chillcobija",
          laboratorio2: "",
          laboratorio3: "",
          fechaEntrega: "",
          descripcion: "Descripcion de la muestra",
          nivel: "NIV - 80",
          este: 763235.063,
          norte: 7593360.633,
          elevacion: 5072.42,
          referenciaLugar: "VETA DE SULFUROS",
          elemento_Ag: "<0.008",
          elemento_Au: "0.01",
          resultado_1_elemento: "",
          resultado_1_valor: "",
          resultado_1_prefijo: ""
        }
      ],
      "plantilla-muestras-exploraciones.xlsx"
    );
  }

  async function onImportMuestrasFile(file: File) {
    try {
      const rows = await readExcelRows(file);
      if (rows.length === 0) {
        showError("El archivo no tiene filas para procesar.");
        return;
      }

      const catalogElementNames = elementos
        .map((item) => item.nombre?.trim())
        .filter((name): name is string => Boolean(name));

      if (catalogElementNames.length === 0) {
        showError(
          "No hay catálogo de elementos disponible. Sincroniza/crea elementos primero para importar resultados."
        );
        return;
      }

      const payloads: ExploracionMuestraPayload[] = [];
      const unmatchedResultHeaders = new Set<string>();

      for (const row of rows) {
        const nombre = toStringOrUndefined(
          getCellValueByAliases(row, ["nombre", "muestra", "sample", "idMuestra"])
        );
        const nivel = toStringOrUndefined(getCellValueByAliases(row, ["nivel"]));
        if (!nombre || !nivel) continue;

        const { results: resultados, unmatchedHeaders } = extractResultadosFromExcelRow(
          row,
          catalogElementNames
        );
        for (const header of unmatchedHeaders) unmatchedResultHeaders.add(header);
        const payload = exploracionMuestraPayloadSchema.parse({
          nombre,
          numero: toNumberOrUndefined(
            getCellValueByAliases(row, ["numero", "nro", "codigo", "código", "cod"])
          ),
          tipoMuestra: toStringOrUndefined(
            getCellValueByAliases(row, ["tipoMuestra", "tipo de muestra", "tipo muestra"])
          ),
          sector: toStringOrUndefined(getCellValueByAliases(row, ["sector"])),
          laboratorio1: toStringOrUndefined(
            getCellValueByAliases(row, ["laboratorio1", "laboratorio 1"])
          ),
          laboratorio2: toStringOrUndefined(
            getCellValueByAliases(row, ["laboratorio2", "laboratorio 2"])
          ),
          laboratorio3: toStringOrUndefined(
            getCellValueByAliases(row, ["laboratorio3", "laboratorio 3"])
          ),
          fechaMuestreo:
            normalizeIsoFromCell(
              getCellValueByAliases(row, ["fechaMuestreo", "fecha muestreo"])
            ) ?? getNowLaPazIso(),
          fechaEntrega: normalizeIsoFromCell(
            getCellValueByAliases(row, ["fechaEntrega", "fecha entrega"])
          ),
          descripcion: toStringOrUndefined(
            getCellValueByAliases(row, ["descripcion", "descripción"])
          ),
          ubicacion: {
            nivel,
            este: toNumberOrUndefined(getCellValueByAliases(row, ["este"])),
            norte: toNumberOrUndefined(getCellValueByAliases(row, ["norte"])),
            elevacion: toNumberOrUndefined(getCellValueByAliases(row, ["elevacion", "elevación"])),
            referenciaLugar: toStringOrUndefined(
              getCellValueByAliases(row, [
                "referenciaLugar",
                "referencia del lugar",
                "referencia de lugar",
                "referencia"
              ])
            )
          },
          resultados: resultados.length ? resultados : undefined
        });

        payloads.push(payload);
      }

      if (payloads.length === 0) {
        showError("No se encontraron filas válidas con nombre y nivel.");
        return;
      }

      saveBatchMutation.mutate(payloads, {
        onSuccess: () => {
          const unmatchedCount = unmatchedResultHeaders.size;
          if (unmatchedCount > 0) {
            showError(
              `Se cargaron ${payloads.length} muestras, pero ${unmatchedCount} columnas de resultados no coincidieron con elementos existentes.`
            );
          } else {
            showSuccess(`${payloads.length} muestras cargadas a la cola local.`);
          }
          attemptAutoSync();
        },
        onError: (error) => {
          const message = error instanceof Error ? error.message : "No se pudo cargar el archivo.";
          showError(message);
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo procesar el Excel.";
      showError(message);
    }
  }

  const pendingLocales = useMemo(
    () => (offlineQuery.data ?? []).filter((item) => !item.synced),
    [offlineQuery.data]
  );
  const laboratorios = laboratoriosQuery.data?.data ?? [];
  const elementos = elementosQuery.data?.data ?? [];
  const tableRows = useMemo<TableRow[]>(() => {
    const pendingRemoteIds = new Set(
      pendingLocales.map((item) => item.remoteId).filter((id): id is string => Boolean(id))
    );

    const remotas: TableRow[] = (remotasQuery.data?.data ?? [])
      .filter((item) => !pendingRemoteIds.has(item.id))
      .map((item) => ({
        key: `r-${item.id}`,
        source: "remota",
        id: item.id,
        nombre: item.nombre,
        numero: item.numero ?? undefined,
        tipoMuestra: item.tipoMuestra ?? undefined,
        sector: item.sector ?? undefined,
        usuarioNombre: item.usuario?.nombre ?? undefined,
        nivel: item.ubicacion.nivel,
        laboratorio1: item.laboratorio1 ?? undefined,
        laboratorio2: item.laboratorio2 ?? undefined,
        laboratorio3: item.laboratorio3 ?? undefined,
        fechaMuestreo: item.fechaMuestreo ?? undefined,
        fechaEntrega: item.fechaEntrega ?? undefined,
        descripcion: item.descripcion ?? undefined,
        este: item.ubicacion.este ?? undefined,
        norte: item.ubicacion.norte ?? undefined,
        elevacion: item.ubicacion.elevacion ?? undefined,
        referenciaLugar: item.ubicacion.referenciaLugar ?? undefined,
        resultadosTexto: (item.resultados ?? [])
          .map(
            (r) =>
              `${r.elemento.nombre}: ${r.prefijo ?? ""}${r.valor}${r.elemento.unidad ? ` ${r.elemento.unidad}` : ""}`
          )
          .join(" | "),
        status: "Sincronizado",
        canEdit: !item.fechaEntrega
      }));

    const locales: TableRow[] = pendingLocales.map((item) => ({
      key: `l-${item.id}`,
      source: "local",
      id: item.id ?? item.localId,
      nombre: item.payload.nombre,
      numero: item.payload.numero,
      tipoMuestra: item.payload.tipoMuestra,
      sector: item.payload.sector,
      usuarioNombre: undefined,
      nivel: item.payload.ubicacion.nivel,
      laboratorio1: item.payload.laboratorio1,
      laboratorio2: item.payload.laboratorio2,
      laboratorio3: item.payload.laboratorio3,
      fechaMuestreo: item.payload.fechaMuestreo,
      fechaEntrega: item.payload.fechaEntrega,
      descripcion: item.payload.descripcion,
      este: item.payload.ubicacion.este,
      norte: item.payload.ubicacion.norte,
      elevacion: item.payload.ubicacion.elevacion,
      referenciaLugar: item.payload.ubicacion.referenciaLugar,
      resultadosTexto: (item.payload.resultados ?? [])
        .map((r) => `${r.elemento}: ${r.prefijo ?? ""}${r.valor}`)
        .join(" | "),
      status: item.syncError ? "Error de sincronizacion" : "Pendiente local",
      canEdit: !item.payload.fechaEntrega
    }));

    return [...locales, ...remotas];
  }, [pendingLocales, remotasQuery.data?.data]);

  const levelOptions = useMemo(
    () =>
      Array.from(new Set(tableRows.map((row) => row.nivel).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b)
      ),
    [tableRows]
  );

  const sectorOptions = useMemo(
    () =>
      Array.from(new Set(tableRows.map((row) => row.sector).filter(Boolean))).sort((a, b) =>
        String(a).localeCompare(String(b))
      ),
    [tableRows]
  );

  const tipoMuestraOptions = useMemo(
    () =>
      Array.from(new Set(tableRows.map((row) => row.tipoMuestra).filter(Boolean))).sort((a, b) =>
        String(a).localeCompare(String(b))
      ),
    [tableRows]
  );

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return tableRows.filter((row) => {
      const matchesSearch =
        !query ||
        row.nombre.toLowerCase().includes(query) ||
        String(row.numero ?? "")
          .toLowerCase()
          .includes(query) ||
        (row.tipoMuestra ?? "").toLowerCase().includes(query) ||
        (row.sector ?? "").toLowerCase().includes(query) ||
        (row.usuarioNombre ?? "").toLowerCase().includes(query) ||
        row.nivel.toLowerCase().includes(query) ||
        (row.laboratorio1 ?? "").toLowerCase().includes(query) ||
        (row.laboratorio2 ?? "").toLowerCase().includes(query) ||
        (row.laboratorio3 ?? "").toLowerCase().includes(query);

      const matchesStatus = statusFilter === "todos" || row.status === statusFilter;
      const matchesLevel = levelFilter === "todos" || row.nivel === levelFilter;
      const hasResultados = Boolean(row.resultadosTexto.trim());
      const matchesResultados =
        resultadosFilter === "todos" ||
        (resultadosFilter === "con" && hasResultados) ||
        (resultadosFilter === "sin" && !hasResultados);
      const hasEntrega = Boolean(row.fechaEntrega);
      const matchesEntrega =
        entregaFilter === "todos" ||
        (entregaFilter === "con-entrega" && hasEntrega) ||
        (entregaFilter === "sin-entrega" && !hasEntrega);

      return matchesSearch && matchesStatus && matchesLevel && matchesResultados && matchesEntrega;
    });
  }, [tableRows, search, statusFilter, levelFilter, resultadosFilter, entregaFilter]);

  const exportRows = useMemo<ExportRecord[]>(
    () => filteredRows.map(mapRowToExportRecord),
    [filteredRows]
  );

  const attemptAutoSync = useCallback(() => {
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    if (syncMutation.isPending || pendingLocales.length === 0) return;
    syncMutation.mutate(undefined, {
      onSuccess: (result) => {
        if (result.failed > 0)
          showError("Algunos registros no pudieron sincronizarse por un error.");
      }
    });
  }, [pendingLocales.length, showError, syncMutation]);

  useEffect(() => {
    // Initial remote fetch happens through React Query automatically.
    // Only attempt syncing local pending queue here.
    attemptAutoSync();
  }, [attemptAutoSync]);

  useEffect(() => {
    function handleOnline() {
      void remotasQuery.refetch();
      attemptAutoSync();
    }
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [attemptAutoSync]);

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateResultado(id: string, key: "elemento" | "valor", value: string) {
    setResultados((current) =>
      current.map((row) => (row.id === id ? { ...row, [key]: value } : row))
    );
  }

  function clearForm() {
    setForm(buildInitialState());
    setResultados([{ id: buildRowId(), elemento: "", valor: "" }]);
    setEditTarget(null);
    setFormCollapsed(true);
  }

  function loadForm(payload: ExploracionMuestraPayload) {
    setForm(fromPayloadToForm(payload));
    setResultados(
      payload.resultados?.length
        ? payload.resultados.map((item) => ({
            id: buildRowId(),
            elemento: item.elemento,
            valor: `${item.prefijo ?? ""}${item.valor}`
          }))
        : [{ id: buildRowId(), elemento: "", valor: "" }]
    );
    setFormCollapsed(false);
  }

  function buildPayload(): ExploracionMuestraPayload {
    const resultadoRows = resultados.filter((row) => row.elemento.trim() && row.valor.trim());
    const invalidResultado = resultadoRows.find(
      (row) => parseChemicalValueWithPrefix(row.valor) === undefined
    );
    if (invalidResultado) {
      throw new Error(
        `Valor químico inválido en "${invalidResultado.elemento}". Usa formatos como 1.23, <0.01 o ND 0.01.`
      );
    }

    const normalizedResultados = resultadoRows.map((row) => {
      const parsed = parseChemicalValueWithPrefix(row.valor) as {
        valor: number;
        prefijo?: "<" | ">";
      };
      return {
        elemento: row.elemento.trim(),
        valor: parsed.valor,
        prefijo: parsed.prefijo
      };
    });

    return exploracionMuestraPayloadSchema.parse({
      nombre: form.nombre.trim(),
      numero: toOptionalNumber(form.numero),
      tipoMuestra: form.tipoMuestra.trim() || undefined,
      sector: form.sector.trim() || undefined,
      laboratorio1: form.laboratorio1.trim() || undefined,
      laboratorio2: form.laboratorio2.trim() || undefined,
      laboratorio3: form.laboratorio3.trim() || undefined,
      fechaMuestreo: editTarget ? normalizeIsoDatetime(form.fechaMuestreo) : getNowLaPazIso(),
      fechaEntrega: toIsoDatetime(form.fechaEntrega),
      descripcion: form.descripcion.trim() || undefined,
      ubicacion: {
        nivel: form.nivel.trim(),
        este: toOptionalNumber(form.este),
        norte: toOptionalNumber(form.norte),
        elevacion: toOptionalNumber(form.elevacion),
        referenciaLugar: form.referenciaLugar.trim() || undefined
      },
      resultados: normalizedResultados.length ? normalizedResultados : undefined
    });
  }

  function onSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const payload = buildPayload();

      if (editTarget?.mode === "local") {
        updateOfflineMutation.mutate(
          { id: editTarget.id, payload },
          {
            onSuccess: () => {
              showSuccess("Registro actualizado.");
              clearForm();
              attemptAutoSync();
            }
          }
        );
        return;
      }

      if (editTarget?.mode === "remota") {
        const queueEditOffline = () =>
          queueRemoteEditOfflineMutation.mutate(
            { remoteId: editTarget.id, payload },
            {
              onSuccess: () => {
                showSuccess("Sin conexión: edición guardada localmente como pendiente.");
                clearForm();
                attemptAutoSync();
              }
            }
          );

        if (typeof navigator !== "undefined" && !navigator.onLine) {
          queueEditOffline();
          return;
        }

        updateRemoteMutation.mutate(
          { id: editTarget.id, payload },
          {
            onSuccess: () => {
              showSuccess("Registro remoto actualizado.");
              clearForm();
            },
            onError: (error) => {
              if (isConnectivityIssue(error)) {
                queueEditOffline();
                return;
              }
              const message = error instanceof Error ? error.message : "No se pudo actualizar.";
              showError(message);
            }
          }
        );
        return;
      }

      saveMutation.mutate(payload, {
        onSuccess: () => {
          showSuccess("Registro guardado.");
          clearForm();
          attemptAutoSync();
        }
      });
    } catch (error) {
      if (error instanceof ZodError) {
        showError(error.issues[0]?.message ?? "Revisa los campos.");
        return;
      }
      if (error instanceof Error) {
        showError(error.message);
        return;
      }
      showError("No se pudo procesar la muestra.");
    }
  }

  function startEdit(row: TableRow) {
    if (!row.canEdit) {
      showError("Este registro ya tiene fecha de entrega y no se puede editar.");
      return;
    }

    if (row.source === "local") {
      const found = pendingLocales.find((item) => item.id === row.id);
      if (!found?.id) return;
      setEditTarget({ mode: "local", id: found.id });
      loadForm(found.payload);
      return;
    }

    const found = (remotasQuery.data?.data ?? []).find((item) => item.id === row.id);
    if (!found) return;
    setEditTarget({ mode: "remota", id: found.id });
    loadForm(fromRemoteToPayload(found));
  }

  function openDetail(row: TableRow) {
    if (row.source === "local") {
      const found = pendingLocales.find((item) => item.id === row.id);
      if (found) setDetailTarget({ source: "local", data: found });
      return;
    }
    const found = (remotasQuery.data?.data ?? []).find((item) => item.id === row.id);
    if (found) setDetailTarget({ source: "remota", data: found });
  }

  const isSubmitting =
    saveMutation.isPending ||
    saveBatchMutation.isPending ||
    updateOfflineMutation.isPending ||
    updateRemoteMutation.isPending ||
    queueRemoteEditOfflineMutation.isPending;
  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <InternalHeader
        eyebrow="Exploraciones"
        title="Registro de muestra"
        description="Completa la informacion de ubicacion, laboratorios y resultados quimicos de cada muestra."
      />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-3">
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
          Herramientas de muestras
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={downloadMuestrasTemplate}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-outline-variant)] px-4 py-2 text-sm font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)]"
          >
            <FileSpreadsheet size={15} />
            Plantilla Excel
          </button>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--color-primary)]/55 px-4 py-2 text-sm font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)]/10">
            <FileUp size={15} />
            Cargar Excel
            <input
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void onImportMuestrasFile(file);
                event.currentTarget.value = "";
              }}
            />
          </label>
          <button
            type="button"
            onClick={() => navigate("/exploraciones/elementos")}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-outline-variant)] px-4 py-2 text-sm font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)]"
          >
            Elementos
          </button>
          <button
            type="button"
            onClick={() => setFormCollapsed((c) => !c)}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-outline-variant)] px-4 py-2 text-sm font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)]"
          >
            {formCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            {formCollapsed ? "Mostrar formulario" : "Minimizar formulario"}
          </button>
        </div>
      </div>

      <datalist id="exploraciones-laboratorios">
        {laboratorios.map((lab) => (
          <option key={lab} value={lab} />
        ))}
      </datalist>
      <datalist id="exploraciones-niveles">
        {levelOptions.map((value) => (
          <option key={value} value={value} />
        ))}
      </datalist>
      <datalist id="exploraciones-sectores">
        {sectorOptions.map((value) => (
          <option key={value} value={value ?? ""} />
        ))}
      </datalist>
      <datalist id="exploraciones-tipos">
        {tipoMuestraOptions.map((value) => (
          <option key={value} value={value ?? ""} />
        ))}
      </datalist>
      <datalist id="exploraciones-elementos">
        {elementos.map((item) => (
          <option key={item.id ?? item.nombre} value={item.nombre} />
        ))}
      </datalist>

      {formCollapsed ? null : (
        <form className="space-y-6" onSubmit={onSave}>
          <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5 md:p-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                  Nivel
                </label>
                <input
                  required
                  list="exploraciones-niveles"
                  value={form.nivel}
                  onChange={(e) => updateForm("nivel", e.target.value)}
                  placeholder="Ej: NIV-8"
                  className={inputClassName}
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                  Nombre
                </label>
                <input
                  required
                  value={form.nombre}
                  onChange={(e) => updateForm("nombre", e.target.value)}
                  placeholder=""
                  className={inputClassName}
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                  Codigo
                </label>
                <input
                  type="number"
                  step={1}
                  min={0}
                  inputMode="numeric"
                  value={form.numero}
                  onChange={(e) => updateForm("numero", e.target.value)}
                  placeholder="Ej: 52"
                  className={numberInputClassName}
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                  Tipo de muestra
                </label>
                <input
                  list="exploraciones-tipos"
                  value={form.tipoMuestra}
                  onChange={(e) => updateForm("tipoMuestra", e.target.value)}
                  placeholder="Ej: SIMPLE"
                  className={inputClassName}
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                  Sector
                </label>
                <input
                  list="exploraciones-sectores"
                  value={form.sector}
                  onChange={(e) => updateForm("sector", e.target.value)}
                  placeholder=""
                  className={inputClassName}
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                  Laboratorio 1
                </label>
                <input
                  list="exploraciones-laboratorios"
                  value={form.laboratorio1}
                  onChange={(e) => updateForm("laboratorio1", e.target.value)}
                  placeholder="Ej: INGENIO LITORAL Chillcobija"
                  className={inputClassName}
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                  Laboratorio 2
                </label>
                <input
                  list="exploraciones-laboratorios"
                  value={form.laboratorio2}
                  onChange={(e) => updateForm("laboratorio2", e.target.value)}
                  placeholder=""
                  className={inputClassName}
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                  Laboratorio 3
                </label>
                <input
                  list="exploraciones-laboratorios"
                  value={form.laboratorio3}
                  onChange={(e) => updateForm("laboratorio3", e.target.value)}
                  placeholder=""
                  className={inputClassName}
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                  Fecha de muestreo
                </label>
                <div className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] px-4 py-3 text-sm text-[var(--color-on-surface-variant)]">
                  {form.fechaMuestreo
                    ? formatDateTime(form.fechaMuestreo)
                    : "Se registrara automaticamente al guardar"}
                </div>
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                  Fecha de entrega
                </label>
                <input
                  type="datetime-local"
                  value={form.fechaEntrega}
                  onChange={(e) => updateForm("fechaEntrega", e.target.value)}
                  placeholder="Selecciona fecha y hora"
                  className={inputClassName}
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                  Referencia de lugar
                </label>
                <input
                  value={form.referenciaLugar}
                  onChange={(e) => updateForm("referenciaLugar", e.target.value)}
                  placeholder=""
                  className={inputClassName}
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                  Este
                </label>
                <input
                  type="number"
                  step="any"
                  inputMode="decimal"
                  min={0}
                  value={form.este}
                  onChange={(e) => updateForm("este", e.target.value)}
                  placeholder="Ej: 763235.063"
                  className={numberInputClassName}
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                  Norte
                </label>
                <input
                  type="number"
                  step="any"
                  inputMode="decimal"
                  min={0}
                  value={form.norte}
                  onChange={(e) => updateForm("norte", e.target.value)}
                  placeholder="Ej: 7593360.633"
                  className={numberInputClassName}
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                  Elevacion
                </label>
                <input
                  type="number"
                  step="any"
                  inputMode="decimal"
                  min={0}
                  value={form.elevacion}
                  onChange={(e) => updateForm("elevacion", e.target.value)}
                  placeholder="Ej: 5072.42"
                  className={numberInputClassName}
                />
              </div>
              <div className="md:col-span-2 xl:col-span-3">
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                  Descripcion
                </label>
                <textarea
                  rows={3}
                  value={form.descripcion}
                  onChange={(e) => updateForm("descripcion", e.target.value)}
                  placeholder="Describe litología, alteración, mineralización y observaciones relevantes."
                  className={`${inputClassName} min-h-[90px] resize-y`}
                />
              </div>
            </div>
          </article>

          <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5 md:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold">Resultados quimicos</h2>
              <button
                type="button"
                onClick={() =>
                  setResultados((c) => [...c, { id: buildRowId(), elemento: "", valor: "" }])
                }
                className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-primary)]/55 px-4 py-2 text-sm font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)]/10"
              >
                <Plus size={15} />
                Agregar elemento
              </button>
            </div>
            <div className="space-y-3">
              {resultados.map((row, index) => (
                <div
                  key={row.id}
                  className="grid grid-cols-1 gap-3 rounded-lg bg-[var(--color-surface-container-high)] p-3 md:grid-cols-[1.2fr_1fr_auto]"
                >
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                      Elemento {index + 1}
                    </label>
                    <input
                      list="exploraciones-elementos"
                      value={row.elemento}
                      onChange={(e) => updateResultado(row.id, "elemento", e.target.value)}
                      placeholder="Ej: Ag DM (L1)"
                      className={inputClassName}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                      Valor
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="Ej: 1.23, <0.01, >2.5, ND 0.01"
                      value={row.valor}
                      onChange={(e) => updateResultado(row.id, "valor", e.target.value)}
                      className={inputClassName}
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() =>
                        setResultados((c) =>
                          c.length === 1 ? c : c.filter((i) => i.id !== row.id)
                        )
                      }
                      disabled={resultados.length === 1}
                      className="inline-flex h-[50px] w-full items-center justify-center rounded-lg border border-[var(--color-error)]/45 text-[var(--color-error)] transition hover:bg-[var(--color-error)]/10 disabled:cursor-not-allowed disabled:opacity-50 md:w-[52px]"
                      aria-label="Eliminar resultado"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <div className="sticky bottom-3 z-20 rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-3 shadow-xl backdrop-blur-sm md:p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-[var(--color-on-surface-variant)]">
                Completa los campos y guarda el registro para continuar.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={clearForm}
                  className="rounded-lg border border-[var(--color-outline-variant)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)]"
                >
                  {editTarget ? "Cancelar edicion" : "Limpiar formulario"}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save size={15} />
                  {isSubmitting
                    ? "Guardando..."
                    : editTarget
                      ? "Actualizar registro"
                      : "Guardar registro"}
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      <article className="overflow-hidden rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)]">
        <div className="border-b border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] px-5 py-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
              <FlaskConical size={14} />
              Registros de muestras
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => navigate("/exploraciones/reportes")}
                className="inline-flex items-center gap-2 rounded-md border border-[var(--color-outline-variant)] px-3 py-1.5 text-xs font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)]"
              >
                <BarChart3 size={13} />
                Reportes y tendencias
              </button>
              <button
                type="button"
                onClick={() => exportRecordsToCsv(exportRows)}
                className="inline-flex items-center gap-2 rounded-md border border-[var(--color-outline-variant)] px-3 py-1.5 text-xs font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)]"
              >
                <FileSpreadsheet size={13} />
                Exportar Excel
              </button>
              <button
                type="button"
                onClick={() => exportRecordsToPdf(exportRows)}
                className="inline-flex items-center gap-2 rounded-md border border-[var(--color-outline-variant)] px-3 py-1.5 text-xs font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)]"
              >
                <FileDown size={13} />
                Exportar PDF
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-5">
            <label className="relative">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-on-surface-variant)]"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por codigo, tipo, sector, usuario, nivel, nombre..."
                className={`${filterInputClassName} w-full pl-9`}
              />
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "todos" | RowStatus)}
              className={filterInputClassName}
            >
              <option value="todos">Todos los estados</option>
              <option value="Sincronizado">Sincronizado</option>
              <option value="Pendiente local">Pendiente local</option>
              <option value="Error de sincronizacion">Error de sincronizacion</option>
            </select>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className={filterInputClassName}
            >
              <option value="todos">Todos los niveles</option>
              {levelOptions.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
            <select
              value={resultadosFilter}
              onChange={(e) => setResultadosFilter(e.target.value as "todos" | "con" | "sin")}
              className={filterInputClassName}
            >
              <option value="todos">Todos los resultados</option>
              <option value="con">Con resultados</option>
              <option value="sin">Sin resultados</option>
            </select>
            <select
              value={entregaFilter}
              onChange={(e) =>
                setEntregaFilter(e.target.value as "todos" | "con-entrega" | "sin-entrega")
              }
              className={filterInputClassName}
            >
              <option value="todos">Con y sin entrega</option>
              <option value="con-entrega">Con entrega</option>
              <option value="sin-entrega">Sin entrega</option>
            </select>
          </div>
        </div>

        <div className="table-scroll overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                  Estado
                </th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                  Nombre
                </th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                  Codigo
                </th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                  Tipo
                </th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                  Sector
                </th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                  Usuario
                </th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                  Nivel
                </th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                  Muestreo
                </th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                  Entrega
                </th>
                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-soft)]">
              {filteredRows.map((row) => (
                <tr
                  key={row.key}
                  className="transition hover:bg-[var(--color-surface-container-highest)]"
                >
                  <td className="px-4 py-3 text-xs">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${row.status === "Sincronizado" ? "bg-[var(--color-success)]/20 text-[var(--color-success)]" : row.status === "Error de sincronizacion" ? "bg-[var(--color-error)]/18 text-[var(--color-error)]" : "bg-[var(--color-tertiary)]/20 text-[var(--color-tertiary)]"}`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold">{row.nombre}</td>
                  <td className="px-4 py-3 text-xs">{row.numero ?? "-"}</td>
                  <td className="px-4 py-3 text-xs">{row.tipoMuestra ?? "-"}</td>
                  <td className="px-4 py-3 text-xs">{row.sector ?? "-"}</td>
                  <td className="px-4 py-3 text-xs uppercase">{row.usuarioNombre ?? "-"}</td>
                  <td className="px-4 py-3 text-xs">{row.nivel}</td>
                  <td className="px-4 py-3 text-xs">{formatDateTime(row.fechaMuestreo)}</td>
                  <td className="px-4 py-3 text-xs">{formatDateTime(row.fechaEntrega)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openDetail(row)}
                        className="inline-flex items-center gap-1 rounded-md border border-[var(--color-outline-variant)] px-3 py-1.5 text-xs font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)]"
                      >
                        <Eye size={12} />
                        Ver
                      </button>
                      <button
                        type="button"
                        onClick={() => startEdit(row)}
                        disabled={!row.canEdit}
                        className="inline-flex items-center gap-1 rounded-md border border-[var(--color-tertiary)]/45 px-3 py-1.5 text-xs font-semibold text-[var(--color-tertiary)] transition hover:bg-[var(--color-tertiary)]/12 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Pencil size={12} />
                        Editar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-6 text-center text-sm text-[var(--color-on-surface-variant)]"
                  >
                    No hay registros para los filtros aplicados.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </article>

      {detailTarget ? (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/55 p-4">
          <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5 shadow-2xl md:p-6">
            <div className="mb-5 flex items-start justify-between gap-4 border-b border-[var(--color-border-soft)] pb-4">
              <div>
                <h4 className="text-xl font-bold">Detalle de muestra</h4>
                <p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">
                  Vista completa del registro seleccionado.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailTarget(null)}
                className="rounded-md border border-[var(--color-outline-variant)] p-2 text-[var(--color-on-surface-variant)] transition hover:text-[var(--color-on-surface)]"
              >
                <X size={14} />
              </button>
            </div>

            <div className="overflow-y-auto pr-1">
              {detailTarget.source === "local" ? (
                <DetailContent
                  nombre={detailTarget.data.payload.nombre}
                  numero={detailTarget.data.payload.numero}
                  tipoMuestra={detailTarget.data.payload.tipoMuestra}
                  sector={detailTarget.data.payload.sector}
                  usuarioNombre="-"
                  fechaMuestreo={detailTarget.data.payload.fechaMuestreo}
                  fechaEntrega={detailTarget.data.payload.fechaEntrega}
                  laboratorio1={detailTarget.data.payload.laboratorio1}
                  laboratorio2={detailTarget.data.payload.laboratorio2}
                  laboratorio3={detailTarget.data.payload.laboratorio3}
                  descripcion={detailTarget.data.payload.descripcion}
                  nivel={detailTarget.data.payload.ubicacion.nivel}
                  este={detailTarget.data.payload.ubicacion.este}
                  norte={detailTarget.data.payload.ubicacion.norte}
                  elevacion={detailTarget.data.payload.ubicacion.elevacion}
                  referenciaLugar={detailTarget.data.payload.ubicacion.referenciaLugar}
                  resultados={(detailTarget.data.payload.resultados ?? []).map((item, index) => ({
                    key: `${item.elemento}-${index}`,
                    label: item.elemento,
                    value: `${item.prefijo ?? ""}${item.valor}`
                  }))}
                />
              ) : (
                <DetailContent
                  nombre={detailTarget.data.nombre}
                  numero={detailTarget.data.numero ?? undefined}
                  tipoMuestra={detailTarget.data.tipoMuestra ?? undefined}
                  sector={detailTarget.data.sector ?? undefined}
                  usuarioNombre={detailTarget.data.usuario?.nombre ?? undefined}
                  fechaMuestreo={detailTarget.data.fechaMuestreo ?? undefined}
                  fechaEntrega={detailTarget.data.fechaEntrega ?? undefined}
                  laboratorio1={detailTarget.data.laboratorio1 ?? undefined}
                  laboratorio2={detailTarget.data.laboratorio2 ?? undefined}
                  laboratorio3={detailTarget.data.laboratorio3 ?? undefined}
                  descripcion={detailTarget.data.descripcion ?? undefined}
                  nivel={detailTarget.data.ubicacion.nivel}
                  este={detailTarget.data.ubicacion.este ?? undefined}
                  norte={detailTarget.data.ubicacion.norte ?? undefined}
                  elevacion={detailTarget.data.ubicacion.elevacion ?? undefined}
                  referenciaLugar={detailTarget.data.ubicacion.referenciaLugar ?? undefined}
                  resultados={(detailTarget.data.resultados ?? []).map((item) => ({
                    key: item.id ?? `${item.elemento.nombre}-${item.valor}`,
                    label: item.elemento.nombre,
                    value: `${item.prefijo ?? ""}${item.valor}${item.elemento.unidad ? ` ${item.elemento.unidad}` : ""}`
                  }))}
                />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
