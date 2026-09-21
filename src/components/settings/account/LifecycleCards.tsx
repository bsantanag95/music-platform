"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { SettingsCard } from "@/components/settings/SettingsSection";
import { apiFetch, ApiError } from "@/lib/api/client";
import { DeactivateAccountDialog } from "./DeactivateAccountDialog";
import { DeleteAccountDialog } from "./DeleteAccountDialog";
import { knownErrorCode } from "./parts";

interface LifecycleCardsProps {
  username: string;
  hasPassword: boolean;
}

const ROW = "flex items-center justify-between gap-4 border-t border-ink-border py-3 first-of-type:border-t-0";
const LABEL = "font-data text-xs uppercase tracking-wide text-paper-muted";

// Tarjetas "Pausar o salir" (desactivar y exportar) y "Eliminar cuenta" (zona de
// peligro, separada) de Cuenta y seguridad (spec owner-settings y account-lifecycle).
export function LifecycleCards({ username, hasPassword }: LifecycleCardsProps) {
  const t = useTranslations("users");
  const tErrors = useTranslations("errors");
  const [dialog, setDialog] = useState<"deactivate" | "delete" | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // La API responde el archivo JSON; se descarga desde el cliente (un enlace directo
  // guardaría el error como archivo si el límite de una exportación por minuto salta).
  async function exportData() {
    setExporting(true);
    setExported(false);
    setExportError(null);
    try {
      const data = await apiFetch("/api/me/export", z.record(z.string(), z.unknown()));
      const stamp = String(data.exportedAt ?? new Date().toISOString()).slice(0, 10);
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `music-platform-${username}-${stamp}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setExported(true);
    } catch (error) {
      setExportError(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <SettingsCard>
        <h3 className="mb-2 font-display text-sm text-paper-muted">{t("settings.account.lifecycle.pause.title")}</h3>

        <div className={ROW}>
          <div className="min-w-0">
            <div className={LABEL}>{t("settings.account.lifecycle.deactivate.title")}</div>
            <p className="max-w-[46ch] font-body text-sm text-paper-muted">
              {t("settings.account.lifecycle.deactivate.hint")}
            </p>
          </div>
          <Button type="button" variant="secondary" onClick={() => setDialog("deactivate")}>
            {t("settings.account.lifecycle.deactivate.button")}
          </Button>
        </div>

        <div className={ROW}>
          <div className="min-w-0">
            <div className={LABEL}>{t("settings.account.lifecycle.export.title")}</div>
            <p className="max-w-[46ch] font-body text-sm text-paper-muted">
              {t("settings.account.lifecycle.export.hint")}
            </p>
          </div>
          <Button type="button" variant="secondary" disabled={exporting} onClick={() => void exportData()}>
            {exporting ? t("settings.account.lifecycle.export.working") : t("settings.account.lifecycle.export.button")}
          </Button>
        </div>
        {exported && (
          <p role="status" className="mt-2 border-l-2 border-petrol pl-3 font-body text-sm text-paper">
            {t("settings.account.lifecycle.export.done")}
          </p>
        )}
        {exportError && (
          <p role="alert" className="mt-2 font-data text-xs text-danger">
            {tErrors(`${knownErrorCode(exportError)}.description`)}
          </p>
        )}
      </SettingsCard>

      <div className="rounded-lg border border-danger/35 bg-ink-surface p-5">
        <h3 className="mb-1 font-display text-sm text-danger">{t("settings.account.lifecycle.delete.title")}</h3>
        <p className="mb-4 max-w-[60ch] font-body text-sm text-paper-muted">
          {t("settings.account.lifecycle.delete.hint")}
        </p>
        <Button
          type="button"
          variant="secondary"
          className="border-danger/50 text-danger hover:border-danger"
          onClick={() => setDialog("delete")}
        >
          {t("settings.account.lifecycle.delete.button")}
        </Button>
      </div>

      {/* Se montan solo abiertos: cada apertura empieza con el formulario limpio. */}
      {dialog === "deactivate" && (
        <DeactivateAccountDialog open onClose={() => setDialog(null)} hasPassword={hasPassword} />
      )}
      {dialog === "delete" && (
        <DeleteAccountDialog
          open
          onClose={() => setDialog(null)}
          username={username}
          hasPassword={hasPassword}
          onChooseDeactivate={() => setDialog("deactivate")}
        />
      )}
    </>
  );
}
