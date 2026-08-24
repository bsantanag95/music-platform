"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { deleteList, removeItemFromList, reorderListItems, updateList } from "@/lib/api/lists";
import { ApiError } from "@/lib/api/client";
import type { DiaryAudience, UserListDetail, UserListItem } from "@/lib/api/schemas";

interface ListDetailProps {
  initial: UserListDetail;
}

function itemHref(item: UserListItem, entityType: string): string {
  if (entityType === "artist") return `/artist/${item.target.id}`;
  if (entityType === "release-group") return `/album/${item.target.id}`;
  return `/song/${item.target.id}`;
}

// Detalle de una lista propia: edición de metadatos, lista de ítems con
// quitar y reordenar (posición), y borrado con confirmación.
export function ListDetail({ initial }: ListDetailProps) {
  const t = useTranslations("lists");
  const router = useRouter();
  const [list, setList] = useState<UserListDetail>(initial);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description ?? "");
  const [audience, setAudience] = useState<DiaryAudience>(initial.audience);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const handleSaveMeta = async () => {
    setBusy(true);
    setErrorCode(null);
    try {
      const updated = await updateList(list.id, {
        title,
        description: description.trim() === "" ? null : description,
        audience,
      });
      setList(updated);
      setEditing(false);
    } catch (error) {
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    setBusy(true);
    setErrorCode(null);
    try {
      await deleteList(list.id);
      router.push("/me/lists");
    } catch (error) {
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveItem = async (item: UserListItem) => {
    setBusy(true);
    setErrorCode(null);
    try {
      const updated = await removeItemFromList(list.id, item.id);
      setList(updated);
      setPendingRemoveId(null);
    } catch (error) {
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    } finally {
      setBusy(false);
    }
  };

  const moveItem = async (itemId: string, direction: -1 | 1) => {
    const index = list.items.findIndex((item) => item.id === itemId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= list.items.length) return;
    const reordered = [...list.items];
    const [moved] = reordered.splice(index, 1);
    if (!moved) return;
    reordered.splice(target, 0, moved);
    setBusy(true);
    setErrorCode(null);
    try {
      const updated = await reorderListItems(list.id, reordered.map((item) => item.id));
      setList(updated);
    } catch (error) {
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    } finally {
      setBusy(false);
    }
  };

  if (list.items.length === 0 && !editing) {
    return (
      <div className="flex w-full max-w-3xl flex-col gap-4">
        <ListHeader list={list} onEdit={() => setEditing(true)} />
        <EmptyState title={t("noItems")} description={t("emptyDescription")} />
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-3xl flex-col gap-4">
      <ListHeader list={list} onEdit={() => setEditing(true)} />

      {editing && (
        <div className="flex flex-col gap-3 rounded border border-ink-border bg-ink-surface p-4">
          <Input label={t("titleLabel")} value={title} onChange={(event) => setTitle(event.target.value)} maxLength={100} />
          <label className="flex flex-col gap-1">
            <span className="font-data text-sm text-paper">{t("descriptionLabel")}</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={500}
              rows={3}
              className="rounded border border-ink-border bg-ink px-3 py-2 font-body text-sm text-paper"
            />
          </label>
          <fieldset>
            <legend className="font-data text-sm text-paper">{t("audienceLabel")}</legend>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {(["private", "followers", "public"] as const).map((option) => (
                <label
                  key={option}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded border px-3 py-1.5 font-data text-xs transition-colors ${
                    audience === option ? "border-amber bg-amber/10 text-paper" : "border-ink-border bg-ink text-paper-muted hover:text-paper"
                  }`}
                >
                  <input type="radio" name="list-audience" className="sr-only" checked={audience === option} onChange={() => setAudience(option)} />
                  {t(`audience.${option}`)}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="flex items-center gap-2">
            <Button variant="primary" disabled={busy || title.trim() === ""} onClick={() => void handleSaveMeta()}>
              {busy ? t("saving") : t("save")}
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => setEditing(false)}>
              {t("collapse")}
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg text-paper">{t("items")}</h2>
        {pendingDelete ? (
          <div className="flex items-center gap-2">
            <span className="font-data text-xs text-danger">{t("deleteConfirm")}</span>
            <Button variant="primary" disabled={busy} onClick={() => void handleDelete()}>
              {busy ? t("deleting") : t("delete")}
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => setPendingDelete(false)}>
              {t("collapse")}
            </Button>
          </div>
        ) : (
          <Button variant="ghost" onClick={() => setPendingDelete(true)}>
            {t("delete")}
          </Button>
        )}
      </div>

      <ul className="flex flex-col gap-4">
        {list.items.map((item, index) => (
          <li key={item.id} className="rounded border border-ink-border bg-ink-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <Link
                href={itemHref(item, list.entityType)}
                className="font-display text-lg text-paper transition-colors hover:text-amber"
              >
                {item.target.title}
              </Link>
              <div className="flex shrink-0 items-center gap-2">
                <Button variant="ghost" disabled={busy || index === 0} aria-label={t("removeItem")} onClick={() => void moveItem(item.id, -1)}>
                  ↑
                </Button>
                <Button variant="ghost" disabled={busy || index === list.items.length - 1} aria-label={t("removeItem")} onClick={() => void moveItem(item.id, 1)}>
                  ↓
                </Button>
                {pendingRemoveId === item.id ? (
                  <div className="flex items-center gap-2">
                    <span className="font-data text-xs text-danger">{t("removeItemConfirm")}</span>
                    <Button variant="primary" disabled={busy} onClick={() => void handleRemoveItem(item)}>
                      {busy ? t("saving") : t("removeItem")}
                    </Button>
                    <Button variant="ghost" disabled={busy} onClick={() => setPendingRemoveId(null)}>
                      {t("collapse")}
                    </Button>
                  </div>
                ) : (
                  <Button variant="ghost" onClick={() => setPendingRemoveId(item.id)}>
                    {t("removeItem")}
                  </Button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>

      {errorCode && (
        <span role="alert" className="text-center font-data text-xs text-danger">
          {t("saveError")}
        </span>
      )}
    </div>
  );
}

function ListHeader({
  list,
  onEdit,
}: {
  list: UserListDetail;
  onEdit: () => void;
}) {
  const t = useTranslations("lists");
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-3">
        <h1 className="font-display text-2xl text-paper">{list.title}</h1>
        <Button variant="secondary" onClick={onEdit}>
          {t("edit")}
        </Button>
      </div>
      {list.description ? <p className="whitespace-pre-wrap font-body text-sm text-paper-muted">{list.description}</p> : null}
      <span className="font-data text-xs text-paper-muted">{t(`audience.${list.audience}`)}</span>
    </div>
  );
}