"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { apiFetch, ApiError } from "@/lib/api/client";
import { EditorialListsResponseSchema, EditorialListSchema, ModerationActionResponseSchema } from "@/lib/api/schemas";
import type { z } from "zod";

type EditorialList = z.infer<typeof EditorialListSchema>;

export function EditorialConsole({ initial }: { initial: { lists: EditorialList[] } }) {
  const t = useTranslations("common.adminConsole");
  const tErrors = useTranslations("errors");
  const [lists, setLists] = useState(initial.lists);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  const refresh = async () => {
    const response = await apiFetch("/api/admin/editorial/lists", EditorialListsResponseSchema);
    setLists(response.lists);
  };

  const toggle = async (list: EditorialList) => {
    const withdrawing = list.isOfficial;
    if (!window.confirm(withdrawing ? t("confirmWithdraw") : t("confirmPublish"))) return;
    setPending(list.id);
    setError(null);
    try {
      await apiFetch(`/api/admin/editorial/lists/${list.id}`, ModerationActionResponseSchema,
        withdrawing
          ? { method: "DELETE" }
          : { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      await refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? tErrors(`${caught.code}.description`) : tErrors("INTERNAL_ERROR.description"));
    } finally {
      setPending(null);
    }
  };

  const stateLabel = (list: EditorialList) => {
    if (list.isOfficial) return t("official");
    if (list.officialWithdrawnAt) return t("withdrawn");
    return t("personal");
  };

  return (
    <div className="flex w-full max-w-4xl flex-col gap-4">
      {error ? <p role="alert" className="rounded border border-danger/40 bg-danger/10 p-3 font-data text-sm text-danger">{error}</p> : null}
      {lists.length === 0 ? <p className="rounded border border-ink-border bg-ink-surface p-8 text-center font-body text-paper-muted">{t("empty")}</p> : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {lists.map((list) => (
            <li key={list.id} className="rounded border border-ink-border bg-ink-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg text-paper">{list.title}</h2>
                  <p className="mt-1 font-data text-xs text-paper-muted">@{list.owner.username}</p>
                </div>
                <span className="font-data text-xs text-amber">{stateLabel(list)}</span>
              </div>
              {list.moderationStatus === "hidden" ? <p className="mt-3 font-data text-xs text-danger">{t("moderated")}</p> : null}
              <button type="button" disabled={pending === list.id || list.moderationStatus === "hidden"} onClick={() => void toggle(list)} className="mt-4 rounded border border-ink-border px-3 py-2 font-data text-xs text-paper-muted hover:text-paper disabled:opacity-50">
                {list.isOfficial ? t("unpublish") : t("publish")}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}