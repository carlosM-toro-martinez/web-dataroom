import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ChevronDown,
  ClipboardList,
  Drill,
  FolderKanban,
  History,
  LayoutDashboard,
  LogOut,
  MapPinned,
  ShieldCheck,
  UserCircle,
  Users
} from "lucide-react";
import { getPostLogoutPath } from "@/app/router/domainConfig";
import { useAuth } from "@/features/auth/context/AuthContext";
import { homePathFor, type PermissionModule } from "@/features/auth/lib/permissions";

type RouteItem = {
  label: string;
  to: string;
  icon: typeof FolderKanban;
  permission?: PermissionModule | PermissionModule[];
  adminOnly?: boolean;
  dashboard?: boolean;
};

const SYSTEM_ROUTES: RouteItem[] = [
  { label: "Inicio", to: "/dashboard", icon: LayoutDashboard, dashboard: true },
  { label: "Data Room", to: "/exploraciones-data-room", icon: FolderKanban, permission: "dataRoom" },
  {
    label: "Muestras",
    to: "/exploraciones",
    icon: MapPinned,
    permission: ["exploracion", "produccion"]
  },
  {
    label: "Sondajes",
    to: "/sondajes",
    icon: Drill,
    permission: ["sondajes", "geologiaSondajes"]
  },
  {
    label: "Trabajadores",
    to: "/trabajadores",
    icon: Users,
    permission: "usuarios"
  },
  {
    label: "Roles y permisos",
    to: "/roles",
    icon: ShieldCheck,
    permission: "usuarios"
  },
  {
    label: "Solicitudes Data Room",
    to: "/solicitudes-data-room",
    icon: ClipboardList,
    permission: "solicitudes"
  },
  {
    label: "Auditoría",
    to: "/auditoria",
    icon: History,
    adminOnly: true
  }
];

type UserRouteMenuProps = {
  buttonClassName?: string;
  menuClassName?: string;
  logoutClassName?: string;
  align?: "left" | "right";
  onNavigate?: () => void;
  // false: el menú solo muestra la cuenta y «Cerrar sesión» (la navegación ya está en la barra).
  showRoutes?: boolean;
};

export function UserRouteMenu({
  buttonClassName,
  menuClassName,
  logoutClassName,
  align = "right",
  onNavigate,
  showRoutes = true
}: UserRouteMenuProps) {
  const { user, logout, can, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);

  const routes = useMemo(
    () =>
      SYSTEM_ROUTES.filter((route) => {
        if (route.dashboard) return homePathFor(user) === "/dashboard";
        if (route.adminOnly) return isAdmin;
        return route.permission ? can(route.permission) : true;
      }),
    [user, can, isAdmin]
  );

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const handleLogout = () => {
    logout();
    setOpen(false);
    onNavigate?.();
    navigate(getPostLogoutPath(window.location.hostname), { replace: true });
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={
          buttonClassName ??
          "inline-flex items-center gap-2 rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] px-3.5 py-2.5 text-xs font-bold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)]"
        }
      >
        <UserCircle size={18} />
        <span className={`max-w-32 truncate ${showRoutes ? "" : "hidden sm:inline"}`}>{user?.nombre ?? "Perfil"}</span>
        <ChevronDown size={14} className={open ? "rotate-180 transition" : "transition"} />
      </button>

      {open ? (
        <div
          role="menu"
          className={
            menuClassName ??
            `absolute ${align === "right" ? "right-0" : "left-0"} top-full z-50 mt-2 w-72 overflow-hidden rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] shadow-2xl`
          }
        >
          <div className="border-b border-[var(--color-border-soft)] px-3 py-2">
            <p className="truncate text-sm font-bold text-[var(--color-on-surface)]">
              {user?.nombre ?? "Usuario"}
            </p>
            <p className="truncate text-xs text-[var(--color-on-surface-variant)]">
              {user?.email ?? user?.role ?? ""}
            </p>
          </div>
          {showRoutes ? (
          <div className="max-h-80 overflow-y-auto p-1">
            {routes.map((route) => {
              const Icon = route.icon;
              const active = location.pathname === route.to;
              return (
                <Link
                  key={route.to}
                  to={route.to}
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    onNavigate?.();
                  }}
                  className={`flex items-center gap-2 rounded px-3 py-2 text-sm font-semibold transition ${
                    active
                      ? "bg-[var(--color-primary)] text-[var(--color-on-primary)]"
                      : "text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-high)]"
                  }`}
                >
                  <Icon size={16} />
                  <span>{route.label}</span>
                </Link>
              );
            })}
          </div>
          ) : null}
          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            className={
              logoutClassName ??
              "flex w-full items-center gap-2 border-t border-[var(--color-border-soft)] px-4 py-3 text-left text-sm font-bold text-[var(--color-error)] transition hover:bg-[var(--color-surface-container-high)]"
            }
          >
            <LogOut size={16} />
            Cerrar sesión
          </button>
        </div>
      ) : null}
    </div>
  );
}
