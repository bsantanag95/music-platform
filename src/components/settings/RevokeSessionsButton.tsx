"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { apiFetch, ApiError } from "@/lib/api/client";
import { OkResponseSchema } from "@/lib/api/schemas";
import { useRouter } from "@/i18n/navigation";

// "Cerrar todas las sesiones" (spec owner-settings, "Pantalla Cuenta y
// seguridad"): pide confirmación, llama a `DELETE /api/auth/revoke-all` y, como
// esa ruta también borra la cookie de la sesión actual, dirige a la persona al
// inicio de sesión. Cancelar no cierra ninguna sesión.
export function RevokeSessionsButton() {
  const t = useTranslations("users");
  const tErrors = useTranslations("errors");
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  async function revoke() {
    setPending(true);
    setErrorCode(null);
    try {
      await apiFetch("/api/auth/revoke-all", OkResponseSchema, { method: "DELETE" });
      setConfirming(false);
      router.push("/auth/login");
      router.refresh();
    } catch (error) {
      setConfirming(false);
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button type="button" variant="secondary" disabled={pending} onClick={() => setConfirming(true)}>
        {t("settings.account.sessions.button")}
      </Button>
      {errorCode && (
        <span role="alert" className="font-data text-xs text-danger">
          {tErrors(`${errorCode}.description`)}
        </span>
      )}
      <ConfirmDialog
        open={confirming}
        title={t("settings.account.sessions.confirmTitle")}
        message={t("settings.account.sessions.confirmMessage")}
        confirmLabel={t("settings.account.sessions.confirm")}
        cancelLabel={t("settings.account.sessions.cancel")}
        danger
        onConfirm={() => void revoke()}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}
