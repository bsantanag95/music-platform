"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { apiFetch, ApiError } from "@/lib/api/client";
import { getMyFavorites } from "@/lib/api/favorites";
import { AlbumFavoritesResponseSchema, type Favorite } from "@/lib/api/schemas";
import { PROFILE_MAX_ALBUM_FAVORITES } from "@/services/social/types";
import type { AlbumFavorite } from "@/services/profiles/album-favorites";

interface OwnerAlbumFavoritesEditorProps {
  initial: AlbumFavorite[];
}

interface Row {
  favoriteId: string;
  title: string;
  artistName: string | null;
  coverThumbUrl: string | null;
}

function favoriteToRow(favorite: Favorite): Row {
  return {
    favoriteId: favorite.id,
    title: favorite.target.title,
    artistName: favorite.target.artistName ?? null,
    coverThumbUrl: favorite.target.coverThumbUrl,
  };
}

// Editor inline de "Álbumes favoritos" del dueño. Igual que el editor de
// destacados (memoria list-detail-scope) NO hay buscador de catálogo: se elige
// de los favoritos de álbum ya marcados. Hasta 6, ordenables. Es una
// declaración, no un ranking: sin notas ni estrellas
// (openspec: redesign-profile-album-identity).
export function OwnerAlbumFavoritesEditor({ initial }: OwnerAlbumFavoritesEditorProps) {
  const t = useTranslations("users");
  const tErrors = useTranslations("errors");

  const [rows, setRows] = useState<Row[]>(
    initial.map((album) => ({
      favoriteId: album.favoriteId,
      title: album.target.title,
      artistName: album.target.artistName,
      coverThumbUrl: album.target.coverThumbUrl,
    })),
  );
  const [favorites, setFavorites] = useState<Favorite[] | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const selectedIds = new Set(rows.map((row) => row.favoriteId));

  async function loadFavorites() {
    if (favorites) return;
    try {
      const result = await getMyFavorites(1, 50, { type: "release-group" });
      setFavorites(result.favorites);
    } catch (error) {
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    }
  }

  function move(index: number, delta: number) {
    setRows((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });
    setStatus("idle");
  }

  async function save() {
    setStatus("saving");
    setErrorCode(null);
    try {
      await apiFetch("/api/me/profile/album-favorites", AlbumFavoritesResponseSchema, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ favoriteIds: rows.map((row) => row.favoriteId) }),
      });
      setStatus("saved");
    } catch (error) {
      setStatus("idle");
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-display text-sm text-paper-muted">{t("albumFavorites.edit.heading")}</h3>
      <p className="font-body text-xs text-paper-muted">{t("albumFavorites.edit.intro")}</p>

      <ul className="flex flex-col gap-2">
        {rows.map((row, index) => (
          <li
            key={row.favoriteId}
            className="flex flex-wrap items-center gap-2 rounded border border-ink-border bg-ink p-2"
          >
            <CoverThumb cover={row.coverThumbUrl} label="" className="size-10" />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-display text-sm text-paper">{row.title}</span>
              {row.artistName && (
                <span className="block truncate font-data text-xs text-paper-muted">
                  {row.artistName}
                </span>
              )}
            </span>
            <span className="flex gap-1">
              <Button
                type="button"
                variant="ghost"
                aria-label={t("albumFavorites.edit.moveUp")}
                disabled={index === 0}
                onClick={() => move(index, -1)}
              >
                ↑
              </Button>
              <Button
                type="button"
                variant="ghost"
                aria-label={t("albumFavorites.edit.moveDown")}
                disabled={index === rows.length - 1}
                onClick={() => move(index, 1)}
              >
                ↓
              </Button>
              <Button
                type="button"
                variant="ghost"
                aria-label={t("albumFavorites.edit.remove")}
                onClick={() => {
                  setRows((prev) => prev.filter((_, i) => i !== index));
                  setStatus("idle");
                }}
              >
                ×
              </Button>
            </span>
          </li>
        ))}
      </ul>

      {rows.length < PROFILE_MAX_ALBUM_FAVORITES ? (
        <details onToggle={() => void loadFavorites()}>
          <summary className="cursor-pointer font-data text-xs text-paper-muted hover:text-paper">
            {t("albumFavorites.edit.pick")}
          </summary>
          <ul className="mt-2 flex max-h-64 flex-col gap-1 overflow-y-auto">
            {favorites?.length === 0 && (
              <li className="font-body text-xs text-paper-muted">
                {t("albumFavorites.edit.noFavorites")}
              </li>
            )}
            {favorites
              ?.filter((favorite) => !selectedIds.has(favorite.id))
              .map((favorite) => (
                <li key={favorite.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setRows((prev) => [...prev, favoriteToRow(favorite)]);
                      setStatus("idle");
                    }}
                    className="flex w-full items-center gap-2 rounded border border-ink-border bg-ink-surface px-2 py-1.5 text-left transition-colors hover:border-amber"
                  >
                    <CoverThumb cover={favorite.target.coverThumbUrl} label="" className="size-8" />
                    <span className="truncate font-body text-xs text-paper">
                      {favorite.target.title}
                    </span>
                  </button>
                </li>
              ))}
          </ul>
        </details>
      ) : (
        <p className="font-data text-xs text-paper-muted">{t("albumFavorites.edit.max")}</p>
      )}

      <div className="flex items-center gap-3">
        <Button type="button" onClick={() => void save()} disabled={status === "saving"}>
          {status === "saving" ? t("edit.saving") : t("albumFavorites.edit.save")}
        </Button>
        {status === "saved" && (
          <span role="status" className="font-data text-xs text-petrol-hover">
            {t("edit.saved")}
          </span>
        )}
      </div>

      {errorCode && (
        <span role="alert" className="font-data text-xs text-danger">
          {tErrors(`${errorCode}.description`)}
        </span>
      )}
    </div>
  );
}
