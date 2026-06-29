import { z } from "zod";

const optionalText = z.string().nullable().optional();
const optionalDate = z.string().nullable().optional();
const optionalNumber = z.coerce.number().nullable().optional();

export const laboratorySlotSchema = z.enum(["L1", "L2", "L3"]);
export const samplePrioritySchema = z.enum(["URGENT", "HIGH", "NORMAL", "LOW"]);

export const elementSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    symbol: z.string(),
    defaultUnit: optionalText,
    description: optionalText
  })
  .passthrough();

export const catalogItemSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    abbreviation: optionalText,
    description: optionalText
  })
  .passthrough();

export const interiorAreaSchema = catalogItemSchema.extend({
  levels: z.array(z.unknown()).optional()
});

export const interiorLevelSchema = catalogItemSchema.extend({
  interiorAreaId: z.string(),
  elevation: optionalNumber,
  codeStart: optionalNumber,
  area: catalogItemSchema.optional()
});

export const interiorLaborSchema = catalogItemSchema.extend({
  interiorLevelId: z.string(),
  level: interiorLevelSchema.optional()
});

export const sampleResultSchema = z
  .object({
    id: z.string().optional(),
    elementId: z.string().optional(),
    value: optionalNumber,
    unit: optionalText,
    qualifier: optionalText,
    comments: optionalText,
    element: elementSchema.optional(),
    laboratory: catalogItemSchema.optional(),
    surfaceLaboratoryId: z.string().nullable().optional()
  })
  .passthrough();

export const createdBySchema = z
  .object({
    id: z.number().or(z.string()),
    nombre: z.string().optional(),
    email: z.string().optional()
  })
  .passthrough();

export const sampleLabAssignmentSchema = z
  .object({
    id: z.string().optional(),
    slot: laboratorySlotSchema.nullable().optional(),
    interiorLaboratoryId: z.string().nullable().optional(),
    surfaceLaboratoryId: z.string().nullable().optional(),
    laboratory: catalogItemSchema.optional(),
    results: z.array(sampleResultSchema).optional().default([])
  })
  .passthrough();

export const interiorSampleSchema = z
  .object({
    id: z.string(),
    code: z.string(),
    name: optionalText,
    sequentialNumber: z.number().nullable().optional(),
    voucherNumber: z.number().nullable().optional(),
    priority: samplePrioritySchema.optional().default("NORMAL"),
    east: optionalNumber,
    north: optionalNumber,
    elevation: optionalNumber,
    sampledAt: optionalDate,
    labor: interiorLaborSchema.optional(),
    objective: catalogItemSchema.optional(),
    createdBy: createdBySchema.optional(),
    labAssignments: z.array(sampleLabAssignmentSchema).optional().default([]),
    results: z.array(sampleResultSchema).optional().default([]),
    createdAt: optionalDate
  })
  .passthrough();

export const surfaceAreaSchema = catalogItemSchema.extend({
  _count: z.unknown().optional()
});

export const surfaceSampleSchema = z
  .object({
    id: z.string(),
    code: z.string(),
    name: optionalText,
    sequentialNumber: z.number().nullable().optional(),
    voucherNumber: z.number().nullable().optional(),
    priority: samplePrioritySchema.optional().default("NORMAL"),
    east: optionalNumber,
    north: optionalNumber,
    elevation: optionalNumber,
    sampledAt: optionalDate,
    area: surfaceAreaSchema.optional(),
    objective: catalogItemSchema.optional(),
    createdBy: createdBySchema.optional(),
    labAssignments: z.array(sampleLabAssignmentSchema).optional().default([]),
    results: z.array(sampleResultSchema).optional().default([]),
    createdAt: optionalDate
  })
  .passthrough();

export type LaboratorySlot = z.infer<typeof laboratorySlotSchema>;
export type SamplePriority = z.infer<typeof samplePrioritySchema>;
export type ElementCatalogItem = z.infer<typeof elementSchema>;
export type CatalogItem = z.infer<typeof catalogItemSchema>;
export type SampleLabAssignment = z.infer<typeof sampleLabAssignmentSchema>;
export type InteriorArea = z.infer<typeof interiorAreaSchema>;
export type InteriorLevel = z.infer<typeof interiorLevelSchema>;
export type InteriorLabor = z.infer<typeof interiorLaborSchema>;
export type InteriorSample = z.infer<typeof interiorSampleSchema>;
export type SurfaceArea = z.infer<typeof surfaceAreaSchema>;
export type SurfaceSample = z.infer<typeof surfaceSampleSchema>;

export interface SampleResultPayload {
  elementId: string;
  value?: number;
  unit?: string;
  qualifier?: string;
  comments?: string;
  surfaceLaboratoryId?: string;
}

export interface InteriorLabAssignmentPayload {
  slot: LaboratorySlot;
  interiorLaboratoryId?: string;
  laboratory?: { name: string; abbreviation?: string; description?: string };
  results?: SampleResultPayload[];
}

export interface SurfaceLabAssignmentPayload {
  surfaceLaboratoryId?: string;
  laboratory?: { name: string; abbreviation?: string; description?: string };
  results?: SampleResultPayload[];
}

export interface InteriorSampleWithResultsPayload {
  interiorLaborId: string;
  interiorObjectiveId: string;
  name?: string;
  priority?: SamplePriority;
  voucherNumber?: number;
  east?: number;
  north?: number;
  elevation?: number;
  sampledAt?: string;
  labAssignments?: InteriorLabAssignmentPayload[];
}

export interface SurfaceSampleWithResultsPayload {
  surfaceAreaId: string;
  surfaceObjectiveId: string;
  name?: string;
  priority?: SamplePriority;
  voucherNumber?: number;
  east?: number;
  north?: number;
  elevation?: number;
  sampledAt?: string;
  labAssignments?: SurfaceLabAssignmentPayload[];
}
