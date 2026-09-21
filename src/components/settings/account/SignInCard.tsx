"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SettingsCard } from "@/components/settings/SettingsSection";
import { apiFetch, ApiError } from "@/lib/api/client";
import { NoContentSchema } from "@/lib/api/schemas";
import { useRouter } from "@/i18n/navigation";
import { ChangePasswordDialog } from "./ChangePasswordDialog";
import { knownErrorCode } from "./parts";

export type GoogleFlash = { kind: "linked" | "confirmed" } | { kind: "error"; code: string } | null;

interface SignInCardProps {
  hasPassword: boolean;
  googleLinked: boolean;
  /** Resultado del flujo de Google que acaba de terminar (query `?google=`), si lo hay. */
  flash: GoogleFlash;
}

const ROW = "flex items-center justify-between gap-4 border-t border-ink-border py-3 first-of-type:border-t-0";
const LABEL = "font-data text-xs uppercase tracking-wide text-paper-muted";

// Tarjeta "Cómo iniciás sesión" (spec owner-settings y account-credentials):
// contraseña (cambiar o crear) y Google (vincular o desvincular). Desvincular
// queda deshabilitado —con la explicación— cuando Google es el único acceso.
export function SignInCard({
  hasPassword: initialHasPassword,
  googleLinked: initialGoogleLinked,
  flash: initialFlash,
}: SignInCardProps) {
  const t = useTranslations("users");
  const tErrors = useTranslations("errors");
  const locale = useLocale();
  const router = useRouter();
  const [hasPassword, setHasPassword] = useState(initialHasPassword);
  const [googleLinked, setGoogleLinked] = useState(initialGoogleLinked);
  const [passwordDialog, setPasswordDialog] = useState(false);
  // El modo se fija al abrir: crear la contraseña no debe convertir el diálogo
  // abierto en "cambiar" a mitad del éxito.
  const [dialogMode, setDialogMode] = useState<"change" | "create">("change");
  const [confirmingUnlink, setConfirmingUnlink] = useState(false);
  const [pending, setPending] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // El aviso del flujo de Google llega por el query (`?google=…`) y se CONSUME: se
  // guarda en estado y se quita de la URL. Si se quedara en ella, cada recarga
  // volvería a mostrar "Google quedó vinculada" aunque ya no lo esté.
  const [flash, setFlash] = useState<GoogleFlash>(initialFlash);

  useEffect(() => {
    if (initialFlash) window.history.replaceState(window.history.state, "", window.location.pathname);
  }, [initialFlash]);

  async function unlink() {
    setPending(true);
    setErrorCode(null);
    setNotice(null);
    setFlash(null);
    try {
      await apiFetch("/api/me/account/identities/google", NoContentSchema, { method: "DELETE" });
      setGoogleLinked(false);
      setNotice(t("settings.account.signIn.google.unlinked"));
      router.refresh();
    } catch (error) {
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    } finally {
      setPending(false);
      setConfirmingUnlink(false);
    }
  }

  const flashText =
    flash?.kind === "linked"
      ? t("settings.account.signIn.google.linkedNotice")
      : flash?.kind === "confirmed"
        ? t("settings.account.signIn.google.confirmedNotice")
        : null;
  const flashError = flash?.kind === "error" ? flash.code : null;
  const onlyMethod = googleLinked && !hasPassword;

  return (
    <SettingsCard>
      <h3 className="mb-2 font-display text-sm text-paper-muted">{t("settings.account.signIn.title")}</h3>

      <div className={ROW}>
        <div className="min-w-0">
          <div className={LABEL}>{t("settings.account.signIn.password.title")}</div>
          <div className="font-display text-base text-paper">
            {hasPassword ? t("settings.account.signIn.password.set") : t("settings.account.signIn.password.none")}
          </div>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setDialogMode(hasPassword ? "change" : "create");
            setPasswordDialog(true);
          }}
        >
          {hasPassword ? t("settings.account.signIn.password.change") : t("settings.account.signIn.password.create")}
        </Button>
      </div>

      <div className={ROW}>
        <div className="min-w-0">
          <div className={LABEL}>{t("settings.account.signIn.google.title")}</div>
          <div className="flex items-center gap-2 font-display text-base text-paper">
            {googleLinked ? t("settings.account.signIn.google.linked") : t("settings.account.signIn.google.notLinked")}
          </div>
        </div>
        {googleLinked ? (
          <Button
            type="button"
            variant="secondary"
            disabled={onlyMethod || pending}
            onClick={() => setConfirmingUnlink(true)}
          >
            {t("settings.account.signIn.google.unlink")}
          </Button>
        ) : (
          <a
            href={`/api/auth/google/start?intent=link&locale=${encodeURIComponent(locale)}`}
            className="inline-flex items-center justify-center rounded border border-ink-border bg-ink-surface px-4 py-2 font-display text-sm text-paper transition-colors hover:border-amber"
          >
            {t("settings.account.signIn.google.link")}
          </a>
        )}
      </div>

      {onlyMethod && (
        <p className="mt-2 border-l-2 border-ink-border pl-3 font-body text-xs text-paper-muted">
          {t("settings.account.signIn.google.lastMethod")}
        </p>
      )}
      {(flashText || notice) && (
        <p role="status" className="mt-3 border-l-2 border-petrol pl-3 font-body text-sm text-paper">
          {notice ?? flashText}
        </p>
      )}
      {(errorCode || flashError) && (
        <p role="alert" className="mt-3 font-data text-xs text-danger">
          {tErrors(`${knownErrorCode(errorCode ?? flashError ?? "INTERNAL_ERROR")}.description`)}
        </p>
      )}

      {passwordDialog && (
        <ChangePasswordDialog
          open
          onClose={() => setPasswordDialog(false)}
          mode={dialogMode}
          onSaved={() => {
            setHasPassword(true);
            router.refresh();
          }}
        />
      )}
      <ConfirmDialog
        open={confirmingUnlink}
        title={t("settings.account.signIn.google.unlinkTitle")}
        message={t("settings.account.signIn.google.unlinkMessage")}
        confirmLabel={t("settings.account.signIn.google.unlinkConfirm")}
        cancelLabel={t("settings.account.dialog.cancel")}
        danger
        onConfirm={() => void unlink()}
        onCancel={() => setConfirmingUnlink(false)}
      />
    </SettingsCard>
  );
}
