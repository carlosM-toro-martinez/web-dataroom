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
    plannedDepth: optionalNumber,
    finalDepth: optionalNumber,
    startedAt: optionalText,
    finishedAt: optionalText,
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
    observations: optionalText
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

export const DRILLING_HOLE_STATUS_LABELS: Record<z.infer<typeof drillingHoleStatusSchema>, string> = {
  PLANNED: "Planificado",
  DRILLING: "En perforación",
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
