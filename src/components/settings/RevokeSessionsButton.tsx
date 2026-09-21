"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { apiFetch, ApiError } from "@/lib/api/client";
import { OkResponseSchema } from "@/lib/api/schemas";

// "Cerrar todas las sesiones" (spec owner-settings, "Pantalla Cuenta y
// seguridad"): pide confirmación, llama a `DELETE /api/auth/revoke-all` y, como
// esa ruta también borra la cookie de la sesión actual, recarga la página en el
// inicio de sesión. Cancelar no cierra ninguna sesión.
export function RevokeSessionsButton() {
  const t = useTranslations("users");
  const tErrors = useTranslations("errors");
  const locale = useLocale();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  async function revoke() {
    setPending(true);
    setErrorCode(null);
    try {
      await apiFetch("/api/auth/revoke-all", OkResponseSchema, { method: "DELETE" });
      setConfirming(false);
      // Recarga COMPLETA hacia el inicio de sesión: la sesión actual ya no existe y
      // cualquier estado del cliente o caché del router (la lista de sesiones, el
      // Header con el usuario) quedaría desactualizado. `router.push` + `refresh`
      // seguidos dejaban la pantalla tal cual.
      window.location.assign(`/${locale}/auth/login`);
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
