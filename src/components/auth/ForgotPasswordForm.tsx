"use client";

import { useState } from "react";
import type { SubmitEventHandler } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { apiFetch, ApiError } from "@/lib/api/client";
import { ForgotPasswordRequestSchema, OkResponseSchema } from "@/lib/api/schemas";

const localizedErrorCodes = new Set([
  "RATE_LIMITED",
  "EMAIL_CONFIG_MISSING",
  "VALIDATION_ERROR",
  "INTERNAL_ERROR",
]);

export function ForgotPasswordForm() {
  const t = useTranslations("auth");
  const tErrors = useTranslations("errors");
  const locale = useLocale();
  const [sent, setSent] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState(false);
  const [pending, setPending] = useState(false);

  const handleSubmit: SubmitEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    setErrorCode(null);
    setFieldError(false);
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const parsed = ForgotPasswordRequestSchema.safeParse({ ...data, locale });
    if (!parsed.success) {
      setFieldError(true);
      return;
    }
    setPending(true);
    try {
      await apiFetch("/api/auth/password/forgot", OkResponseSchema, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      setSent(true);
    } catch (error) {
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    } finally {
      setPending(false);
    }
  };

  if (sent) {
    return (
      <div className="flex flex-col gap-3">
        <h2 className="font-display text-xl text-paper">{t("forgotSentTitle")}</h2>
        <p className="font-body text-sm text-paper-muted">{t("forgotSent")}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex w-full max-w-md flex-col gap-5">
      <label className="flex flex-col gap-2 font-data text-sm text-paper">
        {t("email")}
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          className="rounded-md border border-ink-border bg-ink-surface px-3 py-2"
        />
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
        className="cursor-pointer rounded-md bg-accent px-4 py-3 font-display text-sm text-ink disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? t("submitting") : t("forgotSubmit")}
      </button>
      <p className="font-data text-sm text-paper-muted">
        <Link href="/auth/login" className="text-accent hover:text-paper">
          {t("login")}
        </Link>
      </p>
    </form>
  );
}
