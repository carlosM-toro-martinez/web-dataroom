import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ChevronDown,
  BarChart3,
  ClipboardList,
  Database,
  Drill,
  History,
  LayoutDashboard,
  MapPinned,
  Menu,
  Moon,
  Mountain,
  Settings,
  ShieldCheck,
  Sun,
  UserCheck,
  Users,
  X
} from "lucide-react";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useTheme } from "@/shared/theme/ThemeProvider";
import { UserRouteMenu } from "@/shared/ui/UserRouteMenu";
import { homePathFor, type PermissionModule } from "@/features/auth/lib/permissions";
import { PAGE_CONTAINER } from "@/shared/ui/pageLayout";

type MainRoute = {
  label: string;
  to: string;
  icon: typeof LayoutDashboard;
  permission?: PermissionModule | PermissionModule[];
  adminOnly?: boolean;
  dashboard?: boolean;
  // Los módulos de trabajo van en la barra; lo de administración se agrupa en un solo menú.
  group: "main" | "admin";
};

const MAIN_ROUTES: MainRoute[] = [
  { label: "Inicio", to: "/dashboard", icon: LayoutDashboard, dashboard: true, group: "main" },
  { label: "Data Room", to: "/exploraciones-data-room", icon: Database, permission: "dataRoom", group: "main" },
  { label: "Muestras", to: "/exploraciones", icon: MapPinned, permission: ["exploracion", "produccion"], group: "main" },
  { label: "Sondajes", to: "/sondajes", icon: Drill, permission: ["sondajes", "geologiaSondajes"], group: "main" },
  { label: "Análisis", to: "/analisis-muestras", icon: BarChart3, permission: ["analisisMuestras", "misAnalisisMuestras"], group: "main" },
  { label: "Trabajadores", to: "/trabajadores", icon: Users, permission: "usuarios", group: "admin" },
  { label: "Roles y permisos", to: "/roles", icon: ShieldCheck, permission: "usuarios", group: "admin" },
  { label: "Solicitudes Data Room", to: "/solicitudes-data-room", icon: ClipboardList, permission: "solicitudes", group: "admin" },
  { label: "Accesos", to: "/accesos", icon: UserCheck, adminOnly: true, group: "admin" },
  { label: "Auditoría", to: "/auditoria", icon: History, adminOnly: true, group: "admin" },
  { label: "Ajustes", to: "/exploraciones/ajustes", icon: Settings, adminOnly: true, group: "admin" }
];

const tabBase = "relative inline-flex h-16 items-center gap-2 whitespace-nowrap px-3.5 text-[15px] font-semibold transition";
const tabActive = "text-[var(--color-primary)] after:absolute after:inset-x-3 after:bottom-0 after:h-[3px] after:rounded-full after:bg-[var(--color-primary)]";
const tabIdle = "text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]";

export function AppTopBar() {
  const { user, can, isAdmin } = useAuth();
  const { mode, setMode } = useTheme();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const adminRef = useRef<HTMLDivElement | null>(null);

  const routes = useMemo(
    () =>
      MAIN_ROUTES.filter((route) => {
        if (route.dashboard) return homePathFor(user) === "/dashboard";
        if (route.adminOnly) return isAdmin;
        return route.permission ? can(route.permission) : true;
      }),
    [user, can, isAdmin]
  );
  const mainRoutes = routes.filter((route) => route.group === "main");
  const adminRoutes = routes.filter((route) => route.group === "admin");

  const isActive = (to: string) =>
    location.pathname === to || (to !== "/dashboard" && to !== "/exploraciones" && location.pathname.startsWith(to));
  const adminActive = adminRoutes.some((route) => isActive(route.to));

  useEffect(() => {
    setMobileOpen(false);
    setAdminOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!adminOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!adminRef.current?.contains(event.target as Node)) setAdminOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAdminOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [adminOpen]);

  const dark = mode === "dark";

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] shadow-sm">
      {/* Marca, módulos y cuenta */}
      <div className={`${PAGE_CONTAINER} flex h-16 items-center gap-2`}>
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-[var(--color-on-surface-variant)] transition hover:bg-[var(--color-surface-container-high)] md:hidden"
          aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((open) => !open)}
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <Link to={homePathFor(user)} className="flex items-center gap-2.5 pr-1" aria-label="Ir al inicio">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-primary)] text-[var(--color-on-primary)]">
            <Mountain size={19} />
          </span>
          <span className="hidden pr-4 text-base font-extrabold tracking-tight sm:inline">Minera Marte</span>
        </Link>

        <nav className="hidden items-center md:flex" aria-label="Módulos">
          {mainRoutes.map((route) => (
            <Link key={route.to} to={route.to} className={`${tabBase} ${isActive(route.to) ? tabActive : tabIdle}`} aria-current={isActive(route.to) ? "page" : undefined}>
              {route.label}
            </Link>
          ))}
          {adminRoutes.length ? (
            <div className="relative" ref={adminRef}>
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={adminOpen}
                onClick={() => setAdminOpen((open) => !open)}
                className={`${tabBase} ${adminActive ? tabActive : tabIdle}`}
              >
                Administración
                <ChevronDown size={14} className={`transition ${adminOpen ? "rotate-180" : ""}`} />
              </button>
              {adminOpen ? (
                <div
                  role="menu"
                  className="absolute left-0 top-full z-50 mt-0 w-72 overflow-hidden rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-1 shadow-2xl"
                >
                  {adminRoutes.map((route) => {
                    const Icon = route.icon;
                    return (
                      <Link
                        key={route.to}
                        to={route.to}
                        role="menuitem"
                        className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                          isActive(route.to)
                            ? "bg-[var(--color-primary)] text-[var(--color-on-primary)]"
                            : "text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-high)]"
                        }`}
                      >
                        <Icon size={16} />
                        {route.label}
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ) : null}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setMode(dark ? "light" : "dark")}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-[var(--color-on-surface-variant)] transition hover:bg-[var(--color-surface-container-high)] hover:text-[var(--color-on-surface)]"
            aria-label={dark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
            title={dark ? "Modo claro" : "Modo oscuro"}
          >
            {dark ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <UserRouteMenu
            showRoutes={false}
            buttonClassName="inline-flex items-center gap-2 rounded-xl py-1.5 pl-1.5 pr-2.5 text-sm font-semibold text-[var(--color-on-surface)] transition hover:bg-[var(--color-surface-container-high)]"
          />
        </div>
      </div>

      {/* Menú del celular */}
      {mobileOpen ? (
        <nav className={`${PAGE_CONTAINER} border-t border-[var(--color-border-soft)] py-2 md:hidden`} aria-label="Módulos">
          {[...mainRoutes, ...adminRoutes].map((route, index) => {
            const Icon = route.icon;
            const firstAdmin = route.group === "admin" && (index === 0 || [...mainRoutes, ...adminRoutes][index - 1]?.group !== "admin");
            return (
              <div key={route.to}>
                {firstAdmin ? (
                  <p className="px-3 pb-1 pt-3 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Administración</p>
                ) : null}
                <Link
                  to={route.to}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold ${
                    isActive(route.to) ? "bg-[var(--color-primary)] text-[var(--color-on-primary)]" : "text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-high)]"
                  }`}
                >
                  <Icon size={17} />
                  {route.label}
                </Link>
              </div>
            );
          })}
        </nav>
      ) : null}

    </header>
  );
}
