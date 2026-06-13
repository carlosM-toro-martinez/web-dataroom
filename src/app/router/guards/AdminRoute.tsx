import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/features/auth/context/AuthContext";

export function AdminRoute() {
  const { canManageUsers } = useAuth();

  if (!canManageUsers) {
    return <Navigate to="/perfil" replace />;
  }

  return <Outlet />;
}
