"use client";

import { useId, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { PasswordToggle } from "@/components/ui/PasswordToggle";

type FieldIcon = "user" | "email" | "lock";

const iconProps = {
  className: "h-4 w-4",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

const icons: Record<FieldIcon, ReactNode> = {
  user: (
    <svg {...iconProps}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  email: (
    <svg {...iconProps}>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  ),
  lock: (
    <svg {...iconProps}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
};

interface AuthFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "name"> {
  name: string;
  label: string;
  icon: FieldIcon;
  error?: string;
  hint?: string;
  // Contenido a la derecha de la etiqueta (ej. "¿Olvidaste tu contraseña?").
  aside?: ReactNode;
  // Agrega el botón de mostrar/ocultar; el campo pasa a ser `type="password"`.
  revealable?: boolean;
}

// Campo de los formularios de autenticación: etiqueta, ícono, ancho completo,
// error o pista asociados por `aria-describedby` y, si corresponde, el botón
// para mostrar la contraseña (un clic alterna; funciona con teclado y táctil).
export function AuthField({
  name,
  label,
  icon,
  error,
  hint,
  aside,
  revealable = false,
  className = "",
  ...inputProps
}: AuthFieldProps) {
  const id = useId();
  const messageId = `${id}-message`;
  const [revealed, setRevealed] = useState(false);
  const message = error ?? hint;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="font-data text-sm text-paper">
          {label}
        </label>
        {aside}
      </div>
      <div className="group relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-paper-muted transition-colors duration-150 group-focus-within:text-paper">
          {icons[icon]}
        </span>
        <input
          {...inputProps}
          id={id}
          name={name}
          type={revealable ? (revealed ? "text" : "password") : inputProps.type}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? messageId : undefined}
          className={`auth-input h-11 w-full rounded-md border bg-ink-surface pl-10 font-data text-base text-paper transition-colors duration-150 hover:border-paper-muted/50 focus-visible:border-accent focus-visible:outline-offset-0 ${
            revealable ? "pr-12" : "pr-3"
          } ${error ? "border-danger" : "border-ink-border"} ${className}`}
        />
        {revealable && (
          <PasswordToggle
            revealed={revealed}
            onToggle={() => setRevealed((current) => !current)}
            disabled={inputProps.disabled}
          />
        )}
      </div>
      {message && (
        <p
          id={messageId}
          className={`font-data text-sm ${error ? "text-danger" : "text-paper-muted"}`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
