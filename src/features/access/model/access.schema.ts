import { z } from "zod";

export const accountStateSchema = z.enum(["ACTIVE", "INACTIVE", "VISITOR_ACTIVE", "VISITOR_EXPIRED", "VISITOR_PENDING"]);
export const invitationStateSchema = z.enum(["PENDING_REVIEW", "NOT_ENTERED", "ENTERED", "EXPIRED", "CANCELLED", "REJECTED"]);

const accountSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string(),
  role: z.string(),
  roleName: z.string(),
  isVisitor: z.boolean(),
  state: accountStateSchema,
  createdAt: z.string(),
  lastLoginAt: z.string().nullable(),
  loginsTotal: z.number(),
  logins30Days: z.number(),
  accessExpiresAt: z.string().nullable(),
  daysLeft: z.number().nullable(),
  deviceLinked: z.boolean().nullable()
});

const invitationSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  company: z.string().nullable(),
  requestedAt: z.string(),
  reviewedAt: z.string().nullable(),
  reviewedBy: z.string().nullable(),
  expiresAt: z.string().nullable(),
  state: invitationStateSchema,
  lastLoginAt: z.string().nullable()
});

export const accessOverviewSchema = z.object({
  success: z.boolean().optional(),
  data: z.object({
    generatedAt: z.string(),
    emailConfigured: z.boolean(),
    loginTrackingSince: z.string().nullable(),
    totals: z.object({
      accounts: z.number(),
      staffActive: z.number(),
      staffInactive: z.number(),
      visitorsActive: z.number(),
      visitorsExpired: z.number(),
      visitorsInactive: z.number(),
      enteredLast7Days: z.number(),
      neverEntered: z.number(),
      expiringSoon: z.number()
    }),
    invitationTotals: z.object({
      pendingReview: z.number(),
      notEntered: z.number(),
      entered: z.number(),
      expired: z.number(),
      cancelled: z.number(),
      rejected: z.number()
    }),
    byRole: z.array(z.object({ role: z.string(), roleName: z.string(), total: z.number(), active: z.number() })),
    accounts: z.array(accountSchema),
    invitations: z.array(invitationSchema)
  })
});

export type AccessOverview = z.infer<typeof accessOverviewSchema>["data"];
export type AccessAccount = AccessOverview["accounts"][number];
export type AccessInvitation = AccessOverview["invitations"][number];
export type AccountState = z.infer<typeof accountStateSchema>;
export type InvitationState = z.infer<typeof invitationStateSchema>;
