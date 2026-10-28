"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { UndoToast } from "@/components/ui/UndoToast";
import { useProgressFilters } from "@/components/progress/use-progress-filters";
import { FollowedArtistToolbar, type FollowedArtistSort } from "./FollowedArtistToolbar";
import { FollowedArtistModeSwitcher } from "./FollowedArtistModeSwitcher";
import { useFollowedArtistViewMode } from "./use-followed-artist-view-mode";
import { FollowedArtistRow } from "./FollowedArtistRow";
import { followArtist, unfollowArtist } from "@/lib/api/catalog";
import type { FollowedArtistDto } from "@/lib/api/schemas";

interface FollowedArtistListProps {
  initial: FollowedArtistDto[];
  // Filtros leídos de la URL por la página, ya validados (refine-artists-page-phase1, D4).
  initialFilters?: { q?: string; sort?: FollowedArtistSort };
}

const FILTER_DEFAULTS: { q: string; sort: FollowedArtistSort } = { q: "", sort: "recent" };

interface Unfollowed {
  artist: FollowedArtistDto;
  index: number;
  undoing: boolean;
  failed: boolean;
}

// Lista de gestión de `/me/artists` (openspec: add-artist-following), con buscador + orden + modos de vista. Opera
// sobre la lista completa que trae la página (`listAllFollowedArtists`), así que buscar y ordenar es filtrado/orden en
// memoria; búsqueda y orden se reflejan en la URL. Dejar de seguir quita la fila y ofrece Deshacer
// (refine-artists-page-phase1, D2).
export function FollowedArtistList({ initial, initialFilters }: FollowedArtistListProps) {
  const t = useTranslations("users.artistsFollowed");
  const [mode, setMode, ready] = useFollowedArtistViewMode();
  const [filters, setFilter] = useProgressFilters(FILTER_DEFAULTS, initialFilters);
  const [items, setItems] = useState(initial);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [unfollowed, setUnfollowed] = useState<Unfollowed | null>(null);

  const filtered = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    const list = q ? items.filter((artist) => artist.name.toLowerCase().includes(q)) : items;
    // "recent": el servicio ya entrega desc(createdAt) — no hay que reordenar.
    return filters.sort === "alpha" ? [...list].sort((a, b) => a.name.localeCompare(b.name)) : list;
  }, [items, filters]);

  async function handleUnfollow(artist: FollowedArtistDto) {
    setBusyId(artist.id);
    setError(false);
    try {
      await unfollowArtist(artist.id);
      const index = items.findIndex((item) => item.id === artist.id);
      setItems((current) => current.filter((item) => item.id !== artist.id));
      setUnfollowed({ artist, index, undoing: false, failed: false });
    } catch {
      setError(true);
    } finally {
      setBusyId(null);
    }
  }

  async function handleUndo() {
    if (!unfollowed) return;
    const { artist, index } = unfollowed;
    setUnfollowed({ ...unfollowed, undoing: true });
    try {
      await followArtist(artist.id);
      setItems((current) => {
        const next = [...current];
        next.splice(Math.min(index, next.length), 0, artist);
        return next;
      });
      setUnfollowed(null);
    } catch {
      setUnfollowed({ ...unfollowed, undoing: false, failed: true });
    }
  }

  const dismissToast = useCallback(() => setUnfollowed(null), []);

  const toast = unfollowed ? (
    <UndoToast
      key={unfollowed.artist.id}
      message={unfollowed.failed ? t("undoError") : t("unfollowed", { name: unfollowed.artist.name })}
      undoLabel={t("undo")}
      onUndo={unfollowed.failed ? undefined : () => void handleUndo()}
      onExpire={dismissToast}
      undoing={unfollowed.undoing}
    />
  ) : null;

  if (items.length === 0) {
    return (
      <>
        <EmptyState
          title={t("emptyTitle")}
          description={t("emptyDescription")}
          action={
            <Link
              href="/search?type=artist"
              className="rounded-md border border-ink-border bg-ink-surface px-4 py-2 font-data text-sm text-paper transition-colors hover:border-amber"
            >
              {t("emptyCta")}
            </Link>
          }
        />
        {toast}
      </>
    );
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <FollowedArtistToolbar
          searchInput={filters.q}
          onSearchInput={(value) => setFilter("q", value)}
          sort={filters.sort}
          onSortChange={(value) => setFilter("sort", value)}
        />
        <div className="flex justify-end">
          <FollowedArtistModeSwitcher mode={mode} onChange={setMode} />
        </div>
      </div>

      {error ? (
        <p role="alert" className="font-data text-xs text-danger">
          {t("unfollowError")}
        </p>
      ) : null}

      {!ready ? (
        // Marcador mientras se lee el modo guardado: no se pinta Índice para saltar a Gráfico (D4).
        <div aria-hidden data-testid="followed-artists-placeholder" className="flex flex-col gap-2">
          {Array.from({ length: Math.min(Math.max(filtered.length, 1), 4) }, (_, index) => (
            <div key={index} className="h-14 rounded-lg bg-ink-surface motion-safe:animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState title={t("noResultsTitle")} description={t("noResultsDescription")} />
      ) : mode === "graphic" ? (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
          {filtered.map((artist) => (
            <FollowedArtistRow
              key={artist.id}
              artist={artist}
              mode="graphic"
              onUnfollow={(target) => void handleUnfollow(target)}
              busy={busyId === artist.id}
            />
          ))}
        </ul>
      ) : (
        <ul className="flex flex-col divide-y divide-ink-border rounded-lg border border-ink-border">
          {filtered.map((artist) => (
            <FollowedArtistRow
              key={artist.id}
              artist={artist}
              mode="index"
              onUnfollow={(target) => void handleUnfollow(target)}
              busy={busyId === artist.id}
            />
          ))}
        </ul>
      )}
      {toast}
    </div>
  );
}
