import { useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEventHandler } from "react";
import { Link, Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { Plus, X } from "lucide-react";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import drillMediaFallback01 from "@/assets/images/GENERAL_1PLATA.jpg";
import drillMediaFallback02 from "@/assets/images/GENERAL_2COBRE.jpg";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useToast } from "@/shared/ui/toast/ToastProvider";
import { InternalHeader } from "@/shared/ui/InternalHeader";
import {
  ChipRow,
  ContextHeader,
  DataRoomBreadcrumb,
  DataTable,
  Section,
  fmtNum,
  type Crumb
} from "@/features/exploraciones/components/dataroom/DataRoomUi";
import { AuthenticatedMediaVideo } from "@/features/exploraciones/components/AuthenticatedMediaVideo";
import { dataRoomMediaUrl } from "@/features/exploraciones/lib/dataRoomMedia";
import {
  useAssayDetailQuery,
  useAssaysByIntervalQuery,
  useAssayValuesByAssayQuery,
  useAlterationsByIntervalQuery,
  useCreateAssayMutation,
  useCreateAssayValueMutation,
  useCreateAlterationMutation,
  useCreateDensityMutation,
  useCreateDrillHoleMutation,
  useCreateDrillHoleSurveyMutation,
  useCreateGeologicalStructureMutation,
  useCreateIntervalMutation,
  useCreateLithologyMutation,
  useCreateMagneticSusceptibilityMutation,
  useCreateMineralizationMutation,
  useCreateProjectMutation,
  useCreateQaqcMutation,
  useCreateRecoveryMutation,
  useCreateSignificantInterceptMutation,
  useComputedInterceptsQuery,
  useCreateZoneMutation,
  useDensitiesByIntervalQuery,
  useDrillHoleDetailQuery,
  useDrillHolesByZoneQuery,
  useDrillHoleSurveysByDrillHoleQuery,
  useGeologicalStructuresByIntervalQuery,
  useIntervalDetailQuery,
  useIntervalsByDrillHoleQuery,
  useLithologiesByIntervalQuery,
  useMagneticSusceptibilitiesByIntervalQuery,
  useMineralizationsByIntervalQuery,
  useProjectDetailQuery,
  useProjectsQuery,
  useQaqcByAssayQuery,
  useRecoveriesByIntervalQuery,
  useSignificantInterceptsByZoneQuery,
  useZoneDetailQuery,
  useZonesByProjectQuery
} from "@/features/exploraciones/hooks/useExploracionMinera";

const inputClassName =
  "w-full rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-highest)] px-3 py-2.5 text-sm text-[var(--color-on-surface)] outline-none transition focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]";

type ModalType =
  | "project"
  | "zone"
  | "drillhole"
  | "interval"
  | "assay"
  | "lithology"
  | "qaqc"
  | "significantIntercept"
  | "drillHoleSurvey"
  | "assayValue"
  | "alteration"
  | "mineralization"
  | "geologicalStructure"
  | "recovery"
  | "density"
  | "magneticSusceptibility";

function parseId(value?: string) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function pathFor(
  projectId: number,
  zoneId?: number,
  drillHoleId?: number,
  intervalId?: number,
  assayId?: number
) {
  if (!zoneId) return `/exploraciones-data-room/projects/${projectId}`;
  if (!drillHoleId) return `/exploraciones-data-room/projects/${projectId}/zones/${zoneId}`;
  if (!intervalId) {
    return `/exploraciones-data-room/projects/${projectId}/zones/${zoneId}/drillholes/${drillHoleId}`;
  }
  if (!assayId) {
    return `/exploraciones-data-room/projects/${projectId}/zones/${zoneId}/drillholes/${drillHoleId}/intervals/${intervalId}`;
  }
  return `/exploraciones-data-room/projects/${projectId}/zones/${zoneId}/drillholes/${drillHoleId}/intervals/${intervalId}/assays/${assayId}`;
}

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow
});
const mapMarkerIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [30, 48],
  iconAnchor: [15, 48],
  popupAnchor: [0, -42],
  shadowSize: [46, 46]
});

const DEFAULT_PROJECT_MAP_LAT = Number(import.meta.env.VITE_PROJECT_MAP_LAT ?? -21.734012998021456);
const DEFAULT_PROJECT_MAP_LNG = Number(import.meta.env.VITE_PROJECT_MAP_LNG ?? -66.4585126387057);
const DRILLHOLES_MEDIA_SCHEME = {
  default: [
    "GENERAL_1PLATA.jpg",
    "GENERAL_2COBRE.jpg",
    "1MODELO.gif",
    "2MODELO_.gif"
  ],
  byProjectId: {} as Record<number, string[]>,
  byZoneId: {} as Record<number, string[]>
} as const;

function isGifMedia(src?: string) {
  const cleanSrc = src?.toLowerCase().split("?")[0] ?? "";
  return cleanSrc.endsWith(".gif");
}

function isVideoMedia(src?: string) {
  const cleanSrc = src?.toLowerCase().split("?")[0] ?? "";
  return cleanSrc.endsWith(".mp4") || cleanSrc.endsWith(".webm") || cleanSrc.endsWith("/model-1") || cleanSrc.endsWith("/model-2");
}

function DeferredMediaImage({
  src,
  alt,
  className,
  imageClassName,
  loaded,
  onLoad,
  draggable,
  onMouseDown,
  style
}: {
  src: string;
  alt: string;
  className?: string;
  imageClassName?: string;
  loaded: boolean;
  onLoad: () => void;
  draggable?: boolean;
  onMouseDown?: MouseEventHandler<HTMLImageElement>;
  style?: CSSProperties;
}) {
  if (isVideoMedia(src)) {
    return (
      <div className={`relative overflow-hidden bg-black ${className ?? ""}`}>
        <AuthenticatedMediaVideo
          src={src}
          draggable={draggable}
          onMouseDown={onMouseDown as any}
          loaded={loaded}
          onLoad={onLoad}
          className={`${imageClassName ?? className ?? ""} ${loaded ? "opacity-100" : "opacity-0"} transition-opacity duration-300`}
          style={style}
        />
        {!loaded ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black text-white">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/25 border-t-white" />
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
              Loading model
            </span>
          </div>
        ) : null}
      </div>
    );
  }

  if (isGifMedia(src)) {
    return (
      <div className={`relative overflow-hidden bg-black ${className ?? ""}`}>
        <img
          src={src}
          alt={alt}
          draggable={draggable}
          onMouseDown={onMouseDown}
          onLoad={onLoad}
          loading="lazy"
          decoding="async"
          className={`${imageClassName ?? className ?? ""} ${loaded ? "opacity-100" : "opacity-0"} transition-opacity duration-300`}
          style={style}
        />
        {!loaded ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black text-white">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/25 border-t-white" />
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
              Loading animation
            </span>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      draggable={draggable}
      onMouseDown={onMouseDown}
      loading="lazy"
      decoding="async"
      className={imageClassName ?? className}
      style={style}
    />
  );
}

export function ExploracionesDataRoomPage() {
  const { user, token, can } = useAuth();
  const { showError, showSuccess } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const canManage = can("dataRoom", "update");
  const canView = can("dataRoom", "read");
  const isVisitante = user?.role === "VISITANTE";
  const isAdmin = user?.role === "ADMIN";
  const params = useParams();
  const projectId = parseId(params.projectId);
  const zoneId = parseId(params.zoneId);
  const drillHoleId = parseId(params.drillHoleId);
  const intervalId = parseId(params.intervalId);
  const assayId = parseId(params.assayId);

  const [modal, setModal] = useState<ModalType | null>(null);
  const [showIntroVideo, setShowIntroVideo] = useState(false);
  const [mediaSlide, setMediaSlide] = useState(0);
  const [mediaFullScreen, setMediaFullScreen] = useState(false);
  const [mediaZoom, setMediaZoom] = useState(1);
  const [mediaPan, setMediaPan] = useState({ x: 0, y: 0 });
  const [mediaDragging, setMediaDragging] = useState(false);
  const [mediaDragStart, setMediaDragStart] = useState({ x: 0, y: 0 });
  const [loadedMedia, setLoadedMedia] = useState<Set<string>>(() => new Set());
  const projectsQuery = useProjectsQuery({ page: 1, limit: 100 });
  const projectDetail = useProjectDetailQuery(projectId);
  const zonesQuery = useZonesByProjectQuery(projectId);
  const zoneDetail = useZoneDetailQuery(zoneId);
  const [holeSearchInput, setHoleSearchInput] = useState("");
  const holeSearch = useDebouncedValue(holeSearchInput.trim(), 350);
  const [holePage, setHolePage] = useState(1);
  const [intervalPage, setIntervalPage] = useState(1);
  const [interceptPage, setInterceptPage] = useState(1);
  const [interceptElement, setInterceptElement] = useState<"au" | "cu" | "ag">("au");
  const [interceptCutoffInput, setInterceptCutoffInput] = useState("0.5");
  const [interceptMinWidthInput, setInterceptMinWidthInput] = useState("1");
  const [interceptDilutionInput, setInterceptDilutionInput] = useState("2");
  const debouncedCutoff = useDebouncedValue(interceptCutoffInput, 500);
  const debouncedMinWidth = useDebouncedValue(interceptMinWidthInput, 500);
  const debouncedDilution = useDebouncedValue(interceptDilutionInput, 500);
  const interceptParams = useMemo(() => {
    const num = (value: string, fallback: number) => {
      const parsed = Number(value.replace(",", "."));
      return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
    };
    return {
      element: interceptElement,
      cutoff: num(debouncedCutoff, INTERCEPT_DEFAULTS[interceptElement]),
      minWidth: num(debouncedMinWidth, 1),
      maxDilution: num(debouncedDilution, 2)
    };
  }, [interceptElement, debouncedCutoff, debouncedMinWidth, debouncedDilution]);
  const drillHolesQuery = useDrillHolesByZoneQuery(zoneId, { search: holeSearch, page: holePage, limit: 25 });
  // Para elegir sondaje al crear un intercepto manual: la lista completa de la zona, liviana.
  const holeOptionsQuery = useDrillHolesByZoneQuery(zoneId, { page: 1, limit: 500 });
  const computedInterceptsQuery = useComputedInterceptsQuery(zoneId, interceptParams);
  const drillHoleDetail = useDrillHoleDetailQuery(drillHoleId);
  const intervalsQuery = useIntervalsByDrillHoleQuery(drillHoleId, intervalPage, 50);
  const intervalDetail = useIntervalDetailQuery(intervalId);
  const assaysQuery = useAssaysByIntervalQuery(intervalId);
  const lithologiesQuery = useLithologiesByIntervalQuery(intervalId);
  const assayDetail = useAssayDetailQuery(assayId);
  const qaqcQuery = useQaqcByAssayQuery(assayId);
  const significantInterceptsByZoneQuery = useSignificantInterceptsByZoneQuery(zoneId);
  const drillHoleSurveysQuery = useDrillHoleSurveysByDrillHoleQuery(drillHoleId);
  const assayValuesQuery = useAssayValuesByAssayQuery(assayId);
  const alterationsQuery = useAlterationsByIntervalQuery(intervalId);
  const mineralizationsQuery = useMineralizationsByIntervalQuery(intervalId);
  const geologicalStructuresQuery = useGeologicalStructuresByIntervalQuery(intervalId);
  const recoveriesQuery = useRecoveriesByIntervalQuery(intervalId);
  const densitiesQuery = useDensitiesByIntervalQuery(intervalId);
  const magneticSusceptibilitiesQuery = useMagneticSusceptibilitiesByIntervalQuery(intervalId);

  const createProject = useCreateProjectMutation();
  const createZone = useCreateZoneMutation();
  const createDrillHole = useCreateDrillHoleMutation();
  const createInterval = useCreateIntervalMutation();
  const createAssay = useCreateAssayMutation();
  const createLithology = useCreateLithologyMutation();
  const createQaqc = useCreateQaqcMutation();
  const createSignificantIntercept = useCreateSignificantInterceptMutation();
  const createDrillHoleSurvey = useCreateDrillHoleSurveyMutation();
  const createAssayValue = useCreateAssayValueMutation();
  const createAlteration = useCreateAlterationMutation();
  const createMineralization = useCreateMineralizationMutation();
  const createGeologicalStructure = useCreateGeologicalStructureMutation();
  const createRecovery = useCreateRecoveryMutation();
  const createDensity = useCreateDensityMutation();
  const createMagneticSusceptibility = useCreateMagneticSusceptibilityMutation();
  const intervalsRef = useRef<HTMLDivElement | null>(null);
  const assaysRef = useRef<HTMLDivElement | null>(null);
  const qaqcRef = useRef<HTMLDivElement | null>(null);
  const isLanding = location.pathname === "/exploraciones-data-room";
  const availableProjects = projectsQuery.data?.data ?? [];
  const preferredDrillProject =
    availableProjects.find((project) => project.id === 1) ?? availableProjects[0];
  const introVideoUrl =
    import.meta.env.VITE_EXPLORACIONES_INTRO_VIDEO_URL ?? dataRoomMediaUrl("intro-video");
  const drillholesMediaByName = useMemo<Record<string, string>>(
    () => ({
      "1MODELO.gif": dataRoomMediaUrl("model-1"),
      "2MODELO_.gif": dataRoomMediaUrl("model-2"),
      "GENERAL_1PLATA.jpg": drillMediaFallback01,
      "GENERAL_2COBRE.jpg": drillMediaFallback02
    }),
    [token]
  );
  const drillholesMedia = useMemo(() => {
    const resolve = (names: readonly string[]) =>
      names.map((n) => drillholesMediaByName[n]).filter((src): src is string => Boolean(src));
    if (zoneId && DRILLHOLES_MEDIA_SCHEME.byZoneId[zoneId]?.length) {
      const list = resolve(DRILLHOLES_MEDIA_SCHEME.byZoneId[zoneId]);
      if (list.length) return list;
    }
    if (projectId && DRILLHOLES_MEDIA_SCHEME.byProjectId[projectId]?.length) {
      const list = resolve(DRILLHOLES_MEDIA_SCHEME.byProjectId[projectId]);
      if (list.length) return list;
    }
    const fallback = resolve(DRILLHOLES_MEDIA_SCHEME.default);
    return fallback.length ? fallback : [dataRoomMediaUrl("model-1")];
  }, [drillholesMediaByName, projectId, token, zoneId]);
  // Tabla única de interceptos de la zona: los calculados desde los ensayos y los cargados a mano.
  const interceptRows = useMemo<InterceptRow[]>(() => {
    const calculated = (computedInterceptsQuery.data ?? []).map<InterceptRow>((item, index) => ({
      key: `calc-${item.drillHoleId}-${index}`,
      drillHoleId: item.drillHoleId,
      hole: item.drillHoleName,
      including: null,
      from: item.fromDepth,
      to: item.toDepth,
      width: item.width,
      trueWidth: null,
      au: item.au,
      cu: item.cu,
      ag: item.ag,
      comments: `${item.intervals} interval${item.intervals === 1 ? "" : "s"}`,
      source: "calculated"
    }));
    const manual = (significantInterceptsByZoneQuery.data?.data ?? []).map<InterceptRow>((item) => ({
      key: `manual-${item.id}`,
      drillHoleId: item.drillHoleId,
      hole: item.drillHole?.name ?? `Drillhole #${item.drillHoleId}`,
      including: item.isIncluding,
      from: item.fromDepth,
      to: item.toDepth,
      width: item.width,
      trueWidth: item.trueWidth ?? null,
      au: item.au ?? null,
      cu: item.cu ?? null,
      ag: item.ag ?? null,
      comments: item.comments ?? null,
      source: "manual"
    }));
    // Los de mejor ley primero (según el elemento elegido).
    const grade = (row: InterceptRow) => row[interceptElement] ?? Number.NEGATIVE_INFINITY;
    return [...calculated, ...manual].sort((a, b) => grade(b) - grade(a) || a.hole.localeCompare(b.hole, "en", { numeric: true }) || a.from - b.from);
  }, [computedInterceptsQuery.data, significantInterceptsByZoneQuery.data?.data, interceptElement]);
  const INTERCEPT_PAGE_SIZE = 15;
  const interceptTotalPages = Math.max(1, Math.ceil(interceptRows.length / INTERCEPT_PAGE_SIZE));
  const visibleInterceptRows = interceptRows.slice((interceptPage - 1) * INTERCEPT_PAGE_SIZE, interceptPage * INTERCEPT_PAGE_SIZE);
  const topInterceptByDrillHole = useMemo(() => {
    const map = new Map<number, InterceptRow>();
    const grade = (row: InterceptRow) => row[interceptElement] ?? Number.NEGATIVE_INFINITY;
    interceptRows.forEach((row) => {
      const current = map.get(row.drillHoleId);
      if (!current || grade(row) > grade(current)) map.set(row.drillHoleId, row);
    });
    return map;
  }, [interceptRows, interceptElement]);
  const markMediaLoaded = (src: string) => {
    setLoadedMedia((current) => {
      if (current.has(src)) return current;
      const next = new Set(current);
      next.add(src);
      return next;
    });
  };

  useEffect(() => {
    if (!isLanding && !projectId && projectsQuery.data?.data?.length) {
      const preferredProject =
        projectsQuery.data.data.find((project) => project.id === 1) ?? projectsQuery.data.data[0];
      navigate(pathFor(preferredProject.id), { replace: true });
    }
  }, [isLanding, navigate, projectId, projectsQuery.data]);

  useEffect(() => {
    if (drillHoleId && intervalsRef.current) {
      intervalsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [drillHoleId]);

  useEffect(() => {
    if (intervalId && assaysRef.current) {
      assaysRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [intervalId]);

  useEffect(() => {
    if (assayId && qaqcRef.current) {
      qaqcRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [assayId]);
  useEffect(() => {
    setMediaSlide(0);
    setMediaZoom(1);
    setMediaPan({ x: 0, y: 0 });
  }, [projectId, zoneId, drillholesMedia]);

  const clampMediaZoom = (value: number) => Math.min(6, Math.max(1, value));
  const resetMediaView = () => {
    setMediaZoom(1);
    setMediaPan({ x: 0, y: 0 });
  };
  const formatTopIntercept = (drillHoleId: number) => {
    const intercept = topInterceptByDrillHole.get(drillHoleId);
    if (!intercept) return null;
    const value = intercept[interceptElement];
    return {
      label: value != null ? `${ELEMENT_LABEL[interceptElement]} ${value} ${ELEMENT_UNIT[interceptElement]}` : `Width ${intercept.width} m`,
      interval: `${intercept.from} - ${intercept.to} m`
    };
  };

  // Al cambiar de zona o de sondaje se vuelve a la primera página.
  useEffect(() => {
    setHolePage(1);
    setHoleSearchInput("");
  }, [zoneId]);
  useEffect(() => {
    setIntervalPage(1);
  }, [drillHoleId]);
  useEffect(() => {
    setInterceptPage(1);
  }, [zoneId, interceptParams]);
  useEffect(() => {
    setHolePage(1);
  }, [holeSearch]);

  const isLoading = useMemo(
    () =>
      projectsQuery.isLoading ||
      projectDetail.isLoading ||
      zonesQuery.isLoading ||
      zoneDetail.isLoading ||
      drillHolesQuery.isLoading ||
      drillHoleDetail.isLoading ||
      intervalsQuery.isLoading ||
      intervalDetail.isLoading ||
      assaysQuery.isLoading ||
      assayDetail.isLoading ||
      lithologiesQuery.isLoading ||
      qaqcQuery.isLoading ||
      significantInterceptsByZoneQuery.isLoading ||
      drillHoleSurveysQuery.isLoading ||
      assayValuesQuery.isLoading ||
      alterationsQuery.isLoading ||
      mineralizationsQuery.isLoading ||
      geologicalStructuresQuery.isLoading ||
      recoveriesQuery.isLoading ||
      densitiesQuery.isLoading ||
      magneticSusceptibilitiesQuery.isLoading,
    [
      projectsQuery.isLoading,
      projectDetail.isLoading,
      zonesQuery.isLoading,
      zoneDetail.isLoading,
      drillHolesQuery.isLoading,
      drillHoleDetail.isLoading,
      intervalsQuery.isLoading,
      intervalDetail.isLoading,
      assaysQuery.isLoading,
      assayDetail.isLoading,
      lithologiesQuery.isLoading,
      qaqcQuery.isLoading,
      significantInterceptsByZoneQuery.isLoading,
      drillHoleSurveysQuery.isLoading,
      assayValuesQuery.isLoading,
      alterationsQuery.isLoading,
      mineralizationsQuery.isLoading,
      geologicalStructuresQuery.isLoading,
      recoveriesQuery.isLoading,
      densitiesQuery.isLoading,
      magneticSusceptibilitiesQuery.isLoading
    ]
  );

  if (!canView) return <Navigate to="/perfil" replace />;

  const projectName = projectDetail.data?.name ?? "Project";
  const holeName = drillHoleDetail.data?.name ?? "Drillhole";
  const intervalLabel = intervalDetail.data ? `${fmtNum(intervalDetail.data.fromDepth)}–${fmtNum(intervalDetail.data.toDepth)} m` : "Interval";
  const crumbs: Crumb[] = [{ label: "Data Room", to: "/exploraciones-data-room" }];
  if (projectId) crumbs.push({ label: projectName, to: zoneId ? pathFor(projectId) : undefined });
  if (projectId && zoneId) crumbs.push({ label: `Zone ${zoneDetail.data?.name ?? ""}`.trim(), to: drillHoleId ? pathFor(projectId, zoneId) : undefined });
  if (projectId && zoneId && drillHoleId) crumbs.push({ label: holeName, to: intervalId ? pathFor(projectId, zoneId, drillHoleId) : undefined });
  if (projectId && zoneId && drillHoleId && intervalId) crumbs.push({ label: intervalLabel, to: assayId ? pathFor(projectId, zoneId, drillHoleId, intervalId) : undefined });
  if (assayId) crumbs.push({ label: `Assay ${assayDetail.data?.assayMethod ?? ""}`.trim() });

  const mediaViewer = (
    <Section title="Models & Images" description="Reference model for the current zone.">
      <div className="overflow-hidden rounded-xl border border-[var(--color-border-soft)] bg-black">
        <DeferredMediaImage
          src={drillholesMedia[mediaSlide]}
          alt={`Drillholes media ${mediaSlide + 1}`}
          loaded={loadedMedia.has(drillholesMedia[mediaSlide])}
          onLoad={() => markMediaLoaded(drillholesMedia[mediaSlide])}
          className="h-[260px] w-full"
          imageClassName="h-[260px] w-full object-contain"
        />
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <button
          onClick={() => setMediaSlide((s) => (s - 1 + drillholesMedia.length) % drillholesMedia.length)}
          className="rounded-lg border border-[var(--color-border-soft)] px-3 py-1.5 text-xs font-semibold"
        >
          Prev
        </button>
        <div className="flex gap-2">
          {drillholesMedia.map((_, i) => (
            <button
              key={i}
              onClick={() => setMediaSlide(i)}
              aria-label={`Image ${i + 1}`}
              className={`h-2.5 w-2.5 rounded-full ${i === mediaSlide ? "bg-[var(--color-primary)]" : "bg-[var(--color-border-soft)]"}`}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setMediaFullScreen(true)} className="rounded-lg border border-[var(--color-border-soft)] px-3 py-1.5 text-xs font-semibold">
            Fullscreen
          </button>
          <button
            onClick={() => setMediaSlide((s) => (s + 1) % drillholesMedia.length)}
            className="rounded-lg border border-[var(--color-border-soft)] px-3 py-1.5 text-xs font-semibold"
          >
            Next
          </button>
        </div>
      </div>
    </Section>
  );

  const errorBox = (message: string, retry: () => void) => (
    <p className="rounded-lg bg-rose-500/10 px-3 py-3 text-sm text-rose-500">
      {message}{" "}
      <button type="button" className="font-semibold underline" onClick={retry}>
        Retry
      </button>
    </p>
  );
  const skeleton = (
    <div className="space-y-2">
      {[0, 1, 2, 3].map((row) => (
        <div key={row} className="h-10 animate-pulse rounded-lg bg-[var(--color-surface-container-high)]" />
      ))}
    </div>
  );
  const meanOf = (assays: Array<Record<string, unknown>> | undefined, key: "au" | "cu" | "ag") => {
    const values = (assays ?? []).map((a) => Number(a[key])).filter((v) => Number.isFinite(v));
    return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
  };

  return (
    <section className="space-y-5 text-[var(--color-on-surface)]">
      <InternalHeader
        eyebrow="Data Room"
        title="Exploration Data Room"
        description="Browse projects, zones, drillholes, intervals and assays from one place."
      />
      {!isLanding ? <DataRoomBreadcrumb items={crumbs} /> : null}

      {isLoading ? <LoadingPanel label="Loading exploration data..." /> : null}

      {isLanding ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <article className="md:col-span-3 rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Corporate Overview</p>
                <p className="text-xs text-[var(--color-on-surface-variant)]">
                  Click to open and play in large view.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowIntroVideo(true)}
                className="rounded-lg border border-[var(--color-border-soft)] px-3 py-1.5 text-xs font-semibold"
              >
                Open Video
              </button>
            </div>
            <button
              type="button"
              onClick={() => setShowIntroVideo(true)}
              className="mt-3 w-full overflow-hidden rounded-lg border border-[var(--color-border-soft)] bg-black"
            >
              <AuthenticatedMediaVideo
                key={introVideoUrl}
                src={introVideoUrl}
                className="h-[160px] w-full object-cover opacity-90"
                muted
                autoPlay={false}
                loop={false}
                playsInline
                preload="none"
              />
            </button>
          </article>
          <button
            type="button"
            onClick={() =>
              preferredDrillProject
                ? navigate(`/exploraciones-data-room/projects/${preferredDrillProject.id}`)
                : navigate("/exploraciones-data-room/projects")
            }
            className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5 text-left transition hover:border-[var(--color-primary)]"
          >
            <p className="text-lg font-bold">Drilling</p>
            <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">
              {preferredDrillProject
                ? "Drillholes, intervals, assays and significant intercepts."
                : "No drilling project yet. Click to create the first one."}
            </p>
          </button>
          <button
            type="button"
            onClick={() => navigate("/exploraciones-data-room/surface")}
            className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5 text-left transition hover:border-[var(--color-primary)]"
          >
            <p className="text-lg font-bold">Surface</p>
            <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">
              Surface sampling by area, level and labor.
            </p>
          </button>
          {isAdmin ? (
            <Link
              to="/exploraciones-data-room/forms"
              className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5 text-left transition hover:border-[var(--color-primary)]"
            >
              <p className="text-lg font-bold">Forms</p>
              <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">
                Admin forms hub for Drillholes and Surface, including bulk upload.
              </p>
            </Link>
          ) : null}
        </div>
      ) : null}

      {showIntroVideo ? (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/85 p-4">
          <button
            type="button"
            onClick={() => setShowIntroVideo(false)}
            className="absolute right-6 top-6 rounded-lg border border-white/30 px-3 py-1.5 text-xs font-semibold text-white"
          >
            Close
          </button>
          <AuthenticatedMediaVideo
            key={`${introVideoUrl}-fullscreen`}
            src={introVideoUrl}
            className="max-h-[90vh] w-auto max-w-[92vw] rounded-xl border border-white/20 bg-black"
            controls
            autoPlay
            loop={false}
            muted={false}
            playsInline
            preload="none"
          />
        </div>
      ) : null}

      {mediaFullScreen ? (
        <div
          className="fixed inset-0 z-[160] flex items-center justify-center bg-black/90 p-4"
          onMouseMove={(e) => {
            if (!mediaDragging) return;
            setMediaPan({
              x: e.clientX - mediaDragStart.x,
              y: e.clientY - mediaDragStart.y
            });
          }}
          onMouseUp={() => setMediaDragging(false)}
          onMouseLeave={() => setMediaDragging(false)}
        >
          <button
            onClick={() => setMediaFullScreen(false)}
            className="absolute right-6 top-6 rounded-lg border border-white/30 px-3 py-1.5 text-xs font-semibold text-white"
          >
            Close
          </button>
          <div className="absolute left-6 top-6 flex items-center gap-2">
            <button
              onClick={() => setMediaZoom((z) => clampMediaZoom(z - 0.25))}
              className="rounded-lg border border-white/30 px-3 py-1.5 text-xs font-semibold text-white"
            >
              Zoom -
            </button>
            <button
              onClick={() => setMediaZoom((z) => clampMediaZoom(z + 0.25))}
              className="rounded-lg border border-white/30 px-3 py-1.5 text-xs font-semibold text-white"
            >
              Zoom +
            </button>
            <button
              onClick={resetMediaView}
              className="rounded-lg border border-white/30 px-3 py-1.5 text-xs font-semibold text-white"
            >
              Reset
            </button>
            <span className="rounded-lg border border-white/20 px-2 py-1 text-xs text-white/90">
              {Math.round(mediaZoom * 100)}%
            </span>
          </div>
          <button
            onClick={() =>
              setMediaSlide((s) => (s - 1 + drillholesMedia.length) % drillholesMedia.length)
            }
            className="absolute left-4 rounded-lg border border-white/30 px-3 py-2 text-sm font-semibold text-white"
          >
            Prev
          </button>
          <div
            className="max-h-[90vh] max-w-[90vw] overflow-hidden rounded-xl"
            onWheel={(e) => {
              e.preventDefault();
              const direction = e.deltaY > 0 ? -0.12 : 0.12;
              setMediaZoom((z) => clampMediaZoom(z + direction));
            }}
            onDoubleClick={resetMediaView}
          >
            <DeferredMediaImage
              src={drillholesMedia[mediaSlide]}
              alt={`Drillholes media fullscreen ${mediaSlide + 1}`}
              draggable={false}
              loaded={loadedMedia.has(drillholesMedia[mediaSlide])}
              onLoad={() => markMediaLoaded(drillholesMedia[mediaSlide])}
              onMouseDown={(e) => {
                if (mediaZoom <= 1) return;
                setMediaDragging(true);
                setMediaDragStart({
                  x: e.clientX - mediaPan.x,
                  y: e.clientY - mediaPan.y
                });
              }}
              className="h-[90vh] w-[90vw]"
              imageClassName={`max-h-[90vh] max-w-[90vw] select-none object-contain ${mediaZoom > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in"}`}
              style={{
                transform: `translate(${mediaPan.x}px, ${mediaPan.y}px) scale(${mediaZoom})`,
                transformOrigin: "center center",
                transition: mediaDragging ? "none" : "transform 120ms ease"
              }}
            />
          </div>
          <button
            onClick={() => setMediaSlide((s) => (s + 1) % drillholesMedia.length)}
            className="absolute right-4 rounded-lg border border-white/30 px-3 py-2 text-sm font-semibold text-white"
          >
            Next
          </button>
        </div>
      ) : null}

      {!isLanding && !projectId ? (
        <Section title="Projects" action={canManage ? <AddBtn label="Add Project" onClick={() => setModal("project")} /> : undefined}>
          <DataTable
            columns={[
              { header: "Project", cell: (p) => p.name },
              { header: "Location", cell: (p) => p.location ?? "—" }
            ]}
            rows={projectsQuery.data?.data ?? []}
            rowKey={(p) => String(p.id)}
            rowTo={(p) => pathFor(p.id)}
            empty="No projects."
          />
        </Section>
      ) : null}

      {projectId && !zoneId ? (
        <div className="space-y-4">
          <ContextHeader
            eyebrow="Project"
            title={projectName}
            subtitle={projectDetail.data?.location ?? "No location"}
            stats={[{ label: "Zones", value: zonesQuery.data?.data?.length ?? "—" }]}
          />
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
            <Section
              title="Zones"
              description="Choose a zone to see its drillholes and significant intercepts."
              action={canManage ? <AddBtn label="Add Zone" onClick={() => setModal("zone")} /> : undefined}
            >
              <DataTable
                columns={[
                  { header: "Zone", cell: (z) => z.name },
                  { header: "Description", cell: (z) => <span className="text-[var(--color-on-surface-variant)]">{z.description ?? "—"}</span>, wide: true }
                ]}
                rows={zonesQuery.data?.data ?? []}
                rowKey={(z) => String(z.id)}
                rowTo={(z) => pathFor(projectId, z.id)}
                empty="No zones."
              />
            </Section>
            <Section title="Map" description="Project location.">
              <ProjectResourceMap latitude={DEFAULT_PROJECT_MAP_LAT} longitude={DEFAULT_PROJECT_MAP_LNG} resources={[]} />
            </Section>
          </div>
        </div>
      ) : null}

      {projectId && zoneId ? (
        <div className="space-y-4">
          <ChipRow
            label="Zone"
            items={(zonesQuery.data?.data ?? []).map((zone) => ({ id: String(zone.id), label: zone.name, to: pathFor(projectId, zone.id), selected: zone.id === zoneId }))}
          />

          {!drillHoleId ? (
            <div className="animate-[fadeIn_.28s_ease-out] space-y-4">
              <ContextHeader
                eyebrow="Zone"
                title={zoneDetail.data?.name ?? "Zone"}
                subtitle={zoneDetail.data?.description ?? undefined}
                stats={[
                  { label: "Drillholes", value: drillHolesQuery.data?.meta?.total ?? "—" },
                  { label: "Significant intercepts", value: computedInterceptsQuery.isLoading ? "…" : interceptRows.length }
                ]}
              />
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="min-w-0 space-y-4">
                  <Section
                    title="Drillholes"
                    description="Click a drillhole to see its intervals."
                    action={canManage ? <AddBtn label="Add Drillhole" onClick={() => setModal("drillhole")} /> : undefined}
                  >
                    <input
                      className={`${inputClassName} mb-3`}
                      placeholder="Search drillhole by name…"
                      value={holeSearchInput}
                      onChange={(e) => setHoleSearchInput(e.target.value)}
                    />
                    {drillHolesQuery.isError ? (
                      errorBox("Could not load the drillholes.", () => void drillHolesQuery.refetch())
                    ) : drillHolesQuery.isLoading ? (
                      skeleton
                    ) : (
                      <>
                        <DataTable
                          columns={[
                            { header: "Drillhole", cell: (d) => d.name },
                            { header: "Type", cell: (d) => d.type },
                            { header: "Depth (m)", cell: (d) => fmtNum(d.depth), numeric: true },
                            { header: "Intervals", cell: (d) => fmtNum((d as { _count?: { intervals?: number } })._count?.intervals), numeric: true },
                            {
                              header: "Best grade",
                              cell: (d) => {
                                const top = formatTopIntercept(d.id);
                                if (!top) return <span className="text-[var(--color-on-surface-variant)]">—</span>;
                                return (
                                  <span className="inline-flex flex-col rounded-lg bg-lime-400 px-2 py-1 text-left font-sans text-xs font-bold text-lime-950 ring-1 ring-lime-500/70">
                                    <span>{top.label}</span>
                                    <span className="font-medium opacity-80">{top.interval}</span>
                                  </span>
                                );
                              }
                            },
                            { header: "Campaign", cell: (d) => d.campaign ?? "—", wide: true }
                          ]}
                          rows={drillHolesQuery.data?.data ?? []}
                          rowKey={(d) => String(d.id)}
                          rowTo={(d) => pathFor(projectId, zoneId, d.id)}
                          empty={holeSearch ? `No drillholes match “${holeSearch}”.` : "No drillholes in this zone yet."}
                        />
                        <Pager meta={drillHolesQuery.data?.meta} page={holePage} onPage={setHolePage} noun="drillholes" />
                      </>
                    )}
                  </Section>

                  <Section
                    title="Significant Intercepts"
                    description={`Mineralized runs calculated from the assays with the cut-off below, best grade first. Manually entered intercepts are listed too.`}
                    action={canManage ? <AddBtn label="Add Significant Intercept" onClick={() => setModal("significantIntercept")} /> : undefined}
                  >
                    <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <label className="block">
                        <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[var(--color-on-surface-variant)]">Element</span>
                        <select
                          className={inputClassName}
                          value={interceptElement}
                          onChange={(e) => {
                            const element = e.target.value as "au" | "cu" | "ag";
                            setInterceptElement(element);
                            setInterceptCutoffInput(String(INTERCEPT_DEFAULTS[element]));
                          }}
                        >
                          <option value="au">Au (g/t)</option>
                          <option value="cu">Cu (%)</option>
                          <option value="ag">Ag (g/t)</option>
                        </select>
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[var(--color-on-surface-variant)]">Cut-off ({ELEMENT_UNIT[interceptElement]})</span>
                        <input className={inputClassName} inputMode="decimal" value={interceptCutoffInput} onChange={(e) => setInterceptCutoffInput(e.target.value)} />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[var(--color-on-surface-variant)]">Min. width (m)</span>
                        <input className={inputClassName} inputMode="decimal" value={interceptMinWidthInput} onChange={(e) => setInterceptMinWidthInput(e.target.value)} />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[var(--color-on-surface-variant)]">Max. dilution (m)</span>
                        <input className={inputClassName} inputMode="decimal" value={interceptDilutionInput} onChange={(e) => setInterceptDilutionInput(e.target.value)} />
                      </label>
                    </div>
                    {computedInterceptsQuery.isLoading ? (
                      skeleton
                    ) : computedInterceptsQuery.isError ? (
                      errorBox("Could not calculate the intercepts.", () => void computedInterceptsQuery.refetch())
                    ) : (
                      <>
                        <DataTable
                          columns={[
                            { header: "Drillhole", cell: (si) => si.hole },
                            { header: "From (m)", cell: (si) => fmtNum(si.from), numeric: true },
                            { header: "To (m)", cell: (si) => fmtNum(si.to), numeric: true },
                            { header: "Width (m)", cell: (si) => <strong>{fmtNum(si.width)}</strong>, numeric: true },
                            { header: "Au g/t", cell: (si) => (interceptElement === "au" ? <strong>{fmtNum(si.au)}</strong> : fmtNum(si.au)), numeric: true },
                            { header: "Cu %", cell: (si) => (interceptElement === "cu" ? <strong>{fmtNum(si.cu)}</strong> : fmtNum(si.cu)), numeric: true },
                            { header: "Ag g/t", cell: (si) => (interceptElement === "ag" ? <strong>{fmtNum(si.ag)}</strong> : fmtNum(si.ag)), numeric: true },
                            { header: "True width", cell: (si) => fmtNum(si.trueWidth), numeric: true, wide: true },
                            {
                              header: "Source",
                              wide: true,
                              cell: (si) => (
                                <span className={`rounded-full px-2 py-0.5 font-sans text-xs font-bold ${si.source === "calculated" ? "bg-sky-500/15 text-sky-700 dark:text-sky-300" : "bg-slate-500/20 text-slate-600 dark:text-slate-300"}`}>
                                  {si.source === "calculated" ? "Calculated" : "Manual"}
                                </span>
                              )
                            }
                          ]}
                          rows={visibleInterceptRows}
                          rowKey={(si) => si.key}
                          rowTo={(si) => pathFor(projectId, zoneId, si.drillHoleId)}
                          empty={`No intercepts above ${interceptParams.cutoff} ${ELEMENT_UNIT[interceptElement]} with at least ${interceptParams.minWidth} m width. Try a lower cut-off or width.`}
                        />
                        <Pager
                          meta={{ total: interceptRows.length, limit: INTERCEPT_PAGE_SIZE, totalPages: interceptTotalPages }}
                          page={interceptPage}
                          onPage={setInterceptPage}
                          noun="intercepts, best grade first"
                        />
                        <p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">Grades are length-weighted averages of the assays in each run.</p>
                      </>
                    )}
                  </Section>
                </div>
                <aside className="xl:sticky xl:top-24 xl:self-start">{mediaViewer}</aside>
              </div>
            </div>
          ) : null}

          {drillHoleId && !intervalId ? (
            <div ref={intervalsRef} className="space-y-4">
              <ContextHeader
                eyebrow="Drillhole"
                title={holeName}
                subtitle={[drillHoleDetail.data?.type, drillHoleDetail.data?.campaign].filter(Boolean).join(" · ") || undefined}
                stats={[
                  { label: "Depth", value: drillHoleDetail.data?.depth != null ? `${fmtNum(drillHoleDetail.data.depth)} m` : "—" },
                  { label: "Intervals", value: intervalsQuery.data?.meta?.total ?? "—" },
                  { label: "Surveys", value: drillHoleSurveysQuery.data?.data?.length ?? "—" }
                ]}
              />
              <Section
                title="Intervals"
                description="Click an interval to see its assays and geology."
                action={canManage ? <AddBtn label="Add Interval" onClick={() => setModal("interval")} /> : undefined}
              >
                {intervalsQuery.isError ? (
                  errorBox("Could not load the intervals.", () => void intervalsQuery.refetch())
                ) : intervalsQuery.isLoading ? (
                  skeleton
                ) : (
                  <>
                    <DataTable
                      columns={[
                        { header: "From (m)", cell: (i) => fmtNum(i.fromDepth), numeric: true },
                        { header: "To (m)", cell: (i) => fmtNum(i.toDepth), numeric: true },
                        { header: "Length (m)", cell: (i) => fmtNum(i.toDepth - i.fromDepth), numeric: true },
                        { header: "Rock", cell: (i) => (i as unknown as { lithologies?: Array<{ rockType?: string | null }> }).lithologies?.[0]?.rockType ?? "—" },
                        { header: "Au g/t", cell: (i) => fmtNum(meanOf((i as unknown as { assays?: Array<Record<string, unknown>> }).assays, "au")), numeric: true },
                        { header: "Cu %", cell: (i) => fmtNum(meanOf((i as unknown as { assays?: Array<Record<string, unknown>> }).assays, "cu")), numeric: true },
                        { header: "Ag g/t", cell: (i) => fmtNum(meanOf((i as unknown as { assays?: Array<Record<string, unknown>> }).assays, "ag")), numeric: true }
                      ]}
                      rows={intervalsQuery.data?.data ?? []}
                      rowKey={(i) => String(i.id)}
                      rowTo={(i) => pathFor(projectId, zoneId, drillHoleId, i.id)}
                      empty="This drillhole has no intervals yet."
                      maxHeight="70vh"
                    />
                    <Pager meta={intervalsQuery.data?.meta} page={intervalPage} onPage={setIntervalPage} noun="intervals" />
                  </>
                )}
              </Section>
              <Section
                title="Surveys"
                description="Downhole azimuth and dip measurements."
                action={canManage ? <AddBtn label="Add Survey" onClick={() => setModal("drillHoleSurvey")} /> : undefined}
              >
                <DataTable
                  columns={[
                    { header: "Depth (m)", cell: (s) => fmtNum(s.depth) },
                    { header: "Azimuth (°)", cell: (s) => fmtNum(s.azimuth), numeric: true },
                    { header: "Dip (°)", cell: (s) => fmtNum(s.dip), numeric: true }
                  ]}
                  rows={drillHoleSurveysQuery.data?.data ?? []}
                  rowKey={(s) => String(s.id)}
                  empty="No surveys."
                />
              </Section>
            </div>
          ) : null}

          {drillHoleId && intervalId && !assayId ? (
            <div ref={assaysRef} className="space-y-4">
              <ContextHeader
                eyebrow="Interval"
                title={intervalLabel}
                subtitle={`Drillhole ${holeName}`}
                stats={[
                  { label: "Length", value: intervalDetail.data ? `${fmtNum(intervalDetail.data.toDepth - intervalDetail.data.fromDepth)} m` : "—" },
                  { label: "Assays", value: assaysQuery.data?.data?.length ?? "—" },
                  { label: "Rock", value: lithologiesQuery.data?.data?.[0]?.rockType ?? "—" }
                ]}
              />
              <Section
                title="Assays"
                description="Click an assay to see its element values."
                action={canManage ? <AddBtn label="Add Assay" onClick={() => setModal("assay")} /> : undefined}
              >
                <DataTable
                  columns={[
                    { header: "Method", cell: (a) => a.assayMethod },
                    { header: "Au g/t", cell: (a) => fmtNum(a.au), numeric: true },
                    { header: "Cu %", cell: (a) => fmtNum(a.cu), numeric: true },
                    { header: "Ag g/t", cell: (a) => fmtNum(a.ag), numeric: true },
                    { header: "Laboratory", cell: (a) => a.laboratory ?? "—" }
                  ]}
                  rows={assaysQuery.data?.data ?? []}
                  rowKey={(a) => String(a.id)}
                  rowTo={(a) => pathFor(projectId, zoneId, drillHoleId, intervalId, a.id)}
                  empty="No assays."
                />
              </Section>
              <Section
                title="Lithology"
                action={canManage ? <AddBtn label="Add Lithology" onClick={() => setModal("lithology")} /> : undefined}
              >
                <DataTable
                  columns={[
                    { header: "Rock type", cell: (l) => l.rockType ?? "—" },
                    { header: "Alteration", cell: (l) => l.alteration ?? "—" },
                    { header: "Mineralization", cell: (l) => l.mineralization ?? "—" },
                    { header: "Comments", cell: (l) => l.comments ?? "—", wide: true }
                  ]}
                  rows={lithologiesQuery.data?.data ?? []}
                  rowKey={(l) => String(l.id)}
                  empty="No lithologies."
                />
              </Section>
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {(alterationsQuery.data?.data ?? []).length > 0 ? (
                  <Section title="Alterations" action={canManage ? <AddBtn label="Add Alteration" onClick={() => setModal("alteration")} /> : undefined}>
                    <DataTable
                      columns={[
                        { header: "Type", cell: (a) => a.type },
                        { header: "Intensity", cell: (a) => fmtNum(a.intensity), numeric: true },
                        { header: "Description", cell: (a) => a.description ?? "—", wide: true },
                        { header: "Comments", cell: (a) => a.comments ?? "—", wide: true }
                      ]}
                      rows={alterationsQuery.data?.data ?? []}
                      rowKey={(a) => String(a.id)}
                      empty="No alterations."
                    />
                  </Section>
                ) : null}
                {(mineralizationsQuery.data?.data ?? []).length > 0 ? (
                  <Section title="Mineralizations" action={canManage ? <AddBtn label="Add Mineralization" onClick={() => setModal("mineralization")} /> : undefined}>
                    <DataTable
                      columns={[
                        { header: "Mineral", cell: (m) => m.mineral },
                        { header: "Percentage", cell: (m) => fmtNum(m.percentage), numeric: true },
                        { header: "Style", cell: (m) => m.style ?? "—", wide: true },
                        { header: "Habit", cell: (m) => m.habit ?? "—", wide: true }
                      ]}
                      rows={mineralizationsQuery.data?.data ?? []}
                      rowKey={(m) => String(m.id)}
                      empty="No mineralizations."
                    />
                  </Section>
                ) : null}
                {(geologicalStructuresQuery.data?.data ?? []).length > 0 ? (
                  <Section title="Geological Structures" action={canManage ? <AddBtn label="Add Structure" onClick={() => setModal("geologicalStructure")} /> : undefined}>
                    <DataTable
                      columns={[
                        { header: "Type", cell: (g) => g.structureType },
                        { header: "Angle", cell: (g) => fmtNum(g.angle), numeric: true },
                        { header: "Width", cell: (g) => fmtNum(g.width), numeric: true },
                        { header: "Orientation", cell: (g) => g.orientation ?? "—", wide: true }
                      ]}
                      rows={geologicalStructuresQuery.data?.data ?? []}
                      rowKey={(g) => String(g.id)}
                      empty="No geological structures."
                    />
                  </Section>
                ) : null}
                {(recoveriesQuery.data?.data ?? []).length > 0 ? (
                  <Section title="Recoveries" action={canManage ? <AddBtn label="Add Recovery" onClick={() => setModal("recovery")} /> : undefined}>
                    <DataTable
                      columns={[
                        { header: "Recovery %", cell: (r) => fmtNum(r.recoveryPercent), numeric: true },
                        { header: "RQD %", cell: (r) => fmtNum(r.rqdPercent), numeric: true },
                        { header: "Core loss", cell: (r) => fmtNum(r.coreLoss), numeric: true },
                        { header: "Comments", cell: (r) => r.comments ?? "—", wide: true }
                      ]}
                      rows={recoveriesQuery.data?.data ?? []}
                      rowKey={(r) => String(r.id)}
                      empty="No recoveries."
                    />
                  </Section>
                ) : null}
                {(densitiesQuery.data?.data ?? []).length > 0 ? (
                  <Section title="Densities" action={canManage ? <AddBtn label="Add Density" onClick={() => setModal("density")} /> : undefined}>
                    <DataTable
                      columns={[
                        { header: "Specific gravity", cell: (d) => fmtNum(d.specificGravity), numeric: true },
                        { header: "Dry density", cell: (d) => fmtNum(d.dryDensity), numeric: true },
                        { header: "Wet density", cell: (d) => fmtNum(d.wetDensity), numeric: true },
                        { header: "Method", cell: (d) => d.method ?? "—", wide: true }
                      ]}
                      rows={densitiesQuery.data?.data ?? []}
                      rowKey={(d) => String(d.id)}
                      empty="No densities."
                    />
                  </Section>
                ) : null}
                {(magneticSusceptibilitiesQuery.data?.data ?? []).length > 0 ? (
                  <Section title="Magnetic Susceptibilities" action={canManage ? <AddBtn label="Add Magnetic" onClick={() => setModal("magneticSusceptibility")} /> : undefined}>
                    <DataTable
                      columns={[
                        { header: "Value", cell: (m) => fmtNum(m.value), numeric: true },
                        { header: "Unit", cell: (m) => m.unit ?? "—" },
                        { header: "Instrument", cell: (m) => m.instrument ?? "—", wide: true },
                        { header: "Comments", cell: (m) => m.comments ?? "—", wide: true }
                      ]}
                      rows={magneticSusceptibilitiesQuery.data?.data ?? []}
                      rowKey={(m) => String(m.id)}
                      empty="No magnetic susceptibilities."
                    />
                  </Section>
                ) : null}
              </div>
            </div>
          ) : null}

          {drillHoleId && intervalId && assayId ? (
            <div ref={qaqcRef} className="space-y-4">
              <ContextHeader
                eyebrow="Assay"
                title={assayDetail.data?.assayMethod ?? "Assay"}
                subtitle={[assayDetail.data?.laboratory, `Interval ${intervalLabel}`, `Drillhole ${holeName}`].filter(Boolean).join(" · ")}
                stats={[
                  { label: "Au g/t", value: fmtNum(assayDetail.data?.au) },
                  { label: "Cu %", value: fmtNum(assayDetail.data?.cu) },
                  { label: "Ag g/t", value: fmtNum(assayDetail.data?.ag) }
                ]}
              />
              <Section
                title="Assay Values"
                description="Every element reported for this assay."
                action={canManage ? <AddBtn label="Add Assay Value" onClick={() => setModal("assayValue")} /> : undefined}
              >
                <DataTable
                  columns={[
                    { header: "Element", cell: (v) => v.element },
                    { header: "Value", cell: (v) => fmtNum(v.value), numeric: true },
                    { header: "Unit", cell: (v) => v.unit ?? "—" },
                    { header: "Detection limit", cell: (v) => fmtNum(v.detectionLimit), numeric: true }
                  ]}
                  rows={assayValuesQuery.data?.data ?? []}
                  rowKey={(v) => String(v.id)}
                  empty="No assay values."
                />
              </Section>
            </div>
          ) : null}
        </div>
      ) : null}

      {canManage && modal ? (
        <CreateModal
          type={modal}
          context={{ projectId, zoneId, drillHoleId, intervalId, assayId }}
          drillHoles={holeOptionsQuery.data?.data ?? []}
          onClose={() => setModal(null)}
          onSubmit={async (payload) => {
            try {
              if (modal === "project") await createProject.mutateAsync(payload as any);
              if (modal === "zone") await createZone.mutateAsync(payload as any);
              if (modal === "drillhole") await createDrillHole.mutateAsync(payload as any);
              if (modal === "interval") await createInterval.mutateAsync(payload as any);
              if (modal === "assay") await createAssay.mutateAsync(payload as any);
              if (modal === "lithology") await createLithology.mutateAsync(payload as any);
              if (modal === "qaqc") await createQaqc.mutateAsync(payload as any);
              if (modal === "significantIntercept")
                await createSignificantIntercept.mutateAsync(payload as any);
              if (modal === "drillHoleSurvey")
                await createDrillHoleSurvey.mutateAsync(payload as any);
              if (modal === "assayValue") await createAssayValue.mutateAsync(payload as any);
              if (modal === "alteration") await createAlteration.mutateAsync(payload as any);
              if (modal === "mineralization")
                await createMineralization.mutateAsync(payload as any);
              if (modal === "geologicalStructure")
                await createGeologicalStructure.mutateAsync(payload as any);
              if (modal === "recovery") await createRecovery.mutateAsync(payload as any);
              if (modal === "density") await createDensity.mutateAsync(payload as any);
              if (modal === "magneticSusceptibility")
                await createMagneticSusceptibility.mutateAsync(payload as any);
              showSuccess("Record created successfully.");
              setModal(null);
            } catch (error) {
              showError(error instanceof Error ? error.message : "Could not create the record.");
            }
          }}
        />
      ) : null}
    </section>
  );
}

function ProjectResourceMap({
  latitude,
  longitude,
  resources
}: {
  latitude: number;
  longitude: number;
  resources: Array<{
    type: string;
    category: string;
    cutoff: number;
    tonnes: number;
    au: number;
    cu: number;
    ag: number;
    cuEq: number;
  }>;
}) {
  const totalTonnes = resources.reduce((acc, item) => acc + item.tonnes, 0);

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--color-border-soft)]">
      <MapContainer
        center={[latitude, longitude]}
        zoom={13}
        style={{ height: "420px", width: "100%" }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Marker
          position={[latitude, longitude]}
          icon={mapMarkerIcon}
          eventHandlers={{
            add: (e) => {
              e.target.openPopup();
            }
          }}
        >
          <Popup autoClose={false} closeOnClick={false}>
            <div className="space-y-1 text-xs">
              <h4 className="font-bold text-center">LIPEÑA</h4>

              <p>Description: Sud Lipez</p>

              <p>Ubication: {`${latitude} ${longitude}`}</p>

              {resources.slice(0, 3).map((resource, idx) => (
                <p key={`${resource.type}-${resource.category}-${idx}`}>
                  {resource.type}/{resource.category} · Au {resource.au} · Cu {resource.cu} · CuEq{" "}
                  {resource.cuEq}
                </p>
              ))}

              {resources.length > 3 ? <p>... and {resources.length - 3} more</p> : null}
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}

type InterceptRow = {
  key: string;
  drillHoleId: number;
  hole: string;
  including: boolean | null;
  from: number;
  to: number;
  width: number;
  trueWidth: number | null;
  au: number | null;
  cu: number | null;
  ag: number | null;
  comments: string | null;
  source: "calculated" | "manual";
};

const INTERCEPT_DEFAULTS = { au: 0.5, cu: 0.3, ag: 20 } as const;
const ELEMENT_LABEL = { au: "Au", cu: "Cu", ag: "Ag" } as const;
const ELEMENT_UNIT = { au: "g/t", cu: "%", ag: "g/t" } as const;

function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function Pager({
  meta,
  page,
  onPage,
  noun
}: {
  meta?: { total?: number; limit?: number; totalPages?: number } | undefined;
  page: number;
  onPage: (page: number) => void;
  noun: string;
}) {
  const total = meta?.total;
  const limit = meta?.limit ?? 25;
  if (total === undefined) return null;
  const totalPages = meta?.totalPages ?? Math.max(1, Math.ceil(total / limit));
  const first = total === 0 ? 0 : (page - 1) * limit + 1;
  const last = Math.min(page * limit, total);
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--color-on-surface-variant)]">
      <span>
        Showing {first}–{last} of {total} {noun}
      </span>
      {totalPages > 1 ? (
        <span className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPage(page - 1)}
            className="rounded-lg border border-[var(--color-border-soft)] px-3 py-1.5 font-semibold disabled:opacity-40"
          >
            Previous
          </button>
          Page {page} of {totalPages}
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPage(page + 1)}
            className="rounded-lg border border-[var(--color-border-soft)] px-3 py-1.5 font-semibold disabled:opacity-40"
          >
            Next
          </button>
        </span>
      ) : null}
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

function LoadingPanel({ label }: { label: string }) {
  return (
    <section className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-4">
      <div className="flex items-center gap-3">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-border-soft)] border-t-[var(--color-primary)]" />
        <span className="text-sm font-semibold text-[var(--color-on-surface)]">{label}</span>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-16 animate-pulse rounded-lg bg-[var(--color-surface-container-high)]" />
        ))}
      </div>
    </section>
  );
}

function CreateModal({
  type,
  context,
  drillHoles,
  onClose,
  onSubmit
}: {
  type: ModalType;
  context: {
    projectId?: number;
    zoneId?: number;
    drillHoleId?: number;
    intervalId?: number;
    assayId?: number;
  };
  drillHoles: Array<{ id: number; name: string }>;
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
}) {
  const [v, setV] = useState<Record<string, string>>({});
  const [validationError, setValidationError] = useState<string | null>(null);
  const set = (k: string, val: string) => setV((s) => ({ ...s, [k]: val }));
  const toNumber = (k: string) => {
    const raw = (v[k] ?? "").trim().replace(",", ".");
    if (!raw) return undefined;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : undefined;
  };
  const t = (k: string) => (v[k] ?? "").trim();

  function requireNumber(key: string, label: string) {
    const parsed = toNumber(key);
    if (parsed === undefined) {
      setValidationError(`${label} must be a valid number.`);
      return null;
    }
    return parsed;
  }

  async function submit() {
    setValidationError(null);
    if (type === "project") {
      if (!t("name")) {
        setValidationError("Project name is required.");
        return;
      }
      return onSubmit({
        name: t("name"),
        description: t("description") || undefined,
        location: t("location") || undefined
      });
    }
    if (type === "zone") {
      if (!context.projectId) {
        setValidationError("No project selected.");
        return;
      }
      if (!t("name")) {
        setValidationError("Zone name is required.");
        return;
      }
      return onSubmit({
        projectId: context.projectId,
        name: t("name"),
        description: t("description") || undefined
      });
    }
    if (type === "drillhole") {
      if (!context.projectId || !context.zoneId) {
        setValidationError("You must be inside a project and a zone.");
        return;
      }
      if (!t("name")) {
        setValidationError("Drillhole name is required.");
        return;
      }
      const east = requireNumber("east", "East");
      const north = requireNumber("north", "North");
      const depth = requireNumber("depth", "Depth");
      if (east === null || north === null || depth === null) return;
      return onSubmit({
        projectId: context.projectId,
        zoneId: context.zoneId,
        name: t("name"),
        east,
        north,
        depth,
        type: t("type") || "DDH",
        elevation: toNumber("elevation"),
        azimuth: toNumber("azimuth"),
        dip: toNumber("dip"),
        campaign: t("campaign") || undefined,
        year: toNumber("year")
      });
    }
    if (type === "interval") {
      if (!context.drillHoleId) {
        setValidationError("No drillhole selected.");
        return;
      }
      const fromDepth = requireNumber("fromDepth", "From depth");
      const toDepth = requireNumber("toDepth", "To depth");
      if (fromDepth === null || toDepth === null) return;
      return onSubmit({ drillHoleId: context.drillHoleId, fromDepth, toDepth });
    }
    if (type === "assay") {
      if (!context.intervalId) {
        setValidationError("No interval selected.");
        return;
      }
      const au = requireNumber("au", "Au");
      const cu = requireNumber("cu", "Cu");
      const ag = requireNumber("ag", "Ag");
      if (au === null || cu === null || ag === null) return;
      return onSubmit({
        intervalId: context.intervalId,
        au,
        cu,
        ag,
        assayMethod: t("assayMethod") || "AAS",
        laboratory: t("laboratory") || undefined
      });
    }
    if (type === "lithology")
      return onSubmit({
        intervalId: context.intervalId,
        rockType: t("rockType") || undefined,
        alteration: t("alteration") || undefined,
        mineralization: t("mineralization") || undefined,
        comments: t("comments") || undefined
      });
    if (type === "qaqc")
      return onSubmit({
        assayId: context.assayId,
        type: t("qaqcType") || "BLANK",
        passed: (t("passed") || "true") === "true",
        notes: t("notes") || undefined
      });
    if (type === "drillHoleSurvey") {
      if (!context.drillHoleId) {
        setValidationError("No drillhole selected.");
        return;
      }
      const depth = requireNumber("depth", "Depth");
      const azimuth = requireNumber("azimuth", "Azimuth");
      const dip = requireNumber("dip", "Dip");
      if (depth === null || azimuth === null || dip === null) return;
      return onSubmit({ drillHoleId: context.drillHoleId, depth, azimuth, dip });
    }
    if (type === "assayValue") {
      if (!context.assayId) {
        setValidationError("No assay selected.");
        return;
      }
      if (!t("element")) {
        setValidationError("Element is required.");
        return;
      }
      const value = requireNumber("value", "Value");
      if (value === null) return;
      return onSubmit({
        assayId: context.assayId,
        element: t("element"),
        value,
        unit: t("unit") || undefined,
        detectionLimit: toNumber("detectionLimit")
      });
    }
    if (type === "alteration") {
      if (!context.intervalId) {
        setValidationError("No interval selected.");
        return;
      }
      if (!t("alterationType")) {
        setValidationError("Type is required.");
        return;
      }
      return onSubmit({
        intervalId: context.intervalId,
        type: t("alterationType"),
        intensity: toNumber("intensity"),
        description: t("description") || undefined,
        comments: t("comments") || undefined
      });
    }
    if (type === "mineralization") {
      if (!context.intervalId) {
        setValidationError("No interval selected.");
        return;
      }
      if (!t("mineral")) {
        setValidationError("Mineral is required.");
        return;
      }
      return onSubmit({
        intervalId: context.intervalId,
        mineral: t("mineral"),
        percentage: toNumber("percentage"),
        style: t("style") || undefined,
        habit: t("habit") || undefined,
        description: t("description") || undefined,
        comments: t("comments") || undefined
      });
    }
    if (type === "geologicalStructure") {
      if (!context.intervalId) {
        setValidationError("No interval selected.");
        return;
      }
      if (!t("structureType")) {
        setValidationError("Structure type is required.");
        return;
      }
      return onSubmit({
        intervalId: context.intervalId,
        structureType: t("structureType"),
        angle: toNumber("angle"),
        width: toNumber("width"),
        orientation: t("orientation") || undefined,
        description: t("description") || undefined,
        comments: t("comments") || undefined
      });
    }
    if (type === "recovery") {
      if (!context.intervalId) {
        setValidationError("No interval selected.");
        return;
      }
      return onSubmit({
        intervalId: context.intervalId,
        recoveryPercent: toNumber("recoveryPercent"),
        rqdPercent: toNumber("rqdPercent"),
        coreLoss: toNumber("coreLoss"),
        comments: t("comments") || undefined
      });
    }
    if (type === "density") {
      if (!context.intervalId) {
        setValidationError("No interval selected.");
        return;
      }
      const specificGravity = requireNumber("specificGravity", "Specific gravity");
      if (specificGravity === null) return;
      return onSubmit({
        intervalId: context.intervalId,
        specificGravity,
        method: t("method") || undefined,
        dryDensity: toNumber("dryDensity"),
        wetDensity: toNumber("wetDensity"),
        comments: t("comments") || undefined
      });
    }
    if (type === "magneticSusceptibility") {
      if (!context.intervalId) {
        setValidationError("No interval selected.");
        return;
      }
      const value = requireNumber("value", "Value");
      if (value === null) return;
      return onSubmit({
        intervalId: context.intervalId,
        value,
        unit: t("unit") || undefined,
        instrument: t("instrument") || undefined,
        comments: t("comments") || undefined
      });
    }
    if (type === "significantIntercept") {
      if (!context.zoneId) {
        setValidationError("No zone selected.");
        return;
      }
      const drillHoleId = requireNumber("drillHoleId", "Drillhole");
      const fromDepth = requireNumber("fromDepth", "From depth");
      const toDepth = requireNumber("toDepth", "To depth");
      const width = requireNumber("width", "Width");
      if (drillHoleId === null || fromDepth === null || toDepth === null || width === null) return;
      return onSubmit({
        drillHoleId,
        isIncluding: (t("isIncluding") || "false") === "true",
        fromDepth,
        toDepth,
        width,
        trueWidth: toNumber("trueWidth"),
        au: toNumber("au"),
        cu: toNumber("cu"),
        ag: toNumber("ag"),
        comments: t("comments") || undefined
      });
    }
    setValidationError("Unsupported form type.");
    return;
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-[var(--color-surface-container-low)] p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold">Create {type}</h3>
          <button onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {type === "project" ? (
            <>
              <input
                className={inputClassName}
                placeholder="Project name"
                onChange={(e) => set("name", e.target.value)}
              />
              <input
                className={inputClassName}
                placeholder="Location (optional)"
                onChange={(e) => set("location", e.target.value)}
              />
              <input
                className={`${inputClassName} col-span-2`}
                placeholder="Description (optional)"
                onChange={(e) => set("description", e.target.value)}
              />
            </>
          ) : null}
          {type === "zone" ? (
            <>
              <input
                className={inputClassName}
                placeholder="Zone name"
                onChange={(e) => set("name", e.target.value)}
              />
              <input
                className={inputClassName}
                placeholder="Description (optional)"
                onChange={(e) => set("description", e.target.value)}
              />
            </>
          ) : null}
          {type === "drillhole" ? (
            <>
              <input
                className={inputClassName}
                placeholder="Drillhole name"
                onChange={(e) => set("name", e.target.value)}
              />
              <select
                className={inputClassName}
                onChange={(e) => set("type", e.target.value)}
                defaultValue="DDH"
              >
                <option>DDH</option>
                <option>RC</option>
                <option>AC</option>
                <option>OTHER</option>
              </select>
              <input
                type="number"
                step="any"
                className={inputClassName}
                placeholder="East (ej: 503210.1254)"
                onChange={(e) => set("east", e.target.value)}
              />
              <input
                type="number"
                step="any"
                className={inputClassName}
                placeholder="North (ej: 7712450.2231)"
                onChange={(e) => set("north", e.target.value)}
              />
              <input
                type="number"
                step="any"
                className={inputClassName}
                placeholder="Depth (ej: 220.5)"
                onChange={(e) => set("depth", e.target.value)}
              />
              <input
                type="number"
                step="any"
                className={inputClassName}
                placeholder="Elevation (optional)"
                onChange={(e) => set("elevation", e.target.value)}
              />
              <input
                type="number"
                step="any"
                className={inputClassName}
                placeholder="Azimuth (optional)"
                onChange={(e) => set("azimuth", e.target.value)}
              />
              <input
                type="number"
                step="any"
                className={inputClassName}
                placeholder="Dip (optional)"
                onChange={(e) => set("dip", e.target.value)}
              />
              <input
                className={inputClassName}
                placeholder="Campaign (optional)"
                onChange={(e) => set("campaign", e.target.value)}
              />
              <input
                type="number"
                step="1"
                className={inputClassName}
                placeholder="Year (optional)"
                onChange={(e) => set("year", e.target.value)}
              />
            </>
          ) : null}
          {type === "interval" ? (
            <>
              <input
                type="number"
                step="any"
                className={inputClassName}
                placeholder="From depth (ej: 0)"
                onChange={(e) => set("fromDepth", e.target.value)}
              />
              <input
                type="number"
                step="any"
                className={inputClassName}
                placeholder="To depth (ej: 25)"
                onChange={(e) => set("toDepth", e.target.value)}
              />
            </>
          ) : null}
          {type === "assay" ? (
            <>
              <input
                type="number"
                step="any"
                className={inputClassName}
                placeholder="Au (ej: 0.35)"
                onChange={(e) => set("au", e.target.value)}
              />
              <input
                type="number"
                step="any"
                className={inputClassName}
                placeholder="Cu (ej: 0.12)"
                onChange={(e) => set("cu", e.target.value)}
              />
              <input
                type="number"
                step="any"
                className={inputClassName}
                placeholder="Ag (ej: 4.8)"
                onChange={(e) => set("ag", e.target.value)}
              />
              <select
                className={inputClassName}
                onChange={(e) => set("assayMethod", e.target.value)}
                defaultValue="AAS"
              >
                <option>AAS</option>
                <option>ICP</option>
                <option>XRF</option>
                <option>OTHER</option>
              </select>
              <input
                className={`${inputClassName} col-span-2`}
                placeholder="Laboratorio (optional)"
                onChange={(e) => set("laboratory", e.target.value)}
              />
            </>
          ) : null}
          {type === "lithology" ? (
            <>
              <input
                className={inputClassName}
                placeholder="Rock type (optional)"
                onChange={(e) => set("rockType", e.target.value)}
              />
              <input
                className={inputClassName}
                placeholder="Alteration (optional)"
                onChange={(e) => set("alteration", e.target.value)}
              />
              <input
                className={inputClassName}
                placeholder="Mineralization (optional)"
                onChange={(e) => set("mineralization", e.target.value)}
              />
              <input
                className={inputClassName}
                placeholder="Comments (optional)"
                onChange={(e) => set("comments", e.target.value)}
              />
            </>
          ) : null}
          {type === "qaqc" ? (
            <>
              <select
                className={inputClassName}
                onChange={(e) => set("qaqcType", e.target.value)}
                defaultValue="BLANK"
              >
                <option>BLANK</option>
                <option>DUPLICATE</option>
                <option>STANDARD</option>
              </select>
              <select
                className={inputClassName}
                onChange={(e) => set("passed", e.target.value)}
                defaultValue="true"
              >
                <option value="true">Passed: Yes</option>
                <option value="false">Passed: No</option>
              </select>
              <input
                className={`${inputClassName} col-span-2`}
                placeholder="Notes (optional)"
                onChange={(e) => set("notes", e.target.value)}
              />
            </>
          ) : null}
          {type === "significantIntercept" ? (
            <>
              <select
                className={inputClassName}
                defaultValue=""
                onChange={(e) => set("drillHoleId", e.target.value)}
              >
                <option value="">Select hole...</option>
                {drillHoles.map((hole) => (
                  <option key={hole.id} value={hole.id}>
                    {hole.name}
                  </option>
                ))}
              </select>
              <select
                className={inputClassName}
                onChange={(e) => set("isIncluding", e.target.value)}
                defaultValue="false"
              >
                <option value="false">Including: No</option>
                <option value="true">Including: Yes</option>
              </select>
              <input
                type="number"
                step="any"
                className={inputClassName}
                placeholder="From depth"
                onChange={(e) => set("fromDepth", e.target.value)}
              />
              <input
                type="number"
                step="any"
                className={inputClassName}
                placeholder="To depth"
                onChange={(e) => set("toDepth", e.target.value)}
              />
              <input
                type="number"
                step="any"
                className={inputClassName}
                placeholder="Width"
                onChange={(e) => set("width", e.target.value)}
              />
              <input
                type="number"
                step="any"
                className={inputClassName}
                placeholder="True width (optional)"
                onChange={(e) => set("trueWidth", e.target.value)}
              />
              <input
                type="number"
                step="any"
                className={inputClassName}
                placeholder="Au g/t (optional)"
                onChange={(e) => set("au", e.target.value)}
              />
              <input
                type="number"
                step="any"
                className={inputClassName}
                placeholder="Cu % (optional)"
                onChange={(e) => set("cu", e.target.value)}
              />
              <input
                type="number"
                step="any"
                className={inputClassName}
                placeholder="Ag g/t (optional)"
                onChange={(e) => set("ag", e.target.value)}
              />
              <input
                className={inputClassName}
                placeholder="Comments (optional)"
                onChange={(e) => set("comments", e.target.value)}
              />
            </>
          ) : null}
          {type === "drillHoleSurvey" ? (
            <>
              <input
                type="number"
                step="any"
                className={inputClassName}
                placeholder="Depth"
                onChange={(e) => set("depth", e.target.value)}
              />
              <input
                type="number"
                step="any"
                className={inputClassName}
                placeholder="Azimuth"
                onChange={(e) => set("azimuth", e.target.value)}
              />
              <input
                type="number"
                step="any"
                className={`${inputClassName} col-span-2`}
                placeholder="Dip"
                onChange={(e) => set("dip", e.target.value)}
              />
            </>
          ) : null}
          {type === "assayValue" ? (
            <>
              <input
                className={inputClassName}
                placeholder="Element (ej: Zn)"
                onChange={(e) => set("element", e.target.value)}
              />
              <input
                type="number"
                step="any"
                className={inputClassName}
                placeholder="Value"
                onChange={(e) => set("value", e.target.value)}
              />
              <input
                className={inputClassName}
                placeholder="Unit (optional)"
                onChange={(e) => set("unit", e.target.value)}
              />
              <input
                type="number"
                step="any"
                className={inputClassName}
                placeholder="Detection limit (optional)"
                onChange={(e) => set("detectionLimit", e.target.value)}
              />
            </>
          ) : null}
          {type === "alteration" ? (
            <>
              <input
                className={inputClassName}
                placeholder="Type"
                onChange={(e) => set("alterationType", e.target.value)}
              />
              <input
                type="number"
                step="any"
                className={inputClassName}
                placeholder="Intensity (optional)"
                onChange={(e) => set("intensity", e.target.value)}
              />
              <input
                className={inputClassName}
                placeholder="Description (optional)"
                onChange={(e) => set("description", e.target.value)}
              />
              <input
                className={inputClassName}
                placeholder="Comments (optional)"
                onChange={(e) => set("comments", e.target.value)}
              />
            </>
          ) : null}
          {type === "mineralization" ? (
            <>
              <input
                className={inputClassName}
                placeholder="Mineral"
                onChange={(e) => set("mineral", e.target.value)}
              />
              <input
                type="number"
                step="any"
                className={inputClassName}
                placeholder="Percentage (optional)"
                onChange={(e) => set("percentage", e.target.value)}
              />
              <input
                className={inputClassName}
                placeholder="Style (optional)"
                onChange={(e) => set("style", e.target.value)}
              />
              <input
                className={inputClassName}
                placeholder="Habit (optional)"
                onChange={(e) => set("habit", e.target.value)}
              />
              <input
                className={inputClassName}
                placeholder="Description (optional)"
                onChange={(e) => set("description", e.target.value)}
              />
              <input
                className={inputClassName}
                placeholder="Comments (optional)"
                onChange={(e) => set("comments", e.target.value)}
              />
            </>
          ) : null}
          {type === "geologicalStructure" ? (
            <>
              <input
                className={inputClassName}
                placeholder="Structure type"
                onChange={(e) => set("structureType", e.target.value)}
              />
              <input
                type="number"
                step="any"
                className={inputClassName}
                placeholder="Angle (optional)"
                onChange={(e) => set("angle", e.target.value)}
              />
              <input
                type="number"
                step="any"
                className={inputClassName}
                placeholder="Width (optional)"
                onChange={(e) => set("width", e.target.value)}
              />
              <input
                className={inputClassName}
                placeholder="Orientation (optional)"
                onChange={(e) => set("orientation", e.target.value)}
              />
              <input
                className={inputClassName}
                placeholder="Description (optional)"
                onChange={(e) => set("description", e.target.value)}
              />
              <input
                className={inputClassName}
                placeholder="Comments (optional)"
                onChange={(e) => set("comments", e.target.value)}
              />
            </>
          ) : null}
          {type === "recovery" ? (
            <>
              <input
                type="number"
                step="any"
                className={inputClassName}
                placeholder="Recovery % (optional)"
                onChange={(e) => set("recoveryPercent", e.target.value)}
              />
              <input
                type="number"
                step="any"
                className={inputClassName}
                placeholder="RQD % (optional)"
                onChange={(e) => set("rqdPercent", e.target.value)}
              />
              <input
                type="number"
                step="any"
                className={inputClassName}
                placeholder="Core loss (optional)"
                onChange={(e) => set("coreLoss", e.target.value)}
              />
              <input
                className={inputClassName}
                placeholder="Comments (optional)"
                onChange={(e) => set("comments", e.target.value)}
              />
            </>
          ) : null}
          {type === "density" ? (
            <>
              <input
                type="number"
                step="any"
                className={inputClassName}
                placeholder="Specific gravity"
                onChange={(e) => set("specificGravity", e.target.value)}
              />
              <input
                className={inputClassName}
                placeholder="Method (optional)"
                onChange={(e) => set("method", e.target.value)}
              />
              <input
                type="number"
                step="any"
                className={inputClassName}
                placeholder="Dry density (optional)"
                onChange={(e) => set("dryDensity", e.target.value)}
              />
              <input
                type="number"
                step="any"
                className={inputClassName}
                placeholder="Wet density (optional)"
                onChange={(e) => set("wetDensity", e.target.value)}
              />
              <input
                className={`${inputClassName} col-span-2`}
                placeholder="Comments (optional)"
                onChange={(e) => set("comments", e.target.value)}
              />
            </>
          ) : null}
          {type === "magneticSusceptibility" ? (
            <>
              <input
                type="number"
                step="any"
                className={inputClassName}
                placeholder="Value"
                onChange={(e) => set("value", e.target.value)}
              />
              <input
                className={inputClassName}
                placeholder="Unit (optional)"
                onChange={(e) => set("unit", e.target.value)}
              />
              <input
                className={inputClassName}
                placeholder="Instrument (optional)"
                onChange={(e) => set("instrument", e.target.value)}
              />
              <input
                className={inputClassName}
                placeholder="Comments (optional)"
                onChange={(e) => set("comments", e.target.value)}
              />
            </>
          ) : null}
        </div>
        {validationError ? (
          <p className="mt-3 text-sm text-[var(--color-error)]">{validationError}</p>
        ) : null}
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-[var(--color-border-soft)] px-3 py-2 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={() => void submit()}
            className="rounded-lg bg-[var(--color-primary)] px-3 py-2 text-sm font-semibold text-[var(--color-on-primary)]"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
