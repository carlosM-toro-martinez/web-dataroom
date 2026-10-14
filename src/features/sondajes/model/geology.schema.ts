import { z } from "zod";

// ─── Geología de sondajes: espejo de /api/drilling/{geology-reports, geology-log, photos} ──

const optionalText = z.string().nullable().optional();
const optionalNumber = z.number().nullable().optional();

export const geologyReportSchema = z
  .object({
    id: z.string(),
    holeId: z.string(),
    date: z.string(),
    fromDepth: z.number(),
    toDepth: z.number(),
    plannedEast: optionalNumber,
    plannedNorth: optionalNumber,
    plannedElevation: optionalNumber,
    executedEast: optionalNumber,
    executedNorth: optionalNumber,
    executedElevation: optionalNumber,
    rigName: optionalText,
    diameter: optionalText,
    casing: optionalText,
    azimuth: optionalText,
    dip: optionalText,
    programmedDepth: optionalText,
    startDate: optionalText,
    endStatus: optionalText,
    geologists: optionalText,
    geologySummary: optionalText,
    operationalNotes: optionalText,
    updatedAt: optionalText
  })
  .passthrough();

export const logMineralSchema = z.object({ mineral: z.string(), pct: z.string().nullable().optional(), style: optionalText });
export const logStructureSchema = z.object({ type: z.string(), angle: optionalNumber, fracCount: optionalNumber });

const logRowShape = {
  fromDepth: z.number(),
  toDepth: z.number(),
  dataSet: optionalText,
  lithology: optionalText,
  texture: optionalText,
  support: optionalText,
  alteration1: optionalText,
  alteration1Int: optionalNumber,
  alteration2: optionalText,
  alteration2Int: optionalNumber,
  minerals: z.array(logMineralSchema).nullable().optional(),
  structures: z.array(logStructureSchema).nullable().optional(),
  description: optionalText,
  loggedBy: optionalText,
  loggedAt: optionalText
};

export const logRowPayloadSchema = z.object(logRowShape);
export const logIntervalSchema = z.object({ id: z.string().optional(), ...logRowShape }).passthrough();

export const photoKindSchema = z.enum(["CORE_BOX", "DETAIL", "SECTION", "OTHER"]);

export const drillingPhotoSchema = z
  .object({
    id: z.string(),
    // Código único por pozo (26DLP079-F0001). Lo asigna el servidor al sincronizar.
    code: optionalText,
    sequence: optionalNumber,
    holeId: z.string(),
    reportId: optionalText,
    kind: photoKindSchema,
    caption: optionalText,
    boxFrom: optionalNumber,
    boxTo: optionalNumber,
    fromDepth: optionalNumber,
    toDepth: optionalNumber,
    takenAt: optionalText,
    contentHash: optionalText,
    mimeType: z.string(),
    sizeBytes: z.number(),
    width: optionalNumber,
    height: optionalNumber,
    createdAt: optionalText
  })
  .passthrough();

export type GeologyReport = z.infer<typeof geologyReportSchema>;
export type LogInterval = z.infer<typeof logIntervalSchema>;
export type LogMineral = z.infer<typeof logMineralSchema>;
export type LogStructure = z.infer<typeof logStructureSchema>;
export type PhotoKind = z.infer<typeof photoKindSchema>;
export type DrillingPhoto = z.infer<typeof drillingPhotoSchema>;

// Lo que se envía al guardar (sin campos del servidor).
export type GeologyReportPayload = {
  date: string;
  fromDepth: number;
  toDepth: number;
  plannedEast?: number | null;
  plannedNorth?: number | null;
  plannedElevation?: number | null;
  executedEast?: number | null;
  executedNorth?: number | null;
  executedElevation?: number | null;
  rigName?: string | null;
  diameter?: string | null;
  casing?: string | null;
  azimuth?: string | null;
  dip?: string | null;
  programmedDepth?: string | null;
  startDate?: string | null;
  endStatus?: string | null;
  geologists?: string | null;
  geologySummary?: string | null;
  operationalNotes?: string | null;
};

export type LogRowPayload = z.infer<typeof logRowPayloadSchema>;

export type PhotoMeta = {
  kind: PhotoKind;
  reportId?: string | null;
  caption?: string | null;
  boxFrom?: number | null;
  boxTo?: number | null;
  fromDepth?: number | null;
  toDepth?: number | null;
  takenAt?: string | null;
  width?: number | null;
  height?: number | null;
  contentHash?: string | null;
};
