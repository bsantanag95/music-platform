"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { apiFetch, ApiError } from "@/lib/api/client";
import {
  EditorialListsResponseSchema,
  EditorialListMutationResponseSchema,
  ListMutationResponseSchema,
  NoContentResponseSchema,
} from "@/lib/api/schemas";
import type { EditorialListSchema } from "@/lib/api/schemas";
import type { Permission } from "@/services/auth/authorization";
import type { z } from "zod";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

type EditorialList = z.infer<typeof EditorialListSchema>;
type EntityType = "artist" | "release-group" | "recording";
type DialogState = { kind: "publish" | "withdraw" | "delete"; list: EditorialList } | null;

// Una sola superficie editorial, permission-aware: el curador (`editorial.author`)
// crea, edita y propone; el administrador (`editorial.publish`) además publica y
// retira. No hay página paralela para curadores (ver spec permission-aware-navigation).
export function EditorialConsole({
  initial,
  permissions,
}: {
  initial: { lists: EditorialList[] };
  permissions: Permission[];
}) {
  const t = useTranslations("common.adminConsole");
  const tErrors = useTranslations("errors");
  const canAuthor = permissions.includes("editorial.author");
  const canPublish = permissions.includes("editorial.publish");
  const [lists, setLists] = useState(initial.lists);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [title, setTitle] = useState("");
  const [entityType, setEntityType] = useState<EntityType>("release-group");
  const [creating, setCreating] = useState(false);

  const handleError = (caught: unknown) => {
    setError(
      caught instanceof ApiError
        ? tErrors(`${caught.code}.description`)
        : tErrors("INTERNAL_ERROR.description"),
    );
  };

  const refresh = async () => {
    const response = await apiFetch("/api/admin/editorial/lists", EditorialListsResponseSchema);
    setLists(response.lists);
  };

  const confirmDialog = async () => {
    if (!dialog) return;
    const { kind, list } = dialog;
    setDialog(null);
    setPending(list.id);
    setError(null);
    try {
      if (kind === "delete") {
        await apiFetch(`/api/admin/editorial/lists/${list.id}`, NoContentResponseSchema, {
          method: "DELETE",
        });
      } else {
        await apiFetch(
          `/api/admin/editorial/lists/${list.id}/${kind}`,
          EditorialListMutationResponseSchema,
          { method: "POST" },
        );
      }
      await refresh();
    } catch (caught) {
      handleError(caught);
    } finally {
      setPending(null);
    }
  };

  const submitDraft = async (list: EditorialList) => {
    setPending(list.id);
    setError(null);
    try {
      await apiFetch(
        `/api/admin/editorial/lists/${list.id}/submit`,
        EditorialListMutationResponseSchema,
        { method: "POST" },
      );
      await refresh();
    } catch (caught) {
      handleError(caught);
    } finally {
      setPending(null);
    }
  };

  const createDraft = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreating(true);
    setError(null);
    try {
      await apiFetch("/api/admin/editorial/lists", ListMutationResponseSchema, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType, title }),
      });
      setTitle("");
      await refresh();
    } catch (caught) {
      handleError(caught);
    } finally {
      setCreating(false);
    }
  };

  const stateLabel = (list: EditorialList) => {
    switch (list.state) {
      case "published":
        return t("official");
      case "withdrawn":
        return t("withdrawn");
      case "submitted":
        return t("submitted");
      case "draft":
        return t("draft");
      default:
        return t("personal");
    }
  };

  const confirmCopy = dialog
    ? dialog.kind === "publish"
      ? { title: t("publish"), message: t("confirmPublish"), confirm: t("publish"), danger: false }
      : dialog.kind === "withdraw"
        ? { title: t("unpublish"), message: t("confirmWithdraw"), confirm: t("unpublish"), danger: false }
        : { title: t("delete"), message: t("confirmDelete"), confirm: t("delete"), danger: true }
    : { title: "", message: "", confirm: "", danger: false };

  return (
    <div className="flex w-full max-w-4xl flex-col gap-4">
      {error ? (
        <p role="alert" className="rounded border border-danger/40 bg-danger/10 p-3 font-data text-sm text-danger">
          {error}
        </p>
      ) : null}

      {canAuthor ? (
        <form
          onSubmit={createDraft}
          aria-label={t("newDraft")}
          className="flex flex-wrap items-end gap-3 rounded border border-ink-border bg-ink-surface p-4"
        >
          <label className="flex min-w-48 flex-1 flex-col gap-1 font-data text-xs text-paper-muted">
            <span>{t("titlePlaceholder")}</span>
            <input
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={100}
              className="rounded border border-ink-border bg-ink px-3 py-2 font-body text-sm text-paper"
            />
          </label>
          <label className="flex flex-col gap-1 font-data text-xs text-paper-muted">
            <span>{t("entityArtist")}</span>
            <select
              value={entityType}
              onChange={(event) => setEntityType(event.target.value as EntityType)}
              className="rounded border border-ink-border bg-ink px-3 py-2 font-data text-xs text-paper"
            >
              <option value="artist">{t("entityArtist")}</option>
              <option value="release-group">{t("entityAlbum")}</option>
              <option value="recording">{t("entitySong")}</option>
            </select>
          </label>
          <button
            type="submit"
            disabled={creating || !title.trim()}
            className="rounded bg-amber px-3 py-2 font-data text-xs text-ink disabled:opacity-50"
          >
            {t("create")}
          </button>
        </form>
      ) : null}

      {lists.length === 0 ? (
        <p className="rounded border border-ink-border bg-ink-surface p-8 text-center font-body text-paper-muted">
          {t("empty")}
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {lists.map((list) => {
            const draftLike = list.state === "draft" || list.state === "submitted";
            return (
              <li key={list.id} className="rounded border border-ink-border bg-ink-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-lg text-paper">{list.title}</h2>
                    <p className="mt-1 font-data text-xs text-paper-muted">@{list.owner.username}</p>
                    {list.author ? (
                      <p className="mt-1 font-data text-xs text-paper-muted">
                        {t("author", { username: list.author.username })}
                      </p>
                    ) : null}
                  </div>
                  <span className="font-data text-xs text-amber">{stateLabel(list)}</span>
                </div>
                {list.moderationStatus === "hidden" ? (
                  <p className="mt-3 font-data text-xs text-danger">{t("moderated")}</p>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  {canAuthor && list.state === "draft" ? (
                    <button
                      type="button"
                      disabled={pending === list.id}
                      onClick={() => void submitDraft(list)}
                      className="rounded border border-ink-border px-3 py-2 font-data text-xs text-paper-muted hover:text-paper disabled:opacity-50"
                    >
                      {t("submit")}
                    </button>
                  ) : null}
                  {canAuthor && draftLike ? (
                    <button
                      type="button"
                      disabled={pending === list.id}
                      onClick={() => setDialog({ kind: "delete", list })}
                      className="rounded border border-danger/40 px-3 py-2 font-data text-xs text-danger disabled:opacity-50"
                    >
                      {t("delete")}
                    </button>
                  ) : null}
                  {canPublish && list.state !== "published" ? (
                    <button
                      type="button"
                      disabled={pending === list.id || list.moderationStatus === "hidden"}
                      onClick={() => setDialog({ kind: "publish", list })}
                      className="rounded border border-ink-border px-3 py-2 font-data text-xs text-paper-muted hover:text-paper disabled:opacity-50"
                    >
                      {t("publish")}
                    </button>
                  ) : null}
                  {canPublish && list.state === "published" ? (
                    <button
                      type="button"
                      disabled={pending === list.id}
                      onClick={() => setDialog({ kind: "withdraw", list })}
                      className="rounded border border-ink-border px-3 py-2 font-data text-xs text-paper-muted hover:text-paper disabled:opacity-50"
                    >
                      {t("unpublish")}
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={dialog !== null}
        title={confirmCopy.title}
        message={confirmCopy.message}
        confirmLabel={confirmCopy.confirm}
        cancelLabel={t("cancel")}
        danger={confirmCopy.danger}
        onConfirm={() => void confirmDialog()}
        onCancel={() => setDialog(null)}
      />
    </div>
  );
}
