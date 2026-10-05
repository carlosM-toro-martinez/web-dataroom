import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/features/auth/context/AuthContext";

// Sondajes: todos los roles internos; los visitantes del Data Room no.
export function SondajesRoute() {
  const { user } = useAuth();

  if (!user?.role || user.role === "VISITANTE") {
    return <Navigate to="/exploraciones-data-room" replace />;
  }

  return <Outlet />;
}
