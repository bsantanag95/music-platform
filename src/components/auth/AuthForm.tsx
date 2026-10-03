"use client";

import { useState } from "react";
import type { ReactNode, SubmitEventHandler, SyntheticEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { apiFetch, ApiError } from "@/lib/api/client";
import {
  AuthResponseSchema,
  LoginRequestSchema,
  RegisterRequestSchema,
} from "@/lib/api/schemas";
import {
  PASSWORD_MIN,
  USERNAME_MAX,
  USERNAME_MIN,
} from "@/services/auth/account-rules";
import { Button } from "@/components/ui/Button";
import { AuthField } from "./AuthField";

const localizedErrorCodes = new Set([
  "INVALID_CREDENTIALS",
  "USERNAME_TAKEN",
  "EMAIL_TAKEN",
  "RATE_LIMITED",
  "INTERNAL_ERROR",
]);

// Errores del servidor que pertenecen a un campo concreto, no al formulario.
const fieldOfServerError: Record<string, string> = {
  USERNAME_TAKEN: "username",
  EMAIL_TAKEN: "email",
};

type FieldErrors = Record<string, string>;

export function AuthForm({
  mode,
  passwordAside,
  remember: rememberProp,
  onRememberChange,
}: {
  mode: "login" | "register";
  // Enlace junto a la etiqueta de contraseña (login: "¿Olvidaste tu contraseña?").
  passwordAside?: ReactNode;
  // Casilla "Mantener la sesión iniciada" (solo login). Se controla desde fuera
  // cuando el botón de Google debe reflejarla (LoginPanel); sola, vive aquí.
  remember?: boolean;
  onRememberChange?: (remember: boolean) => void;
}) {
  const t = useTranslations("auth");
  const tErrors = useTranslations("errors");
  const locale = useLocale();
  const router = useRouter();
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [pending, setPending] = useState(false);
  const [ownRemember, setOwnRemember] = useState(true);
  const remember = rememberProp ?? ownRemember;
  const setRemember = onRememberChange ?? setOwnRemember;

  // Mensaje de validación del cliente según el campo y lo que se escribió.
  const clientMessage = (field: string, value: string): string => {
    switch (field) {
      case "username": {
        const length = value.trim().length;
        return length < USERNAME_MIN || length > USERNAME_MAX
          ? t("errorUsernameLength", { min: USERNAME_MIN, max: USERNAME_MAX })
          : t("errorUsernameFormat");
      }
      case "email":
        return t("errorEmail");
      case "identifier":
        return t("errorIdentifier");
      case "password":
        return mode === "login" || value.length === 0
          ? t("errorPasswordEmpty")
          : t("errorPasswordShort", { min: PASSWORD_MIN });
      default:
        return t("validation");
    }
  };

  const focusField = (form: HTMLFormElement, field: string) => {
    const element = form.elements.namedItem(field);
    if (element instanceof HTMLInputElement) element.focus();
  };

  const handleSubmit: SubmitEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    setErrorCode(null);
    setFieldErrors({});
    const fields = Object.fromEntries(new FormData(form));
    const data = mode === "register" ? { ...fields, locale } : { ...fields, remember };
    const parsed =
      mode === "login"
        ? LoginRequestSchema.safeParse(data)
        : RegisterRequestSchema.safeParse(data);
    if (!parsed.success) {
      const errors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0]);
        if (field !== "locale" && !(field in errors)) {
          errors[field] = clientMessage(field, String(fields[field] ?? ""));
        }
      }
      setFieldErrors(errors);
      const first = Object.keys(errors)[0];
      if (first) focusField(form, first);
      return;
    }
    setPending(true);
    try {
      const { user } = await apiFetch(`/api/auth/${mode}`, AuthResponseSchema, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const destination = mode === "register" ? "/welcome" : "/";
      const preferred = mode === "login" ? user.locale : null;
      if (preferred && preferred !== locale) router.push(destination, { locale: preferred });
      else router.push(destination);
      router.refresh();
    } catch (error) {
      const code = error instanceof ApiError ? error.code : "INTERNAL_ERROR";
      const field = fieldOfServerError[code];
      if (field) {
        setFieldErrors({ [field]: tErrors(`${code}.description`) });
        focusField(form, field);
      } else {
        setErrorCode(code);
      }
    } finally {
      setPending(false);
    }
  };

  // Al volver a escribir en un campo con error, el error deja de acusarlo.
  const handleChange = (event: SyntheticEvent<HTMLFormElement>) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || !(target.name in fieldErrors)) return;
    const { name } = target;
    setFieldErrors((current) => {
      const next = { ...current };
      delete next[name];
      return next;
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      onChange={handleChange}
      noValidate
      className="flex w-full flex-col gap-5"
    >
      {mode === "register" && (
        <AuthField
          name="username"
          label={t("username")}
          icon="user"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          minLength={USERNAME_MIN}
          maxLength={USERNAME_MAX}
          hint={t("usernameHint", { min: USERNAME_MIN, max: USERNAME_MAX })}
          error={fieldErrors.username}
        />
      )}
      {mode === "register" ? (
        <AuthField
          name="email"
          label={t("email")}
          icon="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          required
          error={fieldErrors.email}
        />
      ) : (
        <AuthField
          name="identifier"
          label={t("identifier")}
          icon="user"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          error={fieldErrors.identifier}
        />
      )}
      <AuthField
        name="password"
        label={t("password")}
        icon="lock"
        revealable
        autoComplete={mode === "login" ? "current-password" : "new-password"}
        required
        minLength={mode === "register" ? PASSWORD_MIN : 1}
        hint={mode === "register" ? t("passwordHint", { min: PASSWORD_MIN }) : undefined}
        error={fieldErrors.password}
        aside={mode === "login" ? passwordAside : undefined}
      />
      {errorCode && (
        <p
          role="alert"
          className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 font-data text-sm text-danger"
        >
          {tErrors(
            `${localizedErrorCodes.has(errorCode) ? errorCode : "INTERNAL_ERROR"}.description`,
          )}
        </p>
      )}
      {mode === "login" && (
        <label className="flex min-h-9 cursor-pointer items-center gap-2 font-data text-sm text-paper">
          <input
            type="checkbox"
            checked={remember}
            onChange={(event) => setRemember(event.target.checked)}
            className="size-4 shrink-0 accent-amber"
          />
          <span>{t("keepSignedIn")}</span>
        </label>
      )}
      <Button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="mt-1 h-11 w-full cursor-pointer disabled:cursor-wait"
      >
        {pending && (
          <span
            aria-hidden="true"
            className="size-4 animate-spin rounded-full border-2 border-ink/25 border-t-ink"
          />
        )}
        {pending ? t("submitting") : t(mode === "login" ? "submitLogin" : "submitRegister")}
      </Button>
    </form>
  );
}
