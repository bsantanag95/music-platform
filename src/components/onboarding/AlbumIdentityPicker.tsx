"use client";

import { useTranslations } from "next-intl";
import { LazyCoverImage } from "@/components/catalog/LazyCoverImage";
import { PROFILE_MAX_ALBUM_FAVORITES } from "@/services/social/types";
import { useCatalogSearch } from "./useCatalogSearch";

export interface PickedAlbum {
  id: string;
  title: string;
  artistName: string | null;
  year: number | null;
}

interface AlbumIdentityPickerProps {
  picked: PickedAlbum[];
  onChange: (next: PickedAlbum[]) => void;
}

// Puerta 1 del onboarding: elegir hasta 6 álbumes (sugerencia 3–5) que se
// convertirán en Álbumes favoritos del perfil. Solo mantiene la selección en
// estado; el guardado lo dispara `TwoDoorOnboarding`.
export function AlbumIdentityPicker({ picked, onChange }: AlbumIdentityPickerProps) {
  const t = useTranslations("onboarding");
  const { query, setQuery, response, loading } = useCatalogSearch();

  const pickedIds = new Set(picked.map((a) => a.id));
  const atMax = picked.length >= PROFILE_MAX_ALBUM_FAVORITES;
  const albums = (response?.results ?? []).filter(
    (r) => r.kind === "release-group" && !pickedIds.has(r.id),
  );

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-ink-border bg-ink-surface p-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-xl text-paper">{t("door1.heading")}</h2>
        <p className="font-body text-sm text-paper-muted">{t("door1.intro")}</p>
      </div>

      {picked.length > 0 && (
        <ul className="flex flex-col gap-2">
          {picked.map((album) => (
            <li
              key={album.id}
              className="flex items-center gap-3 rounded border border-ink-border bg-ink p-2"
            >
              <LazyCoverImage releaseGroupId={album.id} coverLabel="" className="size-10" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-display text-sm text-paper">{album.title}</span>
                <span className="block truncate font-data text-xs text-paper-muted">
                  {[album.artistName, album.year].filter(Boolean).join(" · ")}
                </span>
              </span>
              <button
                type="button"
                onClick={() => onChange(picked.filter((a) => a.id !== album.id))}
                className="font-data text-xs text-danger underline"
              >
                {t("door1.remove")}
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="font-data text-xs text-paper-muted">
        {t("door1.selected", { count: picked.length })} · {t("door1.suggestion")}
      </p>

      {atMax ? (
        <p className="font-data text-xs text-paper-muted">{t("door1.max")}</p>
      ) : (
        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-1 font-data text-xs text-paper">
            {t("door1.searchLabel")}
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("door1.searchPlaceholder")}
              className="rounded border border-ink-border bg-ink px-3 py-2 font-body text-sm text-paper placeholder:text-paper-muted"
            />
          </label>
          {loading && <p className="font-data text-xs text-paper-muted">{t("door1.searching")}</p>}
          {!loading && query.trim().length >= 2 && albums.length === 0 && (
            <p className="font-data text-xs text-paper-muted">{t("door1.noResults")}</p>
          )}
          <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto">
            {albums.map((album) => (
              <li key={album.id}>
                <button
                  type="button"
                  onClick={() =>
                    onChange([
                      ...picked,
                      { id: album.id, title: album.name, artistName: album.subtitle, year: album.year },
                    ])
                  }
                  className="flex w-full items-center gap-2 rounded border border-ink-border bg-ink px-2 py-1.5 text-left transition-colors hover:border-amber"
                >
                  <LazyCoverImage releaseGroupId={album.id} coverLabel="" className="size-8" />
                  <span className="min-w-0">
                    <span className="block truncate font-body text-xs text-paper">{album.name}</span>
                    {album.subtitle && (
                      <span className="block truncate font-data text-[11px] text-paper-muted">
                        {album.subtitle}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
