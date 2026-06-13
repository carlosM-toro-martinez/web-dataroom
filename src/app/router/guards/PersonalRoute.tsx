import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/features/auth/context/AuthContext";

export function PersonalRoute() {
  const { user } = useAuth();

  const canAccessPersonal =
    user?.role === "ADMIN" ||
    user?.role === "ADMINISTRADOR" ||
    user?.role === "SUPERINTENDENTE";

  if (!canAccessPersonal) {
    return <Navigate to="/perfil" replace />;
  }

  return <Outlet />;
}

