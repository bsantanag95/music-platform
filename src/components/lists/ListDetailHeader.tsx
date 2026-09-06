"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ListCoverMosaic } from "./ListCoverMosaic";
import { SaveListButton } from "./SaveListButton";
import { RelativeDate } from "@/components/feed/feed-row-parts";
import { entityTypeKey } from "./lists-shared";
import { deleteList, updateList } from "@/lib/api/lists";
import type { DiaryAudience, UserListDetail } from "@/lib/api/schemas";

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
  /** Modo gestión: la lista quedó actualizada / borrada. */
  onUpdated?: (list: UserListDetail) => void;
  onDeleted?: () => void;
}

const AUDIENCES: DiaryAudience[] = ["private", "followers", "public"];

export function ListDetailHeader({
  list,
  canManage,
  owner,
  saved = false,
  following = false,
  canSave = false,
  onUpdated,
  onDeleted,
}: ListDetailHeaderProps) {
  const t = useTranslations("lists");
  const router = useRouter();

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(list.title);
  const [description, setDescription] = useState(list.description ?? "");
  const [audience, setAudience] = useState<DiaryAudience>(list.audience);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const saveMeta = async () => {
    setBusy(true);
    setError(false);
    try {
      const updated = await updateList(list.id, {
        title,
        description: description.trim() === "" ? null : description,
        audience,
      });
      onUpdated?.(updated);
      setEditing(false);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setError(false);
    try {
      await deleteList(list.id);
      onDeleted?.();
      router.push("/me/lists");
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-4">
        <ListCoverMosaic
          coverThumbs={list.coverThumbs}
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
                  className="text-paper-muted underline decoration-dotted transition-colors hover:text-paper"
                >
                  {editing ? t("collapse") : t("edit")}
                </button>
                {pendingDelete ? (
                  <>
                    <span className="text-danger">{t("deleteShort")}</span>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void remove()}
                      className="text-danger underline decoration-dotted transition-colors hover:text-paper disabled:opacity-50"
                    >
                      {busy ? t("deleting") : t("delete")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDelete(false)}
                      className="text-paper-muted transition-colors hover:text-paper"
                    >
                      {t("collapse")}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPendingDelete(true)}
                    className="text-paper-muted underline decoration-dotted transition-colors hover:text-danger"
                  >
                    {t("delete")}
                  </button>
                )}
              </div>
            ) : null}
          </div>

          {list.description ? (
            <p className="whitespace-pre-wrap font-body text-sm text-paper-muted">
              {list.description}
            </p>
          ) : null}

          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-data text-xs text-paper-muted">
            {owner ? (
              <>
                <Link
                  href={`/users/${encodeURIComponent(owner.username)}`}
                  className="transition-colors hover:text-amber"
                >
                  {t("byOwner", { name: owner.displayName ?? owner.username })}
                </Link>
                <span aria-hidden>·</span>
              </>
            ) : null}
            <span>{t(entityTypeKey(list.entityType))}</span>
            <span aria-hidden>·</span>
            <span>{t("itemsCount", { count: list.itemCount })}</span>
            <span aria-hidden>·</span>
            <span>{t(`audience.${list.audience}`)}</span>
            <span aria-hidden>·</span>
            <RelativeDate iso={list.createdAt} />
            {list.pinned ? (
              <>
                <span aria-hidden>·</span>
                <span className="text-amber">{t("pinnedBadge")}</span>
              </>
            ) : null}
          </p>

          {owner && canSave ? (
            <SaveListButton
              listId={list.id}
              initialSaved={saved}
              initialFollowing={following}
            />
          ) : null}
        </div>
      </div>

      {canManage && editing ? (
        <div className="flex flex-col gap-3 rounded-lg border border-ink-border bg-ink-surface p-4">
          <Input
            label={t("titleLabel")}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
          />
          <label className="flex flex-col gap-1">
            <span className="font-data text-sm text-paper">{t("descriptionLabel")}</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
              className="rounded border border-ink-border bg-ink px-3 py-2 font-body text-sm text-paper"
            />
          </label>
          <fieldset>
            <legend className="font-data text-sm text-paper">{t("audienceLabel")}</legend>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {AUDIENCES.map((option) => (
                <label
                  key={option}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded border px-3 py-1.5 font-data text-xs transition-colors ${
                    audience === option
                      ? "border-amber bg-amber/10 text-paper"
                      : "border-ink-border bg-ink text-paper-muted hover:text-paper"
                  }`}
                >
                  <input
                    type="radio"
                    name="list-audience"
                    className="sr-only"
                    checked={audience === option}
                    onChange={() => setAudience(option)}
                  />
                  {t(`audience.${option}`)}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="flex items-center gap-2">
            <span className="rounded border border-ink-border bg-ink px-2 py-1 font-data text-xs text-paper-muted">
              {t(entityTypeKey(list.entityType))}
            </span>
            <Button
              variant="primary"
              disabled={busy || title.trim() === ""}
              onClick={() => void saveMeta()}
            >
              {busy ? t("saving") : t("save")}
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => setEditing(false)}>
              {t("collapse")}
            </Button>
          </div>
        </div>
      ) : null}

      {error ? (
        <span role="alert" className="font-data text-xs text-danger">
          {t("saveError")}
        </span>
      ) : null}
    </div>
  );
}
