import { useMemo, useState, type ReactNode } from "react";
import { Link, Navigate } from "react-router-dom";
import { Upload, Download, Plus } from "lucide-react";
import * as XLSX from "xlsx";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useToast } from "@/shared/ui/toast/ToastProvider";
import { InternalHeader } from "@/shared/ui/InternalHeader";
import {
  useCreateAssayMutation,
  useCreateDrillHoleMutation,
  useCreateIntervalMutation,
  useCreateProjectMutation,
  useCreateZoneMutation,
  useExecuteMiningExcelImportMutation,
  useValidateMiningExcelImportMutation
} from "@/features/exploraciones/hooks/useExploracionMinera";
import {
  useCreateMiningAreaMutation,
  useCreateMiningLaborMutation,
  useCreateMiningLevelMutation,
  useCreateSurfaceElementMutation,
  useCreateSurfaceLaboratoryMutation,
  useCreateSurfaceSampleMutation,
  useCreateSurfaceSampleWithResultsMutation
} from "@/features/exploraciones/hooks/useSurfaceExploration";

const field =
  "w-full rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] px-3 py-2 text-sm text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary)]";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function ExploracionesFormsPage() {
  const { user } = useAuth();
  const { showError, showSuccess } = useToast();
  const [uploading, setUploading] = useState(false);
  const [drillImporting, setDrillImporting] = useState<"validate" | "execute" | null>(null);
  const [drillImportFile, setDrillImportFile] = useState<File | null>(null);
  const [drillProjectName, setDrillProjectName] = useState("LIP");
  const [drillDefaultZoneName, setDrillDefaultZoneName] = useState("General");
  const [drillImportResponse, setDrillImportResponse] = useState<Record<string, any> | null>(null);

  const canAdmin = user?.role === "ADMIN";
  if (!canAdmin) return <Navigate to="/perfil" replace />;

  const createProject = useCreateProjectMutation();
  const createZone = useCreateZoneMutation();
  const createDrillHole = useCreateDrillHoleMutation();
  const createInterval = useCreateIntervalMutation();
  const createAssay = useCreateAssayMutation();
  const validateMiningExcelImport = useValidateMiningExcelImportMutation();
  const executeMiningExcelImport = useExecuteMiningExcelImportMutation();

  const createMiningArea = useCreateMiningAreaMutation();
  const createMiningLevel = useCreateMiningLevelMutation();
  const createMiningLabor = useCreateMiningLaborMutation();
  const createSurfaceSample = useCreateSurfaceSampleMutation();
  const createSurfaceSampleWithResults = useCreateSurfaceSampleWithResultsMutation();
  const createSurfaceLaboratory = useCreateSurfaceLaboratoryMutation();
  const createSurfaceElement = useCreateSurfaceElementMutation();

  const [drill, setDrill] = useState<Record<string, string>>({});
  const [surface, setSurface] = useState<Record<string, string>>({});

  const setDrillField = (k: string, v: string) => setDrill((s) => ({ ...s, [k]: v }));
  const setSurfaceField = (k: string, v: string) => setSurface((s) => ({ ...s, [k]: v }));

  const parseNumber = (v?: string) => {
    if (!v) return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };
  const parseISO = (v?: string) => {
    if (!v) return undefined;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
  };
  const parseSampleDate = (v: unknown) => {
    if (v === null || v === undefined || v === "") return undefined;
    if (typeof v === "number") {
      const parsed = XLSX.SSF.parse_date_code(v);
      if (!parsed) return undefined;
      const date = new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d, parsed.H || 0, parsed.M || 0, Math.floor(parsed.S || 0)));
      return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
    }
    return parseISO(String(v));
  };
  const normalizeSampleType = (v: unknown) => {
    const raw = String(v ?? "")
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "_");
    if (raw === "SIMPLE" || raw === "DOUBLE" || raw === "SIMPLE_DOUBLE" || raw === "OTHER") return raw;
    return undefined;
  };
  const parseResultHeader = (header: string) => {
    const raw = String(header ?? "").trim();
    if (!raw) return null;
    const cleaned = raw.replace(/^RESULT\d*_/i, "").trim();
    const match = cleaned.match(/^(.*?)(?:[_\s]|\s*\()\s*L([123])\)?$/i);
    if (!match) return null;
    const elementKey = (match[1] ?? "").trim();
    const slot = `L${match[2]}` as "L1" | "L2" | "L3";
    if (!elementKey) return null;
    return { elementKey, slot };
  };

  const sheetsTemplate = useMemo(
    () => [
      { name: "areas", headers: ["name", "abbreviation", "description"] },
      { name: "levels", headers: ["miningAreaId", "name", "abbreviation", "elevation", "description"] },
      { name: "labors", headers: ["miningLevelId", "name", "abbreviation", "code", "description"] },
      {
        name: "samples_with_results",
        headers: [
          "miningLaborId",
          "code",
          "number",
          "sampledAt",
          "name",
          "sampleType",
          "placeReference",
          "east",
          "north",
          "elevation",
          "description",
          "observations",
          "lab_1_id",
          "lab_2_id",
          "lab_3_id",
          "RESULT_<ELEMENT_ID>_L1",
          "RESULT2_<ELEMENT_ID>_L1",
          "RESULT3_<ELEMENT_ID>_L1",
          "RESULT_<ELEMENT_ID>_L2",
          "RESULT2_<ELEMENT_ID>_L2",
          "RESULT3_<ELEMENT_ID>_L2",
          "RESULT_<ELEMENT_ID>_L3",
          "RESULT2_<ELEMENT_ID>_L3",
          "RESULT3_<ELEMENT_ID>_L3"
        ]
      },
      { name: "laboratories", headers: ["name", "abbreviation", "description"] },
      { name: "elements", headers: ["id", "name", "symbol", "defaultUnit", "description"] }
    ],
    []
  );

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    sheetsTemplate.forEach((sheet) => {
      const ws = XLSX.utils.json_to_sheet([Object.fromEntries(sheet.headers.map((h) => [h, ""]))]);
      XLSX.utils.book_append_sheet(wb, ws, sheet.name);
    });
    XLSX.writeFile(wb, "surface_bulk_template.xlsx");
  };

  const processRowsSequentially = async (rows: any[], handler: (row: any) => Promise<void>) => {
    for (let i = 0; i < rows.length; i += 1) {
      await handler(rows[i]);
      await sleep(120);
    }
  };

  const handleSurfaceFileUpload = async (file: File) => {
    try {
      setUploading(true);
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const getRows = (name: string) => {
        const ws = wb.Sheets[name];
        if (!ws) return [];
        return XLSX.utils.sheet_to_json<any>(ws, { defval: "" }).filter((r) => Object.values(r).some((v) => String(v).trim() !== ""));
      };

      const areas = getRows("areas");
      const levels = getRows("levels");
      const labors = getRows("labors");
      const samples = getRows("samples_with_results").length ? getRows("samples_with_results") : getRows("samples");
      const laboratories = getRows("laboratories");
      const elements = getRows("elements");
      const elementIdByAlias = new Map<string, string>();

      await processRowsSequentially(areas, async (r) => {
        await createMiningArea.mutateAsync({ name: r.name, abbreviation: r.abbreviation || undefined, description: r.description || undefined });
      });
      await processRowsSequentially(levels, async (r) => {
        await createMiningLevel.mutateAsync({
          miningAreaId: r.miningAreaId,
          name: r.name,
          abbreviation: r.abbreviation || undefined,
          elevation: parseNumber(r.elevation),
          description: r.description || undefined
        });
      });
      await processRowsSequentially(labors, async (r) => {
        await createMiningLabor.mutateAsync({
          miningLevelId: r.miningLevelId,
          name: r.name,
          abbreviation: r.abbreviation || undefined,
          code: r.code || undefined,
          description: r.description || undefined
        });
      });
      await processRowsSequentially(laboratories, async (r) => {
        await createSurfaceLaboratory.mutateAsync({
          name: r.name,
          abbreviation: r.abbreviation || undefined,
          description: r.description || undefined
        });
      });
      await processRowsSequentially(elements, async (r) => {
        const id = String(r.id ?? "").trim();
        const symbol = String(r.symbol ?? "").trim();
        const name = String(r.name ?? "").trim();
        if (id) {
          elementIdByAlias.set(id.toLowerCase(), id);
          if (symbol) elementIdByAlias.set(symbol.toLowerCase(), id);
          if (name) elementIdByAlias.set(name.toLowerCase(), id);
        }
        await createSurfaceElement.mutateAsync({
          name: r.name,
          symbol: r.symbol,
          defaultUnit: r.defaultUnit || undefined,
          description: r.description || undefined
        });
      });
      await processRowsSequentially(samples, async (r) => {
        const sampleLabs = [
          { slot: "L1", id: r.lab_1_id },
          { slot: "L2", id: r.lab_2_id },
          { slot: "L3", id: r.lab_3_id }
        ]
          .filter((l) => String(l.id ?? "").trim())
          .map((l) => ({
            slot: l.slot,
            laboratoryId: String(l.id).trim()
          }));

        const results = Object.entries(r)
          .filter(([col]) => /^RESULT\d*_/.test(col.toUpperCase()) && parseResultHeader(col))
          .map(([col, value]) => {
            const n = parseNumber(String(value ?? ""));
            if (n === undefined) return null;
            const parsedHeader = parseResultHeader(col);
            if (!parsedHeader) return null;
            const key = parsedHeader.elementKey.toLowerCase();
            const resolvedElementId = elementIdByAlias.get(key) ?? parsedHeader.elementKey;
            return {
              elementId: resolvedElementId,
              slot: parsedHeader.slot,
              value: n,
              sourceColumn: col
            };
          })
          .filter(Boolean);

        await createSurfaceSampleWithResults.mutateAsync({
          miningLaborId: r.miningLaborId,
          code: String(r.code ?? "").trim(),
          number: parseNumber(r.number),
          sampledAt: parseSampleDate(r.sampledAt),
          name: r.name || undefined,
          sampleType: normalizeSampleType(r.sampleType),
          placeReference: r.placeReference || undefined,
          east: parseNumber(r.east),
          north: parseNumber(r.north),
          elevation: parseNumber(r.elevation),
          description: r.description || undefined,
          observations: r.observations || undefined,
          sampleLabs,
          results
        } as any);
      });

      showSuccess("Surface bulk upload completed successfully.");
    } catch (error: any) {
      showError(error?.message ?? "Bulk upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const runDrillImport = async (mode: "validate" | "execute") => {
    if (!drillImportFile) {
      showError("Please select an Excel file first.");
      return;
    }
    if (!drillProjectName.trim()) {
      showError("Project name is required.");
      return;
    }
    try {
      setDrillImporting(mode);
      const payload = {
        file: drillImportFile,
        projectName: drillProjectName.trim(),
        defaultZoneName: drillDefaultZoneName.trim() || undefined
      };
      const result =
        mode === "validate"
          ? await validateMiningExcelImport.mutateAsync(payload)
          : await executeMiningExcelImport.mutateAsync(payload);
      setDrillImportResponse(result as Record<string, any>);
      showSuccess(mode === "validate" ? "Validation completed." : "Import executed successfully.");
    } catch (error: any) {
      const data = error?.response?.data;
      if (data && typeof data === "object") setDrillImportResponse(data);
      showError(error?.message ?? "Drillholes Excel import failed.");
    } finally {
      setDrillImporting(null);
    }
  };

  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <InternalHeader
        eyebrow="Administracion"
        title="Exploration Forms"
        description="Formularios ordenados para Drillholes, Surface e importaciones administrativas."
      />

      <div className="flex justify-end rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-3">
        <Link
          to="/exploraciones-data-room"
          className="rounded-lg border border-[var(--color-border-soft)] px-4 py-2 text-sm font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)]"
        >
          Data Room
        </Link>
      </div>

      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <h2 className="mb-3 text-lg font-bold">Drillholes Excel Import (Validate / Execute)</h2>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <input
            className={field}
            placeholder="projectName (required)"
            value={drillProjectName}
            onChange={(e) => setDrillProjectName(e.target.value)}
          />
          <input
            className={field}
            placeholder="defaultZoneName (optional)"
            value={drillDefaultZoneName}
            onChange={(e) => setDrillDefaultZoneName(e.target.value)}
          />
          <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-[var(--color-border-soft)] px-3 py-2 text-sm font-semibold">
            <Upload size={14} /> {drillImportFile ? drillImportFile.name : "Select Excel"}
            <input
              type="file"
              accept=".xls,.xlsx"
              className="hidden"
              onChange={(e) => setDrillImportFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => void runDrillImport("validate")}
            disabled={!drillImportFile || drillImporting !== null}
            className="rounded-lg border border-[var(--color-border-soft)] px-3 py-2 text-sm font-semibold disabled:opacity-50"
          >
            Validate Only
          </button>
          <button
            onClick={() => void runDrillImport("execute")}
            disabled={!drillImportFile || drillImporting !== null}
            className="rounded-lg border border-[var(--color-border-soft)] px-3 py-2 text-sm font-semibold disabled:opacity-50"
          >
            Execute Import
          </button>
          {drillImporting ? (
            <span className="text-sm text-[var(--color-on-surface-variant)]">
              Processing: {drillImporting}...
            </span>
          ) : null}
        </div>
        {drillImportResponse ? (
          <div className="mt-3 rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] p-3">
            <p className="text-sm font-semibold">Import Response</p>
            <pre className="mt-2 max-h-72 overflow-auto text-xs">{JSON.stringify(drillImportResponse, null, 2)}</pre>
          </div>
        ) : null}
        <p className="mt-3 text-xs text-[var(--color-on-surface-variant)]">
          Flow: 1) Validate first. 2) Execute with the same file and fields if validation passes.
        </p>
      </article>

      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <h2 className="mb-3 text-lg font-bold">Surface Bulk Upload (CSV/XLSX)</h2>
        <div className="flex flex-wrap gap-2">
          <button onClick={downloadTemplate} className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border-soft)] px-3 py-2 text-sm font-semibold"><Download size={14} /> Download Template</button>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--color-border-soft)] px-3 py-2 text-sm font-semibold">
            <Upload size={14} /> Upload File
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleSurfaceFileUpload(file);
              }}
            />
          </label>
          {uploading ? <span className="text-sm text-[var(--color-on-surface-variant)]">Processing rows sequentially...</span> : null}
        </div>
      </article>

      <div className="grid gap-6 xl:grid-cols-2">
        <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
          <h2 className="mb-3 text-lg font-bold">Drillholes Forms</h2>
          <div className="space-y-4">
            <FormRow title="Project" onSubmit={async () => createProject.mutateAsync({ name: drill.projectName, location: drill.projectLocation || undefined } as any)}>
              <input className={field} placeholder="name" onChange={(e) => setDrillField("projectName", e.target.value)} />
              <input className={field} placeholder="location" onChange={(e) => setDrillField("projectLocation", e.target.value)} />
            </FormRow>
            <FormRow title="Zone" onSubmit={async () => createZone.mutateAsync({ projectId: Number(drill.zoneProjectId), name: drill.zoneName, description: drill.zoneDescription || undefined } as any)}>
              <input className={field} placeholder="projectId" onChange={(e) => setDrillField("zoneProjectId", e.target.value)} />
              <input className={field} placeholder="name" onChange={(e) => setDrillField("zoneName", e.target.value)} />
              <input className={field} placeholder="description" onChange={(e) => setDrillField("zoneDescription", e.target.value)} />
            </FormRow>
            <FormRow title="DrillHole" onSubmit={async () => createDrillHole.mutateAsync({ zoneId: Number(drill.drillZoneId), name: drill.drillName, collarEast: parseNumber(drill.collarEast), collarNorth: parseNumber(drill.collarNorth), collarElevation: parseNumber(drill.collarElevation) } as any)}>
              <input className={field} placeholder="zoneId" onChange={(e) => setDrillField("drillZoneId", e.target.value)} />
              <input className={field} placeholder="name" onChange={(e) => setDrillField("drillName", e.target.value)} />
              <input className={field} placeholder="collarEast" onChange={(e) => setDrillField("collarEast", e.target.value)} />
              <input className={field} placeholder="collarNorth" onChange={(e) => setDrillField("collarNorth", e.target.value)} />
              <input className={field} placeholder="collarElevation" onChange={(e) => setDrillField("collarElevation", e.target.value)} />
            </FormRow>
            <FormRow title="Interval" onSubmit={async () => createInterval.mutateAsync({ drillHoleId: Number(drill.intervalDrillHoleId), fromDepth: parseNumber(drill.fromDepth), toDepth: parseNumber(drill.toDepth) } as any)}>
              <input className={field} placeholder="drillHoleId" onChange={(e) => setDrillField("intervalDrillHoleId", e.target.value)} />
              <input className={field} placeholder="fromDepth" onChange={(e) => setDrillField("fromDepth", e.target.value)} />
              <input className={field} placeholder="toDepth" onChange={(e) => setDrillField("toDepth", e.target.value)} />
            </FormRow>
            <FormRow title="Assay" onSubmit={async () => createAssay.mutateAsync({ intervalId: Number(drill.assayIntervalId), sampleCode: drill.assaySampleCode, method: drill.assayMethod || undefined } as any)}>
              <input className={field} placeholder="intervalId" onChange={(e) => setDrillField("assayIntervalId", e.target.value)} />
              <input className={field} placeholder="sampleCode" onChange={(e) => setDrillField("assaySampleCode", e.target.value)} />
              <input className={field} placeholder="method" onChange={(e) => setDrillField("assayMethod", e.target.value)} />
            </FormRow>
          </div>
        </article>

        <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
          <h2 className="mb-3 text-lg font-bold">Surface Forms</h2>
          <div className="space-y-4">
            <FormRow title="Mining Area" onSubmit={async () => createMiningArea.mutateAsync({ name: surface.areaName, abbreviation: surface.areaAbbreviation || undefined, description: surface.areaDescription || undefined })}>
              <input className={field} placeholder="name" onChange={(e) => setSurfaceField("areaName", e.target.value)} />
              <input className={field} placeholder="abbreviation" onChange={(e) => setSurfaceField("areaAbbreviation", e.target.value)} />
              <input className={field} placeholder="description" onChange={(e) => setSurfaceField("areaDescription", e.target.value)} />
            </FormRow>
            <FormRow title="Mining Level" onSubmit={async () => createMiningLevel.mutateAsync({ miningAreaId: surface.levelAreaId, name: surface.levelName, abbreviation: surface.levelAbbreviation || undefined, elevation: parseNumber(surface.levelElevation), description: surface.levelDescription || undefined })}>
              <input className={field} placeholder="miningAreaId" onChange={(e) => setSurfaceField("levelAreaId", e.target.value)} />
              <input className={field} placeholder="name" onChange={(e) => setSurfaceField("levelName", e.target.value)} />
              <input className={field} placeholder="abbreviation" onChange={(e) => setSurfaceField("levelAbbreviation", e.target.value)} />
              <input className={field} placeholder="elevation" onChange={(e) => setSurfaceField("levelElevation", e.target.value)} />
              <input className={field} placeholder="description" onChange={(e) => setSurfaceField("levelDescription", e.target.value)} />
            </FormRow>
            <FormRow title="Mining Labor" onSubmit={async () => createMiningLabor.mutateAsync({ miningLevelId: surface.laborLevelId, name: surface.laborName, abbreviation: surface.laborAbbreviation || undefined, code: surface.laborCode || undefined, description: surface.laborDescription || undefined })}>
              <input className={field} placeholder="miningLevelId" onChange={(e) => setSurfaceField("laborLevelId", e.target.value)} />
              <input className={field} placeholder="name" onChange={(e) => setSurfaceField("laborName", e.target.value)} />
              <input className={field} placeholder="abbreviation" onChange={(e) => setSurfaceField("laborAbbreviation", e.target.value)} />
              <input className={field} placeholder="code" onChange={(e) => setSurfaceField("laborCode", e.target.value)} />
              <input className={field} placeholder="description" onChange={(e) => setSurfaceField("laborDescription", e.target.value)} />
            </FormRow>
            <FormRow title="Sample" onSubmit={async () => createSurfaceSample.mutateAsync({ miningLaborId: surface.sampleLaborId, code: surface.sampleCode, number: parseNumber(surface.sampleNumber), sampledAt: parseISO(surface.sampledAt), name: surface.sampleName || undefined, sampleType: surface.sampleType as any, placeReference: surface.samplePlaceReference || undefined, east: parseNumber(surface.sampleEast), north: parseNumber(surface.sampleNorth), elevation: parseNumber(surface.sampleElevation), description: surface.sampleDescription || undefined, observations: surface.sampleObservations || undefined } as any)}>
              <input className={field} placeholder="miningLaborId" onChange={(e) => setSurfaceField("sampleLaborId", e.target.value)} />
              <input className={field} placeholder="code" onChange={(e) => setSurfaceField("sampleCode", e.target.value)} />
              <input className={field} placeholder="number" onChange={(e) => setSurfaceField("sampleNumber", e.target.value)} />
              <input className={field} placeholder="sampledAt (YYYY-MM-DDTHH:mm)" onChange={(e) => setSurfaceField("sampledAt", e.target.value)} />
              <input className={field} placeholder="name" onChange={(e) => setSurfaceField("sampleName", e.target.value)} />
              <input className={field} placeholder="sampleType (SIMPLE|DOUBLE|SIMPLE_DOUBLE|OTHER)" onChange={(e) => setSurfaceField("sampleType", e.target.value)} />
            </FormRow>
            <FormRow title="Laboratory / Sample-Lab / Element / Result / QAQC" onSubmit={async () => showSuccess("Use template upload for high-volume inserts or existing module forms for these records.")}>
              <p className="text-xs text-[var(--color-on-surface-variant)]">Use bulk template for complete chain insertion (recommended).</p>
            </FormRow>
          </div>
        </article>
      </div>
    </section>
  );
}

function FormRow({
  title,
  onSubmit,
  children
}: {
  title: string;
  onSubmit: () => Promise<unknown>;
  children: ReactNode;
}) {
  const { showError, showSuccess } = useToast();
  return (
    <div className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-bold">{title}</h3>
        <button
          onClick={async () => {
            try {
              await onSubmit();
              showSuccess(`${title} created successfully.`);
            } catch (error: any) {
              showError(error?.message ?? `Failed to create ${title}.`);
            }
          }}
          className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border-soft)] px-3 py-1.5 text-xs font-semibold"
        >
          <Plus size={12} /> Create
        </button>
      </div>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">{children}</div>
    </div>
  );
}
