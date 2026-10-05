import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/context/AuthContext";

export function ProtectedRoute() {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // El rol SONDAJES solo tiene acceso al módulo de Sondajes.
  if (user?.role === "SONDAJES" && !location.pathname.startsWith("/sondajes")) {
    return <Navigate to="/sondajes" replace />;
  }

  return <Outlet />;
}
