"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { ListCoverMosaic } from "./ListCoverMosaic";
import { SaveListButton } from "./SaveListButton";
import { TrackListButton } from "@/components/camino/TrackListButton";
import { RelativeDate } from "@/components/feed/feed-row-parts";
import { UserHoverCard } from "@/components/profiles/UserHoverCard";
import { entityTypeKey } from "./lists-shared";
import { deleteList } from "@/lib/api/lists";
import { ListMetaForm } from "./ListMetaForm";
import { DeleteListDialog } from "./DeleteListDialog";
import type { UserListDetail } from "@/lib/api/schemas";

interface OwnerInfo {
  username: string;
  displayName: string | null;
}

interface ListDetailHeaderProps {
  list: UserListDetail;
  canManage: boolean;
  /** Modo lectura: dueño de la lista y estado de guardado del visitante. */
  owner?: OwnerInfo;
  saved?: boolean;
  following?: boolean;
  /** Modo lectura: hay sesión, así que se ofrece Guardar/Seguir. */
  canSave?: boolean;
  /** Conteo agregado de guardados. Solo se muestra en listas `public`. */
  saveCount?: number;
  /** Tracking de progreso propio (openspec: add-camino), solo en modo lectura de álbumes. */
  tracking?: boolean;
  trackingProgress?: { selectedCount: number; listenedCount: number } | null;
  /** Modo gestión: la lista quedó actualizada / borrada. */
  onUpdated?: (list: UserListDetail) => void;
  onDeleted?: () => void;
}

export function ListDetailHeader({
  list,
  canManage,
  owner,
  saved = false,
  following = false,
  canSave = false,
  saveCount,
  tracking = false,
  trackingProgress = null,
  onUpdated,
  onDeleted,
}: ListDetailHeaderProps) {
  const t = useTranslations("lists");
  const router = useRouter();

  const [editing, setEditing] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const remove = async () => {
    setBusy(true);
    setDeleting(true);
    setError(false);
    try {
      await deleteList(list.id);
      onDeleted?.();
      router.push("/me/lists");
    } catch {
      setError(true);
      setDeleting(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-4">
        <ListCoverMosaic
          coverThumbs={list.coverThumbs}
          itemCount={list.itemCount}
          entityType={list.entityType}
          className="hidden w-28 shrink-0 sm:block"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-start justify-between gap-3">
            <h1 className="font-display text-2xl text-paper">{list.title}</h1>
            {canManage ? (
              <div className="flex shrink-0 items-center gap-2 font-data text-xs">
                <button
                  type="button"
                  onClick={() => setEditing((v) => !v)}
                  className="inline-flex min-h-8 items-center px-1 text-paper-muted underline decoration-dotted transition-colors hover:text-paper [@media(pointer:coarse)]:min-h-11"
                >
                  {editing ? t("collapse") : t("edit")}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setPendingDelete(true)}
                  className="inline-flex min-h-8 items-center px-1 text-paper-muted underline decoration-dotted transition-colors hover:text-danger disabled:opacity-50 [@media(pointer:coarse)]:min-h-11"
                >
                  {deleting ? t("deleting") : t("delete")}
                </button>
                <DeleteListDialog
                  list={pendingDelete ? list : null}
                  onCancel={() => setPendingDelete(false)}
                  onConfirm={() => {
                    setPendingDelete(false);
                    void remove();
                  }}
                />
              </div>
            ) : null}
          </div>

          {list.description ? (
            <p className="whitespace-pre-wrap font-body text-sm text-paper-muted">
              {list.description}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-data text-xs text-paper-muted">
            {owner ? (
              <>
                <UserHoverCard username={owner.username}>
                  <Link
                    href={`/users/${encodeURIComponent(owner.username)}`}
                    className="transition-colors hover:text-amber"
                  >
                    {t("byOwner", { name: owner.displayName ?? owner.username })}
                  </Link>
                </UserHoverCard>
                <span aria-hidden>·</span>
              </>
            ) : null}
            <span>{t(entityTypeKey(list.entityType))}</span>
            <span aria-hidden>·</span>
            <span>{t("itemsCount", { count: list.itemCount })}</span>
            <span aria-hidden>·</span>
            <span>{t(`audience.${list.audience}`)}</span>
            {list.audience === "public" && typeof saveCount === "number" && saveCount > 0 ? (
              <>
                <span aria-hidden>·</span>
                <span>{t("savesCount", { count: saveCount })}</span>
              </>
            ) : null}
            <span aria-hidden>·</span>
            <RelativeDate iso={list.createdAt} />
            {list.pinned ? (
              <>
                <span aria-hidden>·</span>
                <span className="text-amber">{t("pinnedBadge")}</span>
              </>
            ) : null}
          </div>

          {owner && canSave ? (
            <div className="flex flex-wrap items-start gap-3">
              <SaveListButton
                listId={list.id}
                initialSaved={saved}
                initialFollowing={following}
              />
              {list.entityType === "release-group" ? (
                <TrackListButton
                  listId={list.id}
                  initialTracking={tracking}
                  initialProgress={trackingProgress}
                />
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {canManage && editing ? (
        <ListMetaForm
          list={list}
          onSaved={(updated) => {
            onUpdated?.(updated);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      ) : null}

      {error ? (
        <span role="alert" className="font-data text-xs text-danger">
          {t("deleteError")}
        </span>
      ) : null}
    </div>
  );
}
