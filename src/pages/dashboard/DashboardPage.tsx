import { Link, Navigate } from "react-router-dom";
import { BarChart3, ClipboardList, Database, Drill, FileSpreadsheet, MapPinned, ShieldCheck, Users } from "lucide-react";
import { useAuth } from "@/features/auth/context/AuthContext";
import { homePathFor } from "@/features/auth/lib/permissions";
import { InternalHeader } from "@/shared/ui/InternalHeader";

const cardClassName =
  "group rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5 transition hover:border-[var(--color-primary)] hover:bg-[var(--color-surface-container-high)]";

export function DashboardPage() {
  const { user, can, isAdmin } = useAuth();
  const home = homePathFor(user);
  if (home !== "/dashboard") {
    return <Navigate to={home} replace />;
  }

  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <InternalHeader
        eyebrow="Panel interno"
        title={`Bienvenido, ${user?.nombre ?? "usuario"}`}
        description="Acceso principal para administrar Data Room, muestras y usuarios del sistema."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {can("dataRoom") ? (
          <Link to="/exploraciones-data-room" className={cardClassName}>
            <Database size={22} className="mb-4 text-[var(--color-primary)]" />
            <h2 className="text-lg font-bold">Data Room</h2>
            <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">
              Consulta proyectos, perforaciones y exploración superficial.
            </p>
          </Link>
        ) : null}

        {can(["exploracion", "produccion"]) ? (
          <Link to="/exploraciones" className={cardClassName}>
            <MapPinned size={22} className="mb-4 text-[var(--color-primary)]" />
            <h2 className="text-lg font-bold">Registro de muestras</h2>
            <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">
              Registra muestras, sincroniza datos y revisa resultados.
            </p>
          </Link>
        ) : null}

        {can(["sondajes", "geologiaSondajes"]) ? (
          <Link to="/sondajes" className={cardClassName}>
            <Drill size={22} className="mb-4 text-[var(--color-primary)]" />
            <h2 className="text-lg font-bold">Sondajes</h2>
            <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">
              Programas de perforación por área y estado de cada pozo.
            </p>
          </Link>
        ) : null}

        {can("analisisMuestras") ? (
          <Link to="/analisis-muestras" className={cardClassName}>
            <BarChart3 size={22} className="mb-4 text-[var(--color-primary)]" />
            <h2 className="text-lg font-bold">Análisis de muestras</h2>
            <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">
              Leyes, cobertura, laboratorios, calidad y estimación espacial.
            </p>
          </Link>
        ) : null}

        {can("solicitudes") ? (
          <Link to="/solicitudes-data-room" className={cardClassName}>
            <ClipboardList size={22} className="mb-4 text-[var(--color-primary)]" />
            <h2 className="text-lg font-bold">Solicitudes Data Room</h2>
            <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">
              Aprueba visitantes, define vencimientos y controla accesos externos.
            </p>
          </Link>
        ) : null}

        {can("usuarios") ? (
          <Link to="/trabajadores" className={cardClassName}>
            <Users size={22} className="mb-4 text-[var(--color-primary)]" />
            <h2 className="text-lg font-bold">Trabajadores</h2>
            <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">
              Administra usuarios, roles y estado del personal.
            </p>
          </Link>
        ) : null}

        {can("usuarios") ? (
          <Link to="/roles" className={cardClassName}>
            <ShieldCheck size={22} className="mb-4 text-[var(--color-primary)]" />
            <h2 className="text-lg font-bold">Roles y permisos</h2>
            <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">
              Crea roles y define qué puede ver, crear, editar o borrar cada uno.
            </p>
          </Link>
        ) : null}

        {isAdmin ? (
          <Link to="/exploraciones-data-room/forms" className={cardClassName}>
            <FileSpreadsheet size={22} className="mb-4 text-[var(--color-primary)]" />
            <h2 className="text-lg font-bold">Importaciones</h2>
            <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">
              Carga plantillas masivas y formularios administrativos.
            </p>
          </Link>
        ) : null}
      </div>
    </section>
  );
}
