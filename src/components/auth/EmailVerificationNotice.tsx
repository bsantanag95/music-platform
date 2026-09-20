"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { apiFetch, ApiError } from "@/lib/api/client";
import { OkResponseSchema } from "@/lib/api/schemas";

const localizedErrorCodes = new Set([
  "RATE_LIMITED",
  "EMAIL_CONFIG_MISSING",
  "INTERNAL_ERROR",
]);

export function EmailVerificationNotice({ verified }: { verified: boolean }) {
  const t = useTranslations("auth");
  const tErrors = useTranslations("errors");
  const locale = useLocale();
  const [status, setStatus] = useState<"idle" | "sent" | "already">("idle");
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (verified) return null;

  const handleResend = async () => {
    setErrorCode(null);
    setPending(true);
    try {
      await apiFetch("/api/auth/email/verify/resend", OkResponseSchema, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ locale }),
      });
      setStatus("sent");
    } catch (error) {
      if (error instanceof ApiError && error.code === "EMAIL_ALREADY_VERIFIED") {
        setStatus("already");
      } else {
        setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <section
      role="status"
      aria-label={t("verifyEmailBannerTitle")}
      className="flex w-full max-w-md flex-col gap-3 rounded-md border border-ink-border bg-ink-surface px-4 py-3"
    >
      <h2 className="font-display text-lg text-paper">{t("verifyEmailBannerTitle")}</h2>
      <p className="font-body text-sm text-paper-muted">{t("verifyEmailBannerDescription")}</p>
      {(status === "sent" || status === "already") && (
        <p className="font-data text-sm text-paper">
          {status === "sent" ? t("verifyEmailResent") : t("verifyEmailAlreadyVerified")}
        </p>
      )}
      {errorCode && (
        <p role="alert" className="font-data text-sm text-danger">
          {tErrors(
            `${localizedErrorCodes.has(errorCode) ? errorCode : "INTERNAL_ERROR"}.description`,
          )}
        </p>
      )}
      {status === "idle" && (
        <button
          type="button"
          onClick={handleResend}
          disabled={pending}
          className="cursor-pointer self-start rounded-md bg-accent px-3 py-2 font-display text-sm text-ink disabled:cursor-wait disabled:opacity-60"
        >
          {pending ? t("submitting") : t("verifyEmailResend")}
        </button>
      )}
    </section>
  );
}
