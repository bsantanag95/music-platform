"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Dialog } from "@/components/ui/Dialog";
import { apiFetch, ApiError } from "@/lib/api/client";
import { OkResponseSchema } from "@/lib/api/schemas";
import { DialogError, DialogFooter, NoteList, SensitiveIdentity } from "./parts";

interface DeactivateAccountDialogProps {
  open: boolean;
  onClose: () => void;
  hasPassword: boolean;
}

// "Desactivar cuenta" (spec account-lifecycle): oculta a la persona pero conserva
// su actividad. Explica qué se oculta y qué se conserva antes de pedir el factor
// de identidad. Al terminar la sesión ya no existe, así que recarga por completo
// hacia el inicio de sesión (iniciar sesión la reactiva).
export function DeactivateAccountDialog({ open, onClose, hasPassword }: DeactivateAccountDialogProps) {
  const t = useTranslations("users");
  const locale = useLocale();
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  async function submit() {
    setPending(true);
    setErrorCode(null);
    try {
      await apiFetch("/api/me/account/deactivate", OkResponseSchema, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(hasPassword ? { password } : {}),
      });
      window.location.assign(`/${locale}/auth/login`);
    } catch (error) {
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
      setPassword("");
      setPending(false);
    }
  }

  const canSubmit = !pending && (!hasPassword || password.length > 0);
  const list = (keys: string[]) => keys.map((key) => t(`settings.account.lifecycle.deactivate.${key}`));

  return (
    <Dialog open={open} title={t("settings.account.lifecycle.deactivate.dialogTitle")} onClose={onClose}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (canSubmit) void submit();
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <h3 className="font-data text-xs uppercase tracking-wide text-amber">
              {t("settings.account.lifecycle.deactivate.hidesTitle")}
            </h3>
            <NoteList notes={list(["hides1", "hides2", "hides3"])} />
          </div>
          <div className="flex flex-col gap-1.5">
            <h3 className="font-data text-xs uppercase tracking-wide text-amber">
              {t("settings.account.lifecycle.deactivate.keepsTitle")}
            </h3>
            <NoteList notes={list(["keeps1", "keeps2", "keeps3"])} />
          </div>
        </div>
        <p className="border-l-2 border-ink-border pl-3 font-body text-xs text-paper-muted">
          {t("settings.account.lifecycle.deactivate.note")}
        </p>
        <p className="font-body text-sm text-paper-muted">{t("settings.account.lifecycle.deactivate.reactivate")}</p>

        <SensitiveIdentity
          hasPassword={hasPassword}
          password={password}
          onPasswordChange={(value) => {
            setPassword(value);
            setErrorCode(null);
          }}
          needsReauth={errorCode === "REAUTH_REQUIRED"}
        />
        <DialogError code={errorCode === "REAUTH_REQUIRED" && !hasPassword ? null : errorCode} />
        <DialogFooter
          onCancel={onClose}
          submitLabel={
            pending ? t("settings.account.lifecycle.deactivate.saving") : t("settings.account.lifecycle.deactivate.submit")
          }
          pending={pending}
          disabled={!canSubmit}
        />
      </form>
    </Dialog>
  );
}
