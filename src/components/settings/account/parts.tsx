"use client";

import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

// Piezas compartidas por los diálogos de acciones sensibles de Cuenta y
// seguridad (spec owner-settings, "Pantalla Cuenta y seguridad").

// Códigos de error que las acciones de cuenta pueden devolver y que tienen
// texto en `errors.json`. Cualquier otro cae en INTERNAL_ERROR: nunca se muestra
// el mensaje crudo del servidor ni se pide una clave de traducción inexistente.
const KNOWN_ERROR_CODES = new Set([
  "VALIDATION_ERROR",
  "AUTH_REQUIRED",
  "INVALID_CREDENTIALS",
  "REAUTH_REQUIRED",
  "RATE_LIMITED",
  "USERNAME_TAKEN",
  "USERNAME_CHANGE_COOLDOWN",
  "EMAIL_TAKEN",
  "EMAIL_CONFIG_MISSING",
  "PASSWORD_REUSED",
  "LAST_ACCESS_METHOD",
  "OAUTH_IDENTITY_TAKEN",
  "OAUTH_IDENTITY_MISMATCH",
  "SESSION_NOT_FOUND",
  "ACCOUNT_DELETION_BLOCKED",
  "INTERNAL_ERROR",
]);

export function knownErrorCode(code: string): string {
  return KNOWN_ERROR_CODES.has(code) ? code : "INTERNAL_ERROR";
}

/** Enlace que arranca el flujo de Google para confirmar la identidad (intención `reauth`, retorno fijo a Ajustes). */
export function reauthHref(locale: string): string {
  return `/api/auth/google/start?intent=reauth&locale=${encodeURIComponent(locale)}`;
}

interface SensitiveIdentityProps {
  /** ¿La cuenta tiene contraseña? Si no, el factor es la sesión reciente. */
  hasPassword: boolean;
  password: string;
  onPasswordChange: (value: string) => void;
  /** La API respondió `REAUTH_REQUIRED`: hay que confirmar con Google. */
  needsReauth: boolean;
  disabled?: boolean;
}

// El factor de identidad de una acción sensible: la contraseña actual en cuentas
// con contraseña; en cuentas de Google, nada hasta que la API pida confirmar la
// identidad (sesión antigua) y entonces el botón "Confirmar con Google".
export function SensitiveIdentity({
  hasPassword,
  password,
  onPasswordChange,
  needsReauth,
  disabled,
}: SensitiveIdentityProps) {
  const t = useTranslations("users");
  const locale = useLocale();

  if (hasPassword) {
    return (
      <Input
        type="password"
        label={t("settings.account.identity.passwordLabel")}
        value={password}
        autoComplete="current-password"
        disabled={disabled}
        onChange={(event) => onPasswordChange(event.target.value)}
      />
    );
  }

  if (!needsReauth) return null;
  return (
    <div className="flex flex-col items-start gap-3 rounded border border-ink-border p-3">
      <p className="font-body text-sm text-paper-muted">{t("settings.account.identity.googleHint")}</p>
      <a
        href={reauthHref(locale)}
        className="inline-flex items-center justify-center rounded border border-ink-border bg-ink-surface px-4 py-2 font-display text-sm text-paper transition-colors hover:border-amber"
      >
        {t("settings.account.identity.googleButton")}
      </a>
    </div>
  );
}

interface DialogFooterProps {
  onCancel: () => void;
  submitLabel: string;
  pending?: boolean;
  disabled?: boolean;
  danger?: boolean;
  /** Etiqueta de cerrar cuando la acción ya terminó (sin botón de enviar). */
  done?: boolean;
}

export function DialogFooter({ onCancel, submitLabel, pending, disabled, danger, done }: DialogFooterProps) {
  const t = useTranslations("users");
  if (done) {
    return (
      <div className="flex justify-end">
        <Button type="button" variant="secondary" onClick={onCancel}>
          {t("settings.account.dialog.close")}
        </Button>
      </div>
    );
  }
  return (
    <div className="flex justify-end gap-2">
      <Button type="button" variant="ghost" onClick={onCancel}>
        {t("settings.account.dialog.cancel")}
      </Button>
      <Button
        type="submit"
        disabled={pending || disabled}
        className={danger ? "bg-danger text-paper hover:bg-danger/90" : undefined}
      >
        {submitLabel}
      </Button>
    </div>
  );
}

export function DialogError({ code }: { code: string | null }) {
  const tErrors = useTranslations("errors");
  if (!code) return null;
  return (
    <p role="alert" className="font-data text-xs text-danger">
      {tErrors(`${knownErrorCode(code)}.description`)}
    </p>
  );
}

export function DialogSuccess({ children }: { children: string }) {
  return (
    <p role="status" className="border-l-2 border-petrol pl-3 font-body text-sm text-paper">
      {children}
    </p>
  );
}

export function NoteList({ notes }: { notes: string[] }) {
  return (
    <ul className="flex list-disc flex-col gap-1 pl-5 font-body text-xs text-paper-muted">
      {notes.map((note) => (
        <li key={note}>{note}</li>
      ))}
    </ul>
  );
}
