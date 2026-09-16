"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { FollowedArtistToolbar, type FollowedArtistSort } from "./FollowedArtistToolbar";
import { FollowedArtistModeSwitcher } from "./FollowedArtistModeSwitcher";
import { useFollowedArtistViewMode } from "./use-followed-artist-view-mode";
import { FollowedArtistRow } from "./FollowedArtistRow";
import type { FollowedArtistDto } from "@/lib/api/schemas";

interface FollowedArtistListProps {
  initial: FollowedArtistDto[];
}

// Lista de gestión de `/me/artists` (openspec: add-artist-following),
// rediseñada con el mismo patrón de buscador + orden + modos de vista que
// Favoritos/Colección/Quiero Escuchar. Sin round-trip al servidor: opera
// sobre `initial` (el servicio ya trae hasta 50, sin paginación hoy), así que
// buscar y ordenar es filtrado/orden en memoria.
export function FollowedArtistList({ initial }: FollowedArtistListProps) {
  const t = useTranslations("users.artistsFollowed");
  const [mode, setMode] = useFollowedArtistViewMode();
  const [searchInput, setSearchInput] = useState("");
  const [sort, setSort] = useState<FollowedArtistSort>("recent");

  const filtered = useMemo(() => {
    const q = searchInput.trim().toLowerCase();
    const list = q ? initial.filter((artist) => artist.name.toLowerCase().includes(q)) : initial;
    // "recent": el servicio ya entrega desc(createdAt) — no hay que reordenar.
    return sort === "alpha" ? [...list].sort((a, b) => a.name.localeCompare(b.name)) : list;
  }, [initial, searchInput, sort]);

  if (initial.length === 0) {
    return (
      <EmptyState
        title={t("emptyTitle")}
        description={t("emptyDescription")}
        action={
          <Link
            href="/search"
            className="rounded-md border border-ink-border bg-ink-surface px-4 py-2 font-data text-sm text-paper transition-colors hover:border-amber"
          >
            {t("emptyCta")}
          </Link>
        }
      />
    );
  }

  return (
    <div className="flex w-full max-w-2xl flex-col gap-4">
      <FollowedArtistToolbar
        searchInput={searchInput}
        onSearchInput={setSearchInput}
        sort={sort}
        onSortChange={setSort}
      />
      <div className="flex justify-end">
        <FollowedArtistModeSwitcher mode={mode} onChange={setMode} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState title={t("noResultsTitle")} description={t("noResultsDescription")} />
      ) : mode === "graphic" ? (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
          {filtered.map((artist) => (
            <FollowedArtistRow key={artist.id} artist={artist} mode="graphic" />
          ))}
        </ul>
      ) : (
        <ul className="flex flex-col divide-y divide-ink-border rounded-lg border border-ink-border">
          {filtered.map((artist) => (
            <FollowedArtistRow key={artist.id} artist={artist} mode="index" />
          ))}
        </ul>
      )}
    </div>
  );
}
