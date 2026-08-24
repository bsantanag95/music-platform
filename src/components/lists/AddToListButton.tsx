"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { getMyLists, addItemToList, createList } from "@/lib/api/lists";
import { ApiError } from "@/lib/api/client";
import type { ListTarget, UserListDetail, UserListSummary } from "@/lib/api/schemas";

interface AddToListButtonProps {
  target: ListTarget;
  authenticated: boolean;
}

function isCompatible(list: UserListSummary, targetType: string): boolean {
  return list.entityType === targetType;
}

// Acción "Agregar a lista" contextual en páginas de catálogo: ofrece las
// listas propias compatibles con el tipo del objetivo y crea una nueva
// si todavía no hay ninguna.
export function AddToListButton({ target, authenticated }: AddToListButtonProps) {
  const t = useTranslations("lists");
  const [open, setOpen] = useState(false);
  const [lists, setLists] = useState<UserListSummary[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [addedListId, setAddedListId] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  if (!authenticated) {
    return (
      <Link
        href="/auth/login"
        className="inline-flex items-center justify-center gap-2 rounded border border-ink-border bg-ink-surface px-4 py-2 font-display text-sm text-paper transition-colors hover:border-amber"
      >
        {t("addItem")}
      </Link>
    );
  }

  const loadLists = async () => {
    setBusy(true);
    setErrorCode(null);
    try {
      const result = await getMyLists(1, 50);
      setLists(result.lists);
    } catch (err) {
      setErrorCode(err instanceof ApiError ? err.code : "INTERNAL_ERROR");
    } finally {
      setBusy(false);
    }
  };

  const handleOpen = () => {
    setOpen((current) => !current);
    if (!lists) void loadLists();
  };

  const handleAdd = async (list: UserListSummary) => {
    setBusy(true);
    setErrorCode(null);
    try {
      await addItemToList(list.id, target);
      setAddedListId(list.id);
    } catch (error) {
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    } finally {
      setBusy(false);
    }
  };

  const handleCreateAndAdd = async () => {
    setBusy(true);
    setErrorCode(null);
    try {
      const title =
        target.type === "artist"
          ? t("entityTypeArtist")
          : target.type === "release-group"
            ? t("entityTypeAlbum")
            : t("entityTypeSong");
      const created: UserListDetail = await createList({ entityType: target.type, title });
      await addItemToList(created.id, target);
      setAddedListId(created.id);
    } catch (error) {
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    } finally {
      setBusy(false);
    }
  };

  const compatible = (lists ?? []).filter((list) => isCompatible(list, target.type));

  return (
    <div className="flex flex-col items-start gap-2">
      <Button variant="secondary" onClick={handleOpen}>
        {t("addItem")}
      </Button>
      {open && (
        <div className="flex w-full max-w-sm flex-col gap-2 rounded border border-ink-border bg-ink-surface p-3">
          {compatible.length === 0 ? (
            <p className="font-body text-sm text-paper-muted">{t("emptyDescription")}</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {compatible.map((list) => (
                <li key={list.id}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleAdd(list)}
                    className={`w-full rounded px-2 py-1.5 text-left font-data text-sm transition-colors ${
                      addedListId === list.id
                        ? "bg-amber/10 text-amber"
                        : "text-paper hover:bg-ink"
                    }`}
                  >
                    {list.title}
                    {addedListId === list.id ? " ✓" : ""}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Button variant="ghost" disabled={busy} onClick={() => void handleCreateAndAdd()}>
            {t("newList")}
          </Button>
          {errorCode && (
            <span role="alert" className="font-data text-xs text-danger">
              {t("saveError")}
            </span>
          )}
        </div>
      )}
    </div>
  );
}