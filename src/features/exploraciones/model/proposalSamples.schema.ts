import { z } from "zod";

const optionalText = z.string().nullable().optional();
const optionalDate = z.string().nullable().optional();
const optionalNumber = z.coerce.number().nullable().optional();
const emptyHierarchyStatusCounts = { registered: 0, dispatched: 0, completed: 0, total: 0 };
const emptyHierarchySampleCounts = {
  exploration: emptyHierarchyStatusCounts,
  production: emptyHierarchyStatusCounts,
  total: 0
};

export const laboratorySlotSchema = z.enum(["L1", "L2", "L3"]);
export const samplePrioritySchema = z.enum(["URGENT", "HIGH", "NORMAL", "LOW"]);
export const sampleCategorySchema = z.enum(["EXPLORATION", "PRODUCTION"]);
export const sampleStatusSchema = z.enum(["REGISTERED", "DISPATCHED", "COMPLETED"]);
export const dispatchStatusSchema = z.enum(["PENDING", "COMPLETED"]);

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
  category: sampleCategorySchema.optional(),
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

export const surfaceLevelSchema = catalogItemSchema.extend({
  surfaceAreaId: z.string(),
  elevation: optionalNumber,
  codeStart: optionalNumber,
  area: catalogItemSchema.optional()
});

export const surfaceLaborSchema = catalogItemSchema.extend({
  surfaceLevelId: z.string(),
  level: surfaceLevelSchema.optional()
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
    voucherCode: optionalText,
    category: sampleCategorySchema.optional().default("EXPLORATION"),
    status: sampleStatusSchema.optional().default("REGISTERED"),
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
  category: sampleCategorySchema.optional(),
  _count: z.unknown().optional(),
  levels: z.array(z.unknown()).optional()
});

export const surfaceSampleSchema = z
  .object({
    id: z.string(),
    code: z.string(),
    name: optionalText,
    sequentialNumber: z.number().nullable().optional(),
    voucherNumber: z.number().nullable().optional(),
    voucherCode: optionalText,
    category: sampleCategorySchema.optional().default("EXPLORATION"),
    status: sampleStatusSchema.optional().default("REGISTERED"),
    priority: samplePrioritySchema.optional().default("NORMAL"),
    east: optionalNumber,
    north: optionalNumber,
    elevation: optionalNumber,
    sampledAt: optionalDate,
    labor: surfaceLaborSchema.optional(),
    objective: catalogItemSchema.optional(),
    createdBy: createdBySchema.optional(),
    labAssignments: z.array(sampleLabAssignmentSchema).optional().default([]),
    results: z.array(sampleResultSchema).optional().default([]),
    createdAt: optionalDate
  })
  .passthrough();

const dispatchSampleSummarySchema = z
  .object({
    id: z.string(),
    code: z.string(),
    name: optionalText,
    status: sampleStatusSchema.optional().default("REGISTERED"),
    category: sampleCategorySchema.optional().default("EXPLORATION")
  })
  .passthrough();

export const dispatchRequestedElementSchema = z
  .object({
    id: z.string().optional(),
    elementId: z.string(),
    element: elementSchema.optional()
  })
  .passthrough();

export const dispatchItemSchema = z
  .object({
    id: z.string(),
    dispatchId: z.string().optional(),
    interiorSampleId: z.string().nullable().optional(),
    surfaceSampleId: z.string().nullable().optional(),
    status: dispatchStatusSchema.optional().default("PENDING"),
    notes: optionalText,
    sample: dispatchSampleSummarySchema.optional(),
    requestedElements: z.array(dispatchRequestedElementSchema).optional().default([])
  })
  .passthrough();

export const sampleDispatchSchema = z
  .object({
    id: z.string(),
    interiorLaboratoryId: z.string().nullable().optional(),
    surfaceLaboratoryId: z.string().nullable().optional(),
    projectName: optionalText,
    sentAt: z.string(),
    notes: optionalText,
    status: dispatchStatusSchema.optional().default("PENDING"),
    createdAt: optionalDate,
    updatedAt: optionalDate,
    laboratory: catalogItemSchema.optional(),
    createdBy: createdBySchema.optional(),
    items: z.array(dispatchItemSchema).optional().default([])
  })
  .passthrough();

export const hierarchyStatusCountsSchema = z
  .object({
    registered: z.number().optional().default(0),
    dispatched: z.number().optional().default(0),
    completed: z.number().optional().default(0),
    total: z.number().optional().default(0)
  })
  .passthrough();

export const hierarchySampleCountsSchema = z
  .object({
    exploration: hierarchyStatusCountsSchema.optional().default(emptyHierarchyStatusCounts),
    production: hierarchyStatusCountsSchema.optional().default(emptyHierarchyStatusCounts),
    total: z.number().optional().default(0)
  })
  .passthrough();

export const interiorHierarchyLaborSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    abbreviation: optionalText,
    description: optionalText,
    samples: hierarchySampleCountsSchema.optional().default(emptyHierarchySampleCounts)
  })
  .passthrough();

export const interiorHierarchyLevelSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    abbreviation: optionalText,
    elevation: z.number().nullable().optional(),
    description: optionalText,
    samples: hierarchySampleCountsSchema.optional().default(emptyHierarchySampleCounts),
    labors: z.array(interiorHierarchyLaborSchema).optional().default([])
  })
  .passthrough();

export const interiorHierarchyAreaSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    abbreviation: optionalText,
    category: sampleCategorySchema.optional(),
    description: optionalText,
    samples: hierarchySampleCountsSchema.optional().default(emptyHierarchySampleCounts),
    levels: z.array(interiorHierarchyLevelSchema).optional().default([])
  })
  .passthrough();

export const surfaceHierarchyAreaSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    abbreviation: optionalText,
    category: sampleCategorySchema.optional(),
    description: optionalText,
    samples: hierarchySampleCountsSchema.optional().default(emptyHierarchySampleCounts),
    levels: z.array(interiorHierarchyLevelSchema).optional().default([])
  })
  .passthrough();

export type LaboratorySlot = z.infer<typeof laboratorySlotSchema>;
export type SamplePriority = z.infer<typeof samplePrioritySchema>;
export type SampleCategory = z.infer<typeof sampleCategorySchema>;
export type SampleStatus = z.infer<typeof sampleStatusSchema>;
export type DispatchStatus = z.infer<typeof dispatchStatusSchema>;
export type ElementCatalogItem = z.infer<typeof elementSchema>;
export type CatalogItem = z.infer<typeof catalogItemSchema>;
export type SampleLabAssignment = z.infer<typeof sampleLabAssignmentSchema>;
export type SampleDispatch = z.infer<typeof sampleDispatchSchema>;
export type DispatchItem = z.infer<typeof dispatchItemSchema>;
export type HierarchySampleCounts = z.infer<typeof hierarchySampleCountsSchema>;
export type InteriorHierarchyArea = z.infer<typeof interiorHierarchyAreaSchema>;
export type SurfaceHierarchyArea = z.infer<typeof surfaceHierarchyAreaSchema>;
export type InteriorArea = z.infer<typeof interiorAreaSchema>;
export type InteriorLevel = z.infer<typeof interiorLevelSchema>;
export type InteriorLabor = z.infer<typeof interiorLaborSchema>;
export type InteriorSample = z.infer<typeof interiorSampleSchema>;
export type SurfaceArea = z.infer<typeof surfaceAreaSchema>;
export type SurfaceLevel = z.infer<typeof surfaceLevelSchema>;
export type SurfaceLabor = z.infer<typeof surfaceLaborSchema>;
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
  category?: SampleCategory;
  name?: string;
  priority?: SamplePriority;
  voucherNumber?: number;
  east?: number;
  north?: number;
  elevation?: number;
  sampledAt?: string;
  labAssignments?: InteriorLabAssignmentPayload[];
}

export interface DispatchItemPayload {
  sampleId: string;
  elementIds: string[];
  notes?: string;
}

export interface CreateDispatchPayload {
  laboratoryId: string;
  projectName?: string;
  sentAt: string;
  notes?: string;
  items: DispatchItemPayload[];
}

export interface UpdateDispatchPayload {
  projectName?: string;
  sentAt?: string;
  notes?: string;
  status?: DispatchStatus;
}

export interface CreateSampleResultPayload {
  sampleId: string;
  elementId: string;
  value?: number;
  qualifier?: string;
  unit?: string;
  comments?: string;
  laboratoryId?: string;
}

export interface SurfaceSampleWithResultsPayload {
  surfaceLaborId: string;
  surfaceObjectiveId: string;
  category?: SampleCategory;
  name?: string;
  priority?: SamplePriority;
  voucherNumber?: number;
  east?: number;
  north?: number;
  elevation?: number;
  sampledAt?: string;
  labAssignments?: SurfaceLabAssignmentPayload[];
}
