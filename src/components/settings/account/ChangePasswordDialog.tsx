"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { apiFetch, ApiError } from "@/lib/api/client";
import { OkResponseSchema } from "@/lib/api/schemas";
import { PASSWORD_MIN } from "@/services/auth/account-rules";
import { DialogError, DialogFooter, DialogSuccess, SensitiveIdentity } from "./parts";

interface ChangePasswordDialogProps {
  open: boolean;
  onClose: () => void;
  /** `change`: la cuenta ya tiene contraseña; `create`: alta con Google, sin contraseña. */
  mode: "change" | "create";
  /** Se llama cuando la contraseña quedó guardada (para refrescar el estado de acceso). */
  onSaved: () => void;
}

// "Cambiar contraseña" / "Crear contraseña" (spec account-credentials). El
// cambio pide la actual y ofrece cerrar las demás sesiones; la creación (cuenta
// de Google) pide sesión reciente y, si es antigua, confirmar con Google.
export function ChangePasswordDialog({ open, onClose, mode, onSaved }: ChangePasswordDialogProps) {
  const t = useTranslations("users");
  const locale = useLocale();
  const creating = mode === "create";
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [repeat, setRepeat] = useState("");
  const [revokeOthers, setRevokeOthers] = useState(true);
  const [pending, setPending] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [doneKey, setDoneKey] = useState<"doneChange" | "doneChangeRevoked" | "doneCreate" | null>(null);

  const tooShort = next.length > 0 && next.length < PASSWORD_MIN;
  const mismatch = repeat.length > 0 && next !== repeat;
  const valid = next.length >= PASSWORD_MIN && next === repeat && (creating || current.length > 0);

  async function submit() {
    setPending(true);
    setErrorCode(null);
    try {
      await apiFetch("/api/me/account/password", OkResponseSchema, {
        method: creating ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          creating
            ? { newPassword: next, locale }
            : { currentPassword: current, newPassword: next, revokeOtherSessions: revokeOthers, locale },
        ),
      });
      setDoneKey(creating ? "doneCreate" : revokeOthers ? "doneChangeRevoked" : "doneChange");
      onSaved();
    } catch (error) {
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    } finally {
      setPending(false);
      setCurrent("");
    }
  }

  const title = creating ? t("settings.account.password.createTitle") : t("settings.account.password.changeTitle");

  return (
    <Dialog open={open} title={title} onClose={onClose}>
      {doneKey ? (
        <>
          <DialogSuccess>{t(`settings.account.password.${doneKey}`)}</DialogSuccess>
          <DialogFooter done onCancel={onClose} submitLabel="" />
        </>
      ) : (
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (valid && !pending) void submit();
          }}
        >
          {creating && <p className="font-body text-sm text-paper-muted">{t("settings.account.password.createIntro")}</p>}
          {!creating && (
            <SensitiveIdentity
              hasPassword
              password={current}
              onPasswordChange={(value) => {
                setCurrent(value);
                setErrorCode(null);
              }}
              needsReauth={false}
            />
          )}
          {creating && (
            <SensitiveIdentity
              hasPassword={false}
              password=""
              onPasswordChange={() => undefined}
              needsReauth={errorCode === "REAUTH_REQUIRED"}
            />
          )}
          <Input
            type="password"
            label={t("settings.account.password.new")}
            value={next}
            autoComplete="new-password"
            error={tooShort ? t("settings.account.password.tooShort") : undefined}
            onChange={(event) => {
              setNext(event.target.value);
              setErrorCode(null);
            }}
          />
          <Input
            type="password"
            label={t("settings.account.password.repeat")}
            value={repeat}
            autoComplete="new-password"
            error={mismatch ? t("settings.account.password.mismatch") : undefined}
            onChange={(event) => setRepeat(event.target.value)}
          />
          <p className="-mt-2 font-body text-xs text-paper-muted">{t("settings.account.password.help")}</p>
          {!creating && (
            <label className="flex items-center gap-2 font-body text-sm text-paper-muted">
              <input
                type="checkbox"
                checked={revokeOthers}
                onChange={(event) => setRevokeOthers(event.target.checked)}
                className="accent-amber"
              />
              {t("settings.account.password.revokeOthers")}
            </label>
          )}
          <DialogError code={errorCode === "REAUTH_REQUIRED" && creating ? null : errorCode} />
          <DialogFooter
            onCancel={onClose}
            submitLabel={
              pending
                ? t("settings.account.password.saving")
                : creating
                  ? t("settings.account.password.submitCreate")
                  : t("settings.account.password.submitChange")
            }
            pending={pending}
            disabled={!valid}
          />
        </form>
      )}
    </Dialog>
  );
}
