import { z } from "zod";

const nullableText = z.string().nullable().optional();

export const auditRowSchema = z
  .object({
    seq: z.number(),
    at: z.string(),
    source: z.string(),
    action: z.string(),
    table_name: z.string(),
    record_id: nullableText,
    record_label: nullableText,
    actor_id: z.number().nullable().optional(),
    actor_name: nullableText,
    actor_email: nullableText,
    actor_role: nullableText,
    request_id: nullableText,
    ip: nullableText,
    route: nullableText,
    changed_fields: z.array(z.string()).nullable().optional(),
    user_agent: nullableText,
    db_user: nullableText,
    prev_hash: nullableText,
    hash: nullableText,
    old_data: z.record(z.string(), z.unknown()).nullable().optional(),
    new_data: z.record(z.string(), z.unknown()).nullable().optional(),
    detail: z.record(z.string(), z.unknown()).nullable().optional()
  })
  .passthrough();
export type AuditRow = z.infer<typeof auditRowSchema>;

export const auditListSchema = z.object({
  success: z.boolean().optional(),
  data: z.object({
    data: z.array(auditRowSchema),
    meta: z.object({ page: z.number(), limit: z.number(), total: z.number(), totalPages: z.number() })
  })
});

export const auditDetailSchema = z.object({ success: z.boolean().optional(), data: auditRowSchema });

export const auditFiltersSchema = z.object({
  success: z.boolean().optional(),
  data: z.object({
    actors: z.array(z.object({ id: z.number(), name: z.string().nullable(), email: z.string().nullable(), events: z.number() })),
    tables: z.array(z.object({ name: z.string(), events: z.number() })),
    actions: z.array(z.object({ name: z.string(), events: z.number() }))
  })
});

export const auditSummarySchema = z.object({
  success: z.boolean().optional(),
  data: z.object({ records: z.number(), lastHash: z.string().nullable(), since: z.string().nullable() })
});

export const auditVerifySchema = z.object({
  success: z.boolean().optional(),
  data: z.object({
    ok: z.boolean(),
    checked: z.number(),
    brokenAt: z.number().nullable(),
    reason: z.string().nullable(),
    verifiedAt: z.string()
  })
});

export type AuditFilters = {
  from?: string;
  to?: string;
  actorId?: number;
  action?: string;
  table?: string;
  recordId?: string;
  source?: string;
  search?: string;
};
