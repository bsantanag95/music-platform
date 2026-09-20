"use client";

import { useState } from "react";
import type { SubmitEventHandler } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { apiFetch, ApiError } from "@/lib/api/client";
import { OkResponseSchema, ResetPasswordRequestSchema } from "@/lib/api/schemas";

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
  const [pending, setPending] = useState(false);

  const handleSubmit: SubmitEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    setErrorCode(null);
    setMismatch(false);
    const data = new FormData(event.currentTarget);
    const password = String(data.get("password") ?? "");
    const confirmation = String(data.get("confirmPassword") ?? "");
    if (password !== confirmation) {
      setMismatch(true);
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
    <form onSubmit={handleSubmit} noValidate className="flex w-full max-w-md flex-col gap-5">
      <label className="flex flex-col gap-2 font-data text-sm text-paper">
        {t("newPassword")}
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={128}
          className="rounded-md border border-ink-border bg-ink-surface px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-2 font-data text-sm text-paper">
        {t("confirmPassword")}
        <input
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={128}
          className="rounded-md border border-ink-border bg-ink-surface px-3 py-2"
        />
      </label>
      {(mismatch || errorCode) && (
        <p role="alert" className="font-data text-sm text-danger">
          {mismatch
            ? t("passwordMismatch")
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
        {pending ? t("submitting") : t("resetSubmit")}
      </button>
    </form>
  );
}
