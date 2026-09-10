"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { apiFetch, ApiError } from "@/lib/api/client";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SUSPENSION_PRESETS, expiresAtFromPreset } from "@/lib/moderation-presets";
import { BlockedResponseSchema, ReportContentResponseSchema, SocialRestrictionMutationResponseSchema } from "@/lib/api/schemas";

interface ContentActionsProps {
  targetType: "comment" | "review";
  targetId: string;
  authorUsername: string;
  authorId: string;
  /** El visitante tiene `moderation.suspend_social`: habilita suspender al autor. */
  canModerate?: boolean;
  /** Se llama tras bloquear al autor para retirar su contenido de la vista. */
  onBlocked?: () => void;
}

// Acciones de un usuario común sobre un comentario o reseña ajena: reportar
// con motivo y bloquear al autor. Si el visitante es moderador, además puede
// suspender la actividad social del autor. La ocultación/restauración sigue
// viviendo en la consola de moderación.
export function ContentActions({ targetType, targetId, authorUsername, authorId, canModerate = false, onBlocked }: ContentActionsProps) {
  const t = useTranslations("catalog.social");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const [open, setOpen] = useState<"report" | "suspend" | null>(null);
  const [reason, setReason] = useState("");
  const [durationMs, setDurationMs] = useState(SUSPENSION_PRESETS[0].ms);
  const [pending, setPending] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [reported, setReported] = useState(false);
  const [suspended, setSuspended] = useState(false);
  const [confirmingSuspend, setConfirmingSuspend] = useState(false);

  async function submitReport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reason.trim()) return;
    setPending(true);
    setErrorCode(null);
    try {
      await apiFetch("/api/moderation/reports", ReportContentResponseSchema, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType, targetId, reason }),
      });
      setReported(true);
      setOpen(null);
      setReason("");
    } catch (error) {
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
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
        body: JSON.stringify({ userId: authorId, reason, expiresAt: expiresAtFromPreset(durationMs) }),
      });
      setSuspended(true);
      setOpen(null);
      setReason("");
    } catch (error) {
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    } finally {
      setPending(false);
    }
  }

  async function block() {
    if (!window.confirm(t("blockAuthorConfirm", { username: authorUsername }))) return;
    setPending(true);
    setErrorCode(null);
    try {
      await apiFetch(
        `/api/users/${encodeURIComponent(authorUsername)}/block`,
        BlockedResponseSchema,
        { method: "PUT" },
      );
      onBlocked?.();
    } catch (error) {
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-3 flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3 font-data text-xs">
        {reported ? (
          <span className="text-paper-muted">{t("reportSent")}</span>
        ) : (
          <button
            type="button"
            onClick={() => setOpen((value) => (value === "report" ? null : "report"))}
            className="text-paper-muted underline decoration-dotted underline-offset-2 transition-colors hover:text-paper"
          >
            {t("report")}
          </button>
        )}
        {canModerate ? (
          suspended ? (
            <span className="text-paper-muted">{t("suspendDone")}</span>
          ) : (
            <button
              type="button"
              onClick={() => setOpen((value) => (value === "suspend" ? null : "suspend"))}
              className="text-amber underline decoration-dotted underline-offset-2"
            >
              {t("suspendAuthor", { username: authorUsername })}
            </button>
          )
        ) : null}
        <button
          type="button"
          disabled={pending}
          onClick={() => void block()}
          className="text-paper-muted underline decoration-dotted underline-offset-2 transition-colors hover:text-paper disabled:opacity-50"
        >
          {t("blockAuthor", { username: authorUsername })}
        </button>
      </div>

      {open === "report" ? (
        <form onSubmit={submitReport} className="flex flex-col gap-2" aria-label={t("reportReasonLabel")}>
          <textarea
            required
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={t("reportReasonPlaceholder")}
            maxLength={1000}
            rows={2}
            className="rounded border border-ink-border bg-ink px-3 py-2 font-body text-sm text-paper"
          />
          <div className="flex gap-2">
            <button type="submit" disabled={pending || !reason.trim()} className="rounded bg-amber px-3 py-1 font-data text-xs text-ink disabled:opacity-50">
              {t("reportSubmit")}
            </button>
            <button type="button" onClick={() => { setOpen(null); setReason(""); }} className="rounded border border-ink-border px-3 py-1 font-data text-xs text-paper">
              {t("cancel")}
            </button>
          </div>
        </form>
      ) : null}

      {open === "suspend" && canModerate ? (
        <form onSubmit={submitSuspend} className="flex flex-col gap-2" aria-label={t("suspendReasonLabel")}>
          <label className="flex flex-col gap-1 font-data text-xs text-paper-muted">
            <span>{t("suspendExpires")}</span>
            <select value={durationMs} onChange={(event) => setDurationMs(Number(event.target.value))} className="rounded border border-ink-border bg-ink px-2 py-2 font-data text-xs text-paper">
              {SUSPENSION_PRESETS.map((preset) => (
                <option key={preset.key} value={preset.ms}>{tCommon(`moderationPresets.${preset.key}`)}</option>
              ))}
            </select>
          </label>
          <textarea
            required
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={t("suspendReasonPlaceholder")}
            maxLength={1000}
            rows={2}
            className="rounded border border-ink-border bg-ink px-3 py-2 font-body text-sm text-paper"
          />
          <div className="flex gap-2">
            <button type="submit" disabled={pending || !reason.trim()} className="rounded bg-amber px-3 py-1 font-data text-xs text-ink disabled:opacity-50">
              {t("suspendSubmit")}
            </button>
            <button type="button" onClick={() => { setOpen(null); setReason(""); }} className="rounded border border-ink-border px-3 py-1 font-data text-xs text-paper">
              {t("cancel")}
            </button>
          </div>
        </form>
      ) : null}

      {errorCode ? <p role="alert" className="font-data text-xs text-danger">{tErrors(`${errorCode}.description`)}</p> : null}

      <ConfirmDialog
        open={confirmingSuspend}
        title={t("suspendAuthor", { username: authorUsername })}
        message={t("suspendAuthorConfirm", { username: authorUsername })}
        confirmLabel={t("suspendSubmit")}
        cancelLabel={t("cancel")}
        danger
        onConfirm={() => void executeSuspend()}
        onCancel={() => setConfirmingSuspend(false)}
      />
    </div>
  );
}