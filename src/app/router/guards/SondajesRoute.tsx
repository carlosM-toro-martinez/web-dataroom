import { PermissionRoute } from "@/app/router/guards/PermissionRoute";

// Sondajes: Perforación o Geología (cada uno ve su parte dentro del módulo).
export function SondajesRoute() {
  return <PermissionRoute module={["sondajes", "geologiaSondajes"]} />;
}
