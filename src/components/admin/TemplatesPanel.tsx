"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { apiFetch, ApiError } from "@/lib/api/client";
import { EditorialListMutationResponseSchema, TemplatesAdminResponseSchema } from "@/lib/api/schemas";
import type { TemplateAdminRow, TemplatesAdminResponse } from "@/lib/api/schemas";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { MIN_ALBUMS_FOR_SECTION } from "@/services/discovery/constants";

// Panel "Generadas automáticamente" (openspec: manage-explore-featured-console): estado de las
// plantillas de colecciones y control de pausa / regeneración. Escribir exige `editorial.publish`.
export function TemplatesPanel({ initial, canPublish }: { initial: TemplatesAdminResponse; canPublish: boolean }) {
  const t = useTranslations("common.adminConsole");
  const tErrors = useTranslations("errors");
  const locale = useLocale();
  const [templates, setTemplates] = useState(initial.templates);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [pausing, setPausing] = useState<TemplateAdminRow | null>(null);

  const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });

  const refresh = async () => {
    const response = await apiFetch("/api/admin/editorial/templates", TemplatesAdminResponseSchema);
    setTemplates(response.templates);
  };

  const act = async (template: TemplateAdminRow, action: "pause" | "resume" | "run") => {
    setPending(template.key);
    setError(null);
    setNotice(null);
    try {
      await apiFetch(`/api/admin/editorial/templates/${template.key}/${action}`, EditorialListMutationResponseSchema, {
        method: "POST",
      });
      if (action === "run") setNotice(t("templates.runQueued"));
      await refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? tErrors(`${caught.code}.description`) : tErrors("INTERNAL_ERROR.description"));
    } finally {
      setPending(null);
    }
  };

  // Por qué una plantilla no tiene colección vigente: pausada, aún sin generar, o la regla no
  // alcanza el mínimo de álbumes (caso habitual con poca actividad de la comunidad).
  const noCollectionReason = (template: TemplateAdminRow): string => {
    if (template.paused || template.lastItemCount === null) {
      return template.paused || template.lastRun ? t("templates.none") : t("templates.notGenerated");
    }
    return template.lastItemCount < MIN_ALBUMS_FOR_SECTION
      ? t("templates.belowMinimum", { count: template.lastItemCount, min: MIN_ALBUMS_FOR_SECTION })
      : t("templates.none");
  };

  const confirmPause = () => {
    if (!pausing) return;
    const template = pausing;
    setPausing(null);
    void act(template, "pause");
  };

  return (
    <section aria-labelledby="templates-heading" className="flex flex-col gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="templates-heading" className="font-display text-xl text-paper">
            {t("templates.title")}
          </h2>
          <p className="mt-1 font-body text-sm text-paper-muted">{t("templates.description")}</p>
        </div>
        <button
          type="button"
          onClick={() => void refresh().catch(() => undefined)}
          className="rounded border border-ink-border px-3 py-2 font-data text-xs text-paper-muted hover:text-paper"
        >
          {t("templates.refresh")}
        </button>
      </header>

      {error ? (
        <p role="alert" className="rounded border border-danger/40 bg-danger/10 p-3 font-data text-sm text-danger">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="rounded border border-ink-border bg-ink-surface p-3 font-data text-sm text-paper-muted">
          {notice}
        </p>
      ) : null}

      {templates.length === 0 ? (
        <p className="rounded border border-ink-border bg-ink-surface p-8 text-center font-body text-paper-muted">
          {t("templates.empty")}
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {templates.map((template) => (
            <li key={template.key} className="rounded border border-ink-border bg-ink-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-display text-lg text-paper">{t(`templates.names.${template.key}`)}</h3>
                <span className={`font-data text-xs ${template.paused ? "text-danger" : "text-amber"}`}>
                  {template.paused ? t("templates.paused") : t("templates.active")}
                </span>
              </div>

              <dl className="mt-3 flex flex-col gap-1 font-data text-xs text-paper-muted">
                <div>
                  <dt className="inline">{t("templates.lastRun")}: </dt>
                  <dd className="inline">
                    {template.lastRun
                      ? `${t(`templates.runStatus.${template.lastRun.status}`)} · ${dateFormat.format(new Date(template.lastRun.startedAt))}`
                      : t("templates.never")}
                  </dd>
                </div>
                {template.lastRun?.status === "failed" && template.lastRun.error ? (
                  <div className="text-danger">{t("templates.error", { error: template.lastRun.error })}</div>
                ) : null}
                {template.nextDueAt ? (
                  <div>{t("templates.nextDue", { date: dateFormat.format(new Date(template.nextDueAt)) })}</div>
                ) : null}
                <div>
                  <dt className="inline">{t("templates.current")}: </dt>
                  <dd className="inline">
                    {template.current
                      ? `${template.current.title} · ${template.current.inRail ? t("templates.inRail") : t("templates.outOfRail")}`
                      : noCollectionReason(template)}
                  </dd>
                </div>
              </dl>

              {canPublish ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {template.paused ? (
                    <button
                      type="button"
                      disabled={pending === template.key}
                      onClick={() => void act(template, "resume")}
                      className="rounded border border-ink-border px-3 py-2 font-data text-xs text-paper-muted hover:text-paper disabled:opacity-50"
                    >
                      {t("templates.resume")}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={pending === template.key}
                      onClick={() => setPausing(template)}
                      className="rounded border border-ink-border px-3 py-2 font-data text-xs text-paper-muted hover:text-paper disabled:opacity-50"
                    >
                      {t("templates.pause")}
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={pending === template.key}
                    onClick={() => void act(template, "run")}
                    className="rounded border border-ink-border px-3 py-2 font-data text-xs text-paper-muted hover:text-paper disabled:opacity-50"
                  >
                    {t("templates.run")}
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={pausing !== null}
        title={t("templates.pause")}
        message={t("templates.confirmPause")}
        confirmLabel={t("templates.pause")}
        cancelLabel={t("cancel")}
        danger
        onConfirm={confirmPause}
        onCancel={() => setPausing(null)}
      />
    </section>
  );
}
