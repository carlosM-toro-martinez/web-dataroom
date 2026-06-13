import type { CSSProperties } from "react";
import backgroundImage from "@/assets/background.jpeg";
import minerImage from "@/assets/miner.png";

export const authLayoutClassName =
  "auth-layout relative flex min-h-screen items-center justify-center overflow-hidden bg-cover bg-center bg-no-repeat p-6 text-[var(--color-on-surface)]";

export const authLayoutStyle: CSSProperties = {
  backgroundImage: `url(${backgroundImage})`
};

export const authCardClassName =
  "auth-card relative z-10 w-full max-w-md rounded-2xl border border-[var(--auth-card-border)] [background:var(--auth-card-bg)] p-7 shadow-[0_24px_70px_rgba(1,6,15,0.45)] backdrop-blur-md";

export const authSplitCardClassName =
  "auth-split-card relative z-10 w-full max-w-6xl overflow-hidden rounded-2xl border border-[var(--auth-card-border)] [background:var(--auth-card-bg)] shadow-[0_24px_70px_rgba(1,6,15,0.45)] backdrop-blur-md";

export const authSidePanelClassName =
  "auth-side-panel relative border-b border-[var(--color-border-soft)] p-7 md:border-b-0 md:border-r md:border-[var(--color-border-soft)] md:p-10";

export const authFormPanelClassName = "auth-form-panel p-7 md:p-10";

export const authLabelClassName =
  "mb-1 block text-xs uppercase tracking-widest text-[var(--color-on-surface-variant)]";

export const authInputClassName =
  "w-full rounded-lg border border-[var(--auth-input-border)] bg-[var(--auth-input-bg)] px-4 py-2.5 text-sm text-[var(--color-on-surface)] transition placeholder:text-[var(--color-on-surface-variant)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/35";

export const authPrimaryButtonClassName =
  "w-full rounded-lg bg-[linear-gradient(135deg,#9ecaff,#77b6ff)] px-5 py-2.5 text-sm font-semibold text-[#03284b] transition hover:brightness-105 disabled:opacity-60";

export const authSecondaryButtonClassName =
  "w-full rounded-lg border border-[var(--color-primary)]/55 bg-[#0f2347]/40 px-5 py-2.5 text-sm font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)]/10";

export function getAuthMessageClassName(isSuccess: boolean) {
  return isSuccess
    ? "rounded-lg border border-[var(--color-success)]/30 bg-[var(--color-success)]/10 px-3 py-2 text-sm text-[var(--color-success)]"
    : "rounded-lg border border-[var(--color-error)]/30 bg-[var(--color-error)]/10 px-3 py-2 text-sm text-[var(--color-error)]";
}

export function AuthMiningBackdrop() {
  return (
    <>
      <div className="pointer-events-none absolute inset-0 bg-[var(--auth-overlay)]" />
      <div className="auth-brand-chip pointer-events-none absolute left-6 top-6 z-20 rounded-xl border border-[var(--auth-brand-chip-border)] bg-[var(--auth-brand-chip-bg)] px-4 py-3 backdrop-blur-sm">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--auth-brand-title)]">
          Empresa Minera Marte
        </p>
        <p className="mt-1 text-[12px] font-bold uppercase tracking-[0.16em] text-[var(--auth-brand-subtitle)]">
          JVD Sistema Minero Integral
        </p>
      </div>
      <img
        src={minerImage}
        alt=""
        aria-hidden="true"
        className="auth-miner-image pointer-events-none absolute top-1 right-6 z-20 h-24 w-24 opacity-95 drop-shadow-[0_0_20px_rgba(245,201,136,0.45)] md:h-32 md:w-32"
      />
    </>
  );
}
