"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { apiFetch, ApiError } from "@/lib/api/client";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SUSPENSION_PRESETS, expiresAtFromPreset } from "@/lib/moderation-presets";
import { ReportContentResponseSchema, SocialRestrictionMutationResponseSchema } from "@/lib/api/schemas";

interface ProfileModerationActionsProps {
  userId: string;
  username: string;
  /** El visitante tiene `moderation.suspend_social`. */
  canModerate: boolean;
}

// Acciones de reporte (cualquier usuario autenticado) y suspensión social
// (solo moderadores) desde el perfil de otra persona. La suspensión es una
// operación de moderación con expiración y motivo; el reporte alimenta la
// misma cola que los reportes de comentarios y reseñas.
export function ProfileModerationActions({ userId, username, canModerate }: ProfileModerationActionsProps) {
  const t = useTranslations("users");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const [open, setOpen] = useState<"report" | "suspend" | null>(null);
  const [reason, setReason] = useState("");
  const [durationMs, setDurationMs] = useState(SUSPENSION_PRESETS[0].ms);
  const [pending, setPending] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [done, setDone] = useState<"report" | "suspend" | null>(null);
  const [confirmingSuspend, setConfirmingSuspend] = useState(false);

  const showError = (error: unknown) => {
    setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
  };

  async function submitReport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reason.trim()) return;
    setPending(true);
    setErrorCode(null);
    try {
      await apiFetch("/api/moderation/reports", ReportContentResponseSchema, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType: "user", targetId: userId, reason }),
      });
      setDone("report");
      setOpen(null);
      setReason("");
    } catch (error) {
      showError(error);
    } finally {
      setPending(false);
    }
  }

  async function submitSuspend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reason.trim()) return;
    setConfirmingSuspend(true);
  }

  async function executeSuspend() {
    setConfirmingSuspend(false);
    setPending(true);
    setErrorCode(null);
    try {
      await apiFetch("/api/moderation/restrictions", SocialRestrictionMutationResponseSchema, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, reason, expiresAt: expiresAtFromPreset(durationMs) }),
      });
      setDone("suspend");
      setOpen(null);
      setReason("");
    } catch (error) {
      showError(error);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center justify-end gap-3 font-data text-xs">
        {done === "report" ? (
          <span className="text-paper-muted">{t("reportSent")}</span>
        ) : (
          <button type="button" onClick={() => setOpen((value) => (value === "report" ? null : "report"))} className="text-paper-muted underline decoration-dotted underline-offset-2 transition-colors hover:text-paper">
            {t("report")}
          </button>
        )}
        {canModerate ? (
          done === "suspend" ? (
            <span className="text-paper-muted">{t("suspendSent")}</span>
          ) : (
            <button type="button" onClick={() => setOpen((value) => (value === "suspend" ? null : "suspend"))} className="text-amber underline decoration-dotted underline-offset-2">
              {t("suspend")}
            </button>
          )
        ) : null}
      </div>

      {open === "report" ? (
        <form onSubmit={submitReport} className="flex w-full max-w-sm flex-col gap-2" aria-label={t("reportReasonLabel")}>
          <textarea required value={reason} onChange={(event) => setReason(event.target.value)} placeholder={t("reportReasonPlaceholder")} maxLength={1000} rows={2} className="rounded border border-ink-border bg-ink px-3 py-2 font-body text-sm text-paper" />
          <div className="flex justify-end gap-2">
            <button type="submit" disabled={pending || !reason.trim()} className="rounded bg-amber px-3 py-1 font-data text-xs text-ink disabled:opacity-50">{t("reportSubmit")}</button>
            <button type="button" onClick={() => { setOpen(null); setReason(""); }} className="rounded border border-ink-border px-3 py-1 font-data text-xs text-paper">{t("cancel")}</button>
          </div>
        </form>
      ) : null}

      {open === "suspend" && canModerate ? (
        <form onSubmit={submitSuspend} className="flex w-full max-w-sm flex-col gap-2" aria-label={t("suspendReasonLabel")}>
          <label className="flex flex-col gap-1 font-data text-xs text-paper-muted">
            <span>{t("suspendExpires")}</span>
            <select value={durationMs} onChange={(event) => setDurationMs(Number(event.target.value))} className="rounded border border-ink-border bg-ink px-2 py-2 font-data text-xs text-paper">
              {SUSPENSION_PRESETS.map((preset) => (
                <option key={preset.key} value={preset.ms}>{tCommon(`moderationPresets.${preset.key}`)}</option>
              ))}
            </select>
          </label>
          <textarea required value={reason} onChange={(event) => setReason(event.target.value)} placeholder={t("suspendReasonPlaceholder")} maxLength={1000} rows={2} className="rounded border border-ink-border bg-ink px-3 py-2 font-body text-sm text-paper" />
          <div className="flex justify-end gap-2">
            <button type="submit" disabled={pending || !reason.trim()} className="rounded bg-amber px-3 py-1 font-data text-xs text-ink disabled:opacity-50">{t("suspendSubmit")}</button>
            <button type="button" onClick={() => { setOpen(null); setReason(""); }} className="rounded border border-ink-border px-3 py-1 font-data text-xs text-paper">{t("cancel")}</button>
          </div>
        </form>
      ) : null}

      {errorCode ? <p role="alert" className="font-data text-xs text-danger">{tErrors(`${errorCode}.description`)}</p> : null}

      <ConfirmDialog
        open={confirmingSuspend}
        title={t("suspend")}
        message={t("suspendConfirm", { username })}
        confirmLabel={t("suspendSubmit")}
        cancelLabel={t("cancel")}
        danger
        onConfirm={() => void executeSuspend()}
        onCancel={() => setConfirmingSuspend(false)}
      />
    </div>
  );
}