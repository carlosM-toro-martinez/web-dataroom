import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, FileSpreadsheet, RotateCcw, Upload } from "lucide-react";
import type { DrillingCampaign } from "@/features/sondajes/model/sondajes.schema";
import { parseProgramFile, type ParsedProgram } from "@/features/sondajes/lib/programExcel";
import { HoleStatusBadge } from "@/features/sondajes/components/HoleStatus";
import { suggestProgramCode } from "@/features/sondajes/components/ProgramFormModal";
import { Field, Modal, SectionTitle, fieldClass, formatMeters, formatNumber, primaryButton, secondaryButton } from "@/features/sondajes/components/ui";

export type ImportRequest = {
  target: { mode: "new"; name: string; code: string; area: string } | { mode: "existing"; campaignId: string };
  holes: Array<Record<string, unknown>>;
};

export function ImportProgramModal({
  open,
  campaigns,
  saving,
  onClose,
  onImport
}: {
  open: boolean;
  campaigns: DrillingCampaign[];
  saving: boolean;
  onClose: () => void;
  onImport: (request: ImportRequest) => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState("");
  const [parsed, setParsed] = useState<ParsedProgram | null>(null);
  const [parseError, setParseError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [area, setArea] = useState("");
  const [campaignId, setCampaignId] = useState("");

  useEffect(() => {
    if (open) return;
    setFileName("");
    setParsed(null);
    setParseError("");
    setMode("new");
    setCampaignId("");
  }, [open]);

  async function handleFile(file?: File | null) {
    if (!file) return;
    setFileName(file.name);
    setParseError("");
    setParsed(null);
    try {
      const result = await parseProgramFile(file);
      setParsed(result);
      setName(result.suggestedName);
      setCode(suggestProgramCode(result.suggestedName));
      setArea(result.suggestedArea);
      // Si ya existe un programa del área, se propone agregar a ese.
      const sameArea = campaigns.find((campaign) => (campaign.area ?? "").toUpperCase() === result.suggestedArea);
      if (sameArea && sameArea.name.toUpperCase() === result.suggestedName.toUpperCase()) {
        setMode("existing");
        setCampaignId(sameArea.id);
      }
    } catch (error) {
      setParseError(error instanceof Error ? error.message : "No se pudo leer el archivo.");
    }
  }

  const rows = parsed?.rows ?? [];
  const invalidRows = rows.filter((row) => row.errors.length > 0);
  const canImport =
    rows.length > 0 &&
    invalidRows.length === 0 &&
    (parsed?.missingColumns.length ?? 0) === 0 &&
    (mode === "existing" ? Boolean(campaignId) : Boolean(name.trim() && code.trim()));
  const totalMeters = rows.reduce((sum, row) => sum + (row.plannedDepth ?? 0), 0);

  async function submit() {
    if (!canImport) return;
    await onImport({
      target: mode === "existing" ? { mode, campaignId } : { mode, name: name.trim(), code: code.trim().toUpperCase(), area: area.trim().toUpperCase() },
      holes: rows.map((row) => ({
        code: row.code,
        status: row.status,
        type: "DDH",
        plannedEast: row.plannedEast,
        plannedNorth: row.plannedNorth,
        plannedElevation: row.plannedElevation,
        plannedAzimuth: row.plannedAzimuth,
        plannedDip: row.plannedDip,
        plannedDepth: row.plannedDepth
      }))
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      icon={<FileSpreadsheet size={20} />}
      title="Importar programa desde Excel"
      subtitle="Formato del Programa DDH: Drillhole, X, Y, Z, Azimuth, Dip, Target Depth, Estado"
      footer={
        <>
          <button type="button" className={secondaryButton} onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className={primaryButton} disabled={!canImport || saving} onClick={submit}>
            <Upload size={16} />
            {saving ? "Importando..." : `Importar ${rows.length || ""} pozo${rows.length === 1 ? "" : "s"}`}
          </button>
        </>
      }
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(event) => {
          void handleFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />

      {!parsed ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            void handleFile(event.dataTransfer.files?.[0]);
          }}
          className={`flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-14 text-center transition ${
            dragging ? "border-[var(--color-primary)] bg-[var(--color-surface-container-high)]" : "border-[var(--color-border-soft)] hover:border-[var(--color-primary)]"
          }`}
        >
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-surface-container-high)] text-[var(--color-primary)]">
            <FileSpreadsheet size={26} />
          </span>
          <span className="text-sm font-bold">Arrastra aquí el Excel o haz clic para elegirlo</span>
          <span className="text-xs text-[var(--color-on-surface-variant)]">Acepta .xlsx y .xls (p. ej. Programa_DDH_Mosa, Programa_DDH_Lipeña)</span>
          {parseError ? (
            <span className="mt-2 inline-flex items-center gap-2 rounded-xl bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-600">
              <AlertTriangle size={14} />
              {parseError}
            </span>
          ) : null}
        </button>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--color-border-soft)] p-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{parsed.title || fileName}</p>
              <p className="mt-0.5 text-xs text-[var(--color-on-surface-variant)]">
                {fileName} · {rows.length} pozos · {formatMeters(totalMeters)} programados
              </p>
            </div>
            <button type="button" className={secondaryButton} onClick={() => inputRef.current?.click()}>
              <RotateCcw size={15} />
              Cambiar archivo
            </button>
          </div>

          {parsed.missingColumns.length > 0 ? (
            <p className="flex items-center gap-2 rounded-xl bg-rose-500/10 px-3 py-2.5 text-sm font-semibold text-rose-600">
              <AlertTriangle size={16} />
              Faltan columnas: {parsed.missingColumns.join(", ")}
            </p>
          ) : invalidRows.length > 0 ? (
            <p className="flex items-center gap-2 rounded-xl bg-rose-500/10 px-3 py-2.5 text-sm font-semibold text-rose-600">
              <AlertTriangle size={16} />
              {invalidRows.length} fila(s) con errores. Corrige el Excel y vuelve a cargarlo.
            </p>
          ) : (
            <p className="flex items-center gap-2 rounded-xl bg-emerald-500/10 px-3 py-2.5 text-sm font-semibold text-emerald-600">
              <CheckCircle2 size={16} />
              Archivo correcto: {rows.length} pozos listos para importar.
            </p>
          )}

          <section>
            <SectionTitle>Destino</SectionTitle>
            <div className="mb-4 inline-flex rounded-xl border border-[var(--color-border-soft)] p-1">
              {(["new", "existing"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setMode(option)}
                  disabled={option === "existing" && campaigns.length === 0}
                  className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold transition disabled:opacity-40 ${
                    mode === option ? "bg-[var(--color-primary)] text-[var(--color-on-primary)]" : "text-[var(--color-on-surface-variant)]"
                  }`}
                >
                  {option === "new" ? "Programa nuevo" : "Agregar a uno existente"}
                </button>
              ))}
            </div>
            {mode === "new" ? (
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Nombre del programa" required className="sm:col-span-3">
                  <input className={fieldClass} value={name} onChange={(event) => setName(event.target.value)} />
                </Field>
                <Field label="Código" required className="sm:col-span-2">
                  <input className={`${fieldClass} font-mono uppercase`} value={code} onChange={(event) => setCode(event.target.value)} />
                </Field>
                <Field label="Área">
                  <input className={`${fieldClass} uppercase`} value={area} onChange={(event) => setArea(event.target.value)} />
                </Field>
              </div>
            ) : (
              <Field label="Programa">
                <select className={fieldClass} value={campaignId} onChange={(event) => setCampaignId(event.target.value)}>
                  <option value="">Selecciona un programa</option>
                  {campaigns.map((campaign) => (
                    <option key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}
          </section>

          <section>
            <SectionTitle>Vista previa</SectionTitle>
            <div className="overflow-x-auto rounded-2xl border border-[var(--color-border-soft)]">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-[var(--color-surface-container-high)] text-[10px] font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                  <tr>
                    {["Fila", "Drillhole", "X", "Y", "Z", "Az", "Dip", "Target", "Estado"].map((heading) => (
                      <th key={heading} className="px-3 py-2.5">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-soft)]">
                  {rows.map((row) => (
                    <tr key={row.rowNumber} className={row.errors.length ? "bg-rose-500/5" : ""}>
                      <td className="px-3 py-2 text-xs text-[var(--color-on-surface-variant)]">{row.rowNumber}</td>
                      <td className="px-3 py-2 font-semibold">
                        {row.code || "—"}
                        {row.errors.length ? <span className="block text-xs font-medium text-rose-600">{row.errors.join(" · ")}</span> : null}
                      </td>
                      <td className="px-3 py-2 font-mono tabular-nums">{formatNumber(row.plannedEast)}</td>
                      <td className="px-3 py-2 font-mono tabular-nums">{formatNumber(row.plannedNorth)}</td>
                      <td className="px-3 py-2 font-mono tabular-nums">{formatNumber(row.plannedElevation)}</td>
                      <td className="px-3 py-2 font-mono tabular-nums">{formatNumber(row.plannedAzimuth, 0)}</td>
                      <td className="px-3 py-2 font-mono tabular-nums">{formatNumber(row.plannedDip, 0)}</td>
                      <td className="px-3 py-2 font-mono tabular-nums">{formatMeters(row.plannedDepth)}</td>
                      <td className="px-3 py-2">
                        <HoleStatusBadge status={row.status} size="sm" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </Modal>
  );
}
