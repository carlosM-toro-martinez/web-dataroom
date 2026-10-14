import { PermissionRoute } from "@/app/router/guards/PermissionRoute";

export function ExploracionesAdminRoute() {
  return <PermissionRoute module={["exploracion", "produccion"]} />;
}
