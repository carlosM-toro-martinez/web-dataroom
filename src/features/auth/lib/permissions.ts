import type { AuthUser, PermissionAction } from "@/features/auth/model/auth.schema";

// Debe coincidir con PERMISSION_MODULES de la API (src/modules/roles/permissions.catalog.ts).
export type PermissionModule =
  | "dataRoom"
  | "exploracion"
  | "produccion"
  | "despachos"
  | "sondajes"
  | "geologiaSondajes"
  | "analisisMuestras"
  | "elementos"
  | "solicitudes"
  | "usuarios";

export function hasPermission(
  user: AuthUser | null | undefined,
  module: PermissionModule | PermissionModule[],
  action: PermissionAction = "read"
) {
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  const modules = Array.isArray(module) ? module : [module];
  return modules.some((key) => user.permissions?.[key]?.includes(action) ?? false);
}

// Página de inicio según lo que el rol puede ver.
export function homePathFor(user: AuthUser | null | undefined) {
  if (!user) return "/login";
  if (user.role === "ADMIN") return "/dashboard";
  const modules = Object.entries(user.permissions ?? {})
    .filter(([, actions]) => actions.includes("read"))
    .map(([key]) => key);
  if (modules.length > 0 && modules.every((key) => key === "sondajes" || key === "geologiaSondajes")) return "/sondajes";
  if (modules.length === 1 && modules[0] === "dataRoom") return "/exploraciones-data-room";
  return "/dashboard";
}
