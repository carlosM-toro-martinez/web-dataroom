import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/context/AuthContext";
import { AppTopBar } from "@/shared/ui/AppTopBar";
import { PAGE_CONTAINER } from "@/shared/ui/pageLayout";

// Marco común de todas las pantallas internas: barra superior a todo el ancho y un solo ancho de contenido.
export function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return (
    <div className="min-h-screen text-[var(--color-on-surface)]">
      <AppTopBar />
      <main className={`${PAGE_CONTAINER} space-y-6 py-6 lg:py-8`}>
        <Outlet />
      </main>
    </div>
  );
}
