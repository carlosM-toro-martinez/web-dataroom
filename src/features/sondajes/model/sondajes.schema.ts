import { z } from "zod";

// ─── Sondajes: modelos del frontend (espejo de /api/drilling) ────────────────

export const drillingCampaignStatusSchema = z.enum(["PLANNED", "ACTIVE", "CLOSED"]);
export const drillingHoleStatusSchema = z.enum(["PLANNED", "DRILLING", "PAUSED", "COMPLETED", "ABANDONED"]);
export const drillingHoleTypeSchema = z.enum(["DDH", "RC", "AC", "OTHER"]);
export const drillingLocationTypeSchema = z.enum(["SURFACE", "UNDERGROUND"]);
export const drillingShiftSchema = z.enum(["DAY", "NIGHT"]);
export const drillingSampleTypeSchema = z.enum([
  "CORE_WHOLE",
  "CORE_HALF",
  "CORE_QUARTER",
  "CHIPS",
  "DUPLICATE",
  "STANDARD",
  "BLANK"
]);
export const drillingCategorySchema = z.enum(["EXPLORATION", "PRODUCTION"]);
export const drillingSampleStatusSchema = z.enum(["REGISTERED", "DISPATCHED", "COMPLETED"]);

const optionalText = z.string().nullable().optional();
const optionalNumber = z.number().nullable().optional();

export const drillingCatalogSchema = z
  .object({
    id: z.string(),
    name: z.string().optional(),
    code: z.string().optional(),
    abbreviation: optionalText,
    description: optionalText,
    active: z.boolean().optional()
  })
  .passthrough();

export const drillingCampaignSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    code: z.string(),
    area: optionalText,
    category: drillingCategorySchema,
    status: drillingCampaignStatusSchema,
    objective: optionalText,
    plannedMeters: optionalNumber,
    startDate: optionalText,
    endDate: optionalText,
    description: optionalText
  })
  .passthrough();

export const drillingHoleSchema = z
  .object({
    id: z.string(),
    campaignId: z.string(),
    code: z.string(),
    type: drillingHoleTypeSchema,
    status: drillingHoleStatusSchema,
    locationType: drillingLocationTypeSchema,
    sector: optionalText,
    target: optionalText,
    rigId: optionalText,
    contractorId: optionalText,
    plannedEast: optionalNumber,
    plannedNorth: optionalNumber,
    plannedElevation: optionalNumber,
    plannedAzimuth: optionalNumber,
    plannedDip: optionalNumber,
    plannedDepth: optionalNumber,
    east: optionalNumber,
    north: optionalNumber,
    elevation: optionalNumber,
    azimuth: optionalNumber,
    dip: optionalNumber,
    finalDepth: optionalNumber,
    startedAt: optionalText,
    finishedAt: optionalText,
    notes: optionalText,
    createdAt: optionalText,
    updatedAt: optionalText,
    drilledMeters: optionalNumber,
    currentDepth: optionalNumber
  })
  .passthrough();

export const drillingShiftReportSchema = z
  .object({
    id: z.string(),
    holeId: z.string(),
    date: z.string(),
    shift: drillingShiftSchema,
    fromDepth: z.number(),
    toDepth: z.number(),
    metersDrilled: z.number(),
    drillingHours: optionalNumber,
    standbyHours: optionalNumber,
    diameter: optionalText,
    operator: optionalText,
    observations: optionalText,
    reportNumber: optionalText,
    coreRecovery: optionalNumber,
    waterReturn: optionalText,
    rockType: optionalText,
    rigName: optionalText,
    coreBoxNumber: optionalText,
    drillingMethod: z.enum(["DIAMOND", "REVERSE_AIR"]).nullable().optional(),
    rcDiameter: optionalText,
    casing: optionalText,
    crownNumber: optionalText,
    reamerNumber: optionalText,
    shoeNumber: optionalText,
    firstHelper: optionalText,
    secondHelper: optionalText,
    driver: optionalText,
    supervisor: optionalText,
    drillingChief: optionalText,
    activities: z.array(z.record(z.string(), z.unknown())).nullable().optional(),
    consumables: z.record(z.string(), z.unknown()).nullable().optional(),
    additives: z.record(z.string(), z.unknown()).nullable().optional(),
    timeDetail: z.record(z.string(), z.unknown()).nullable().optional(),
    incidents: z.array(z.record(z.string(), z.unknown())).nullable().optional(),
    reviewStatus: z.enum(["PENDING", "REVIEWED"]).optional(),
    reviewedBy: optionalText,
    reviewedAt: optionalText,
    reviewNotes: optionalText,
    createdAt: optionalText,
    updatedAt: optionalText
  })
  .passthrough();

export const drillingSampleSchema = z
  .object({
    id: z.string(),
    holeId: z.string(),
    code: z.string(),
    fromDepth: z.number(),
    toDepth: z.number(),
    type: drillingSampleTypeSchema,
    status: drillingSampleStatusSchema
  })
  .passthrough();

export const drillingDispatchSchema = z
  .object({
    id: z.string(),
    folio: z.number(),
    laboratoryId: z.string(),
    sentAt: z.string(),
    status: z.enum(["PENDING", "COMPLETED"]),
    items: z.array(z.object({ id: z.string(), sampleId: z.string() }).passthrough()).optional().default([])
  })
  .passthrough();

export const drillingSummarySchema = z.object({
  campaigns: z.number(),
  holes: z.record(z.string(), z.number()),
  drilledMeters: z.number(),
  samples: z.number()
});

export type DrillingCatalog = z.infer<typeof drillingCatalogSchema>;
export type DrillingCampaign = z.infer<typeof drillingCampaignSchema>;
export type DrillingHole = z.infer<typeof drillingHoleSchema>;
export type DrillingShiftReport = z.infer<typeof drillingShiftReportSchema>;
export type DrillingSample = z.infer<typeof drillingSampleSchema>;
export type DrillingDispatch = z.infer<typeof drillingDispatchSchema>;
export type DrillingSummary = z.infer<typeof drillingSummarySchema>;

export type DrillingHoleStatus = z.infer<typeof drillingHoleStatusSchema>;
export type DrillingHoleType = z.infer<typeof drillingHoleTypeSchema>;
export type DrillingCategory = z.infer<typeof drillingCategorySchema>;

export const DRILLING_HOLE_STATUSES = drillingHoleStatusSchema.options;

// Mismos términos que el programa de perforación en Excel ("Proyectado", "Proceso").
export const DRILLING_HOLE_STATUS_LABELS: Record<DrillingHoleStatus, string> = {
  PLANNED: "Proyectado",
  DRILLING: "En proceso",
  PAUSED: "Pausado",
  COMPLETED: "Terminado",
  ABANDONED: "Abandonado"
};

export const DRILLING_CAMPAIGN_STATUS_LABELS: Record<z.infer<typeof drillingCampaignStatusSchema>, string> = {
  PLANNED: "Planificada",
  ACTIVE: "Activa",
  CLOSED: "Cerrada"
};

export const DRILLING_SAMPLE_TYPE_LABELS: Record<z.infer<typeof drillingSampleTypeSchema>, string> = {
  CORE_WHOLE: "Testigo entero",
  CORE_HALF: "Medio testigo",
  CORE_QUARTER: "Cuarto de testigo",
  CHIPS: "Detritos (RC)",
  DUPLICATE: "Duplicado",
  STANDARD: "Estándar",
  BLANK: "Blanco"
};
