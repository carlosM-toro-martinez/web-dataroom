import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ChevronRight, Plus, X } from "lucide-react";
import imgGeneralPlata from "@/assets/images/GENERAL_1PLATA.jpg";
import imgGeneralCobre from "@/assets/images/GENERAL_2COBRE.jpg";
import imgAydaProyeccion1 from "@/assets/images/AYDA_PROYECCION1.jpg";
import imgAydaProyeccion2 from "@/assets/images/AYDA_PROYECCION2.jpg";
import imgCentralPlata from "@/assets/images/CENTRAL_1PLATA.jpg";
import imgCentralCobre from "@/assets/images/CENTRAL_2COBRE.jpg";
import imgCentralPorvenir0Estructuras from "@/assets/images/CENTRAL_NIVEL_PORVENIR_0ESTRUCTURAS.jpg";
import imgCentralPorvenir1Plata from "@/assets/images/CENTRAL_NIVEL_PORVENIR_1PLATA.jpg";
import imgCentralPorvenir2Cobre from "@/assets/images/CENTRAL_NIVEL_PORVENIR_2COBRE.jpg";
import imgCentralPorvenir3Oro from "@/assets/images/CENTRAL_NIVEL_PORVENIR_3ORO.jpg";
import imgLipenaPlata from "@/assets/images/LIPEÑA_1PLATA.jpg";
import imgLipenaCobre from "@/assets/images/LIPEÑA_2COBRE.jpg";
import imgLipenaNivel00Estructuras from "@/assets/images/LIPEÑA_NIVEL0_0ESTRUCTURAS.jpg";
import imgLipenaNivel0Cobre from "@/assets/images/LIPEÑA_NIVEL0_COBRE.jpg";
import imgLipenaNivel0Plata from "@/assets/images/LIPEÑA_NIVEL0_PLATA.jpg";
import imgLipenaNivel400Estructuras from "@/assets/images/LIPEÑA_NIVEL40_0ESTRUCTURAS.jpg";
import imgLipenaNivel401Plata from "@/assets/images/LIPEÑA_NIVEL40_1PLATA.jpg";
import imgLipenaNivel40Cobre from "@/assets/images/LIPEÑA_NIVEL40_COBRE.jpg";
import imgMosaPlata from "@/assets/images/MOSA_1PLATA.jpg";
import imgMosaCobre from "@/assets/images/MOSA_2COBRE.jpg";
import imgMosaGaleria4Estructuras from "@/assets/images/MOSA_GALERIA_ABANDONADA_4ESTRUCTURAS.jpg";
import imgMosaEsperanza0Estructuras from "@/assets/images/MOSA_NIVEL_ESPERANZA_0ESTRUCTURAS.jpg";
import imgMosaEsperanza1Plata from "@/assets/images/MOSA_NIVEL_ESPERANZA_1PLATA.jpg";
import imgMosaEsperanza2Cobre from "@/assets/images/MOSA_NIVEL_ESPERANZA_2COBRE.jpg";
import imgMosaEsperanza3Oro from "@/assets/images/MOSA_NIVEL_ESPERANZA_3ORO.jpg";
import imgMosaLuz0Estructuras from "@/assets/images/MOSA_NIVEL_LUZ_0ESTRUCTURAS.jpg";
import imgMosaLuz1Plata from "@/assets/images/MOSA_NIVEL_LUZ_1PLATA.jpg";
import imgMosaLuz2Cobre from "@/assets/images/MOSA_NIVEL_LUZ_2COBRE.jpg";
import imgModelo1 from "@/assets/images/1MODELO.gif";
import imgModelo2 from "@/assets/images/2MODELO_.gif";
import { useAuth } from "@/features/auth/context/AuthContext";
import { InternalHeader } from "@/shared/ui/InternalHeader";
import {
  useCreateMiningAreaMutation,
  useCreateMiningLaborMutation,
  useCreateMiningLevelMutation,
  useCreateSampleLaboratoryMutation,
  useCreateSampleQaqcMutation,
  useCreateSampleResultMutation,
  useCreateSurfaceElementMutation,
  useCreateSurfaceLaboratoryMutation,
  useCreateSurfaceSampleMutation,
  useMiningAreasQuery,
  useMiningLaborsQuery,
  useMiningLevelsQuery,
  useSampleLaboratoriesQuery,
  useSampleQaqcQuery,
  useSampleResultsBySampleQuery,
  useSurfaceElementsQuery,
  useSurfaceLaboratoriesQuery,
  useSurfaceSamplesQuery
} from "@/features/exploraciones/hooks/useSurfaceExploration";

function p(areaId?: string, levelId?: string, laborId?: string, sampleId?: string) {
  if (!areaId) return "/exploraciones-data-room/surface";
  if (!levelId) return `/exploraciones-data-room/surface/areas/${areaId}`;
  if (!laborId) return `/exploraciones-data-room/surface/areas/${areaId}/levels/${levelId}`;
  if (!sampleId)
    return `/exploraciones-data-room/surface/areas/${areaId}/levels/${levelId}/labors/${laborId}`;
  return `/exploraciones-data-room/surface/areas/${areaId}/levels/${levelId}/labors/${laborId}/samples/${sampleId}`;
}

type ModalType =
  | "area"
  | "level"
  | "labor"
  | "sample"
  | "laboratory"
  | "sampleLaboratory"
  | "element"
  | "result"
  | "qaqc";

// Editable image scheme: update this object when new maps/models are added.
const SURFACE_IMAGE_SCHEME = {
  // 1) GENERAL al inicio
  default: ["GENERAL_1PLATA.jpg", "GENERAL_2COBRE.jpg", "1MODELO.gif", "2MODELO_.gif"],
  byAreaId: {
    // 2) Imagenes por area (solo nombre de area) al inicio de cada area
    "640d7ed2-66b6-4ca6-85df-8b113205e256": ["AYDA_PROYECCION1.jpg", "AYDA_PROYECCION2.jpg"],
    "f7259e26-68ac-4190-9299-fc5bae8f6131": ["GENERAL_1PLATA.jpg", "GENERAL_2COBRE.jpg"],
    "365d677a-63ec-42c8-ac51-43d8323bb9e7": ["GENERAL_1PLATA.jpg", "GENERAL_2COBRE.jpg"],
    // Central
    "b9e1f191-8ac8-46aa-9f47-fbf3bc301025": ["CENTRAL_1PLATA.jpg", "CENTRAL_2COBRE.jpg"],
    // Lipeña
    "2e802037-351e-40a1-a219-d097eebba799": [
      "LIPEÑA_1PLATA.jpg",
      "LIPEÑA_2COBRE.jpg"
    ],
    // Mosa
    "ba3aca6c-0545-4e82-82fd-2a62108cd939": ["MOSA_1PLATA.jpg", "MOSA_2COBRE.jpg", "MOSA_GALERIA_ABANDONADA_4ESTRUCTURAS.jpg"]
  } as Record<string, string[]>,
  byLevelId: {
    // 3) Niveles: primero los que inician con 0
    // Central - Porvenir
    "607e931a-00e2-4ebc-bf0b-383ec0f5701c": [
      "CENTRAL_NIVEL_PORVENIR_0ESTRUCTURAS.jpg",
      "CENTRAL_NIVEL_PORVENIR_1PLATA.jpg",
      "CENTRAL_NIVEL_PORVENIR_2COBRE.jpg",
      "CENTRAL_NIVEL_PORVENIR_3ORO.jpg"
    ],
    // Lipeña - Cuadro (sin set específico, usa de área)
    "39c57d4b-2c42-4f81-9948-6e40a7bdf431": [
      "LIPEÑA_1PLATA.jpg",
      "LIPEÑA_2COBRE.jpg"
    ],
    // Lipeña - Nivel 0
    "baaf5c29-50ab-4e5f-887d-ccd119e36b23": [
      "LIPEÑA_NIVEL0_0ESTRUCTURAS.jpg",
      "LIPEÑA_NIVEL0_PLATA.jpg",
      "LIPEÑA_NIVEL0_COBRE.jpg"
    ],
    // Lipeña - Nivel 40
    "83e3f378-9e92-4da5-a18a-f9da29249e87": [
      "LIPEÑA_NIVEL40_0ESTRUCTURAS.jpg",
      "LIPEÑA_NIVEL40_1PLATA.jpg",
      "LIPEÑA_NIVEL40_COBRE.jpg"
    ],
    // Lipeña - Nivel 80 (fallback temporal)
    "a78257c0-cef5-4dbe-a73b-fb44131e976e": [
      "LIPEÑA_1PLATA.jpg",
      "LIPEÑA_2COBRE.jpg"
    ],
    // Mosa - Esperanza
    "3498ff83-6b74-4f7b-a260-9cd3da8c5269": [
      "MOSA_NIVEL_ESPERANZA_0ESTRUCTURAS.jpg",
      "MOSA_NIVEL_ESPERANZA_1PLATA.jpg",
      "MOSA_NIVEL_ESPERANZA_2COBRE.jpg",
      "MOSA_NIVEL_ESPERANZA_3ORO.jpg"
    ],
    // Mosa - Luz
    "3bfc25a5-daa4-4597-93d2-d66d3b0f42f1": [
      "MOSA_NIVEL_LUZ_0ESTRUCTURAS.jpg",
      "MOSA_NIVEL_LUZ_1PLATA.jpg",
      "MOSA_NIVEL_LUZ_2COBRE.jpg"
    ]
  } as Record<string, string[]>
};

function getSampleTopNumericValue(sample: any): number {
  const direct = Array.isArray(sample?.results) ? sample.results : [];
  const byLab = Array.isArray(sample?.sampleLabs)
    ? sample.sampleLabs.flatMap((x: any) => (Array.isArray(x?.results) ? x.results : []))
    : [];
  const merged = [...direct, ...byLab];
  const numeric = merged.filter((r: any) => typeof r?.value === "number");
  if (!numeric.length) return Number.NEGATIVE_INFINITY;
  return numeric.reduce((max: number, r: any) => (r.value > max ? r.value : max), Number.NEGATIVE_INFINITY);
}

export function ExploracionesSurfaceDataRoomPage() {
  const { user } = useAuth();
  const canManage = user?.role === "ADMIN" || user?.role === "SUPERINTENDENTE";
  const canView = canManage || user?.role === "VISITANTE";
  const { areaId, levelId, laborId, sampleId } = useParams();
  const [modal, setModal] = useState<ModalType | null>(null);
  const [slide, setSlide] = useState(0);
  const [fullScreen, setFullScreen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [sampleRowsPerPage, setSampleRowsPerPage] = useState<5 | 10>(5);
  const [samplePage, setSamplePage] = useState(0);
  const relevantSampleRef = useRef<HTMLDivElement | null>(null);

  const areas = useMiningAreasQuery();
  const levels = useMiningLevelsQuery(areaId);
  const labors = useMiningLaborsQuery(levelId);
  const samples = useSurfaceSamplesQuery(laborId, Boolean(levelId || laborId));
  const sampleLabs = useSampleLaboratoriesQuery(sampleId);
  const results = useSampleResultsBySampleQuery(sampleId);
  const qaqc = useSampleQaqcQuery(sampleId);
  const laboratories = useSurfaceLaboratoriesQuery();
  const elements = useSurfaceElementsQuery();

  const createArea = useCreateMiningAreaMutation();
  const createLevel = useCreateMiningLevelMutation();
  const createLabor = useCreateMiningLaborMutation();
  const createSample = useCreateSurfaceSampleMutation();
  const createLab = useCreateSurfaceLaboratoryMutation();
  const createSampleLab = useCreateSampleLaboratoryMutation();
  const createElement = useCreateSurfaceElementMutation();
  const createResult = useCreateSampleResultMutation();
  const createQaqc = useCreateSampleQaqcMutation();

  const selectedSample = useMemo(
    () => (samples.data ?? []).find((s) => s.id === sampleId),
    [samples.data, sampleId]
  );
  const selectedSampleResults = useMemo(() => {
    if (!selectedSample) return [];
    const direct = Array.isArray((selectedSample as any).results) ? (selectedSample as any).results : [];
    const byLab = Array.isArray((selectedSample as any).sampleLabs)
      ? (selectedSample as any).sampleLabs.flatMap((x: any) => (Array.isArray(x?.results) ? x.results : []))
      : [];
    const fromEndpoint = Array.isArray(results.data) ? results.data : [];
    const merged = [...direct, ...byLab, ...fromEndpoint];
    const dedup = new Map<string, any>();
    merged.forEach((r: any) => {
      const key = String(r?.id ?? `${r?.elementId}-${r?.sampleLaboratoryId ?? "none"}-${r?.value ?? "na"}-${r?.sourceColumn ?? "na"}`);
      if (!dedup.has(key)) dedup.set(key, r);
    });
    return Array.from(dedup.values());
  }, [selectedSample, results.data]);
  const sampleRows = useMemo(() => {
    const all = samples.data ?? [];
    if (laborId) {
      return [...all].sort((a: any, b: any) => getSampleTopNumericValue(b) - getSampleTopNumericValue(a));
    }
    if (!levelId) return [];
    const laborSet = new Set((labors.data ?? []).map((l) => l.id));
    return all
      .filter((s) => laborSet.has(s.miningLaborId))
      .sort((a: any, b: any) => getSampleTopNumericValue(b) - getSampleTopNumericValue(a));
  }, [samples.data, laborId, levelId, labors.data]);
  const sampleTotalPages = Math.max(1, Math.ceil(sampleRows.length / sampleRowsPerPage));
  const safeSamplePage = Math.min(samplePage, sampleTotalPages - 1);
  const pagedSamples = useMemo(() => {
    const start = safeSamplePage * sampleRowsPerPage;
    return sampleRows.slice(start, start + sampleRowsPerPage);
  }, [sampleRows, safeSamplePage, sampleRowsPerPage]);
  const sampleLabMap = useMemo(() => {
    const map = new Map<string, string>();
    (sampleLabs.data ?? []).forEach((x) => map.set(x.id, `${x.slot} · ${x.laboratoryId}`));
    const fromSelected = Array.isArray((selectedSample as any)?.sampleLabs) ? (selectedSample as any).sampleLabs : [];
    fromSelected.forEach((x: any) => {
      const labId = x?.laboratoryId ?? x?.laboratory?.id;
      if (x?.id && labId) map.set(x.id, `${x.slot} · ${labId}`);
    });
    return map;
  }, [sampleLabs.data, selectedSample]);
  const laboratoryMap = useMemo(() => {
    const map = new Map<string, string>();
    (laboratories.data ?? []).forEach((x) => map.set(x.id, x.name));
    return map;
  }, [laboratories.data]);
  const elementMap = useMemo(() => {
    const map = new Map<string, string>();
    (elements.data ?? []).forEach((x) => map.set(x.id, `${x.symbol} (${x.name})`));
    return map;
  }, [elements.data]);
  const modelImages = useMemo(() => {
    const allImages = [
      imgGeneralPlata,
      imgGeneralCobre,
      imgAydaProyeccion1,
      imgAydaProyeccion2,
      imgCentralPlata,
      imgCentralCobre,
      imgCentralPorvenir0Estructuras,
      imgCentralPorvenir1Plata,
      imgCentralPorvenir2Cobre,
      imgCentralPorvenir3Oro,
      imgLipenaPlata,
      imgLipenaCobre,
      imgLipenaNivel00Estructuras,
      imgLipenaNivel0Plata,
      imgLipenaNivel0Cobre,
      imgLipenaNivel400Estructuras,
      imgLipenaNivel401Plata,
      imgLipenaNivel40Cobre,
      imgMosaPlata,
      imgMosaCobre,
      imgMosaGaleria4Estructuras,
      imgMosaEsperanza0Estructuras,
      imgMosaEsperanza1Plata,
      imgMosaEsperanza2Cobre,
      imgMosaEsperanza3Oro,
      imgMosaLuz0Estructuras,
      imgMosaLuz1Plata,
      imgMosaLuz2Cobre,
      imgModelo1,
      imgModelo2
    ];

    const imageByName: Record<string, string> = {
      "GENERAL_1PLATA.jpg": imgGeneralPlata,
      "GENERAL_2COBRE.jpg": imgGeneralCobre,
      "AYDA_PROYECCION1.jpg": imgAydaProyeccion1,
      "AYDA_PROYECCION2.jpg": imgAydaProyeccion2,
      "CENTRAL_1PLATA.jpg": imgCentralPlata,
      "CENTRAL_2COBRE.jpg": imgCentralCobre,
      "CENTRAL_NIVEL_PORVENIR_0ESTRUCTURAS.jpg": imgCentralPorvenir0Estructuras,
      "CENTRAL_NIVEL_PORVENIR_1PLATA.jpg": imgCentralPorvenir1Plata,
      "CENTRAL_NIVEL_PORVENIR_2COBRE.jpg": imgCentralPorvenir2Cobre,
      "CENTRAL_NIVEL_PORVENIR_3ORO.jpg": imgCentralPorvenir3Oro,
      "LIPEÑA_1PLATA.jpg": imgLipenaPlata,
      "LIPEÑA_2COBRE.jpg": imgLipenaCobre,
      "LIPEÑA_NIVEL0_0ESTRUCTURAS.jpg": imgLipenaNivel00Estructuras,
      "LIPEÑA_NIVEL0_PLATA.jpg": imgLipenaNivel0Plata,
      "LIPEÑA_NIVEL0_COBRE.jpg": imgLipenaNivel0Cobre,
      "LIPEÑA_NIVEL40_0ESTRUCTURAS.jpg": imgLipenaNivel400Estructuras,
      "LIPEÑA_NIVEL40_1PLATA.jpg": imgLipenaNivel401Plata,
      "LIPEÑA_NIVEL40_COBRE.jpg": imgLipenaNivel40Cobre,
      "MOSA_1PLATA.jpg": imgMosaPlata,
      "MOSA_2COBRE.jpg": imgMosaCobre,
      "MOSA_GALERIA_ABANDONADA_4ESTRUCTURAS.jpg": imgMosaGaleria4Estructuras,
      "MOSA_NIVEL_ESPERANZA_0ESTRUCTURAS.jpg": imgMosaEsperanza0Estructuras,
      "MOSA_NIVEL_ESPERANZA_1PLATA.jpg": imgMosaEsperanza1Plata,
      "MOSA_NIVEL_ESPERANZA_2COBRE.jpg": imgMosaEsperanza2Cobre,
      "MOSA_NIVEL_ESPERANZA_3ORO.jpg": imgMosaEsperanza3Oro,
      "MOSA_NIVEL_LUZ_0ESTRUCTURAS.jpg": imgMosaLuz0Estructuras,
      "MOSA_NIVEL_LUZ_1PLATA.jpg": imgMosaLuz1Plata,
      "MOSA_NIVEL_LUZ_2COBRE.jpg": imgMosaLuz2Cobre,
      "1MODELO.gif": imgModelo1,
      "2MODELO_.gif": imgModelo2
    };

    const resolve = (names: string[]) =>
      names.map((n) => imageByName[n]).filter((src): src is string => Boolean(src));

    if (!areaId && !levelId) {
      const initial = resolve(SURFACE_IMAGE_SCHEME.default);
      return initial.length ? initial : allImages;
    }
    if (levelId && SURFACE_IMAGE_SCHEME.byLevelId[levelId]) {
      const selected = resolve(SURFACE_IMAGE_SCHEME.byLevelId[levelId]);
      if (selected.length) return selected;
    }
    if (areaId && SURFACE_IMAGE_SCHEME.byAreaId[areaId]) {
      const selected = resolve(SURFACE_IMAGE_SCHEME.byAreaId[areaId]);
      if (selected.length) return selected;
    }
    return allImages;
  }, [areaId, levelId, laborId]);
  const getTopResult = (sample: any) => {
    const direct = Array.isArray(sample?.results) ? sample.results : [];
    const byLab = Array.isArray(sample?.sampleLabs)
      ? sample.sampleLabs.flatMap((x: any) => (Array.isArray(x?.results) ? x.results : []))
      : [];
    const merged = [...direct, ...byLab];
    if (!merged.length) return null;
    const numeric = merged.filter((r: any) => typeof r?.value === "number");
    if (!numeric.length) return null;
    const top = numeric.reduce(
      (acc: any, cur: any) => (cur.value > acc.value ? cur : acc),
      numeric[0]
    );
    return {
      symbol: top?.element?.symbol ?? top?.element?.name ?? "Result",
      value: top?.value,
      unit: top?.unit ?? top?.element?.defaultUnit ?? ""
    };
  };
  const resultBadgeClass = (value?: number) => {
    if (value === undefined || value === null) {
      return "bg-[var(--color-surface-container-highest)] text-[var(--color-on-surface)]";
    }
    return "bg-lime-400 text-lime-950 ring-1 ring-lime-500/70";
  };

  useEffect(() => {
    if (sampleId && relevantSampleRef.current) {
      relevantSampleRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [sampleId]);
  useEffect(() => {
    setSlide(0);
  }, [modelImages]);
  useEffect(() => {
    if (!fullScreen) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setDragging(false);
    }
  }, [fullScreen]);
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [slide]);

  const clampZoom = (value: number) => Math.min(6, Math.max(1, value));
  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  if (!canView) return <Navigate to="/perfil" replace />;

  return (
    <section className="space-y-4 text-[var(--color-on-surface)]">
      <InternalHeader
        eyebrow="Data Room"
        title="Surface Data Room"
        description="Modelo de areas, niveles, labores, muestras y resultados superficiales."
      />

      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold">Hierarchy</h2>
          {canManage ? (
            <div className="flex flex-wrap gap-2">
              <AddBtn label="Add Area" onClick={() => setModal("area")} />
              {areaId ? <AddBtn label="Add Level" onClick={() => setModal("level")} /> : null}
              {laborId ? <AddBtn label="Add Sample" onClick={() => setModal("sample")} /> : null}
            </div>
          ) : null}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <MiniList
            title="Areas"
            items={(areas.data ?? []).map((x) => ({
              id: x.id,
              label: x.name,
              to: p(x.id),
              selected: x.id === areaId
            }))}
          />
          <MiniList
            title="Levels"
            items={(levels.data ?? []).map((x) => ({
              id: x.id,
              label: x.name,
              to: p(areaId, x.id),
              selected: x.id === levelId
            }))}
          />
        </div>
      </article>

      <div className="grid gap-4 xl:grid-cols-9">
        <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-4 xl:col-span-3">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-base font-bold">Models / Images</h3>
            <button
              onClick={() => setFullScreen(true)}
              className="rounded-lg border border-[var(--color-border-soft)] px-3 py-1.5 text-xs font-semibold"
            >
              Fullscreen
            </button>
          </div>
          <div className="overflow-hidden rounded-xl border border-[var(--color-border-soft)]">
            <img
              src={modelImages[slide]}
              alt={`Model ${slide + 1}`}
              className="h-[320px] w-full object-cover"
            />
          </div>
          <div className="mt-3 flex items-center justify-between">
            <button
              onClick={() => setSlide((s) => (s - 1 + modelImages.length) % modelImages.length)}
              className="rounded-lg border border-[var(--color-border-soft)] px-3 py-1.5 text-xs font-semibold"
            >
              Prev
            </button>
            <div className="flex gap-2">
              {modelImages.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setSlide(i)}
                  className={`h-2.5 w-2.5 rounded-full ${i === slide ? "bg-[var(--color-primary)]" : "bg-[var(--color-border-soft)]"}`}
                />
              ))}
            </div>
            <button
              onClick={() => setSlide((s) => (s + 1) % modelImages.length)}
              className="rounded-lg border border-[var(--color-border-soft)] px-3 py-1.5 text-xs font-semibold"
            >
              Next
            </button>
          </div>
          <p className="mt-2 text-xs text-[var(--color-on-surface-variant)]">
            Images are demo placeholders linked to selected Area/Level/Labor.
          </p>
        </article>

        <div className="space-y-4 xl:col-span-6">
          <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-bold">Samples</h3>
              <div className="flex items-center gap-2">
                <select
                  value={sampleRowsPerPage}
                  onChange={(e) => {
                    setSampleRowsPerPage(Number(e.target.value) as 5 | 10);
                    setSamplePage(0);
                  }}
                  className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] px-2 py-1 text-xs"
                >
                  <option value={5}>5 rows</option>
                  <option value={10}>10 rows</option>
                </select>
                {canManage && laborId ? <AddBtn label="Add Sample" onClick={() => setModal("sample")} /> : null}
              </div>
            </div>
            <div className="min-h-[240px]">
              <Table
                headers={["Code", "Type", "Top Result", "Sampled At", "Open"]}
                rows={pagedSamples.map((s) => [
                  s.code,
                  s.sampleType ?? "-",

                  (() => {
                    const top = getTopResult(s);
                    if (!top)
                      return <span className="text-[var(--color-on-surface-variant)]">-</span>;
                    return (
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${resultBadgeClass(top.value)}`}
                      >
                        {top.symbol}: {top.value}
                        {top.unit ? ` ${top.unit}` : ""}
                      </span>
                    );
                  })(),
                  s.sampledAt ? new Date(s.sampledAt).toLocaleDateString("es-BO") : "-",
                  <Link
                    key={s.id}
                    className="text-[var(--color-primary)]"
                    to={p(areaId, levelId, s.miningLaborId, s.id)}
                  >
                    Select
                  </Link>
                ])}
                empty={
                  laborId
                    ? "No samples in selected labor."
                    : levelId
                      ? "No samples in selected level."
                      : "Select a level to view samples."
                }
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-[var(--color-on-surface-variant)]">
              <span>
                Page {safeSamplePage + 1} / {sampleTotalPages} · {sampleRows.length} records
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSamplePage((p) => Math.max(0, p - 1))}
                  disabled={safeSamplePage <= 0}
                  className="rounded-md border border-[var(--color-border-soft)] px-2 py-1 disabled:opacity-40"
                >
                  ←
                </button>
                <button
                  onClick={() => setSamplePage((p) => Math.min(sampleTotalPages - 1, p + 1))}
                  disabled={safeSamplePage >= sampleTotalPages - 1}
                  className="rounded-md border border-[var(--color-border-soft)] px-2 py-1 disabled:opacity-40"
                >
                  →
                </button>
              </div>
            </div>
            <div
              ref={relevantSampleRef}
              className="mt-3 rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] p-3"
            >
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--color-on-surface-variant)]">
                Relevant Sample Data
              </p>
              {selectedSample ? (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <K label="Code" value={selectedSample.code} />
                  {/* <K label="Name" value={selectedSample.name ?? "-"} /> */}
                  <K label="Sample Type" value={selectedSample.sampleType ?? "-"} />
                  {/* <K label="Number" value={selectedSample.number ?? "-"} /> */}
                  <K label="Place Ref." value={selectedSample.placeReference ?? "-"} />
                  <K label="Sampled At" value={selectedSample.sampledAt ?? "-"} />
                  <K label="East" value={selectedSample.east ?? "-"} />
                  <K label="North" value={selectedSample.north ?? "-"} />
                  <K label="Elevation" value={selectedSample.elevation ?? "-"} />
                  <K label="Description" value={selectedSample.description ?? "-"} />
                </div>
              ) : (
                <p className="text-xs text-[var(--color-on-surface-variant)]">
                  Select a sample to see key fields.
                </p>
              )}
            </div>
          </article>

          <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-bold">Results Panel</h3>
              {canManage ? (
                <div className="flex flex-wrap gap-2">
                  <AddBtn label="Laboratory" onClick={() => setModal("laboratory")} />
                  <AddBtn label="Sample-Lab" onClick={() => setModal("sampleLaboratory")} />
                  <AddBtn label="Element" onClick={() => setModal("element")} />
                  <AddBtn label="Result" onClick={() => setModal("result")} />
                  <AddBtn label="QAQC" onClick={() => setModal("qaqc")} />
                </div>
              ) : null}
            </div>
            <div className="space-y-3">
              <Table
                headers={["Laboratory", "Element", "Value", "Unit"]}
                rows={selectedSampleResults.map((x: any) => [
                  x.sampleLaboratoryId
                    ? (() => {
                        const slotLaboratory = sampleLabMap.get(x.sampleLaboratoryId);
                        if (!slotLaboratory) return "-";
                        const parts = slotLaboratory.split(" · ");
                        const labId = parts[1];
                        return laboratoryMap.get(labId) ?? labId ?? "-";
                      })()
                    : "-",
                  elementMap.get(x.elementId) ?? x.elementId,
                  x.value ?? "-",
                  x.unit ?? x.element?.defaultUnit ?? "-"
                ])}
                empty={
                  sampleId ? "No results for selected sample." : "Select a sample to view results."
                }
              />
              {/* <Table
                headers={["Type", "Passed", "Expected", "Obtained", "Deviation %", "Comments"]}
                rows={(qaqc.data ?? []).map((x) => [
                  x.type,
                  x.passed === null || x.passed === undefined ? "-" : x.passed ? "Yes" : "No",
                  x.expectedValue ?? "-",
                  x.obtainedValue ?? "-",
                  x.deviationPercent ?? "-",
                  x.comments ?? "-"
                ])}
                empty={sampleId ? "No QAQC for selected sample." : "Select a sample to view QAQC."}
              /> */}
            </div>
          </article>
        </div>
      </div>

      {fullScreen ? (
        <div
          className="fixed inset-0 z-[140] flex items-center justify-center bg-black/90 p-4"
          onMouseMove={(e) => {
            if (!dragging) return;
            setPan({
              x: e.clientX - dragStart.x,
              y: e.clientY - dragStart.y
            });
          }}
          onMouseUp={() => setDragging(false)}
          onMouseLeave={() => setDragging(false)}
        >
          <button
            onClick={() => setFullScreen(false)}
            className="absolute right-6 top-6 rounded-lg border border-white/30 px-3 py-1.5 text-xs font-semibold text-white"
          >
            Close
          </button>
          <div className="absolute left-6 top-6 flex items-center gap-2">
            <button
              onClick={() => setZoom((z) => clampZoom(z - 0.25))}
              className="rounded-lg border border-white/30 px-3 py-1.5 text-xs font-semibold text-white"
            >
              Zoom -
            </button>
            <button
              onClick={() => setZoom((z) => clampZoom(z + 0.25))}
              className="rounded-lg border border-white/30 px-3 py-1.5 text-xs font-semibold text-white"
            >
              Zoom +
            </button>
            <button
              onClick={resetView}
              className="rounded-lg border border-white/30 px-3 py-1.5 text-xs font-semibold text-white"
            >
              Reset
            </button>
            <span className="rounded-lg border border-white/20 px-2 py-1 text-xs text-white/90">
              {Math.round(zoom * 100)}%
            </span>
          </div>
          <button
            onClick={() => setSlide((s) => (s - 1 + modelImages.length) % modelImages.length)}
            className="absolute left-4 rounded-lg border border-white/30 px-3 py-2 text-sm font-semibold text-white"
          >
            Prev
          </button>
          <div
            className="max-h-[90vh] max-w-[90vw] overflow-hidden rounded-xl"
            onWheel={(e) => {
              e.preventDefault();
              const direction = e.deltaY > 0 ? -0.12 : 0.12;
              setZoom((z) => clampZoom(z + direction));
            }}
            onDoubleClick={resetView}
          >
            <img
              src={modelImages[slide]}
              alt={`Model ${slide + 1}`}
              draggable={false}
              onMouseDown={(e) => {
                if (zoom <= 1) return;
                setDragging(true);
                setDragStart({
                  x: e.clientX - pan.x,
                  y: e.clientY - pan.y
                });
              }}
              className={`max-h-[90vh] max-w-[90vw] select-none object-contain ${zoom > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in"}`}
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: "center center",
                transition: dragging ? "none" : "transform 120ms ease"
              }}
            />
          </div>
          <button
            onClick={() => setSlide((s) => (s + 1) % modelImages.length)}
            className="absolute right-4 rounded-lg border border-white/30 px-3 py-2 text-sm font-semibold text-white"
          >
            Next
          </button>
        </div>
      ) : null}

      {canManage && modal ? (
        <SurfaceCreateModal
          type={modal}
          areaId={areaId}
          levelId={levelId}
          laborId={laborId}
          sampleId={sampleId}
          laboratories={laboratories.data ?? []}
          sampleLaboratories={sampleLabs.data ?? []}
          elements={elements.data ?? []}
          onClose={() => setModal(null)}
          onSubmit={async (payload) => {
            if (modal === "area") await createArea.mutateAsync(payload as any);
            if (modal === "level") await createLevel.mutateAsync(payload as any);
            if (modal === "labor") await createLabor.mutateAsync(payload as any);
            if (modal === "sample") await createSample.mutateAsync(payload as any);
            if (modal === "laboratory") await createLab.mutateAsync(payload as any);
            if (modal === "sampleLaboratory") await createSampleLab.mutateAsync(payload as any);
            if (modal === "element") await createElement.mutateAsync(payload as any);
            if (modal === "result") await createResult.mutateAsync(payload as any);
            if (modal === "qaqc") await createQaqc.mutateAsync(payload as any);
            setModal(null);
          }}
        />
      ) : null}
    </section>
  );
}

function SurfaceCreateModal({
  type,
  areaId,
  levelId,
  laborId,
  sampleId,
  laboratories,
  sampleLaboratories,
  elements,
  onClose,
  onSubmit
}: {
  type: ModalType;
  areaId?: string;
  levelId?: string;
  laborId?: string;
  sampleId?: string;
  laboratories: Array<{ id: string; name: string }>;
  sampleLaboratories: Array<{ id: string; slot: "L1" | "L2" | "L3"; laboratoryId: string }>;
  elements: Array<{ id: string; name: string; symbol: string }>;
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
}) {
  const fieldClass =
    "w-full rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] px-3 py-2 text-sm text-[var(--color-on-surface)] placeholder:text-[var(--color-on-surface-variant)] focus:border-[var(--color-primary)] focus:outline-none";
  const [v, setV] = useState<Record<string, string>>({});
  const set = (k: string, value: string) => setV((s) => ({ ...s, [k]: value }));
  const t = (k: string) => {
    const raw = v[k];
    if (raw === undefined) return undefined;
    const trimmed = raw.trim();
    return trimmed ? trimmed : undefined;
  };
  const n = (k: string) => {
    const raw = (v[k] ?? "").trim().replace(",", ".");
    if (!raw) return undefined;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : undefined;
  };
  const b = (k: string) => (v[k] ? v[k] === "true" : undefined);
  const iso = (k: string) => {
    const raw = t(k);
    if (!raw) return undefined;
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 p-4">
      <div className="w-full max-w-4xl rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-xl font-bold capitalize">Create {type}</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-[var(--color-surface-container-high)]"
          >
            <X size={16} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {type === "area" ? (
            <>
              <input
                className={fieldClass}
                placeholder="Name"
                onChange={(e) => set("name", e.target.value)}
              />
              <input
                className={fieldClass}
                placeholder="Abbreviation"
                onChange={(e) => set("abbreviation", e.target.value)}
              />
              <input
                className={`${fieldClass} col-span-2`}
                placeholder="Description"
                onChange={(e) => set("description", e.target.value)}
              />
            </>
          ) : null}
          {type === "level" ? (
            <>
              <input
                className={fieldClass}
                placeholder="Name"
                onChange={(e) => set("name", e.target.value)}
              />
              <input
                className={fieldClass}
                placeholder="Abbreviation"
                onChange={(e) => set("abbreviation", e.target.value)}
              />
              <input
                className={fieldClass}
                type="number"
                step="any"
                placeholder="Elevation"
                onChange={(e) => set("elevation", e.target.value)}
              />
              <input
                className={fieldClass}
                placeholder="Description"
                onChange={(e) => set("description", e.target.value)}
              />
            </>
          ) : null}
          {type === "labor" ? (
            <>
              <input
                className={fieldClass}
                placeholder="Name"
                onChange={(e) => set("name", e.target.value)}
              />
              <input
                className={fieldClass}
                placeholder="Abbreviation"
                onChange={(e) => set("abbreviation", e.target.value)}
              />
              <input
                className={fieldClass}
                placeholder="Code"
                onChange={(e) => set("code", e.target.value)}
              />
              <input
                className={fieldClass}
                placeholder="Description"
                onChange={(e) => set("description", e.target.value)}
              />
            </>
          ) : null}
          {type === "sample" ? (
            <>
              <input
                className={fieldClass}
                placeholder="Code"
                onChange={(e) => set("code", e.target.value)}
              />
              <input
                className={fieldClass}
                placeholder="Name"
                onChange={(e) => set("name", e.target.value)}
              />
              <input
                className={fieldClass}
                type="number"
                step="1"
                placeholder="Number"
                onChange={(e) => set("number", e.target.value)}
              />
              <select
                className={fieldClass}
                defaultValue=""
                onChange={(e) => set("sampleType", e.target.value)}
              >
                <option value="">Sample Type</option>
                <option>SIMPLE</option>
                <option>DOUBLE</option>
                <option>SIMPLE_DOUBLE</option>
                <option>OTHER</option>
              </select>
              <input
                className={fieldClass}
                type="datetime-local"
                onChange={(e) => set("sampledAt", e.target.value)}
              />
              <input
                className={fieldClass}
                placeholder="Place Reference"
                onChange={(e) => set("placeReference", e.target.value)}
              />
              <input
                className={fieldClass}
                type="number"
                step="any"
                placeholder="East"
                onChange={(e) => set("east", e.target.value)}
              />
              <input
                className={fieldClass}
                type="number"
                step="any"
                placeholder="North"
                onChange={(e) => set("north", e.target.value)}
              />
              <input
                className={fieldClass}
                type="number"
                step="any"
                placeholder="Elevation"
                onChange={(e) => set("elevation", e.target.value)}
              />
              <input
                className={fieldClass}
                placeholder="Description"
                onChange={(e) => set("description", e.target.value)}
              />
              <input
                className={`${fieldClass} col-span-2`}
                placeholder="Observations"
                onChange={(e) => set("observations", e.target.value)}
              />
            </>
          ) : null}
          {type === "laboratory" ? (
            <>
              <input
                className={fieldClass}
                placeholder="Name"
                onChange={(e) => set("name", e.target.value)}
              />
              <input
                className={fieldClass}
                placeholder="Abbreviation"
                onChange={(e) => set("abbreviation", e.target.value)}
              />
              <input
                className={`${fieldClass} col-span-2`}
                placeholder="Description"
                onChange={(e) => set("description", e.target.value)}
              />
            </>
          ) : null}
          {type === "sampleLaboratory" ? (
            <>
              <select
                className={fieldClass}
                defaultValue={sampleId ?? ""}
                onChange={(e) => set("sampleId", e.target.value)}
              >
                <option value="">Sample</option>
                {sampleId ? <option value={sampleId}>{sampleId}</option> : null}
              </select>
              <select
                className={fieldClass}
                defaultValue=""
                onChange={(e) => set("laboratoryId", e.target.value)}
              >
                <option value="">Laboratory</option>
                {laboratories.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
              <select
                className={fieldClass}
                defaultValue="L1"
                onChange={(e) => set("slot", e.target.value)}
              >
                <option>L1</option>
                <option>L2</option>
                <option>L3</option>
              </select>
              <div className="text-xs text-[var(--color-on-surface-variant)]">
                Current slots: {sampleLaboratories.map((x) => x.slot).join(", ") || "-"}
              </div>
            </>
          ) : null}
          {type === "element" ? (
            <>
              <input
                className={fieldClass}
                placeholder="Name"
                onChange={(e) => set("name", e.target.value)}
              />
              <input
                className={fieldClass}
                placeholder="Symbol"
                onChange={(e) => set("symbol", e.target.value)}
              />
              <input
                className={fieldClass}
                placeholder="Default Unit"
                onChange={(e) => set("defaultUnit", e.target.value)}
              />
              <input
                className={fieldClass}
                placeholder="Description"
                onChange={(e) => set("description", e.target.value)}
              />
            </>
          ) : null}
          {type === "result" ? (
            <>
              <select
                className={fieldClass}
                defaultValue={sampleId ?? ""}
                onChange={(e) => set("sampleId", e.target.value)}
              >
                <option value="">Sample</option>
                {sampleId ? <option value={sampleId}>{sampleId}</option> : null}
              </select>
              <select
                className={fieldClass}
                defaultValue=""
                onChange={(e) => set("sampleLaboratoryId", e.target.value)}
              >
                <option value="">Sample-Laboratory (optional)</option>
                {sampleLaboratories.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.slot} · {x.laboratoryId}
                  </option>
                ))}
              </select>
              <select
                className={fieldClass}
                defaultValue=""
                onChange={(e) => set("elementId", e.target.value)}
              >
                <option value="">Element</option>
                {elements.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.symbol} ({e.name})
                  </option>
                ))}
              </select>
              <input
                className={fieldClass}
                type="number"
                step="any"
                placeholder="Value"
                onChange={(e) => set("value", e.target.value)}
              />
              <input
                className={fieldClass}
                placeholder="Qualifier"
                onChange={(e) => set("qualifier", e.target.value)}
              />
              <input
                className={fieldClass}
                placeholder="Unit"
                onChange={(e) => set("unit", e.target.value)}
              />
              <input
                className={fieldClass}
                placeholder="Source Column"
                onChange={(e) => set("sourceColumn", e.target.value)}
              />
              <input
                className={fieldClass}
                placeholder="Comments"
                onChange={(e) => set("comments", e.target.value)}
              />
            </>
          ) : null}
          {type === "qaqc" ? (
            <>
              <select
                className={fieldClass}
                defaultValue={sampleId ?? ""}
                onChange={(e) => set("sampleId", e.target.value)}
              >
                <option value="">Sample</option>
                {sampleId ? <option value={sampleId}>{sampleId}</option> : null}
              </select>
              <input
                className={fieldClass}
                placeholder="Type"
                onChange={(e) => set("type", e.target.value)}
              />
              <select
                className={fieldClass}
                defaultValue=""
                onChange={(e) => set("passed", e.target.value)}
              >
                <option value="">Passed?</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
              <input
                className={fieldClass}
                type="number"
                step="any"
                placeholder="Expected Value"
                onChange={(e) => set("expectedValue", e.target.value)}
              />
              <input
                className={fieldClass}
                type="number"
                step="any"
                placeholder="Obtained Value"
                onChange={(e) => set("obtainedValue", e.target.value)}
              />
              <input
                className={fieldClass}
                type="number"
                step="any"
                placeholder="Deviation %"
                onChange={(e) => set("deviationPercent", e.target.value)}
              />
              <input
                className={`${fieldClass} col-span-2`}
                placeholder="Comments"
                onChange={(e) => set("comments", e.target.value)}
              />
            </>
          ) : null}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-[var(--color-border-soft)] px-4 py-2 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={() =>
              void (async () => {
                if (type === "area")
                  await onSubmit({
                    name: t("name"),
                    abbreviation: t("abbreviation"),
                    description: t("description")
                  });
                if (type === "level")
                  await onSubmit({
                    miningAreaId: areaId,
                    name: t("name"),
                    abbreviation: t("abbreviation"),
                    elevation: n("elevation"),
                    description: t("description")
                  });
                if (type === "labor")
                  await onSubmit({
                    miningLevelId: levelId,
                    name: t("name"),
                    abbreviation: t("abbreviation"),
                    code: t("code"),
                    description: t("description")
                  });
                if (type === "sample")
                  await onSubmit({
                    miningLaborId: laborId,
                    number: n("number"),
                    sampledAt: iso("sampledAt"),
                    name: t("name"),
                    sampleType: t("sampleType"),
                    code: t("code"),
                    placeReference: t("placeReference"),
                    east: n("east"),
                    north: n("north"),
                    elevation: n("elevation"),
                    description: t("description"),
                    observations: t("observations")
                  });
                if (type === "laboratory")
                  await onSubmit({
                    name: t("name"),
                    abbreviation: t("abbreviation"),
                    description: t("description")
                  });
                if (type === "sampleLaboratory")
                  await onSubmit({
                    sampleId: t("sampleId") ?? sampleId,
                    laboratoryId: t("laboratoryId"),
                    slot: t("slot") ?? "L1"
                  });
                if (type === "element")
                  await onSubmit({
                    name: t("name"),
                    symbol: t("symbol"),
                    defaultUnit: t("defaultUnit"),
                    description: t("description")
                  });
                if (type === "result")
                  await onSubmit({
                    sampleId: t("sampleId") ?? sampleId,
                    sampleLaboratoryId: t("sampleLaboratoryId"),
                    elementId: t("elementId"),
                    value: n("value"),
                    qualifier: t("qualifier"),
                    unit: t("unit"),
                    sourceColumn: t("sourceColumn"),
                    comments: t("comments")
                  });
                if (type === "qaqc")
                  await onSubmit({
                    sampleId: t("sampleId") ?? sampleId,
                    type: t("type"),
                    passed: b("passed"),
                    expectedValue: n("expectedValue"),
                    obtainedValue: n("obtainedValue"),
                    deviationPercent: n("deviationPercent"),
                    comments: t("comments")
                  });
              })()
            }
            className="rounded-lg bg-[var(--color-primary)] px-3 py-2 text-sm font-semibold text-[var(--color-on-primary)]"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

function MiniList({
  title,
  items
}: {
  title: string;
  items: Array<{ id: string; label: string; to: string; selected: boolean }>;
}) {
  return (
    <div className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] p-2">
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--color-on-surface-variant)]">
        {title}
      </p>
      <div className="grid max-h-56 grid-cols-2 gap-1 overflow-y-auto pr-1 xl:grid-cols-3">
        {items.length ? (
          items.map((item) => (
            <Link
              key={item.id}
              to={item.to}
              className={`block rounded px-2 py-1.5 text-sm ${item.selected ? "bg-[var(--color-primary)] text-[var(--color-on-primary)]" : "hover:bg-[var(--color-surface-container-highest)]"}`}
            >
              {item.label}
            </Link>
          ))
        ) : (
          <p className="px-2 py-1 text-xs text-[var(--color-on-surface-variant)]">No data</p>
        )}
      </div>
    </div>
  );
}

function AddBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border-soft)] px-3 py-1.5 text-xs font-semibold"
    >
      <Plus size={13} /> {label}
    </button>
  );
}

function K({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] px-2 py-1">
      <span className="block text-[10px] uppercase tracking-wide text-[var(--color-on-surface-variant)]">
        {label}
      </span>
      <span className="text-xs">{value}</span>
    </div>
  );
}

function Table({
  headers,
  rows,
  empty
}: {
  headers: string[];
  rows: Array<Array<string | number | ReactNode>>;
  empty: string;
}) {
  return (
    <div className="table-scroll overflow-x-auto rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)]">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr>
            {headers.map((h) => (
              <th
                key={h}
                className="bg-[var(--color-surface-container-highest)] px-3 py-2 text-xs font-bold uppercase tracking-wide text-[var(--color-on-surface-variant)]"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row, idx) => (
              <tr key={idx} className="border-t border-[var(--color-border-soft)]">
                {row.map((col, i) => (
                  <td key={i} className="px-3 py-2 text-sm">
                    {col}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={headers.length}
                className="px-3 py-4 text-sm text-[var(--color-on-surface-variant)]"
              >
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
