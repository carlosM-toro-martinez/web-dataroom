import { InputHTMLAttributes, useId, useState } from "react";

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: string;
  wrapperClassName?: string;
  labelClassName?: string;
};

export function PasswordInput({
  label,
  className,
  wrapperClassName,
  labelClassName,
  id,
  ...inputProps
}: PasswordInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className={wrapperClassName}>
      <label
        className={labelClassName ?? "mb-1 block text-xs uppercase tracking-widest text-[#6f7fa3]"}
        htmlFor={inputId}
      >
        {label}
      </label>

      <div className="relative">
        <input
          {...inputProps}
          id={inputId}
          type={showPassword ? "text" : "password"}
          className={className}
        />

        <button
          type="button"
          aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
          title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
          onClick={() => setShowPassword((current) => !current)}
          className="absolute inset-y-0 right-3 inline-flex items-center text-[var(--color-on-surface-variant)] transition hover:text-[var(--color-tertiary)]"
        >
          {showPassword ? (
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 3l18 18" />
              <path d="M10.58 10.58a2 2 0 0 0 2.83 2.83" />
              <path d="M9.88 4.24A10.94 10.94 0 0 1 12 4c6 0 10 8 10 8a17.6 17.6 0 0 1-4.07 4.94" />
              <path d="M6.61 6.61A17.6 17.6 0 0 0 2 12s4 8 10 8a10.94 10.94 0 0 0 5.17-1.38" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 12s4-8 10-8 10 8 10 8-4 8-10 8-10-8-10-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
