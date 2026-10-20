import { Suspense, lazy, useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { CorporateLandingPage } from "@/pages/corporate/CorporateLandingPage";
import { ResponsibleMiningPage } from "@/pages/corporate/ResponsibleMiningPage";
import { EnvironmentPage } from "@/pages/corporate/EnvironmentPage";
import { IndustrialSafetyPage } from "@/pages/corporate/IndustrialSafetyPage";
import { LoginPage } from "@/pages/auth/LoginPage";
import { DataRoomAccessRequestPublicPage } from "@/pages/auth/DataRoomAccessRequestPublicPage";
import { ForgotPasswordPage } from "@/pages/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "@/pages/auth/ResetPasswordPage";
const RegisterUserPage = lazy(() => import("@/pages/auth/RegisterUserPage").then((module) => ({ default: module.RegisterUserPage })));
const DataRoomAccessRequestsPage = lazy(() => import("@/pages/auth/DataRoomAccessRequestsPage").then((module) => ({ default: module.DataRoomAccessRequestsPage })));
const DashboardPage = lazy(() => import("@/pages/dashboard/DashboardPage").then((module) => ({ default: module.DashboardPage })));
import { NotFoundPage } from "@/pages/not-found/NotFoundPage";
const ExploracionesPage = lazy(() => import("@/pages/exploraciones/ExploracionesPage").then((module) => ({ default: module.ExploracionesPage })));
const ExploracionesReportesPage = lazy(() => import("@/pages/exploraciones/ExploracionesReportesPage").then((module) => ({ default: module.ExploracionesReportesPage })));
const ExploracionesElementosPage = lazy(() => import("@/pages/exploraciones/ExploracionesElementosPage").then((module) => ({ default: module.ExploracionesElementosPage })));
const ExploracionesHierarchyPage = lazy(() => import("@/pages/exploraciones/ExploracionesHierarchyPage").then((module) => ({ default: module.ExploracionesHierarchyPage })));
const ExploracionesDataRoomPage = lazy(() => import("@/pages/exploraciones/ExploracionesDataRoomPage").then((module) => ({ default: module.ExploracionesDataRoomPage })));
const ExploracionesSurfaceDataRoomPage = lazy(() => import("@/pages/exploraciones/ExploracionesSurfaceDataRoomPage").then((module) => ({ default: module.ExploracionesSurfaceDataRoomPage })));
const ExploracionesFormsPage = lazy(() => import("@/pages/exploraciones/ExploracionesFormsPage").then((module) => ({ default: module.ExploracionesFormsPage })));
const ExploracionesAjustesPage = lazy(() => import("@/pages/exploraciones/ExploracionesAjustesPage").then((module) => ({ default: module.ExploracionesAjustesPage })));
const SondajesPage = lazy(() => import("@/pages/sondajes/SondajesPage").then((module) => ({ default: module.SondajesPage })));
const AuditPage = lazy(() => import("@/pages/audit/AuditPage").then((module) => ({ default: module.AuditPage })));
const SondajesHolePage = lazy(() => import("@/pages/sondajes/SondajesHolePage").then((module) => ({ default: module.SondajesHolePage })));
import { ProtectedRoute } from "@/app/router/guards/ProtectedRoute";
import { PublicOnlyRoute } from "@/app/router/guards/PublicOnlyRoute";
import { AdminRoute } from "@/app/router/guards/AdminRoute";
import { ExploracionesAdminRoute } from "@/app/router/guards/ExploracionesAdminRoute";
import { SondajesRoute } from "@/app/router/guards/SondajesRoute";
import { PermissionRoute } from "@/app/router/guards/PermissionRoute";
const RolesPage = lazy(() => import("@/pages/auth/RolesPage").then((module) => ({ default: module.RolesPage })));
import { SeoManager } from "@/shared/seo/SeoManager";

// Mientras se descarga la pantalla pedida (cada módulo se baja solo cuando se entra a él).
function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center" role="status" aria-live="polite">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-border-soft)] border-t-[var(--color-primary)]" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}

export function DataRoomRouter() {
  return (
    <>
      <SeoManager />
      <ScrollToRouteTarget />
      <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>

        <Route path="/" element={<CorporateLandingPage />} />
        <Route path="/solicitar-acceso-data-room" element={<DataRoomAccessRequestPublicPage />} />
        <Route path="/mineria-responsable" element={<ResponsibleMiningPage />} />
        <Route path="/medio-ambiente" element={<EnvironmentPage />} />
        <Route path="/seguridad-industrial" element={<IndustrialSafetyPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route element={<PermissionRoute module="dataRoom" />}>
            <Route path="/exploraciones-data-room" element={<ExploracionesDataRoomPage />} />
            <Route path="/exploraciones-data-room/projects" element={<ExploracionesDataRoomPage />} />
            <Route path="/exploraciones-data-room/projects/:projectId" element={<ExploracionesDataRoomPage />} />
            <Route path="/exploraciones-data-room/projects/:projectId/zones/:zoneId" element={<ExploracionesDataRoomPage />} />
            <Route path="/exploraciones-data-room/projects/:projectId/zones/:zoneId/drillholes/:drillHoleId" element={<ExploracionesDataRoomPage />} />
            <Route path="/exploraciones-data-room/projects/:projectId/zones/:zoneId/drillholes/:drillHoleId/intervals/:intervalId" element={<ExploracionesDataRoomPage />} />
            <Route path="/exploraciones-data-room/projects/:projectId/zones/:zoneId/drillholes/:drillHoleId/intervals/:intervalId/assays/:assayId" element={<ExploracionesDataRoomPage />} />
            <Route path="/exploraciones-data-room/surface" element={<ExploracionesSurfaceDataRoomPage />} />
            <Route path="/exploraciones-data-room/surface/areas/:areaId" element={<ExploracionesSurfaceDataRoomPage />} />
            <Route path="/exploraciones-data-room/surface/areas/:areaId/levels/:levelId" element={<ExploracionesSurfaceDataRoomPage />} />
            <Route path="/exploraciones-data-room/surface/areas/:areaId/levels/:levelId/labors/:laborId" element={<ExploracionesSurfaceDataRoomPage />} />
            <Route path="/exploraciones-data-room/surface/areas/:areaId/levels/:levelId/labors/:laborId/samples/:sampleId" element={<ExploracionesSurfaceDataRoomPage />} />
          </Route>

          <Route element={<ExploracionesAdminRoute />}>
            <Route path="/exploraciones" element={<ExploracionesPage />} />
            <Route element={<PermissionRoute module="exploracion" />}>
              <Route path="/exploraciones/exploracion" element={<ExploracionesPage category="EXPLORATION" />} />
            </Route>
            <Route element={<PermissionRoute module="produccion" />}>
              <Route path="/exploraciones/produccion" element={<ExploracionesPage category="PRODUCTION" />} />
            </Route>
            <Route path="/exploraciones/elementos" element={<ExploracionesElementosPage />} />
            <Route path="/exploraciones/jerarquia" element={<ExploracionesHierarchyPage />} />
            <Route path="/exploraciones/reportes" element={<ExploracionesReportesPage />} />
          </Route>

          <Route element={<SondajesRoute />}>
            <Route path="/sondajes" element={<SondajesPage />} />
            <Route path="/sondajes/pozos/:holeId" element={<SondajesHolePage />} />
          </Route>

          <Route element={<AdminRoute />}>
            <Route path="/exploraciones/ajustes" element={<ExploracionesAjustesPage />} />
            <Route path="/exploraciones-data-room/forms" element={<ExploracionesFormsPage />} />
            <Route path="/auditoria" element={<AuditPage />} />
          </Route>

          <Route element={<PermissionRoute module="solicitudes" />}>
            <Route path="/solicitudes-data-room" element={<DataRoomAccessRequestsPage />} />
          </Route>

          <Route element={<PermissionRoute module="usuarios" />}>
            <Route path="/trabajadores" element={<RegisterUserPage />} />
            <Route path="/roles" element={<RolesPage />} />
            <Route path="/usuarios/nuevo" element={<Navigate to="/trabajadores" replace />} />
          </Route>
        </Route>

        <Route path="/404" element={<NotFoundPage />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
      </Suspense>
    </>
  );
}

function ScrollToRouteTarget() {
  const location = useLocation();

  useEffect(() => {
    if (!location.hash) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    window.setTimeout(() => {
      document.querySelector(location.hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }, [location.pathname, location.hash]);

  return null;
}
