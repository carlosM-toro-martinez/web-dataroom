import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/features/auth/context/AuthContext";

export function ExploracionesAdminRoute() {
  const { user } = useAuth();

  if (!user?.role || !["ADMIN", "GEOLOGOADMIN", "SUPERINTENDENTE", "GEOLOGO"].includes(user.role)) {
    return <Navigate to="/exploraciones-data-room" replace />;
  }

  return <Outlet />;
}
