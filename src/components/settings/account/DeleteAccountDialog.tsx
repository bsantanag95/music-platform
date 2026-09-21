"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { apiFetch, ApiError } from "@/lib/api/client";
import { OkResponseSchema } from "@/lib/api/schemas";
import { DialogError, DialogFooter, NoteList, SensitiveIdentity } from "./parts";

interface DeleteAccountDialogProps {
  open: boolean;
  onClose: () => void;
  username: string;
  hasPassword: boolean;
  /** "Desactivá la cuenta": cierra este diálogo y abre el de desactivar (la alternativa reversible). */
  onChooseDeactivate: () => void;
}

// "Eliminar cuenta" (spec account-lifecycle): borra todo lo que la persona creó, sin
// vuelta atrás. Lista lo que se borra, ofrece Desactivar como alternativa y exige
// escribir el usuario y el factor de identidad. Con historial de moderación la API
// responde ACCOUNT_DELETION_BLOCKED y el mensaje ya sugiere desactivar.
export function DeleteAccountDialog({
  open,
  onClose,
  username,
  hasPassword,
  onChooseDeactivate,
}: DeleteAccountDialogProps) {
  const t = useTranslations("users");
  const locale = useLocale();
  const [confirmation, setConfirmation] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const matches = confirmation.trim() === username;
  const canSubmit = matches && !pending && (!hasPassword || password.length > 0);

  async function submit() {
    setPending(true);
    setErrorCode(null);
    try {
      await apiFetch("/api/me/account", OkResponseSchema, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: confirmation.trim(), ...(hasPassword ? { password } : {}) }),
      });
      // La cuenta y su sesión ya no existen: recarga completa hacia el inicio.
      window.location.assign(`/${locale}`);
    } catch (error) {
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
      setPassword("");
      setPending(false);
    }
  }

  return (
    <Dialog open={open} title={t("settings.account.lifecycle.delete.dialogTitle")} onClose={onClose}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (canSubmit) void submit();
        }}
      >
        <p className="font-body text-sm text-danger">{t("settings.account.lifecycle.delete.warning")}</p>
        <NoteList
          notes={["item1", "item2", "item3"].map((key) => t(`settings.account.lifecycle.delete.${key}`))}
        />
        <p className="font-body text-sm text-paper-muted">
          {t("settings.account.lifecycle.delete.alternativePrefix")}{" "}
          <button type="button" onClick={onChooseDeactivate} className="text-amber underline">
            {t("settings.account.lifecycle.delete.alternativeLink")}
          </button>{" "}
          {t("settings.account.lifecycle.delete.alternativeSuffix")}
        </p>

        <Input
          label={t("settings.account.lifecycle.delete.confirmLabel", { username })}
          value={confirmation}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          onChange={(event) => {
            setConfirmation(event.target.value);
            setErrorCode(null);
          }}
        />
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
            pending ? t("settings.account.lifecycle.delete.saving") : t("settings.account.lifecycle.delete.submit")
          }
          pending={pending}
          disabled={!canSubmit}
          danger
        />
      </form>
    </Dialog>
  );
}
