import { z } from "zod";

const envSchema = z.object({
  VITE_API_BASE_URL: z
    .string()
    .url()
    .default("http://localhost:3000")
    .transform((value) => value.replace(/\/+$/, "")),
  VITE_BIOMETRIC_SYNC_USERS_URL: z
    .string()
    .url()
    .default("https://api.marte.encuentrass.lat/iclock/sync-users")
    .transform((value) => value.replace(/\/+$/, ""))
});

export const env = envSchema.parse(import.meta.env);
