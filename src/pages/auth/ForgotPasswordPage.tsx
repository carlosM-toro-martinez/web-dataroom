import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForgotPasswordMutation } from "@/features/auth/hooks/useForgotPasswordMutation";
import { ApiError } from "@/shared/api/core/apiError";
import { useToast } from "@/shared/ui/toast/ToastProvider";
import {
  AuthMiningBackdrop,
  authFormPanelClassName,
  authInputClassName,
  authLabelClassName,
  authLayoutClassName,
  authLayoutStyle,
  authPrimaryButtonClassName,
  authSecondaryButtonClassName,
  authSidePanelClassName,
  authSplitCardClassName
} from "@/pages/auth/authUi";

const resetPasswordTokenStorageKey = "auth:reset-password-token";

export function ForgotPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const forgotPasswordMutation = useForgotPasswordMutation();
  const { showError, showSuccess } = useToast();
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [token, setToken] = useState("");

  useEffect(() => {
    const tokenFromEmailLink = searchParams.get("token");
    if (!tokenFromEmailLink) return;

    const normalizedToken = tokenFromEmailLink.trim();
    if (!normalizedToken) return;

    window.sessionStorage.setItem(resetPasswordTokenStorageKey, normalizedToken);
    navigate("/reset-password", {
      replace: true,
      state: { token: normalizedToken }
    });
  }, [navigate, searchParams]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    forgotPasswordMutation.mutate(
      { email },
      {
        onSuccess: (response) => showSuccess(response.message),
        onError: (error) => {
          const message =
            error instanceof ApiError
              ? error.message
              : "No se pudo solicitar la recuperación de contraseña.";
          showError(message);
        }
      }
    );
  }

  function onUseToken(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedToken = token.trim();
    if (normalizedToken) {
      window.sessionStorage.setItem(resetPasswordTokenStorageKey, normalizedToken);
    }
    navigate("/reset-password", {
      state: normalizedToken ? { token: normalizedToken } : undefined
    });
  }

  return (
    <main className={authLayoutClassName} style={authLayoutStyle}>
      <AuthMiningBackdrop />
      <section className={authSplitCardClassName}>
        <div className="grid md:grid-cols-[1.15fr_1fr]">
          <aside className={authSidePanelClassName}>
            <div className="inline-flex rounded-full border border-[var(--color-primary)]/35 bg-[var(--color-primary)]/12 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-primary)]">
              Recuperación Segura
            </div>
            <h1 className="page-title mt-4 font-headline text-4xl font-extrabold leading-tight">
              Recuperar contraseña
            </h1>
            <p className="mt-3 max-w-md text-sm text-[var(--color-on-surface-variant)]">
              Solicita un token de recuperación y restablece el acceso de forma rápida.
            </p>
          </aside>

          <div className={authFormPanelClassName}>
            <h2 className="page-title font-headline text-3xl font-extrabold">Enviar token</h2>
            <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">
              Ingresa tu email corporativo.
            </p>

            <form className="mt-6 space-y-4" onSubmit={onSubmit}>
              <div>
                <label className={authLabelClassName} htmlFor="forgot-email">
                  Email
                </label>
                <input
                  id="forgot-email"
                  required
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className={authInputClassName}
                  placeholder="usuario@empresa.com"
                />
              </div>

              <button
                type="submit"
                disabled={forgotPasswordMutation.isPending}
                className={authPrimaryButtonClassName}
              >
                {forgotPasswordMutation.isPending ? "Solicitando..." : "Enviar token"}
              </button>
            </form>

            <form className="mt-5 space-y-3 border-t border-[var(--color-border-soft)] pt-4" onSubmit={onUseToken}>
              <p className="text-xs uppercase tracking-widest text-[var(--color-primary-dim)]">Ya tengo un token</p>
              <input
                value={token}
                onChange={(event) => setToken(event.target.value)}
                className={authInputClassName}
                placeholder="Pega aquí el token recibido por correo"
              />
              <button type="submit" className={authSecondaryButtonClassName}>
                Continuar con token
              </button>
            </form>

            <p className="mt-4 text-center text-xs text-[var(--color-on-surface-variant)]">
              <Link to="/login" className="text-[var(--color-primary-dim)] transition hover:opacity-80">
                Volver al login
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
