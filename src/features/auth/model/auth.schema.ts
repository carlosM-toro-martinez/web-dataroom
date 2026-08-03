import { z } from "zod";

export const roleSchema = z.enum([
  "ADMIN",
  "ADMINISTRADOR",
  "ALMACENERO",
  "CONTADOR",
  "GEOLOGO",
  "GEOLOGOADMIN",
  "LABORATORISTA",
  "RECEPCIONISTA",
  "SOLICITANTE",
  "SUPERINTENDENTE",
  "TOPOGRAFO",
  "TRABAJADOR",
  "VISITANTE"
]);

export const authUserSchema = z.object({
  id: z.number().int().positive(),
  nombre: z.string().min(1),
  email: z.string().email(),
  role: roleSchema,
  activo: z.boolean().optional()
});

export const loginPayloadSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  deviceId: z.string().min(16).optional()
});

export const loginResponseSchema = z
  .union([
    z.object({
      success: z.boolean().optional(),
      data: z.object({
        accessToken: z.string().min(1),
        refreshToken: z.string().min(1).optional(),
        user: authUserSchema
      })
    }),
    z.object({
      token: z.string().min(1),
      user: authUserSchema
    })
  ])
  .transform((value) => {
    if ("data" in value) return value;
    return {
      success: true,
      data: {
        accessToken: value.token,
        refreshToken: value.token,
        user: value.user
      }
    };
  });

export const refreshPayloadSchema = z.object({
  refreshToken: z.string().min(1),
  deviceId: z.string().min(16).optional()
});

export const refreshResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    accessToken: z.string().min(1),
    refreshToken: z.string().min(1).optional()
  })
});

export const registerPayloadSchema = z.object({
  nombre: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: roleSchema
});

export const registerResponseSchema = z.object({
  success: z.boolean(),
  data: authUserSchema
});

export const managedUserSchema = z.object({
  id: z.number().int().positive(),
  nombre: z.string().min(1),
  email: z.string().email(),
  role: roleSchema,
  activo: z.boolean().optional().default(true),
  createdAt: z.string().optional(),
  visitorAccessExpiresAt: z.string().nullable().optional(),
  visitorLastLoginAt: z.string().nullable().optional(),
  visitorDeviceIdHash: z.string().nullable().optional()
});

export const usersListResponseSchema = z.object({
  success: z.boolean().optional(),
  data: z.array(managedUserSchema).default([])
});

export const updateUserPayloadSchema = z
  .object({
    nombre: z.string().min(1).optional(),
    email: z.string().email().optional(),
    role: roleSchema.optional(),
    activo: z.boolean().optional(),
    visitorAccessExpiresAt: z.string().datetime().nullable().optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Debes enviar al menos un campo para actualizar."
  });

export const updateUserResponseSchema = z.object({
  success: z.boolean().optional(),
  data: managedUserSchema.optional(),
  message: z.string().optional()
});

export const forgotPasswordPayloadSchema = z.object({
  email: z.string().email()
});

const genericMessageResponseSchema = z
  .object({
    success: z.boolean().optional(),
    message: z.string().min(1).optional(),
    data: z
      .object({
        message: z.string().min(1).optional()
      })
      .optional()
  })
  .transform((value) => ({
    success: value.success ?? true,
    message: value.message ?? value.data?.message ?? "Operacion completada."
  }));

export const forgotPasswordResponseSchema = genericMessageResponseSchema;

export const resetPasswordPayloadSchema = z
  .object({
    token: z.string().min(1),
    password: z.string().min(8),
    confirmPassword: z.string().min(8)
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"]
  });

export const resetPasswordRequestSchema = z.object({
  password: z.string().min(8)
});

export const resetPasswordResponseSchema = genericMessageResponseSchema;

export const authSessionSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1).optional(),
  user: authUserSchema
});

export const dataRoomAccessRequestPayloadSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(5),
  company: z.string().optional(),
  reason: z.string().min(8)
});

export const dataRoomAccessRequestSchema = z.object({
  id: z.string().min(1),
  fullName: z.string(),
  email: z.string().email(),
  phone: z.string(),
  company: z.string().nullable().optional(),
  reason: z.string(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
  requestedAt: z.string(),
  reviewedAt: z.string().nullable().optional(),
  reviewedById: z.number().nullable().optional(),
  expiresAt: z.string().nullable().optional(),
  visitorUserId: z.number().nullable().optional(),
  adminNotes: z.string().nullable().optional(),
  rejectionReason: z.string().nullable().optional()
});

export const dataRoomAccessRequestResponseSchema = z.object({
  success: z.boolean().optional(),
  data: dataRoomAccessRequestSchema
});

export const dataRoomAccessRequestsResponseSchema = z.object({
  success: z.boolean().optional(),
  data: z.array(dataRoomAccessRequestSchema).default([])
});

export const approveDataRoomAccessPayloadSchema = z.object({
  expiresAt: z.string().datetime(),
  adminNotes: z.string().optional()
});

export const approveDataRoomAccessResponseSchema = z.object({
  success: z.boolean().optional(),
  data: z.object({
    request: dataRoomAccessRequestSchema,
    user: managedUserSchema.pick({
      id: true,
      nombre: true,
      email: true,
      role: true,
      activo: true,
      visitorAccessExpiresAt: true
    }),
    temporaryPassword: z.string().optional(),
    emailSent: z.boolean()
  })
});

export const rejectDataRoomAccessPayloadSchema = z.object({
  rejectionReason: z.string().min(3)
});

export type AuthRole = z.infer<typeof roleSchema>;
export type AuthUser = z.infer<typeof authUserSchema>;
export type LoginPayload = z.infer<typeof loginPayloadSchema>;
export type RegisterPayload = z.infer<typeof registerPayloadSchema>;
export type ForgotPasswordPayload = z.infer<typeof forgotPasswordPayloadSchema>;
export type ResetPasswordPayload = z.infer<typeof resetPasswordPayloadSchema>;
export type RefreshPayload = z.infer<typeof refreshPayloadSchema>;
export type AuthSession = z.infer<typeof authSessionSchema>;
export type ManagedUser = z.infer<typeof managedUserSchema>;
export type UpdateUserPayload = z.infer<typeof updateUserPayloadSchema>;
export type DataRoomAccessRequestPayload = z.infer<typeof dataRoomAccessRequestPayloadSchema>;
export type DataRoomAccessRequest = z.infer<typeof dataRoomAccessRequestSchema>;
export type ApproveDataRoomAccessPayload = z.infer<typeof approveDataRoomAccessPayloadSchema>;
export type RejectDataRoomAccessPayload = z.infer<typeof rejectDataRoomAccessPayloadSchema>;
