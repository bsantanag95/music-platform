"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { apiFetch, ApiError } from "@/lib/api/client";
import { RelativeDate } from "@/components/feed/feed-row-parts";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SUSPENSION_PRESETS, expiresAtFromPreset } from "@/lib/moderation-presets";
import {
  ModerationActionResponseSchema,
  ModerationReportSchema,
  ModerationReportsResponseSchema,
  SocialRestrictionMutationResponseSchema,
  SocialRestrictionsResponseSchema,
} from "@/lib/api/schemas";
import type { z } from "zod";

type Report = z.infer<typeof ModerationReportSchema>;
type ReportData = z.infer<typeof ModerationReportsResponseSchema>;
type Restriction = z.infer<typeof SocialRestrictionsResponseSchema>["restrictions"][number];

const STATUS_OPTIONS = ["pending", "resolved", "dismissed"] as const;
const TARGET_OPTIONS = ["comment", "review", "user"] as const;

function targetIdOf(report: Report): string | null {
  return report.comment?.id ?? report.review?.id ?? null;
}

function moderationStatusOf(report: Report): string | null {
  return report.comment?.moderationStatus ?? report.review?.moderationStatus ?? null;
}

export function ModerationConsole({ initial, initialRestrictions }: { initial: ReportData; initialRestrictions: Restriction[] }) {
  const t = useTranslations("common.moderationConsole");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]>(initial.status);
  const [targetType, setTargetType] = useState<(typeof TARGET_OPTIONS)[number] | "">("");
  const [page, setPage] = useState(initial.page);
  const [hasNext, setHasNext] = useState(initial.hasNext);
  const [reports, setReports] = useState<Report[]>(initial.reports);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [suspensionError, setSuspensionError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [restrictions, setRestrictions] = useState(initialRestrictions);
  const [suspension, setSuspension] = useState({
    identifier: "",
    durationMs: SUSPENSION_PRESETS[0].ms,
    reason: "",
  });
  const [confirmingSuspend, setConfirmingSuspend] = useState(false);

  const queueUrl = (target: string, p: number) => {
    const params = new URLSearchParams({ status, page: String(p), pageSize: "20" });
    if (target) params.set("targetType", target);
    return `/api/moderation/reports?${params.toString()}`;
  };

  const showError = (caught: unknown) => {
    setError(caught instanceof ApiError ? tErrors(`${caught.code}.description`) : tErrors("INTERNAL_ERROR.description"));
  };

  const refresh = async (target = targetType, p = page) => {
    setLoading(true);
    try {
      const response = await apiFetch(queueUrl(target, p), ModerationReportsResponseSchema);
      setReports(response.reports);
      setPage(response.page);
      setHasNext(response.hasNext);
    } catch (caught) {
      showError(caught);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    setError(null);
    void refresh(targetType, 1);
  };

  const actOnContent = async (report: Report) => {
    const reason = reasons[report.id]?.trim();
    if (!reason) {
      setError(t("requiredReason"));
      return;
    }
    const targetId = targetIdOf(report);
    const currentStatus = moderationStatusOf(report);
    if (!targetId || !currentStatus) return;
    const action = currentStatus === "hidden" ? "restore" : "hide";
    if (!window.confirm(t(action === "hide" ? "confirmHide" : "confirmRestore"))) return;
    setPending(report.id);
    setError(null);
    try {
      await apiFetch(
        `/api/moderation/content/${report.targetType}/${targetId}`,
        ModerationActionResponseSchema,
        { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, reason }) },
      );
      await apiFetch(`/api/moderation/reports/${report.id}`, ModerationActionResponseSchema, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "resolved" }),
      });
      await refresh();
    } catch (caught) {
      showError(caught);
    } finally {
      setPending(null);
    }
  };

  const dismiss = async (reportId: string) => {
    if (!window.confirm(t("confirmDismiss"))) return;
    setPending(reportId);
    setError(null);
    try {
      await apiFetch(`/api/moderation/reports/${reportId}`, ModerationActionResponseSchema, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "dismissed" }),
      });
      await refresh();
    } catch (caught) {
      showError(caught);
    } finally {
      setPending(null);
    }
  };

  const createSuspension = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setConfirmingSuspend(true);
  };

  const executeSuspension = async () => {
    setConfirmingSuspend(false);
    setSuspensionError(null);
    try {
      await apiFetch("/api/moderation/restrictions", SocialRestrictionMutationResponseSchema, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: suspension.identifier,
          reason: suspension.reason,
          expiresAt: expiresAtFromPreset(suspension.durationMs),
        }),
      });
      const response = await apiFetch("/api/moderation/restrictions", SocialRestrictionsResponseSchema);
      setRestrictions(response.restrictions);
      setSuspension({ identifier: "", durationMs: SUSPENSION_PRESETS[0].ms, reason: "" });
    } catch (caught) {
      setSuspensionError(caught instanceof ApiError ? tErrors(`${caught.code}.description`) : tErrors("INTERNAL_ERROR.description"));
    }
  };

  const revokeSuspension = async (id: string) => {
    if (!window.confirm(t("confirmRevoke"))) return;
    setError(null);
    try {
      await apiFetch(`/api/moderation/restrictions/${id}`, ModerationActionResponseSchema, { method: "DELETE" });
      setRestrictions((current) => current.map((restriction) => restriction.id === id ? { ...restriction, revokedAt: new Date().toISOString() } : restriction));
    } catch (caught) {
      showError(caught);
    }
  };

  const prefillSuspension = (report: Report) => {
    const username = report.user?.username;
    if (!username) return;
    setSuspension((current) => ({ ...current, identifier: username }));
    setSuspensionError(null);
    document.getElementById("moderation-suspension")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const restrictionState = (restriction: Restriction) => {
    if (restriction.revokedAt) return t("stateRevoked");
    if (restriction.expiresAt && new Date(restriction.expiresAt).getTime() <= Date.now()) return t("stateExpired");
    return t("stateActive");
  };

  return (
    <div className="flex w-full max-w-4xl flex-col gap-5">
      {error ? <p role="alert" className="rounded border border-danger/40 bg-danger/10 p-3 font-data text-sm text-danger">{error}</p> : null}

      <form className="flex flex-wrap items-end gap-3 rounded border border-ink-border bg-ink-surface p-3" onSubmit={(event) => { event.preventDefault(); applyFilters(); }}>
        <label className="flex flex-col gap-1 font-data text-xs text-paper-muted">
          <span>{t("filterStatusLabel")}</span>
          <select value={status} onChange={(event) => setStatus(event.target.value as (typeof STATUS_OPTIONS)[number])} className="rounded border border-ink-border bg-ink px-2 py-2 font-data text-xs text-paper">
            {STATUS_OPTIONS.map((option) => <option key={option} value={option}>{t(`status.${option}`)}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 font-data text-xs text-paper-muted">
          <span>{t("filterTargetLabel")}</span>
          <select value={targetType} onChange={(event) => setTargetType(event.target.value as (typeof TARGET_OPTIONS)[number] | "")} className="rounded border border-ink-border bg-ink px-2 py-2 font-data text-xs text-paper">
            <option value="">{t("filterAllTargets")}</option>
            {TARGET_OPTIONS.map((option) => <option key={option} value={option}>{t(`target.${option}`)}</option>)}
          </select>
        </label>
        <button type="submit" disabled={loading} className="rounded bg-amber px-3 py-2 font-data text-xs text-ink disabled:opacity-50">{t("applyFilters")}</button>
      </form>

      {reports.length === 0 ? (
        <p className="rounded border border-ink-border bg-ink-surface p-8 text-center font-body text-paper-muted">{status === "pending" && !targetType ? t("empty") : t("emptyFiltered")}</p>
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {reports.map((report) => {
              const isUser = report.targetType === "user";
              const body = report.comment?.body ?? report.review?.body ?? "";
              const title = report.review?.title;
              const contentStatus = moderationStatusOf(report);
              return (
                <li key={report.id} className="rounded border border-ink-border bg-ink-surface p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 font-data text-xs text-paper-muted">
                    <span>{t("report")} · {t(`target.${report.targetType}`)}</span>
                    <span className="flex items-center gap-2">{t("reportedBy", { username: report.reporter.username })} · <RelativeDate iso={report.createdAt} /></span>
                  </div>
                  {isUser ? (
                    <p className="mt-3 font-body text-paper">
                      {report.user?.username ? (
                        <Link href={`/users/${encodeURIComponent(report.user.username)}`} className="text-amber underline">
                          @{report.user.username}
                        </Link>
                      ) : null}
                    </p>
                  ) : (
                    <>
                      {title ? <h2 className="mt-3 font-display text-lg text-paper">{title}</h2> : null}
                      <p className="mt-2 whitespace-pre-wrap font-body text-paper">{body}</p>
                    </>
                  )}
                  <p className="mt-3 font-data text-xs text-paper-muted">{report.reason}</p>
                  {isUser ? null : (
                    <textarea
                      value={reasons[report.id] ?? ""}
                      onChange={(event) => setReasons((current) => ({ ...current, [report.id]: event.target.value }))}
                      placeholder={t("reasonPlaceholder")}
                      className="mt-4 min-h-20 w-full rounded border border-ink-border bg-ink px-3 py-2 font-body text-sm text-paper outline-none focus:border-amber"
                    />
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {isUser ? (
                      <button type="button" onClick={() => prefillSuspension(report)} className="rounded bg-amber px-3 py-2 font-data text-xs text-ink">
                        {t("suspendReported")}
                      </button>
                    ) : (
                      <button type="button" disabled={pending === report.id} onClick={() => void actOnContent(report)} className="rounded bg-amber px-3 py-2 font-data text-xs text-ink disabled:opacity-50">
                        {contentStatus === "hidden" ? t("restore") : t("hide")}
                      </button>
                    )}
                    <button type="button" disabled={pending === report.id} onClick={() => void dismiss(report.id)} className="rounded border border-ink-border px-3 py-2 font-data text-xs text-paper-muted hover:text-paper disabled:opacity-50">
                      {t("dismiss")}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="flex items-center justify-between font-data text-xs text-paper-muted">
            <button type="button" disabled={page <= 1 || loading} onClick={() => void refresh(targetType, page - 1)} className="rounded border border-ink-border px-3 py-2 hover:text-paper disabled:opacity-50">{t("previousPage")}</button>
            <span>{t("page", { page })}</span>
            <button type="button" disabled={!hasNext || loading} onClick={() => void refresh(targetType, page + 1)} className="rounded border border-ink-border px-3 py-2 hover:text-paper disabled:opacity-50">{t("nextPage")}</button>
          </div>
        </>
      )}

      <section id="moderation-suspension" className="rounded border border-ink-border bg-ink-surface p-4">
        <h2 className="font-display text-xl text-paper">{t("suspensionTitle")}</h2>
        {suspensionError ? <p role="alert" className="mt-3 rounded border border-danger/40 bg-danger/10 p-3 font-data text-sm text-danger">{suspensionError}</p> : null}
        <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={(event) => void createSuspension(event)}>
          <input required value={suspension.identifier} onChange={(event) => setSuspension((current) => ({ ...current, identifier: event.target.value }))} placeholder={t("identifier")} className="rounded border border-ink-border bg-ink px-3 py-2 font-data text-xs text-paper" />
          <label className="flex flex-col gap-1 font-data text-xs text-paper-muted">
            <span>{t("expiresAt")}</span>
            <select value={suspension.durationMs} onChange={(event) => setSuspension((current) => ({ ...current, durationMs: Number(event.target.value) }))} className="rounded border border-ink-border bg-ink px-2 py-2 font-data text-xs text-paper">
              {SUSPENSION_PRESETS.map((preset) => (
                <option key={preset.key} value={preset.ms}>{tCommon(`moderationPresets.${preset.key}`)}</option>
              ))}
            </select>
          </label>
          <textarea required value={suspension.reason} onChange={(event) => setSuspension((current) => ({ ...current, reason: event.target.value }))} placeholder={t("reasonPlaceholder")} className="min-h-20 rounded border border-ink-border bg-ink px-3 py-2 font-body text-sm text-paper sm:col-span-2" />
          <button type="submit" className="w-fit rounded bg-amber px-3 py-2 font-data text-xs text-ink">{t("suspend")}</button>
        </form>
        {restrictions.length > 0 ? (
          <ul className="mt-5 flex flex-col gap-2">
            {restrictions.map((restriction) => (
              <li key={restriction.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-border pt-2 font-data text-xs text-paper-muted">
                <span className="flex flex-wrap items-center gap-x-2">
                  <span>{restriction.user.username}</span>
                  <span aria-hidden>·</span>
                  <span>{restriction.reason}</span>
                  {restriction.expiresAt ? <><span aria-hidden>·</span><span>{t("expiresOn", { date: new Date(restriction.expiresAt).toLocaleDateString() })}</span></> : null}
                </span>
                <span className="flex items-center gap-3">
                  <span className={restriction.revokedAt ? undefined : "text-amber"}>{restrictionState(restriction)}</span>
                  {restriction.revokedAt ? null : <button type="button" onClick={() => void revokeSuspension(restriction.id)} className="text-amber">{t("resolve")}</button>}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <ConfirmDialog
        open={confirmingSuspend}
        title={t("suspensionTitle")}
        message={t("confirmSuspend")}
        confirmLabel={t("suspend")}
        cancelLabel={t("cancel")}
        danger
        onConfirm={() => void executeSuspension()}
        onCancel={() => setConfirmingSuspend(false)}
      />
    </div>
  );
}