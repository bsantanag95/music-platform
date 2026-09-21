"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { apiFetch, ApiError } from "@/lib/api/client";
import { OkResponseSchema } from "@/lib/api/schemas";

const localizedErrorCodes = new Set([
  "INVALID_VERIFICATION_TOKEN",
  "EMAIL_TAKEN",
  "RATE_LIMITED",
  "VALIDATION_ERROR",
  "INTERNAL_ERROR",
]);

// Botón que confirma el cambio de email con el token del enlace del correo.
export function ChangeEmailForm({ token }: { token: string }) {
  const t = useTranslations("auth");
  const tErrors = useTranslations("errors");
  const locale = useLocale();
  const [done, setDone] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleConfirm = async () => {
    setErrorCode(null);
    setPending(true);
    try {
      await apiFetch("/api/auth/email/change/confirm", OkResponseSchema.passthrough(), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, locale }),
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
        <h2 className="font-display text-xl text-paper">{t("changeEmailSuccessTitle")}</h2>
        <p className="font-body text-sm text-paper-muted">{t("changeEmailSuccess")}</p>
        <Link
          href="/me/settings/account"
          className="rounded-md bg-accent px-4 py-3 text-center font-display text-sm text-ink hover:opacity-90"
        >
          {t("changeEmailGoToSettings")}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={handleConfirm}
        disabled={pending}
        className="cursor-pointer rounded-md bg-accent px-4 py-3 font-display text-sm text-ink disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? t("submitting") : t("changeEmailConfirmButton")}
      </button>
      {errorCode && (
        <p role="alert" className="font-data text-sm text-danger">
          {tErrors(`${localizedErrorCodes.has(errorCode) ? errorCode : "INTERNAL_ERROR"}.description`)}
        </p>
      )}
    </div>
  );
}
