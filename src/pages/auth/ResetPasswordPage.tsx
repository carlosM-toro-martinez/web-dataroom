import { FormEvent, useMemo, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useResetPasswordMutation } from "@/features/auth/hooks/useResetPasswordMutation";
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
  authSplitCardClassName,
  getAuthMessageClassName
} from "@/pages/auth/authUi";

const resetPasswordTokenStorageKey = "auth:reset-password-token";

export function ResetPasswordPage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const tokenFromState = (location.state as { token?: string } | null)?.token ?? "";
  const tokenFromQuery = searchParams.get("token") ?? "";
  const tokenFromSession = window.sessionStorage.getItem(resetPasswordTokenStorageKey) ?? "";
  const resolvedInitialToken = useMemo(
    () => tokenFromState || tokenFromSession || tokenFromQuery,
    [tokenFromQuery, tokenFromSession, tokenFromState]
  );

  if (tokenFromState) {
    window.sessionStorage.setItem(resetPasswordTokenStorageKey, tokenFromState);
  } else if (tokenFromQuery) {
    window.sessionStorage.setItem(resetPasswordTokenStorageKey, tokenFromQuery);
  }

  const [token, setToken] = useState(resolvedInitialToken);
  const [isManualTokenMode, setIsManualTokenMode] = useState(!resolvedInitialToken);
  const resetPasswordMutation = useResetPasswordMutation();
  const { showError, showSuccess } = useToast();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const passwordMinLengthMet = password.length >= 8;
  const passwordsMatch = password.length > 0 && confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;
  const canSubmit =
    token.trim().length > 0 &&
    password.length >= 8 &&
    confirmPassword.length >= 8 &&
    password === confirmPassword;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetPasswordMutation.mutate(
      {
        token,
        password,
        confirmPassword
      },
      {
        onSuccess: (response) => {
          window.sessionStorage.removeItem(resetPasswordTokenStorageKey);
          showSuccess(response.message);
        },
        onError: (error) => {
          const message =
            error instanceof ApiError ? error.message : "No se pudo restablecer la contraseña.";
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
              Restablecer Acceso
            </div>
            <h1 className="page-title mt-4 font-headline text-4xl font-extrabold leading-tight">
              Nueva contraseña
            </h1>
            <p className="mt-3 max-w-md text-sm text-[var(--color-on-surface-variant)]">
              Configura tu nueva contraseña y recupera el control de tu cuenta.
            </p>
          </aside>

          <div className={authFormPanelClassName}>
            <h2 className="page-title font-headline text-3xl font-extrabold">Actualizar contraseña</h2>
            <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">
              Configura tu nueva contraseña para completar la recuperacion.
            </p>

            <form className="mt-6 space-y-4" onSubmit={onSubmit}>
              {isManualTokenMode ? (
                <div>
                  <label className={authLabelClassName} htmlFor="reset-token">
                    Token de recuperación
                  </label>
                  <input
                    id="reset-token"
                    required
                    value={token}
                    onChange={(event) => setToken(event.target.value)}
                    className={authInputClassName}
                    placeholder="Pega aquí el token del correo"
                  />
                </div>
              ) : (
                <div className="rounded-lg border border-[var(--color-success)]/35 bg-[var(--color-success)]/12 px-3 py-2 text-xs font-semibold text-[var(--color-success)]">
                  Token de recuperacion detectado automaticamente.
                  <button
                    type="button"
                    onClick={() => {
                      setIsManualTokenMode(true);
                      setToken("");
                    }}
                    className="ml-2 underline underline-offset-2"
                  >
                    Usar otro token
                  </button>
                </div>
              )}

              <PasswordInput
                required
                minLength={8}
                label="Contraseña"
                labelClassName={authLabelClassName}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={`${authInputClassName} pr-10`}
                placeholder="Minimo 8 caracteres"
              />

              <PasswordInput
                required
                minLength={8}
                label="Confirmar contraseña"
                labelClassName={authLabelClassName}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className={`${authInputClassName} pr-10`}
                placeholder="Repite la contraseña"
              />

              {password.length > 0 ? (
                <p className={getAuthMessageClassName(passwordMinLengthMet)}>
                  {passwordMinLengthMet
                    ? "La contraseña cumple el minimo de 8 caracteres."
                    : "La contraseña debe tener al menos 8 caracteres."}
                </p>
              ) : null}

              {passwordsMismatch ? (
                <p className={getAuthMessageClassName(false)}>Las contraseñas no coinciden.</p>
              ) : null}

              {passwordsMatch ? (
                <p className={getAuthMessageClassName(true)}>Las contraseñas coinciden.</p>
              ) : null}

              <button
                type="submit"
                disabled={resetPasswordMutation.isPending || !canSubmit}
                className={authPrimaryButtonClassName}
              >
                {resetPasswordMutation.isPending ? "Actualizando..." : "Actualizar contraseña"}
              </button>
            </form>

            <p className="mt-4 text-center text-xs text-[var(--color-on-surface-variant)]">
              <Link to="/login" className="text-[var(--color-primary-dim)] transition hover:opacity-80">
                Ir al login
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
