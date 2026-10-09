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

type NoticeVariant = "settings" | "welcome" | "home";

interface EmailVerificationNoticeProps {
  verified: boolean;
  variant?: NoticeVariant;
}

export function EmailVerificationNotice({ verified, variant = "settings" }: EmailVerificationNoticeProps) {
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

  const titleKey = variant === "welcome" ? "verifyEmailWelcomeTitle" : variant === "home" ? "verifyEmailHomeTitle" : "verifyEmailBannerTitle";
  const descriptionKey = variant === "welcome" ? "verifyEmailWelcomeDescription" : variant === "home" ? "verifyEmailHomeDescription" : "verifyEmailBannerDescription";

  const containerClass = variant === "welcome"
    ? "grid w-full grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 rounded-md border border-amber/40 bg-amber/5 px-4 py-3"
    : variant === "home"
    ? "flex w-full max-w-3xl flex-col gap-2 rounded-md border border-ink-border bg-ink-surface px-4 py-3"
    : "flex w-full max-w-md flex-col gap-3 rounded-md border border-ink-border bg-ink-surface px-4 py-3";

  const titleClass = variant === "welcome"
    ? "col-start-1 font-display text-sm text-paper"
    : variant === "home"
    ? "font-display text-sm text-paper"
    : "font-display text-lg text-paper";

  const descriptionClass = variant === "welcome"
    ? "col-span-2 font-body text-xs text-paper-muted"
    : variant === "home"
    ? "font-body text-xs text-paper-muted"
    : "font-body text-sm text-paper-muted";

  // En bienvenida el aviso no compite con las dos puertas: aviso discreto y botón secundario
  // (un botón ámbar lleno era el elemento más llamativo de la página).
  const buttonClass = variant === "welcome"
    ? "col-start-2 row-start-1 min-h-11 cursor-pointer rounded-md border border-ink-border px-3 font-display text-sm text-paper transition-colors hover:border-amber disabled:cursor-wait disabled:opacity-60 sm:min-h-9"
    : "cursor-pointer self-start rounded-md bg-accent px-3 py-2 font-display text-sm text-ink disabled:cursor-wait disabled:opacity-60";

  return (
    <section
      role="status"
      aria-label={t(titleKey)}
      className={containerClass}
    >
      <h2 className={titleClass}>{t(titleKey)}</h2>
      <p className={descriptionClass}>{t(descriptionKey)}</p>
      {(status === "sent" || status === "already") && (
        <p className={`font-data text-sm text-paper ${variant === "welcome" ? "col-span-2" : ""}`}>
          {status === "sent" ? t("verifyEmailResent") : t("verifyEmailAlreadyVerified")}
        </p>
      )}
      {errorCode && (
        <p role="alert" className={`font-data text-sm text-danger ${variant === "welcome" ? "col-span-2" : ""}`}>
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
          className={buttonClass}
        >
          {pending ? t("submitting") : t("verifyEmailResend")}
        </button>
      )}
    </section>
  );
}
