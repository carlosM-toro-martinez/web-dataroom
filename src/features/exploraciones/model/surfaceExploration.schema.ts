import { z } from "zod";

const optionalText = z.string().nullable().optional();
const optionalDate = z.string().nullable().optional();
const optionalNumber = z.coerce.number().nullable().optional();

export const sampleTypeSchema = z.enum(["SIMPLE", "DOUBLE", "SIMPLE_DOUBLE", "OTHER"]);
export const laboratorySlotSchema = z.enum(["L1", "L2", "L3"]);

export const miningAreaSchema = z.object({
  id: z.string(),
  name: z.string(),
  abbreviation: optionalText,
  description: optionalText,
  createdAt: optionalDate,
  updatedAt: optionalDate,
  createdById: z.number().nullable().optional(),
  updatedById: z.number().nullable().optional()
}).passthrough();

export const miningLevelSchema = z.object({
  id: z.string(),
  miningAreaId: z.string(),
  name: z.string(),
  abbreviation: optionalText,
  elevation: optionalNumber,
  description: optionalText,
  createdAt: optionalDate,
  updatedAt: optionalDate,
  createdById: z.number().nullable().optional(),
  updatedById: z.number().nullable().optional()
}).passthrough();

export const miningLaborSchema = z.object({
  id: z.string(),
  miningLevelId: z.string(),
  name: z.string(),
  abbreviation: optionalText,
  code: optionalText,
  description: optionalText,
  createdAt: optionalDate,
  updatedAt: optionalDate,
  createdById: z.number().nullable().optional(),
  updatedById: z.number().nullable().optional()
}).passthrough();

export const sampleSchema = z.object({
  id: z.string(),
  miningLaborId: z.string(),
  number: z.number().nullable().optional(),
  sampledAt: optionalDate,
  name: optionalText,
  sampleType: sampleTypeSchema.nullable().optional(),
  code: z.string(),
  placeReference: optionalText,
  east: optionalNumber,
  north: optionalNumber,
  elevation: optionalNumber,
  description: optionalText,
  observations: optionalText,
  createdAt: optionalDate,
  updatedAt: optionalDate,
  createdById: z.number().nullable().optional(),
  updatedById: z.number().nullable().optional()
}).passthrough();

export const laboratorySchema = z.object({
  id: z.string(),
  name: z.string(),
  abbreviation: optionalText,
  description: optionalText,
  createdAt: optionalDate,
  updatedAt: optionalDate,
  createdById: z.number().nullable().optional(),
  updatedById: z.number().nullable().optional()
}).passthrough();

export const sampleLaboratorySchema = z.object({
  id: z.string(),
  sampleId: z.string(),
  laboratoryId: z.string(),
  slot: laboratorySlotSchema,
  createdAt: optionalDate,
  updatedAt: optionalDate,
  createdById: z.number().nullable().optional(),
  updatedById: z.number().nullable().optional()
}).passthrough();

export const elementSchema = z.object({
  id: z.string(),
  name: z.string(),
  symbol: z.string(),
  defaultUnit: optionalText,
  description: optionalText,
  createdAt: optionalDate,
  updatedAt: optionalDate,
  createdById: z.number().nullable().optional(),
  updatedById: z.number().nullable().optional()
}).passthrough();

export const sampleResultSchema = z.object({
  id: z.string(),
  sampleId: z.string(),
  sampleLaboratoryId: z.string().nullable().optional(),
  elementId: z.string(),
  value: optionalNumber,
  qualifier: optionalText,
  unit: optionalText,
  sourceColumn: optionalText,
  comments: optionalText,
  createdAt: optionalDate,
  updatedAt: optionalDate,
  createdById: z.number().nullable().optional(),
  updatedById: z.number().nullable().optional()
}).passthrough();

export const sampleQaqcSchema = z.object({
  id: z.string(),
  sampleId: z.string(),
  type: z.string(),
  passed: z.boolean().nullable().optional(),
  expectedValue: optionalNumber,
  obtainedValue: optionalNumber,
  deviationPercent: optionalNumber,
  comments: optionalText,
  createdAt: optionalDate,
  updatedAt: optionalDate,
  createdById: z.number().nullable().optional(),
  updatedById: z.number().nullable().optional()
}).passthrough();

