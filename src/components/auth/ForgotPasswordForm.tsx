"use client";

import { useState } from "react";
import type { SubmitEventHandler } from "react";
import { useLocale, useTranslations } from "next-intl";
import { apiFetch, ApiError } from "@/lib/api/client";
import { ForgotPasswordRequestSchema, OkResponseSchema } from "@/lib/api/schemas";
import { Button } from "@/components/ui/Button";
import { AuthField } from "./AuthField";

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
    const form = event.currentTarget;
    setErrorCode(null);
    setFieldError(false);
    const data = Object.fromEntries(new FormData(form));
    const parsed = ForgotPasswordRequestSchema.safeParse({ ...data, locale });
    if (!parsed.success) {
      setFieldError(true);
      form.querySelector("input")?.focus();
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
      <div role="status" className="flex flex-col gap-3">
        <h2 className="font-display text-xl text-paper">{t("forgotSentTitle")}</h2>
        <p className="font-body text-sm text-paper-muted">{t("forgotSent")}</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      onChange={() => setFieldError(false)}
      noValidate
      className="flex w-full flex-col gap-5"
    >
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
        error={fieldError ? t("errorEmail") : undefined}
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
      <Button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="mt-1 h-11 w-full cursor-pointer disabled:cursor-wait"
      >
        {pending ? t("submitting") : t("forgotSubmit")}
      </Button>
    </form>
  );
}
