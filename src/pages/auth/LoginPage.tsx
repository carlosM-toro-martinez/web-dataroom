import { FormEvent, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { BadgeCheck, Clock3, ShieldCheck } from "lucide-react";
import { useLoginMutation } from "@/features/auth/hooks/useLoginMutation";
import { ApiError } from "@/shared/api/core/apiError";
import { PasswordInput } from "@/shared/ui/PasswordInput";
import { useToast } from "@/shared/ui/toast/ToastProvider";
import {
  AuthMiningBackdrop,
  authFormPanelClassName,
  authInputClassName,
  authLabelClassName,
  authLayoutClassName,
  authLayoutStyle,
  authPrimaryButtonClassName,
  authSidePanelClassName,
  authSplitCardClassName
} from "@/pages/auth/authUi";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectPath = (location.state as { from?: string } | null)?.from ?? "/dashboard";
  const loginMutation = useLoginMutation();
  const { showError, showSuccess } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const forgotPasswordPath = email.trim()
    ? `/forgot-password?email=${encodeURIComponent(email.trim())}`
    : "/forgot-password";

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    loginMutation.mutate(
      { email, password },
      {
        onSuccess: () => {
          showSuccess("Inicio de sesión exitoso.");
          navigate(redirectPath, { replace: true });
        },
        onError: (error) => {
          const message =
            error instanceof ApiError ? error.message : "No se pudo iniciar sesión.";
          showError(message);
        }
      }
    );
  }

  return (
    <main className={authLayoutClassName} style={authLayoutStyle}>
      <AuthMiningBackdrop />
      <section className={authSplitCardClassName}>
        <div className="grid md:grid-cols-[1.15fr_1fr]">
          <aside className={authSidePanelClassName}>
            <div className="inline-flex rounded-full border border-[var(--color-primary)]/35 bg-[var(--color-primary)]/12 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-primary)]">
              Plataforma Operativa
            </div>
            <h1 className="page-title mt-4 font-headline text-4xl font-extrabold leading-tight">
              Bienvenido a Minera Marte
            </h1>
            <p className="mt-3 max-w-md text-sm text-[var(--color-on-surface-variant)]">
              Inicia sesión para gestionar inventario, control operativo y trazabilidad en tiempo real.
            </p>

            <ul className="mt-7 space-y-3 text-sm">
              <li className="flex items-center gap-3 text-[var(--color-on-surface)]">
                <span className="rounded-md bg-[var(--color-primary)]/14 p-2 text-[var(--color-primary)]">
                  <ShieldCheck size={16} />
                </span>
                Acceso seguro con control de sesión activa.
              </li>
              <li className="flex items-center gap-3 text-[var(--color-on-surface)]">
                <span className="rounded-md bg-[var(--color-primary)]/14 p-2 text-[var(--color-primary)]">
                  <Clock3 size={16} />
                </span>
                Procesos listos para operación diaria.
              </li>
              <li className="flex items-center gap-3 text-[var(--color-on-surface)]">
                <span className="rounded-md bg-[var(--color-primary)]/14 p-2 text-[var(--color-primary)]">
                  <BadgeCheck size={16} />
                </span>
                Experiencia unificada en modo claro y oscuro.
              </li>
            </ul>
          </aside>

          <div className={authFormPanelClassName}>
            <h2 className="page-title font-headline text-3xl font-extrabold">Iniciar sesión</h2>
            <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">
              Accede con tu cuenta corporativa.
            </p>

            <form className="mt-6 space-y-4" onSubmit={onSubmit}>
              <div>
                <label className={authLabelClassName}>Email</label>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className={authInputClassName}
                  placeholder="usuario@empresa.com"
                />
              </div>

              <PasswordInput
                required
                label="Contraseña"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                labelClassName={authLabelClassName}
                className={`${authInputClassName} pr-10`}
                placeholder="••••••••"
              />

              <div className="text-right">
                <Link
                  to={forgotPasswordPath}
                  className="text-xs uppercase tracking-widest text-[var(--color-primary-dim)] transition hover:opacity-80"
                >
                  Olvidé mi contraseña
                </Link>
              </div>

              <button
                type="submit"
                disabled={loginMutation.isPending}
                className={authPrimaryButtonClassName}
              >
                {loginMutation.isPending ? "Ingresando..." : "Entrar"}
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
