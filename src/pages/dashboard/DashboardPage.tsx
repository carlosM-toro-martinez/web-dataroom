import { Link } from "react-router-dom";
import { Database, FileSpreadsheet, MapPinned, Users } from "lucide-react";
import { useAuth } from "@/features/auth/context/AuthContext";
import { InternalHeader } from "@/shared/ui/InternalHeader";

const cardClassName =
  "group rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5 transition hover:border-[var(--color-primary)] hover:bg-[var(--color-surface-container-high)]";

export function DashboardPage() {
  const { user } = useAuth();
  const canAdmin = user?.role === "ADMIN" || user?.role === "SUPERINTENDENTE";

  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <InternalHeader
        eyebrow="Panel interno"
        title={`Bienvenido, ${user?.nombre ?? "usuario"}`}
        description="Acceso principal para administrar Data Room, exploraciones y usuarios del sistema."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Link to="/exploraciones-data-room" className={cardClassName}>
          <Database size={22} className="mb-4 text-[var(--color-primary)]" />
          <h2 className="text-lg font-bold">Data Room</h2>
          <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">
            Consulta proyectos, perforaciones y exploración superficial.
          </p>
        </Link>

        {canAdmin ? (
          <Link to="/exploraciones" className={cardClassName}>
            <MapPinned size={22} className="mb-4 text-[var(--color-primary)]" />
            <h2 className="text-lg font-bold">Exploraciones</h2>
            <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">
              Registra muestras, sincroniza datos y revisa resultados.
            </p>
          </Link>
        ) : null}

        {canAdmin ? (
          <Link to="/trabajadores" className={cardClassName}>
            <Users size={22} className="mb-4 text-[var(--color-primary)]" />
            <h2 className="text-lg font-bold">Trabajadores</h2>
            <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">
              Administra usuarios, roles y estado del personal.
            </p>
          </Link>
        ) : null}

        {user?.role === "ADMIN" ? (
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
