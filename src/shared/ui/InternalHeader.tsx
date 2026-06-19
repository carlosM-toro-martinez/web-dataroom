import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Database, LayoutDashboard, MapPinned, MoonStar, Sun, Users } from "lucide-react";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useTheme } from "@/shared/theme/ThemeProvider";
import { UserRouteMenu } from "@/shared/ui/UserRouteMenu";
import type { AuthRole } from "@/features/auth/model/auth.schema";

type MainRoute = {
  label: string;
  to: string;
  icon: typeof LayoutDashboard;
  roles?: AuthRole[];
};

const MAIN_ROUTES: MainRoute[] = [
  { label: "Inicio", to: "/dashboard", icon: LayoutDashboard, roles: ["ADMIN", "SUPERINTENDENTE"] },
  { label: "Data Room", to: "/exploraciones-data-room", icon: Database },
  {
    label: "Exploraciones",
    to: "/exploraciones",
    icon: MapPinned,
    roles: ["ADMIN", "SUPERINTENDENTE", "GEOLOGO"]
  },
  {
    label: "Trabajadores",
    to: "/trabajadores",
    icon: Users,
    roles: ["ADMIN", "SUPERINTENDENTE"]
  }
];

type InternalHeaderProps = {
  title: string;
  description?: string;
  eyebrow?: string;
};

export function InternalHeader({
  title,
  description,
  eyebrow
}: InternalHeaderProps) {
  const { user } = useAuth();
  const { mode, setMode } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const routes = MAIN_ROUTES.filter((route) => {
    if (!route.roles?.length) return true;
    return user?.role ? route.roles.includes(user.role) : false;
  });

  return (
    <header className="overflow-visible rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-4 shadow-sm md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)]"
            aria-label="Volver"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0">
            {eyebrow ? (
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-[var(--color-primary)]">
                {eyebrow}
              </p>
            ) : null}
            <h1 className="page-title font-headline text-2xl font-extrabold md:text-3xl">
              {title}
            </h1>
            {description ? (
              <p className="mt-2 max-w-3xl text-sm text-[var(--color-on-surface-variant)]">
                {description}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="grid grid-cols-2 gap-1 rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] p-1">
            <button
              type="button"
              onClick={() => setMode("light")}
              className={`inline-flex items-center justify-center gap-1 rounded-lg px-2.5 py-2 text-xs font-bold transition ${
                mode === "light"
                  ? "bg-[var(--color-primary)] text-[var(--color-on-primary)] shadow-sm"
                  : "text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]"
              }`}
              aria-pressed={mode === "light"}
            >
              <Sun size={14} />
              Light
            </button>
            <button
              type="button"
              onClick={() => setMode("dark")}
              className={`inline-flex items-center justify-center gap-1 rounded-lg px-2.5 py-2 text-xs font-bold transition ${
                mode === "dark"
                  ? "bg-[var(--color-primary)] text-[var(--color-on-primary)] shadow-sm"
                  : "text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]"
              }`}
              aria-pressed={mode === "dark"}
            >
              <MoonStar size={14} />
              Dark
            </button>
          </div>
          <UserRouteMenu />
        </div>
      </div>

      <nav className="mt-5 flex flex-wrap gap-2 border-t border-[var(--color-border-soft)] pt-4">
        {routes.map((route) => {
          const Icon = route.icon;
          const active =
            location.pathname === route.to ||
            (route.to !== "/dashboard" && location.pathname.startsWith(route.to));
          return (
            <Link
              key={route.to}
              to={route.to}
              className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-bold transition ${
                active
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-on-primary)] shadow-sm"
                  : "border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)] hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)]"
              }`}
            >
              <Icon size={14} />
              {route.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
