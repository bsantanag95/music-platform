"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { apiFetch, ApiError } from "@/lib/api/client";
import { OkResponseSchema } from "@/lib/api/schemas";

const localizedErrorCodes = new Set([
  "INVALID_VERIFICATION_TOKEN",
  "RATE_LIMITED",
  "EMAIL_CONFIG_MISSING",
  "VALIDATION_ERROR",
  "INTERNAL_ERROR",
]);

export function VerifyEmailForm({ token }: { token: string }) {
  const t = useTranslations("auth");
  const tErrors = useTranslations("errors");
  const [done, setDone] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleVerify = async () => {
    setErrorCode(null);
    setPending(true);
    try {
      await apiFetch("/api/auth/email/verify", OkResponseSchema, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      setDone(true);
    } catch (error) {
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    } finally {
      setPending(false);
    }
  };

  if (done) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="font-display text-xl text-paper">{t("verifyEmailSuccessTitle")}</h2>
        <p className="font-body text-sm text-paper-muted">{t("verifyEmailSuccess")}</p>
        <Link
          href="/"
          className="rounded-md bg-accent px-4 py-3 text-center font-display text-sm text-ink hover:opacity-90"
        >
          {t("goToSearch")}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={handleVerify}
        disabled={pending}
        className="cursor-pointer rounded-md bg-accent px-4 py-3 font-display text-sm text-ink disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? t("submitting") : t("verifyEmailCta")}
      </button>
      {errorCode && (
        <p role="alert" className="font-data text-sm text-danger">
          {tErrors(
            `${localizedErrorCodes.has(errorCode) ? errorCode : "INTERNAL_ERROR"}.description`,
          )}
        </p>
      )}
    </div>
  );
}
