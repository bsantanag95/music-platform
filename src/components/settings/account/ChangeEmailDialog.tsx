"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { apiFetch, ApiError } from "@/lib/api/client";
import { OkResponseSchema } from "@/lib/api/schemas";
import { DialogError, DialogFooter, DialogSuccess, NoteList, SensitiveIdentity } from "./parts";

interface ChangeEmailDialogProps {
  open: boolean;
  onClose: () => void;
  currentEmail: string;
  hasPassword: boolean;
  /** Se llama con el email nuevo cuando el correo de confirmación ya salió. */
  onRequested: (newEmail: string) => void;
}

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// "Cambiar email" (spec account-credentials): pide el email nuevo y el factor de
// identidad; el servidor manda un correo de confirmación y el email actual NO
// cambia hasta que se confirme. Si la sesión de una cuenta de Google es antigua
// la API responde REAUTH_REQUIRED y se ofrece "Confirmar con Google".
export function ChangeEmailDialog({ open, onClose, currentEmail, hasPassword, onRequested }: ChangeEmailDialogProps) {
  const t = useTranslations("users");
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const trimmed = email.trim();
  const invalid = trimmed.length > 0 && !EMAIL_PATTERN.test(trimmed);
  const canSubmit = EMAIL_PATTERN.test(trimmed) && (!hasPassword || password.length > 0) && !pending;

  async function submit() {
    setPending(true);
    setErrorCode(null);
    try {
      await apiFetch("/api/me/account/email", OkResponseSchema, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail: trimmed, locale, ...(hasPassword ? { password } : {}) }),
      });
      setSentTo(trimmed);
      onRequested(trimmed);
    } catch (error) {
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    } finally {
      setPending(false);
      setPassword("");
    }
  }

  return (
    <Dialog open={open} title={t("settings.account.email.dialogTitle")} onClose={onClose}>
      {sentTo ? (
        <>
          <DialogSuccess>{t("settings.account.email.done", { email: sentTo, current: currentEmail })}</DialogSuccess>
          <DialogFooter done onCancel={onClose} submitLabel="" />
        </>
      ) : (
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (canSubmit) void submit();
          }}
        >
          <p className="font-body text-sm text-paper-muted">{t("settings.account.email.intro")}</p>
          <Input
            type="email"
            label={t("settings.account.email.label")}
            value={email}
            placeholder={t("settings.account.email.placeholder")}
            autoComplete="email"
            error={invalid ? t("settings.account.email.invalid") : undefined}
            onChange={(event) => {
              setEmail(event.target.value);
              setErrorCode(null);
            }}
          />
          <SensitiveIdentity
            hasPassword={hasPassword}
            password={password}
            onPasswordChange={setPassword}
            needsReauth={errorCode === "REAUTH_REQUIRED"}
          />
          <NoteList notes={[t("settings.account.email.note1"), t("settings.account.email.note2")]} />
          {/* En una cuenta de Google REAUTH_REQUIRED ya se explica con el botón. */}
          <DialogError code={errorCode === "REAUTH_REQUIRED" && !hasPassword ? null : errorCode} />
          <DialogFooter
            onCancel={onClose}
            submitLabel={pending ? t("settings.account.email.sending") : t("settings.account.email.submit")}
            pending={pending}
            disabled={!canSubmit}
          />
        </form>
      )}
    </Dialog>
  );
}
