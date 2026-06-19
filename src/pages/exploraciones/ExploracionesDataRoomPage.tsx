import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { ChevronRight, Plus, X } from "lucide-react";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import introVideoDefault from "@/assets/images/VIDEO DE PRESENTACION.mp4";
import modelGifDefault from "@/assets/images/1MODELO.gif";
import modelGifDef2ault from "@/assets/images/2MODELO_.gif";
import drillMediaFallback01 from "@/assets/images/GENERAL_1PLATA.jpg";
import drillMediaFallback02 from "@/assets/images/GENERAL_2COBRE.jpg";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useToast } from "@/shared/ui/toast/ToastProvider";
import { InternalHeader } from "@/shared/ui/InternalHeader";
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

const DEFAULT_PROJECT_MAP_LAT = Number(import.meta.env.VITE_PROJECT_MAP_LAT ?? -16.5);
const DEFAULT_PROJECT_MAP_LNG = Number(import.meta.env.VITE_PROJECT_MAP_LNG ?? -68.15);
const EXPLORACIONES_INTRO_VIDEO_URL =
  import.meta.env.VITE_EXPLORACIONES_INTRO_VIDEO_URL ?? introVideoDefault;
const DRILLHOLES_MEDIA_SCHEME = {
  default: [
    "1MODELO.gif",
    "2MODELO_.gif",
    "GENERAL_1PLATA.jpg",
    "GENERAL_2COBRE.jpg"
  ],
  byProjectId: {} as Record<number, string[]>,
  byZoneId: {} as Record<number, string[]>
} as const;
const DRILLHOLES_MEDIA_BY_NAME: Record<string, string> = {
  "1MODELO.gif": modelGifDefault,
  "2MODELO_.gif": modelGifDef2ault,
  "GENERAL_1PLATA.jpg": drillMediaFallback01,
  "GENERAL_2COBRE.jpg": drillMediaFallback02
};

export function ExploracionesDataRoomPage() {
  const { user } = useAuth();
  const { showError, showSuccess } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const canManage = user?.role === "ADMIN" || user?.role === "SUPERINTENDENTE";
  const canView = canManage || user?.role === "VISITANTE" || user?.role === "GEOLOGO";
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
  const projectsQuery = useProjectsQuery({ page: 1, limit: 100 });
  const projectDetail = useProjectDetailQuery(projectId);
  const zonesQuery = useZonesByProjectQuery(projectId);
  const zoneDetail = useZoneDetailQuery(zoneId);
  const drillHolesQuery = useDrillHolesByZoneQuery(zoneId);
  const drillHoleDetail = useDrillHoleDetailQuery(drillHoleId);
  const intervalsQuery = useIntervalsByDrillHoleQuery(drillHoleId);
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
  const drillholesMedia = useMemo(() => {
    const resolve = (names: readonly string[]) =>
      names.map((n) => DRILLHOLES_MEDIA_BY_NAME[n]).filter((src): src is string => Boolean(src));
    if (zoneId && DRILLHOLES_MEDIA_SCHEME.byZoneId[zoneId]?.length) {
      const list = resolve(DRILLHOLES_MEDIA_SCHEME.byZoneId[zoneId]);
      if (list.length) return list;
    }
    if (projectId && DRILLHOLES_MEDIA_SCHEME.byProjectId[projectId]?.length) {
      const list = resolve(DRILLHOLES_MEDIA_SCHEME.byProjectId[projectId]);
      if (list.length) return list;
    }
    const fallback = resolve(DRILLHOLES_MEDIA_SCHEME.default);
    return fallback.length ? fallback : [modelGifDefault];
  }, [projectId, zoneId]);

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

  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <InternalHeader
        eyebrow="Data Room"
        title="Exploration Data Room"
        description="Explora proyectos, zonas, perforaciones, intervalos y ensayos desde una vista ejecutiva centralizada."
      />

      {isLoading ? (
        <section className="rounded-xl bg-[var(--color-surface-container-low)] p-4">
          Loading...
        </section>
      ) : null}

      {isLanding ? (
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 md:grid-cols-3">
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
              <video
                key={EXPLORACIONES_INTRO_VIDEO_URL}
                className="h-[160px] w-full object-cover opacity-90"
                muted
                playsInline
                preload="metadata"
              >
                <source src={EXPLORACIONES_INTRO_VIDEO_URL} type="video/mp4" />
              </video>
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
            <p className="text-lg font-bold">Taladros</p>
            <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">
              {preferredDrillProject
                ? "Enter the drilling data room."
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
              Enter the surface exploration data room.
            </p>
          </button>
          {!isVisitante ? (
            <button
              type="button"
              className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5 text-left opacity-75"
            >
              <p className="text-lg font-bold">Geochemistry</p>
              <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">
                Geochemistry module (coming soon).
              </p>
            </button>
          ) : null}
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
          <video
            key={`${EXPLORACIONES_INTRO_VIDEO_URL}-fullscreen`}
            className="max-h-[90vh] w-auto max-w-[92vw] rounded-xl border border-white/20 bg-black"
            controls
            autoPlay
            playsInline
            preload="metadata"
          >
            <source src={EXPLORACIONES_INTRO_VIDEO_URL} type="video/mp4" />
          </video>
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
            <img
              src={drillholesMedia[mediaSlide]}
              alt={`Drillholes media fullscreen ${mediaSlide + 1}`}
              draggable={false}
              onMouseDown={(e) => {
                if (mediaZoom <= 1) return;
                setMediaDragging(true);
                setMediaDragStart({
                  x: e.clientX - mediaPan.x,
                  y: e.clientY - mediaPan.y
                });
              }}
              className={`max-h-[90vh] max-w-[90vw] select-none object-contain ${mediaZoom > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in"}`}
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
        <div className="mx-auto max-w-5xl">
          <Card
            title="Projects"
            action={
              canManage ? (
                <AddBtn label="Add Project" onClick={() => setModal("project")} />
              ) : undefined
            }
          >
            <SimpleTable
              headers={["ID", "Name", "Location", "Action"]}
              rows={(projectsQuery.data?.data ?? []).map((p) => [
                String(p.id),
                p.name,
                p.location ?? "-",
                <Link key={p.id} className="text-[var(--color-primary)]" to={pathFor(p.id)}>
                  Open
                </Link>
              ])}
              empty="No projects."
            />
          </Card>
        </div>
      ) : null}

      {projectId && !zoneId ? (
        <div className="space-y-4">
          <header className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-4">
            <h2 className="text-xl font-bold">{projectDetail.data?.name ?? "Project"}</h2>
            <p className="text-sm text-[var(--color-on-surface-variant)]">
              {projectDetail.data?.location ?? "No location"}
            </p>
          </header>
          <div className="grid gap-4 xl:grid-cols-9">
            <div className="xl:col-span-6">
              <Card
                title="Project Zones"
                description={`Zones defined for project ${projectDetail.data?.name ?? `#${projectId}`}.`}
                action={
                  canManage ? <AddBtn label="Add Zone" onClick={() => setModal("zone")} /> : undefined
                }
              >
                <SimpleTable
                  headers={["Zone", "Action"]}
                  rows={(zonesQuery.data?.data ?? []).map((z) => [
                    z.name,
                    <Link
                      key={z.id}
                      className="text-[var(--color-primary)]"
                      to={pathFor(projectId, z.id)}
                    >
                      View Drillholes
                    </Link>
                  ])}
                  empty="No zones."
                />
              </Card>
            </div>
            <div className="xl:col-span-3">
              <Card
                title="Map"
                description={`Geospatial overview for project ${projectDetail.data?.name ?? `#${projectId}`}.`}
              >
                <ProjectResourceMap
                  latitude={DEFAULT_PROJECT_MAP_LAT}
                  longitude={DEFAULT_PROJECT_MAP_LNG}
                  resources={[]}
                />
              </Card>
            </div>
          </div>
        </div>
      ) : null}

      {projectId && zoneId ? (
        <div className="space-y-4">
          <header className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-4">
            <h2 className="text-xl font-bold">{projectDetail.data?.name ?? "Project"}</h2>
            <p className="text-sm text-[var(--color-on-surface-variant)]">
              {projectDetail.data?.location ?? "No location"}
            </p>
            <p className="mt-2 text-sm">
              <strong>Zone:</strong> {zoneDetail.data?.name ?? "-"} ·{" "}
              {zoneDetail.data?.description ?? "No description"}
            </p>
          </header>
          <div className="animate-[fadeIn_.28s_ease-out]">
            {!drillHoleId ? (
              <div className="space-y-4">
                <Card
                  title="Drillholes Media Viewer"
                  description="Model/image preview for the current drillholes context."
                >
                  <div className="overflow-hidden rounded-xl border border-[var(--color-border-soft)] bg-black">
                    <img
                      src={drillholesMedia[mediaSlide]}
                      alt={`Drillholes media ${mediaSlide + 1}`}
                      className="h-[320px] w-full object-contain"
                    />
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <button
                      onClick={() =>
                        setMediaSlide(
                          (s) => (s - 1 + drillholesMedia.length) % drillholesMedia.length
                        )
                      }
                      className="rounded-lg border border-[var(--color-border-soft)] px-3 py-1.5 text-xs font-semibold"
                    >
                      Prev
                    </button>
                    <div className="flex gap-2">
                      {drillholesMedia.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setMediaSlide(i)}
                          className={`h-2.5 w-2.5 rounded-full ${i === mediaSlide ? "bg-[var(--color-primary)]" : "bg-[var(--color-border-soft)]"}`}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setMediaFullScreen(true)}
                        className="rounded-lg border border-[var(--color-border-soft)] px-3 py-1.5 text-xs font-semibold"
                      >
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
                  <p className="mt-2 text-xs text-[var(--color-on-surface-variant)]">
                    Add more images or gifs in <code>DRILLHOLES_MEDIA_SCHEME</code> (this file).
                  </p>
                </Card>
                <Card
                  title="Significant Intercepts"
                  description={`Significant intercepts registered for zone ${zoneDetail.data?.name ?? `#${zoneId}`}.`}
                  action={
                    canManage ? (
                      <AddBtn
                        label="Add Significant Intercept"
                        onClick={() => setModal("significantIntercept")}
                      />
                    ) : undefined
                  }
                >
                  <div className="overflow-x-auto rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)]">
                    <table className="w-full border-collapse text-left">
                      <thead>
                        <tr>
                          {[
                            "Hole",
                            "Incl.",
                            "From",
                            "To",
                            "Width",
                            "True Width",
                            "Au g/t",
                            "Cu %",
                            "Ag g/t",
                            "Comments"
                          ].map((h) => (
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
                        {(significantInterceptsByZoneQuery.data?.data ?? []).length ? (
                          (significantInterceptsByZoneQuery.data?.data ?? []).map((si) => (
                            <tr
                              key={si.id}
                              className="border-t border-[var(--color-border-soft)] transition hover:bg-[var(--color-surface-container-highest)]"
                            >
                              <td className="px-3 py-2 text-sm font-semibold">
                                <Link
                                  className="text-[var(--color-primary)] hover:underline"
                                  to={pathFor(projectId, zoneId, si.drillHoleId)}
                                >
                                  {si.drillHole?.name ?? `Drillhole #${si.drillHoleId}`}
                                </Link>
                              </td>
                              <td className="px-3 py-2 text-sm">
                                <span
                                  className={`rounded-full px-2 py-0.5 text-xs font-bold ${si.isIncluding ? "bg-emerald-500/15 text-emerald-300" : "bg-slate-500/20 text-slate-300"}`}
                                >
                                  {si.isIncluding ? "YES" : "NO"}
                                </span>
                              </td>
                              <td className="px-3 py-2 font-mono text-sm text-cyan-300">
                                {si.fromDepth}
                              </td>
                              <td className="px-3 py-2 font-mono text-sm text-cyan-300">
                                {si.toDepth}
                              </td>
                              <td className="px-3 py-2 font-mono text-sm font-bold text-amber-300">
                                {si.width}
                              </td>
                              <td className="px-3 py-2 font-mono text-sm">{si.trueWidth ?? "-"}</td>
                              <td className="px-3 py-2 font-mono text-sm font-bold text-yellow-300">
                                {si.au ?? "-"}
                              </td>
                              <td className="px-3 py-2 font-mono text-sm font-bold text-orange-300">
                                {si.cu ?? "-"}
                              </td>
                              <td className="px-3 py-2 font-mono text-sm font-bold text-lime-300">
                                {si.ag ?? "-"}
                              </td>
                              <td className="px-3 py-2 text-sm text-[var(--color-on-surface-variant)]">
                                {si.comments ?? "-"}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan={10}
                              className="px-3 py-4 text-sm text-[var(--color-on-surface-variant)]"
                            >
                              No significant intercepts.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
                <Card
                  title="Drillholes"
                  description={`Drillholes registered for zone ${zoneDetail.data?.name ?? `#${zoneId}`}.`}
                  action={
                    canManage ? (
                      <AddBtn label="Add Drillhole" onClick={() => setModal("drillhole")} />
                    ) : undefined
                  }
                >
                  <SimpleTable
                    headers={[
                      "Hole",
                      "Type",
                      "East",
                      "North",
                      "Elevation",
                      "Depth",
                      "Azimuth",
                      "Dip",
                      "Campaign",
                      "Year",
                      "Action"
                    ]}
                    rows={(drillHolesQuery.data?.data ?? []).map((d) => [
                      d.name,
                      d.type,
                      String(d.east),
                      String(d.north),
                      d.elevation === null ? "-" : String(d.elevation),
                      String(d.depth),
                      d.azimuth === null ? "-" : String(d.azimuth),
                      d.dip === null ? "-" : String(d.dip),
                      d.campaign ?? "-",
                      d.year === null ? "-" : String(d.year),
                      <Link
                        key={d.id}
                        className="text-[var(--color-primary)]"
                        to={pathFor(projectId, zoneId, d.id)}
                      >
                        View Intervals
                      </Link>
                    ])}
                    empty="No drillholes in this zone."
                  />
                </Card>
              </div>
            ) : null}

            {drillHoleId && !intervalId ? (
              <div ref={intervalsRef}>
                <Card
                  title="Intervals"
                  description={`Intervals logged for drillhole ${drillHoleDetail.data?.name ?? `#${drillHoleId}`}.`}
                  action={
                    canManage ? (
                      <AddBtn label="Add Interval" onClick={() => setModal("interval")} />
                    ) : undefined
                  }
                >
                  <div className="mb-3 text-xs text-[var(--color-on-surface-variant)]">
                    You are viewing intervals for the selected drillhole.
                  </div>
                  <SimpleTable
                    headers={["ID", "From", "To", "Action"]}
                    rows={(intervalsQuery.data?.data ?? []).map((i) => [
                      String(i.id),
                      String(i.fromDepth),
                      String(i.toDepth),
                      <Link
                        key={i.id}
                        className="text-[var(--color-primary)]"
                        to={pathFor(projectId, zoneId, drillHoleId, i.id)}
                      >
                        View Assays
                      </Link>
                    ])}
                    empty="This drillhole has no intervals yet."
                  />
                </Card>
                <div className="mt-3" />
                <Card
                  title="Drillhole Surveys"
                  description={`Survey measurements for drillhole ${drillHoleDetail.data?.name ?? `#${drillHoleId}`}.`}
                  action={
                    canManage ? (
                      <AddBtn label="Add Survey" onClick={() => setModal("drillHoleSurvey")} />
                    ) : undefined
                  }
                >
                  <SimpleTable
                    headers={["ID", "Depth", "Azimuth", "Dip"]}
                    rows={(drillHoleSurveysQuery.data?.data ?? []).map((s) => [
                      String(s.id),
                      String(s.depth),
                      String(s.azimuth),
                      String(s.dip)
                    ])}
                    empty="No surveys."
                  />
                </Card>
              </div>
            ) : null}

            {drillHoleId && intervalId && !assayId ? (
              <div ref={assaysRef}>
                <Card
                  title="Assays and Lithologies"
                  description={`Assay and lithology records for interval #${intervalId}.`}
                  action={
                    canManage ? (
                      <div className="flex gap-2">
                        <AddBtn label="Add Assay" onClick={() => setModal("assay")} />
                        <AddBtn label="Add Lithology" onClick={() => setModal("lithology")} />
                      </div>
                    ) : undefined
                  }
                >
                  <div className="mb-3 text-xs text-[var(--color-on-surface-variant)]">
                    You are viewing details for the selected interval.
                  </div>
                  <SimpleTable
                    headers={["ID", "Method", "Au", "Cu", "Ag", "Lab", "Action"]}
                    rows={(assaysQuery.data?.data ?? []).map((a) => [
                      String(a.id),
                      a.assayMethod,
                      String(a.au),
                      String(a.cu),
                      String(a.ag),
                      a.laboratory ?? "-",
                      <Link
                        key={a.id}
                        className="text-[var(--color-primary)]"
                        to={pathFor(projectId, zoneId, drillHoleId, intervalId, a.id)}
                      >
                        View QAQC
                      </Link>
                    ])}
                    empty="No assays."
                  />
                  <div className="mt-3" />
                  <SimpleTable
                    headers={["ID", "Rock Type", "Alteration", "Mineralization", "Comments"]}
                    rows={(lithologiesQuery.data?.data ?? []).map((l) => [
                      String(l.id),
                      l.rockType ?? "-",
                      l.alteration ?? "-",
                      l.mineralization ?? "-",
                      l.comments ?? "-"
                    ])}
                    empty="No lithologies."
                  />
                  <div className="mt-3" />
                  <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                    {(alterationsQuery.data?.data ?? []).length > 0 ? (
                      <Card
                        title="Alterations"
                        description={`Alteration logs for interval #${intervalId}.`}
                        action={
                          canManage ? (
                            <AddBtn label="Add Alteration" onClick={() => setModal("alteration")} />
                          ) : undefined
                        }
                      >
                        <SimpleTable
                          headers={["ID", "Type", "Intensity", "Description", "Comments"]}
                          rows={(alterationsQuery.data?.data ?? []).map((a) => [
                            String(a.id),
                            a.type,
                            a.intensity === null ? "-" : String(a.intensity),
                            a.description ?? "-",
                            a.comments ?? "-"
                          ])}
                          empty="No alterations."
                        />
                      </Card>
                    ) : null}
                    {(mineralizationsQuery.data?.data ?? []).length > 0 ? (
                      <Card
                        title="Mineralizations"
                        description={`Mineralization logs for interval #${intervalId}.`}
                        action={
                          canManage ? (
                            <AddBtn
                              label="Add Mineralization"
                              onClick={() => setModal("mineralization")}
                            />
                          ) : undefined
                        }
                      >
                        <SimpleTable
                          headers={["ID", "Mineral", "Percentage", "Style", "Habit"]}
                          rows={(mineralizationsQuery.data?.data ?? []).map((m) => [
                            String(m.id),
                            m.mineral,
                            m.percentage === null ? "-" : String(m.percentage),
                            m.style ?? "-",
                            m.habit ?? "-"
                          ])}
                          empty="No mineralizations."
                        />
                      </Card>
                    ) : null}
                    {(geologicalStructuresQuery.data?.data ?? []).length > 0 ? (
                      <Card
                        title="Geological Structures"
                        description={`Structural records for interval #${intervalId}.`}
                        action={
                          canManage ? (
                            <AddBtn
                              label="Add Structure"
                              onClick={() => setModal("geologicalStructure")}
                            />
                          ) : undefined
                        }
                      >
                        <SimpleTable
                          headers={["ID", "Type", "Angle", "Width", "Orientation"]}
                          rows={(geologicalStructuresQuery.data?.data ?? []).map((g) => [
                            String(g.id),
                            g.structureType,
                            g.angle === null ? "-" : String(g.angle),
                            g.width === null ? "-" : String(g.width),
                            g.orientation ?? "-"
                          ])}
                          empty="No geological structures."
                        />
                      </Card>
                    ) : null}
                    {(recoveriesQuery.data?.data ?? []).length > 0 ? (
                      <Card
                        title="Recoveries"
                        description={`Core recovery metrics for interval #${intervalId}.`}
                        action={
                          canManage ? (
                            <AddBtn label="Add Recovery" onClick={() => setModal("recovery")} />
                          ) : undefined
                        }
                      >
                        <SimpleTable
                          headers={["ID", "Recovery %", "RQD %", "Core Loss", "Comments"]}
                          rows={(recoveriesQuery.data?.data ?? []).map((r) => [
                            String(r.id),
                            r.recoveryPercent === null ? "-" : String(r.recoveryPercent),
                            r.rqdPercent === null ? "-" : String(r.rqdPercent),
                            r.coreLoss === null ? "-" : String(r.coreLoss),
                            r.comments ?? "-"
                          ])}
                          empty="No recoveries."
                        />
                      </Card>
                    ) : null}
                    {(densitiesQuery.data?.data ?? []).length > 0 ? (
                      <Card
                        title="Densities"
                        description={`Density measurements for interval #${intervalId}.`}
                        action={
                          canManage ? (
                            <AddBtn label="Add Density" onClick={() => setModal("density")} />
                          ) : undefined
                        }
                      >
                        <SimpleTable
                          headers={[
                            "ID",
                            "Specific Gravity",
                            "Method",
                            "Dry Density",
                            "Wet Density"
                          ]}
                          rows={(densitiesQuery.data?.data ?? []).map((d) => [
                            String(d.id),
                            String(d.specificGravity),
                            d.method ?? "-",
                            d.dryDensity === null ? "-" : String(d.dryDensity),
                            d.wetDensity === null ? "-" : String(d.wetDensity)
                          ])}
                          empty="No densities."
                        />
                      </Card>
                    ) : null}
                    {(magneticSusceptibilitiesQuery.data?.data ?? []).length > 0 ? (
                      <Card
                        title="Magnetic Susceptibilities"
                        description={`Magnetic susceptibility readings for interval #${intervalId}.`}
                        action={
                          canManage ? (
                            <AddBtn
                              label="Add Magnetic"
                              onClick={() => setModal("magneticSusceptibility")}
                            />
                          ) : undefined
                        }
                      >
                        <SimpleTable
                          headers={["ID", "Value", "Unit", "Instrument", "Comments"]}
                          rows={(magneticSusceptibilitiesQuery.data?.data ?? []).map((m) => [
                            String(m.id),
                            String(m.value),
                            m.unit ?? "-",
                            m.instrument ?? "-",
                            m.comments ?? "-"
                          ])}
                          empty="No magnetic susceptibilities."
                        />
                      </Card>
                    ) : null}
                  </div>
                </Card>
              </div>
            ) : null}

            {drillHoleId && intervalId && assayId ? (
              <div ref={qaqcRef}>
                {/* <Card
                  title="QAQC"
                  description={`Quality control records for assay #${assayId}.`}
                  action={
                    canManage ? (
                      <AddBtn label="Add QAQC" onClick={() => setModal("qaqc")} />
                    ) : undefined
                  }
                >
                  <div className="mb-3 text-xs text-[var(--color-on-surface-variant)]">
                    You are viewing QAQC records for the selected assay.
                  </div>
                  <SimpleTable
                    headers={["ID", "Type", "Passed", "Notes"]}
                    rows={(qaqcQuery.data?.data ?? []).map((q) => [
                      String(q.id),
                      q.type,
                      q.passed ? "Yes" : "No",
                      q.notes ?? "-"
                    ])}
                    empty="No QAQC records."
                  />
                </Card> */}
                <div className="mt-3" />
                <Card
                  title="Assay Values"
                  description={`Element values reported for assay #${assayId}.`}
                  action={
                    canManage ? (
                      <AddBtn label="Add Assay Value" onClick={() => setModal("assayValue")} />
                    ) : undefined
                  }
                >
                  <SimpleTable
                    headers={["ID", "Element", "Value", "Unit", "Detection Limit"]}
                    rows={(assayValuesQuery.data?.data ?? []).map((v) => [
                      String(v.id),
                      v.element,
                      String(v.value),
                      v.unit ?? "-",
                      v.detectionLimit === null ? "-" : String(v.detectionLimit)
                    ])}
                    empty="No assay values."
                  />
                </Card>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {canManage && modal ? (
        <CreateModal
          type={modal}
          context={{ projectId, zoneId, drillHoleId, intervalId, assayId }}
          drillHoles={drillHolesQuery.data?.data ?? []}
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

function Card({
  title,
  description,
  action,
  children
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold">{title}</h2>
          {description ? (
            <p className="text-xs text-[var(--color-on-surface-variant)]">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </article>
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

function SimpleTable({
  headers,
  rows,
  empty
}: {
  headers: string[];
  rows: Array<Array<string | React.ReactNode>>;
  empty: string;
}) {
  return (
    <div className="table-scroll overflow-x-auto rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] shadow-sm">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr>
            {headers.map((header) => (
              <th
                key={header}
                className="bg-[var(--color-surface-container-highest)] px-3 py-2 text-xs font-bold uppercase tracking-wide text-[var(--color-on-surface-variant)]"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row, idx) => (
              <tr
                key={idx}
                className={`border-t border-[var(--color-border-soft)] transition hover:bg-[var(--color-surface-container-highest)] ${idx % 2 === 0 ? "bg-transparent" : "bg-[var(--color-surface-container)]/45"}`}
              >
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
