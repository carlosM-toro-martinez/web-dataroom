import { Navigate, Route, Routes } from "react-router-dom";
import { CorporateLandingPage } from "@/pages/corporate/CorporateLandingPage";
import { LoginPage } from "@/pages/auth/LoginPage";
import { ForgotPasswordPage } from "@/pages/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "@/pages/auth/ResetPasswordPage";
import { RegisterUserPage } from "@/pages/auth/RegisterUserPage";
import { DashboardPage } from "@/pages/dashboard/DashboardPage";
import { NotFoundPage } from "@/pages/not-found/NotFoundPage";
import { ExploracionesPage } from "@/pages/exploraciones/ExploracionesPage";
import { ExploracionesReportesPage } from "@/pages/exploraciones/ExploracionesReportesPage";
import { ExploracionesElementosPage } from "@/pages/exploraciones/ExploracionesElementosPage";
import { ExploracionesDataRoomPage } from "@/pages/exploraciones/ExploracionesDataRoomPage";
import { ExploracionesSurfaceDataRoomPage } from "@/pages/exploraciones/ExploracionesSurfaceDataRoomPage";
import { ExploracionesFormsPage } from "@/pages/exploraciones/ExploracionesFormsPage";
import { ProtectedRoute } from "@/app/router/guards/ProtectedRoute";
import { PublicOnlyRoute } from "@/app/router/guards/PublicOnlyRoute";
import { AdminRoute } from "@/app/router/guards/AdminRoute";
import { ExploracionesAdminRoute } from "@/app/router/guards/ExploracionesAdminRoute";

export function DataRoomRouter() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Route>

      <Route path="/" element={<CorporateLandingPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
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

        <Route element={<ExploracionesAdminRoute />}>
          <Route path="/exploraciones" element={<ExploracionesPage />} />
        </Route>
        <Route path="/exploraciones/elementos" element={<ExploracionesElementosPage />} />
        <Route path="/exploraciones/reportes" element={<ExploracionesReportesPage />} />

        <Route element={<AdminRoute />}>
          <Route path="/exploraciones-data-room/forms" element={<ExploracionesFormsPage />} />
          <Route path="/trabajadores" element={<RegisterUserPage />} />
          <Route path="/usuarios/nuevo" element={<Navigate to="/trabajadores" replace />} />
        </Route>
      </Route>

      <Route path="/404" element={<NotFoundPage />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}
