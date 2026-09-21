"use client";

import { useEffect, useRef, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { apiFetch, ApiError } from "@/lib/api/client";
import { ChangeUsernameResponseSchema, UsernameAvailabilityResponseSchema } from "@/lib/api/schemas";
import { validateUsernameFormat } from "@/services/auth/account-rules";
import { useRouter } from "@/i18n/navigation";
import { DialogError, DialogFooter, DialogSuccess, NoteList } from "./parts";

type Reason = "too_short" | "too_long" | "invalid_chars" | "current" | "taken";
type Check = { state: "idle" } | { state: "checking" } | { state: "ready"; available: boolean; reason: Reason | null };

interface ChangeUsernameDialogProps {
  open: boolean;
  onClose: () => void;
  currentUsername: string;
  /** Fecha (ISO) en que se puede volver a cambiar; `null` si ya se puede. */
  nextChangeAt: string | null;
  onChanged: (username: string, nextChangeAt: string) => void;
}

const DEBOUNCE_MS = 300;

// "Cambiar usuario" (spec account-username): validación de formato en el
// cliente, disponibilidad con debounce contra el servidor, vista previa del
// enlace nuevo y los avisos de enfriamiento y redirección. El servidor vuelve a
// validar todo; esto solo evita mandar peticiones que ya se sabe que fallan.
export function ChangeUsernameDialog({
  open,
  onClose,
  currentUsername,
  nextChangeAt,
  onChanged,
}: ChangeUsernameDialogProps) {
  const t = useTranslations("users");
  const format = useFormatter();
  const router = useRouter();
  const [value, setValue] = useState("");
  const [check, setCheck] = useState<Check>({ state: "idle" });
  const [pending, setPending] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [done, setDone] = useState<{ username: string; nextChangeAt: string } | null>(null);
  const requestId = useRef(0);

  const candidate = value.trim();
  const inCooldown = nextChangeAt !== null && new Date(nextChangeAt) > new Date();

  useEffect(() => {
    requestId.current += 1;
    const current = requestId.current;
    if (candidate.length === 0) {
      setCheck({ state: "idle" });
      return;
    }
    const problem = validateUsernameFormat(candidate);
    if (problem) {
      setCheck({ state: "ready", available: false, reason: problem });
      return;
    }
    if (candidate === currentUsername) {
      setCheck({ state: "ready", available: false, reason: "current" });
      return;
    }
    setCheck({ state: "checking" });
    const timer = setTimeout(async () => {
      try {
        const result = await apiFetch(
          `/api/me/account/username/availability?q=${encodeURIComponent(candidate)}`,
          UsernameAvailabilityResponseSchema,
        );
        if (current === requestId.current) {
          setCheck({ state: "ready", available: result.available, reason: result.reason });
        }
      } catch {
        // Si la consulta falla no se bloquea el envío: el servidor decide.
        if (current === requestId.current) setCheck({ state: "ready", available: true, reason: null });
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [candidate, currentUsername]);

  const canSubmit = !inCooldown && check.state === "ready" && check.available && !pending;

  async function submit() {
    setPending(true);
    setErrorCode(null);
    try {
      const result = await apiFetch("/api/me/account/username", ChangeUsernameResponseSchema, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: candidate }),
      });
      setDone(result);
      onChanged(result.username, result.nextChangeAt);
      router.refresh();
    } catch (error) {
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    } finally {
      setPending(false);
    }
  }

  const date = (iso: string) => format.dateTime(new Date(iso), { dateStyle: "long" });

  let hint: string | undefined;
  let hintIsError = false;
  if (check.state === "checking") hint = t("settings.account.username.checking");
  else if (check.state === "ready" && check.available) hint = t("settings.account.username.available");
  else if (check.state === "ready" && check.reason) {
    hint = t(`settings.account.username.reason.${check.reason}`);
    hintIsError = true;
  }

  return (
    <Dialog open={open} title={t("settings.account.username.dialogTitle")} onClose={onClose}>
      {done ? (
        <>
          <DialogSuccess>
            {t("settings.account.username.done", { username: done.username, date: date(done.nextChangeAt) })}
          </DialogSuccess>
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
          <p className="font-body text-sm text-paper-muted">{t("settings.account.username.intro")}</p>
          {inCooldown && nextChangeAt && (
            <p role="status" className="rounded border border-ink-border p-3 font-body text-sm text-paper">
              {t("settings.account.username.cooldown", { date: date(nextChangeAt) })}
            </p>
          )}
          <div className="flex flex-col gap-1">
            <Input
              label={t("settings.account.username.label")}
              value={value}
              maxLength={40}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              disabled={inCooldown}
              onChange={(event) => {
                setValue(event.target.value);
                setErrorCode(null);
              }}
            />
            <p
              aria-live="polite"
              className={`min-h-4 font-data text-xs ${hintIsError ? "text-danger" : "text-petrol-hover"}`}
            >
              {hint}
            </p>
            {check.state === "ready" && check.available && (
              <p className="font-data text-xs text-paper-muted">
                {t("settings.account.username.preview", { username: candidate })}
              </p>
            )}
          </div>
          <NoteList
            notes={[
              t("settings.account.username.note1"),
              t("settings.account.username.note2", { old: currentUsername }),
              t("settings.account.username.note3"),
            ]}
          />
          <DialogError code={errorCode} />
          <DialogFooter
            onCancel={onClose}
            submitLabel={pending ? t("settings.account.username.saving") : t("settings.account.username.submit")}
            pending={pending}
            disabled={!canSubmit}
          />
        </form>
      )}
    </Dialog>
  );
}
