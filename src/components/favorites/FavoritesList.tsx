"use client";

import { useTranslations, useLocale } from "next-intl";
import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { getMyFavorites, getUserFavorites, removeFavorite } from "@/lib/api/favorites";
import { ApiError } from "@/lib/api/client";
import type { FavoritesListResponse, Favorite } from "@/lib/api/schemas";

interface FavoritesListProps {
  initial: FavoritesListResponse;
  readOnly?: boolean;
  username?: string;
  empty?: { title: string; description: string };
}

function targetHref(favorite: Favorite): string {
  if (favorite.targetType === "artist") return `/artist/${favorite.target.id}`;
  if (favorite.targetType === "release-group") return `/album/${favorite.target.id}`;
  return `/song/${favorite.target.id}`;
}

function formatDate(iso: string, locale: string) {
  return new Date(iso).toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Listado de favoritos. En modo propio permite quitarlos; en modo lectura
// (perfil ajeno) solo muestra los visibles.
export function FavoritesList({ initial, readOnly, username, empty }: FavoritesListProps) {
  const t = useTranslations("favorites");
  const locale = useLocale();
  const [favorites, setFavorites] = useState<Favorite[]>(initial.favorites);
  const [page, setPage] = useState(initial.page);
  const [hasNext, setHasNext] = useState(initial.hasNext);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  if (favorites.length === 0) {
    return (
      <EmptyState
        title={empty?.title ?? t("emptyTitle")}
        description={empty?.description ?? t("emptyDescription")}
      />
    );
  }

  const handleRemove = async (favorite: Favorite) => {
    setLoading(true);
    setLoadError(false);
    try {
      await removeFavorite({ type: favorite.targetType, id: favorite.target.id });
      setFavorites((current) => current.filter((item) => item.id !== favorite.id));
    } catch (error) {
      if (error instanceof ApiError && error.code === "FAVORITE_NOT_FOUND") {
        setFavorites((current) => current.filter((item) => item.id !== favorite.id));
      } else {
        setLoadError(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const next = readOnly && username
        ? await getUserFavorites(username, page + 1, 20)
        : await getMyFavorites(page + 1, 20);
      setFavorites((current) => [...current, ...next.favorites]);
      setPage(next.page);
      setHasNext(next.hasNext);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex w-full max-w-3xl flex-col gap-4">
      <ul className="flex flex-col gap-4">
        {favorites.map((favorite) => (
          <li key={favorite.id} className="rounded border border-ink-border bg-ink-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link
                  href={targetHref(favorite)}
                  className="font-display text-lg text-paper transition-colors hover:text-amber"
                >
                  {favorite.target.title}
                </Link>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-data text-xs text-paper-muted">
                  {!readOnly && <span>{t(`audience.${favorite.audience}`)}</span>}
                  <time dateTime={favorite.createdAt}>{formatDate(favorite.createdAt, locale)}</time>
                </div>
              </div>
              {!readOnly && (
                <Button variant="ghost" disabled={loading} onClick={() => void handleRemove(favorite)}>
                  {loading ? t("saving") : t("removeFavorite")}
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
      {hasNext && (
        <Button variant="secondary" disabled={loading} onClick={() => void handleLoadMore()} className="self-center">
          {loading ? t("loadingMore") : t("loadMore")}
        </Button>
      )}
      {loadError && (
        <span role="alert" className="text-center font-data text-xs text-danger">
          {t("loadError")}
        </span>
      )}
    </div>
  );
}