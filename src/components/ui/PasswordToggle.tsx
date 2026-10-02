"use client";

import { useTranslations } from "next-intl";

const eyeProps = {
  className: "h-4 w-4",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

interface PasswordToggleProps {
  revealed: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

// Ojo para mostrar/ocultar una contraseña: un clic alterna (funciona con
// teclado y táctil; mantener presionado no). Se posiciona dentro del contenedor
// `relative` del campo, a la derecha.
export function PasswordToggle({ revealed, onToggle, disabled }: PasswordToggleProps) {
  const t = useTranslations("common");
  return (
    <button
      type="button"
      aria-label={t(revealed ? "hidePassword" : "showPassword")}
      aria-pressed={revealed}
      disabled={disabled}
      onClick={onToggle}
      className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded text-paper-muted transition-colors duration-150 hover:text-paper disabled:cursor-not-allowed disabled:opacity-50"
    >
      {revealed ? (
        <svg {...eyeProps}>
          <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
          <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
          <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
          <line x1="2" x2="22" y1="2" y2="22" />
        </svg>
      ) : (
        <svg {...eyeProps}>
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )}
    </button>
  );
}
