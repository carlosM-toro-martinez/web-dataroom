import { httpClient } from "@/shared/api/core/httpClient";
import { apiEndpoints } from "@/shared/api/endpoints";
import {
  alterationSchema,
  assaySchema,
  assayValueSchema,
  createAssayPayloadSchema,
  createAssayValuePayloadSchema,
  createAlterationPayloadSchema,
  createDensityPayloadSchema,
  createDrillHolePayloadSchema,
  createDrillHoleSurveyPayloadSchema,
  createGeologicalStructurePayloadSchema,
  createIntervalPayloadSchema,
  createLithologyPayloadSchema,
  createMagneticSusceptibilityPayloadSchema,
  createMineralizationPayloadSchema,
  createProjectPayloadSchema,
  createQaqcPayloadSchema,
  createRecoveryPayloadSchema,
  createResourcePayloadSchema,
  createSignificantInterceptPayloadSchema,
  createZonePayloadSchema,
  densitySchema,
  drillHoleSchema,
  drillHoleSurveySchema,
  geologicalStructureSchema,
  intervalSchema,
  lithologySchema,
  listMetaSchema,
  magneticSusceptibilitySchema,
  mineralizationSchema,
  projectSchema,
  qaqcSchema,
  recoverySchema,
  resourceSchema,
  significantInterceptSchema,
  updateAssayPayloadSchema,
  updateAssayValuePayloadSchema,
  updateAlterationPayloadSchema,
  updateDensityPayloadSchema,
  updateDrillHolePayloadSchema,
  updateDrillHoleSurveyPayloadSchema,
  updateGeologicalStructurePayloadSchema,
  updateIntervalPayloadSchema,
  updateLithologyPayloadSchema,
  updateMagneticSusceptibilityPayloadSchema,
  updateMineralizationPayloadSchema,
  updateProjectPayloadSchema,
  updateQaqcPayloadSchema,
  updateRecoveryPayloadSchema,
  updateResourcePayloadSchema,
  updateSignificantInterceptPayloadSchema,
  updateZonePayloadSchema,
  zoneSchema,
  type Alteration,
  type Assay,
  type AssayValue,
  type CreateAssayPayload,
  type CreateAssayValuePayload,
  type CreateAlterationPayload,
  type CreateDensityPayload,
  type CreateDrillHolePayload,
  type CreateDrillHoleSurveyPayload,
  type CreateGeologicalStructurePayload,
  type CreateIntervalPayload,
  type CreateLithologyPayload,
  type CreateMagneticSusceptibilityPayload,
  type CreateMineralizationPayload,
  type CreateProjectPayload,
  type CreateQaqcPayload,
  type CreateRecoveryPayload,
  type CreateResourcePayload,
  type CreateSignificantInterceptPayload,
  type CreateZonePayload,
  type Density,
  type DrillHole,
  type DrillHoleSurvey,
  type GeologicalStructure,
  type Interval,
  type Lithology,
  type MagneticSusceptibility,
  type Mineralization,
  type Project,
  type QAQC,
  type Recovery,
  type Resource,
  type SignificantIntercept,
  type UpdateAssayPayload,
  type UpdateAssayValuePayload,
  type UpdateAlterationPayload,
  type UpdateDensityPayload,
  type UpdateDrillHolePayload,
  type UpdateDrillHoleSurveyPayload,
  type UpdateGeologicalStructurePayload,
  type UpdateIntervalPayload,
  type UpdateLithologyPayload,
  type UpdateMagneticSusceptibilityPayload,
  type UpdateMineralizationPayload,
  type UpdateProjectPayload,
  type UpdateQaqcPayload,
  type UpdateRecoveryPayload,
  type UpdateResourcePayload,
  type UpdateSignificantInterceptPayload,
  type UpdateZonePayload,
  type Zone
} from "@/features/exploraciones/model/exploracionMinera.schema";

interface ListParams {
  search?: string;
  page?: number;
  limit?: number;
}

interface PaginatedResult<T> {
  data: T[];
  meta: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

interface MiningExcelImportPayload {
  file: File;
  projectName: string;
  defaultZoneName?: string;
}

function normalizeListResponse<T>(raw: unknown, parser: (value: unknown) => T): PaginatedResult<T> {
  const root = raw && typeof raw === "object" && "data" in raw ? (raw as { data: unknown }).data : raw;

  const candidates: unknown[] = [
    root,
    root && typeof root === "object" && "items" in root ? (root as { items?: unknown }).items : undefined,
    root && typeof root === "object" && "rows" in root ? (root as { rows?: unknown }).rows : undefined,
    root && typeof root === "object" && "data" in root ? (root as { data?: unknown }).data : undefined
  ];

  const listRaw = candidates.find((item) => Array.isArray(item));
  const list = Array.isArray(listRaw) ? listRaw.map(parser) : [];

  const metaSource = root && typeof root === "object" ? root : {};
  const meta = listMetaSchema
    .safeParse({
      total: (metaSource as Record<string, unknown>).total,
      page: (metaSource as Record<string, unknown>).page,
      limit: (metaSource as Record<string, unknown>).limit
    })
    .success
    ? listMetaSchema.parse({
        total: (metaSource as Record<string, unknown>).total,
        page: (metaSource as Record<string, unknown>).page,
        limit: (metaSource as Record<string, unknown>).limit
      })
    : {};

  return { data: list, meta };
}

function normalizeDetailResponse<T>(raw: unknown, parse: (value: unknown) => T): T {
  const root = raw && typeof raw === "object" && "data" in raw ? (raw as { data: unknown }).data : raw;
  return parse(root);
}

function buildParams(params?: { [key: string]: string | number | undefined }) {
  if (!params) return undefined;
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== "")
  );
  return Object.keys(clean).length ? clean : undefined;
}

export async function getProjects(params?: ListParams) {
  const response = await httpClient.get(apiEndpoints.exploraciones.projects, {
    params: buildParams(params as { [key: string]: string | number | undefined } | undefined)
  });
  return normalizeListResponse(response.data, (item) => projectSchema.parse(item));
}

export async function getProjectById(id: number) {
  const response = await httpClient.get(apiEndpoints.exploraciones.projectById(id));
  return normalizeDetailResponse(response.data, (item) => projectSchema.parse(item));
}

export async function createProject(payload: CreateProjectPayload) {
  const response = await httpClient.post(
    apiEndpoints.exploraciones.projects,
    createProjectPayloadSchema.parse(payload)
  );
  return normalizeDetailResponse(response.data, (item) => projectSchema.parse(item));
}

export async function updateProject(id: number, payload: UpdateProjectPayload) {
  const response = await httpClient.patch(
    apiEndpoints.exploraciones.projectById(id),
    updateProjectPayloadSchema.parse(payload)
  );
  return normalizeDetailResponse(response.data, (item) => projectSchema.parse(item));
}

export async function getZones(params: { projectId?: number; page?: number; limit?: number }) {
  const response = await httpClient.get(apiEndpoints.exploraciones.zones, {
    params: buildParams(params)
  });
  return normalizeListResponse(response.data, (item) => zoneSchema.parse(item));
}

export async function getZoneById(id: number) {
  const response = await httpClient.get(apiEndpoints.exploraciones.zoneById(id));
  return normalizeDetailResponse(response.data, (item) => zoneSchema.parse(item));
}

export async function createZone(payload: CreateZonePayload) {
  const response = await httpClient.post(
    apiEndpoints.exploraciones.zones,
    createZonePayloadSchema.parse(payload)
  );
  return normalizeDetailResponse(response.data, (item) => zoneSchema.parse(item));
}

export async function updateZone(id: number, payload: UpdateZonePayload) {
  const response = await httpClient.patch(
    apiEndpoints.exploraciones.zoneById(id),
    updateZonePayloadSchema.parse(payload)
  );
  return normalizeDetailResponse(response.data, (item) => zoneSchema.parse(item));
}

export async function getDrillHoles(params: { zoneId?: number; page?: number; limit?: number }) {
  const response = await httpClient.get(apiEndpoints.exploraciones.drillholes, {
    params: buildParams(params)
  });
  return normalizeListResponse(response.data, (item) => drillHoleSchema.parse(item));
}

export async function getDrillHoleById(id: number) {
  const response = await httpClient.get(apiEndpoints.exploraciones.drillholeById(id));
  return normalizeDetailResponse(response.data, (item) => drillHoleSchema.parse(item));
}

export async function createDrillHole(payload: CreateDrillHolePayload) {
  const response = await httpClient.post(
    apiEndpoints.exploraciones.drillholes,
    createDrillHolePayloadSchema.parse(payload)
  );
  return normalizeDetailResponse(response.data, (item) => drillHoleSchema.parse(item));
}

export async function updateDrillHole(id: number, payload: UpdateDrillHolePayload) {
  const response = await httpClient.patch(
    apiEndpoints.exploraciones.drillholeById(id),
    updateDrillHolePayloadSchema.parse(payload)
  );
  return normalizeDetailResponse(response.data, (item) => drillHoleSchema.parse(item));
}

export async function getIntervals(params: { drillHoleId?: number; page?: number; limit?: number }) {
  const response = await httpClient.get(apiEndpoints.exploraciones.intervals, {
    params: buildParams(params)
  });
  return normalizeListResponse(response.data, (item) => intervalSchema.parse(item));
}

export async function getIntervalById(id: number) {
  const response = await httpClient.get(apiEndpoints.exploraciones.intervalById(id));
  return normalizeDetailResponse(response.data, (item) => intervalSchema.parse(item));
}

export async function createInterval(payload: CreateIntervalPayload) {
  const response = await httpClient.post(
    apiEndpoints.exploraciones.intervals,
    createIntervalPayloadSchema.parse(payload)
  );
  return normalizeDetailResponse(response.data, (item) => intervalSchema.parse(item));
}

export async function updateInterval(id: number, payload: UpdateIntervalPayload) {
  const response = await httpClient.patch(
    apiEndpoints.exploraciones.intervalById(id),
    updateIntervalPayloadSchema.parse(payload)
  );
  return normalizeDetailResponse(response.data, (item) => intervalSchema.parse(item));
}

export async function getAssays(params: { intervalId?: number; page?: number; limit?: number }) {
  const response = await httpClient.get(apiEndpoints.exploraciones.assays, {
    params: buildParams(params)
  });
  return normalizeListResponse(response.data, (item) => assaySchema.parse(item));
}

export async function getAssayById(id: number) {
  const response = await httpClient.get(apiEndpoints.exploraciones.assayById(id));
  return normalizeDetailResponse(response.data, (item) => assaySchema.parse(item));
}

export async function createAssay(payload: CreateAssayPayload) {
  const response = await httpClient.post(
    apiEndpoints.exploraciones.assays,
    createAssayPayloadSchema.parse(payload)
  );
  return normalizeDetailResponse(response.data, (item) => assaySchema.parse(item));
}

export async function updateAssay(id: number, payload: UpdateAssayPayload) {
  const response = await httpClient.patch(
    apiEndpoints.exploraciones.assayById(id),
    updateAssayPayloadSchema.parse(payload)
  );
  return normalizeDetailResponse(response.data, (item) => assaySchema.parse(item));
}

export async function getLithologies(params: { intervalId?: number; page?: number; limit?: number }) {
  const response = await httpClient.get(apiEndpoints.exploraciones.lithologies, {
    params: buildParams(params)
  });
  return normalizeListResponse(response.data, (item) => lithologySchema.parse(item));
}

export async function getLithologyById(id: number) {
  const response = await httpClient.get(apiEndpoints.exploraciones.lithologyById(id));
  return normalizeDetailResponse(response.data, (item) => lithologySchema.parse(item));
}

export async function createLithology(payload: CreateLithologyPayload) {
  const response = await httpClient.post(
    apiEndpoints.exploraciones.lithologies,
    createLithologyPayloadSchema.parse(payload)
  );
  return normalizeDetailResponse(response.data, (item) => lithologySchema.parse(item));
}

export async function updateLithology(id: number, payload: UpdateLithologyPayload) {
  const response = await httpClient.patch(
    apiEndpoints.exploraciones.lithologyById(id),
    updateLithologyPayloadSchema.parse(payload)
  );
  return normalizeDetailResponse(response.data, (item) => lithologySchema.parse(item));
}

export async function getQaqc(params: { assayId?: number; page?: number; limit?: number }) {
  const response = await httpClient.get(apiEndpoints.exploraciones.qaqc, {
    params: buildParams(params)
  });
  return normalizeListResponse(response.data, (item) => qaqcSchema.parse(item));
}

export async function getQaqcById(id: number) {
  const response = await httpClient.get(apiEndpoints.exploraciones.qaqcById(id));
  return normalizeDetailResponse(response.data, (item) => qaqcSchema.parse(item));
}

export async function createQaqc(payload: CreateQaqcPayload) {
  const response = await httpClient.post(
    apiEndpoints.exploraciones.qaqc,
    createQaqcPayloadSchema.parse(payload)
  );
  return normalizeDetailResponse(response.data, (item) => qaqcSchema.parse(item));
}

export async function updateQaqc(id: number, payload: UpdateQaqcPayload) {
  const response = await httpClient.patch(
    apiEndpoints.exploraciones.qaqcById(id),
    updateQaqcPayloadSchema.parse(payload)
  );
  return normalizeDetailResponse(response.data, (item) => qaqcSchema.parse(item));
}

export async function getResources(params: { projectId?: number; page?: number; limit?: number }) {
  const response = await httpClient.get(apiEndpoints.exploraciones.resources, {
    params: buildParams(params)
  });
  return normalizeListResponse(response.data, (item) => resourceSchema.parse(item));
}

export async function getResourceById(id: number) {
  const response = await httpClient.get(apiEndpoints.exploraciones.resourceById(id));
  return normalizeDetailResponse(response.data, (item) => resourceSchema.parse(item));
}

export async function createResource(payload: CreateResourcePayload) {
  const response = await httpClient.post(
    apiEndpoints.exploraciones.resources,
    createResourcePayloadSchema.parse(payload)
  );
  return normalizeDetailResponse(response.data, (item) => resourceSchema.parse(item));
}

export async function updateResource(id: number, payload: UpdateResourcePayload) {
  const response = await httpClient.patch(
    apiEndpoints.exploraciones.resourceById(id),
    updateResourcePayloadSchema.parse(payload)
  );
  return normalizeDetailResponse(response.data, (item) => resourceSchema.parse(item));
}

export async function getDrillHoleSurveys(params: { drillHoleId?: number; page?: number; limit?: number }) {
  const response = await httpClient.get(apiEndpoints.exploraciones.drillHoleSurveys, {
    params: buildParams(params)
  });
  return normalizeListResponse(response.data, (item) => drillHoleSurveySchema.parse(item));
}

export async function createDrillHoleSurvey(payload: CreateDrillHoleSurveyPayload) {
  const response = await httpClient.post(
    apiEndpoints.exploraciones.drillHoleSurveys,
    createDrillHoleSurveyPayloadSchema.parse(payload)
  );
  return normalizeDetailResponse(response.data, (item) => drillHoleSurveySchema.parse(item));
}

export async function updateDrillHoleSurvey(id: number, payload: UpdateDrillHoleSurveyPayload) {
  const response = await httpClient.patch(
    apiEndpoints.exploraciones.drillHoleSurveyById(id),
    updateDrillHoleSurveyPayloadSchema.parse(payload)
  );
  return normalizeDetailResponse(response.data, (item) => drillHoleSurveySchema.parse(item));
}

export async function getAssayValues(params: {
  assayId?: number;
  element?: string;
  page?: number;
  limit?: number;
}) {
  const response = await httpClient.get(apiEndpoints.exploraciones.assayValues, {
    params: buildParams(params)
  });
  return normalizeListResponse(response.data, (item) => assayValueSchema.parse(item));
}

export async function createAssayValue(payload: CreateAssayValuePayload) {
  const response = await httpClient.post(
    apiEndpoints.exploraciones.assayValues,
    createAssayValuePayloadSchema.parse(payload)
  );
  return normalizeDetailResponse(response.data, (item) => assayValueSchema.parse(item));
}

export async function updateAssayValue(id: number, payload: UpdateAssayValuePayload) {
  const response = await httpClient.patch(
    apiEndpoints.exploraciones.assayValueById(id),
    updateAssayValuePayloadSchema.parse(payload)
  );
  return normalizeDetailResponse(response.data, (item) => assayValueSchema.parse(item));
}

export async function getAlterations(params: { intervalId?: number; page?: number; limit?: number }) {
  const response = await httpClient.get(apiEndpoints.exploraciones.alterations, {
    params: buildParams(params)
  });
  return normalizeListResponse(response.data, (item) => alterationSchema.parse(item));
}

export async function createAlteration(payload: CreateAlterationPayload) {
  const response = await httpClient.post(
    apiEndpoints.exploraciones.alterations,
    createAlterationPayloadSchema.parse(payload)
  );
  return normalizeDetailResponse(response.data, (item) => alterationSchema.parse(item));
}

export async function updateAlteration(id: number, payload: UpdateAlterationPayload) {
  const response = await httpClient.patch(
    apiEndpoints.exploraciones.alterationById(id),
    updateAlterationPayloadSchema.parse(payload)
  );
  return normalizeDetailResponse(response.data, (item) => alterationSchema.parse(item));
}

export async function getMineralizations(params: { intervalId?: number; page?: number; limit?: number }) {
  const response = await httpClient.get(apiEndpoints.exploraciones.mineralizations, {
    params: buildParams(params)
  });
  return normalizeListResponse(response.data, (item) => mineralizationSchema.parse(item));
}

export async function createMineralization(payload: CreateMineralizationPayload) {
  const response = await httpClient.post(
    apiEndpoints.exploraciones.mineralizations,
    createMineralizationPayloadSchema.parse(payload)
  );
  return normalizeDetailResponse(response.data, (item) => mineralizationSchema.parse(item));
}

export async function updateMineralization(id: number, payload: UpdateMineralizationPayload) {
  const response = await httpClient.patch(
    apiEndpoints.exploraciones.mineralizationById(id),
    updateMineralizationPayloadSchema.parse(payload)
  );
  return normalizeDetailResponse(response.data, (item) => mineralizationSchema.parse(item));
}

export async function getGeologicalStructures(params: {
  intervalId?: number;
  page?: number;
  limit?: number;
}) {
  const response = await httpClient.get(apiEndpoints.exploraciones.geologicalStructures, {
    params: buildParams(params)
  });
  return normalizeListResponse(response.data, (item) => geologicalStructureSchema.parse(item));
}

export async function createGeologicalStructure(payload: CreateGeologicalStructurePayload) {
  const response = await httpClient.post(
    apiEndpoints.exploraciones.geologicalStructures,
    createGeologicalStructurePayloadSchema.parse(payload)
  );
  return normalizeDetailResponse(response.data, (item) => geologicalStructureSchema.parse(item));
}

export async function updateGeologicalStructure(id: number, payload: UpdateGeologicalStructurePayload) {
  const response = await httpClient.patch(
    apiEndpoints.exploraciones.geologicalStructureById(id),
    updateGeologicalStructurePayloadSchema.parse(payload)
  );
  return normalizeDetailResponse(response.data, (item) => geologicalStructureSchema.parse(item));
}

export async function getRecoveries(params: { intervalId?: number; page?: number; limit?: number }) {
  const response = await httpClient.get(apiEndpoints.exploraciones.recoveries, {
    params: buildParams(params)
  });
  return normalizeListResponse(response.data, (item) => recoverySchema.parse(item));
}

export async function createRecovery(payload: CreateRecoveryPayload) {
  const response = await httpClient.post(
    apiEndpoints.exploraciones.recoveries,
    createRecoveryPayloadSchema.parse(payload)
  );
  return normalizeDetailResponse(response.data, (item) => recoverySchema.parse(item));
}

export async function updateRecovery(id: number, payload: UpdateRecoveryPayload) {
  const response = await httpClient.patch(
    apiEndpoints.exploraciones.recoveryById(id),
    updateRecoveryPayloadSchema.parse(payload)
  );
  return normalizeDetailResponse(response.data, (item) => recoverySchema.parse(item));
}

export async function getDensities(params: { intervalId?: number; page?: number; limit?: number }) {
  const response = await httpClient.get(apiEndpoints.exploraciones.densities, {
    params: buildParams(params)
  });
  return normalizeListResponse(response.data, (item) => densitySchema.parse(item));
}

export async function createDensity(payload: CreateDensityPayload) {
  const response = await httpClient.post(
    apiEndpoints.exploraciones.densities,
    createDensityPayloadSchema.parse(payload)
  );
  return normalizeDetailResponse(response.data, (item) => densitySchema.parse(item));
}

export async function updateDensity(id: number, payload: UpdateDensityPayload) {
  const response = await httpClient.patch(
    apiEndpoints.exploraciones.densityById(id),
    updateDensityPayloadSchema.parse(payload)
  );
  return normalizeDetailResponse(response.data, (item) => densitySchema.parse(item));
}

export async function getMagneticSusceptibilities(params: {
  intervalId?: number;
  page?: number;
  limit?: number;
}) {
  const response = await httpClient.get(apiEndpoints.exploraciones.magneticSusceptibilities, {
    params: buildParams(params)
  });
  return normalizeListResponse(response.data, (item) => magneticSusceptibilitySchema.parse(item));
}

export async function createMagneticSusceptibility(payload: CreateMagneticSusceptibilityPayload) {
  const response = await httpClient.post(
    apiEndpoints.exploraciones.magneticSusceptibilities,
    createMagneticSusceptibilityPayloadSchema.parse(payload)
  );
  return normalizeDetailResponse(response.data, (item) => magneticSusceptibilitySchema.parse(item));
}

export async function updateMagneticSusceptibility(
  id: number,
  payload: UpdateMagneticSusceptibilityPayload
) {
  const response = await httpClient.patch(
    apiEndpoints.exploraciones.magneticSusceptibilityById(id),
    updateMagneticSusceptibilityPayloadSchema.parse(payload)
  );
  return normalizeDetailResponse(response.data, (item) => magneticSusceptibilitySchema.parse(item));
}

function normalizeImportResponse(raw: unknown) {
  if (raw && typeof raw === "object" && "data" in raw) {
    const inner = (raw as { data?: unknown }).data;
    if (inner && typeof inner === "object") return inner as Record<string, unknown>;
  }
  return (raw ?? {}) as Record<string, unknown>;
}

export async function validateMiningExcelImport(payload: MiningExcelImportPayload) {
  const formData = new FormData();
  formData.append("file", payload.file);
  formData.append("projectName", payload.projectName);
  if (payload.defaultZoneName) formData.append("defaultZoneName", payload.defaultZoneName);

  const response = await httpClient.post(apiEndpoints.exploraciones.miningExcelValidate, formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  return normalizeImportResponse(response.data);
}

export async function executeMiningExcelImport(payload: MiningExcelImportPayload) {
  const formData = new FormData();
  formData.append("file", payload.file);
  formData.append("projectName", payload.projectName);
  if (payload.defaultZoneName) formData.append("defaultZoneName", payload.defaultZoneName);

  const response = await httpClient.post(apiEndpoints.exploraciones.miningExcelExecute, formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  return normalizeImportResponse(response.data);
}

export async function getSignificantIntercepts(params: {
  drillHoleId?: number;
  zoneId?: number;
  page?: number;
  limit?: number;
}) {
  const response = await httpClient.get(apiEndpoints.exploraciones.significantIntercepts, {
    params: buildParams(params)
  });
  return normalizeListResponse(response.data, (item) => significantInterceptSchema.parse(item));
}

export async function getSignificantInterceptById(id: number) {
  const response = await httpClient.get(apiEndpoints.exploraciones.significantInterceptById(id));
  return normalizeDetailResponse(response.data, (item) => significantInterceptSchema.parse(item));
}

export async function createSignificantIntercept(payload: CreateSignificantInterceptPayload) {
  const response = await httpClient.post(
    apiEndpoints.exploraciones.significantIntercepts,
    createSignificantInterceptPayloadSchema.parse(payload)
  );
  return normalizeDetailResponse(response.data, (item) => significantInterceptSchema.parse(item));
}

export async function updateSignificantIntercept(
  id: number,
  payload: UpdateSignificantInterceptPayload
) {
  const response = await httpClient.patch(
    apiEndpoints.exploraciones.significantInterceptById(id),
    updateSignificantInterceptPayloadSchema.parse(payload)
  );
  return normalizeDetailResponse(response.data, (item) => significantInterceptSchema.parse(item));
}

export interface ExplorationHierarchy {
  projects: Project[];
  zones: Zone[];
  drillHoles: DrillHole[];
  intervals: Interval[];
  assays: Assay[];
  lithologies: Lithology[];
  qaqc: QAQC[];
  resources: Resource[];
  drillHoleSurveys: DrillHoleSurvey[];
  assayValues: AssayValue[];
  alterations: Alteration[];
  mineralizations: Mineralization[];
  geologicalStructures: GeologicalStructure[];
  recoveries: Recovery[];
  densities: Density[];
  magneticSusceptibilities: MagneticSusceptibility[];
  significantIntercepts: SignificantIntercept[];
}

export async function getExplorationHierarchy(params?: { search?: string; page?: number; limit?: number }) {
  const projects = await getProjects(params);
  const projectIds = projects.data.map((p) => p.id);

  const safe = async <T>(task: () => Promise<T>, fallback: T): Promise<T> => {
    try {
      return await task();
    } catch {
      return fallback;
    }
  };

  const zonesByProject = await Promise.all(
    projectIds.map((projectId) =>
      safe(() => getZones({ projectId, page: 1, limit: 100 }), { data: [], meta: {} })
    )
  );
  const zones = zonesByProject.flatMap((result) => result.data);

  const resourcesByProject = await Promise.all(
    projectIds.map((projectId) =>
      safe(() => getResources({ projectId, page: 1, limit: 100 }), { data: [], meta: {} })
    )
  );
  const resources = resourcesByProject.flatMap((result) => result.data);

  const zoneIds = zones.map((z) => z.id);
  const drillHolesByZone = await Promise.all(
    zoneIds.map((zoneId) =>
      safe(() => getDrillHoles({ zoneId, page: 1, limit: 100 }), { data: [], meta: {} })
    )
  );
  const drillHoles = drillHolesByZone.flatMap((result) => result.data);

  const drillHoleIds = drillHoles.map((d) => d.id);
  const intervalsByDrillHole = await Promise.all(
    drillHoleIds.map((drillHoleId) =>
      safe(() => getIntervals({ drillHoleId, page: 1, limit: 100 }), { data: [], meta: {} })
    )
  );
  const intervals = intervalsByDrillHole.flatMap((result) => result.data);

  const intervalIds = intervals.map((i) => i.id);
  const assaysByInterval = await Promise.all(
    intervalIds.map((intervalId) =>
      safe(() => getAssays({ intervalId, page: 1, limit: 100 }), { data: [], meta: {} })
    )
  );
  const lithologiesByInterval = await Promise.all(
    intervalIds.map((intervalId) =>
      safe(() => getLithologies({ intervalId, page: 1, limit: 100 }), { data: [], meta: {} })
    )
  );
  const assays = assaysByInterval.flatMap((result) => result.data);
  const lithologies = lithologiesByInterval.flatMap((result) => result.data);

  const alterationsByInterval = await Promise.all(
    intervalIds.map((intervalId) =>
      safe(() => getAlterations({ intervalId, page: 1, limit: 100 }), { data: [], meta: {} })
    )
  );
  const mineralizationsByInterval = await Promise.all(
    intervalIds.map((intervalId) =>
      safe(() => getMineralizations({ intervalId, page: 1, limit: 100 }), { data: [], meta: {} })
    )
  );
  const geologicalStructuresByInterval = await Promise.all(
    intervalIds.map((intervalId) =>
      safe(() => getGeologicalStructures({ intervalId, page: 1, limit: 100 }), { data: [], meta: {} })
    )
  );
  const recoveriesByInterval = await Promise.all(
    intervalIds.map((intervalId) =>
      safe(() => getRecoveries({ intervalId, page: 1, limit: 100 }), { data: [], meta: {} })
    )
  );
  const densitiesByInterval = await Promise.all(
    intervalIds.map((intervalId) =>
      safe(() => getDensities({ intervalId, page: 1, limit: 100 }), { data: [], meta: {} })
    )
  );
  const magneticSusceptibilitiesByInterval = await Promise.all(
    intervalIds.map((intervalId) =>
      safe(() => getMagneticSusceptibilities({ intervalId, page: 1, limit: 100 }), { data: [], meta: {} })
    )
  );
  const alterations = alterationsByInterval.flatMap((result) => result.data);
  const mineralizations = mineralizationsByInterval.flatMap((result) => result.data);
  const geologicalStructures = geologicalStructuresByInterval.flatMap((result) => result.data);
  const recoveries = recoveriesByInterval.flatMap((result) => result.data);
  const densities = densitiesByInterval.flatMap((result) => result.data);
  const magneticSusceptibilities = magneticSusceptibilitiesByInterval.flatMap((result) => result.data);

  const assayIds = assays.map((a) => a.id);
  const qaqcByAssay = await Promise.all(
    assayIds.map((assayId) =>
      safe(() => getQaqc({ assayId, page: 1, limit: 100 }), { data: [], meta: {} })
    )
  );
  const qaqc = qaqcByAssay.flatMap((result) => result.data);
  const assayValuesByAssay = await Promise.all(
    assayIds.map((assayId) =>
      safe(() => getAssayValues({ assayId, page: 1, limit: 100 }), { data: [], meta: {} })
    )
  );
  const assayValues = assayValuesByAssay.flatMap((result) => result.data);

  const drillHoleSurveysByDrillHole = await Promise.all(
    drillHoleIds.map((drillHoleId) =>
      safe(() => getDrillHoleSurveys({ drillHoleId, page: 1, limit: 100 }), { data: [], meta: {} })
    )
  );
  const drillHoleSurveys = drillHoleSurveysByDrillHole.flatMap((result) => result.data);
  const significantInterceptsByDrillHole = await Promise.all(
    drillHoleIds.map((drillHoleId) =>
      safe(() => getSignificantIntercepts({ drillHoleId, page: 1, limit: 100 }), { data: [], meta: {} })
    )
  );
  const significantIntercepts = significantInterceptsByDrillHole.flatMap((result) => result.data);

  return {
    projects: projects.data,
    zones,
    drillHoles,
    intervals,
    assays,
    lithologies,
    qaqc,
    resources,
    drillHoleSurveys,
    assayValues,
    alterations,
    mineralizations,
    geologicalStructures,
    recoveries,
    densities,
    magneticSusceptibilities,
    significantIntercepts
  };
}
