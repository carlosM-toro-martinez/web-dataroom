import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/features/auth/context/AuthContext";
import { homePathFor, type PermissionModule } from "@/features/auth/lib/permissions";
import type { PermissionAction } from "@/features/auth/model/auth.schema";

export function PermissionRoute({
  module,
  action = "read"
}: {
  module: PermissionModule | PermissionModule[];
  action?: PermissionAction;
}) {
  const { user, can } = useAuth();
  if (!can(module, action)) {
    return <Navigate to={homePathFor(user)} replace />;
  }
  return <Outlet />;
}
