"use client";

import { useState } from "react";
import type { SubmitEventHandler } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { apiFetch, ApiError } from "@/lib/api/client";
import {
  AuthResponseSchema,
  LoginRequestSchema,
  RegisterRequestSchema,
} from "@/lib/api/schemas";

const localizedErrorCodes = new Set([
  "INVALID_CREDENTIALS",
  "USERNAME_TAKEN",
  "EMAIL_TAKEN",
  "RATE_LIMITED",
  "INTERNAL_ERROR",
]);

const iconUser = (
  <svg className="h-4 w-4 text-paper-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const iconEmail = (
  <svg className="h-4 w-4 text-paper-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);

const iconLock = (
  <svg className="h-4 w-4 text-paper-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const iconEye = (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const iconEyeOff = (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
    <line x1="2" x2="22" y1="2" y2="22" />
  </svg>
);

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const t = useTranslations("auth");
  const tErrors = useTranslations("errors");
  const locale = useLocale();
  const router = useRouter();
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState(false);
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit: SubmitEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    setErrorCode(null);
    setFieldError(false);
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    const data = mode === "register" ? { ...fields, locale } : fields;
    const parsed =
      mode === "login"
        ? LoginRequestSchema.safeParse(data)
        : RegisterRequestSchema.safeParse(data);
    if (!parsed.success) {
      setFieldError(true);
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
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    } finally {
      setPending(false);
    }
  };

  const inputBase =
    "rounded-md border border-ink-border bg-ink-surface py-2 pl-10 pr-10 transition-colors duration-150 outline-none focus:border-accent focus:ring-1 focus:ring-accent/30";

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex w-full max-w-md flex-col gap-5"
    >
      {mode === "register" && (
        <label className="flex flex-col gap-2 font-data text-sm text-paper">
          {t("username")}
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
              {iconUser}
            </span>
            <input
              name="username"
              autoComplete="username"
              required
              minLength={3}
              maxLength={32}
              className={inputBase}
            />
          </div>
        </label>
      )}
      {mode === "register" ? (
        <label className="flex flex-col gap-2 font-data text-sm text-paper">
          {t("email")}
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
              {iconEmail}
            </span>
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              className={inputBase}
            />
          </div>
        </label>
      ) : (
        <label className="flex flex-col gap-2 font-data text-sm text-paper">
          {t("identifier")}
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
              {iconUser}
            </span>
            <input
              name="identifier"
              autoComplete="username"
              required
              className={inputBase}
            />
          </div>
        </label>
      )}
      <label className="flex flex-col gap-2 font-data text-sm text-paper">
        {t("password")}
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
            {iconLock}
          </span>
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
            minLength={mode === "register" ? 8 : 1}
            className={inputBase}
          />
          <button
            type="button"
            aria-label={t("togglePasswordVisibility")}
            aria-pressed={showPassword}
            onMouseDown={() => setShowPassword(true)}
            onMouseUp={() => setShowPassword(false)}
            onMouseLeave={() => setShowPassword(false)}
            onTouchStart={() => setShowPassword(true)}
            onTouchEnd={() => setShowPassword(false)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-paper-muted hover:text-paper transition-colors duration-150"
          >
            {showPassword ? iconEyeOff : iconEye}
          </button>
        </div>
      </label>
      {(fieldError || errorCode) && (
        <p role="alert" className="font-data text-sm text-danger">
          {fieldError
            ? t("validation")
            : tErrors(
                `${errorCode && localizedErrorCodes.has(errorCode) ? errorCode : "INTERNAL_ERROR"}.description`,
              )}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="cursor-pointer rounded-md bg-accent px-4 py-3 font-display text-sm text-ink transition-opacity duration-150 hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
      >
        {pending
          ? t("submitting")
          : t(mode === "login" ? "submitLogin" : "submitRegister")}
      </button>
    </form>
  );
}
