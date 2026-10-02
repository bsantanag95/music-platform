"use client";

import { useState } from "react";
import type { SubmitEventHandler } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { apiFetch, ApiError } from "@/lib/api/client";
import { OkResponseSchema, ResetPasswordRequestSchema } from "@/lib/api/schemas";
import { PASSWORD_MAX, PASSWORD_MIN } from "@/services/auth/account-rules";
import { Button } from "@/components/ui/Button";
import { AuthField } from "./AuthField";

const localizedErrorCodes = new Set([
  "INVALID_RESET_TOKEN",
  "PASSWORD_REUSED",
  "RATE_LIMITED",
  "VALIDATION_ERROR",
  "INTERNAL_ERROR",
]);

export function ResetPasswordForm({ token }: { token: string }) {
  const t = useTranslations("auth");
  const tErrors = useTranslations("errors");
  const router = useRouter();
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [mismatch, setMismatch] = useState(false);
  const [tooShort, setTooShort] = useState(false);
  const [pending, setPending] = useState(false);

  const handleSubmit: SubmitEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    setErrorCode(null);
    setMismatch(false);
    setTooShort(false);
    const form = event.currentTarget;
    const data = new FormData(form);
    const password = String(data.get("password") ?? "");
    const confirmation = String(data.get("confirmPassword") ?? "");
    if (password.length < PASSWORD_MIN) {
      setTooShort(true);
      form.querySelector<HTMLInputElement>('input[name="password"]')?.focus();
      return;
    }
    if (password !== confirmation) {
      setMismatch(true);
      form.querySelector<HTMLInputElement>('input[name="confirmPassword"]')?.focus();
      return;
    }
    const parsed = ResetPasswordRequestSchema.safeParse({ token, password });
    if (!parsed.success) {
      setErrorCode("VALIDATION_ERROR");
      return;
    }
    setPending(true);
    try {
      await apiFetch("/api/auth/password/reset", OkResponseSchema, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      router.push("/auth/login?reset=1");
      router.refresh();
    } catch (error) {
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    } finally {
      setPending(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      onChange={() => {
        setMismatch(false);
        setTooShort(false);
      }}
      noValidate
      className="flex w-full flex-col gap-5"
    >
      <AuthField
        name="password"
        label={t("newPassword")}
        icon="lock"
        revealable
        autoComplete="new-password"
        required
        minLength={PASSWORD_MIN}
        maxLength={PASSWORD_MAX}
        hint={t("passwordHint", { min: PASSWORD_MIN })}
        error={tooShort ? t("errorPasswordShort", { min: PASSWORD_MIN }) : undefined}
      />
      <AuthField
        name="confirmPassword"
        label={t("confirmPassword")}
        icon="lock"
        revealable
        autoComplete="new-password"
        required
        minLength={PASSWORD_MIN}
        maxLength={PASSWORD_MAX}
        error={mismatch ? t("passwordMismatch") : undefined}
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
        {pending ? t("submitting") : t("resetSubmit")}
      </Button>
    </form>
  );
}
