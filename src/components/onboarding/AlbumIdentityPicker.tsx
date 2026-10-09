"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { LazyCoverImage } from "@/components/catalog/LazyCoverImage";
import { useTargetSearch } from "@/components/quick-actions/use-target-search";
import { isRecord } from "@/lib/session-state";
import { ONBOARDING_MAX_ALBUMS, type Audience } from "@/services/social/types";
import { AudienceNote } from "./AudienceNote";
import { categoryKey } from "./ResultCategory";
import { SearchStatus } from "./SearchStatus";

export interface PickedAlbum {
  id: string;
  title: string;
  artistName: string | null;
  year: number | null;
}

/** Forma de un álbum elegido guardado en `sessionStorage` (un valor ajeno se descarta). */
export function isPickedAlbum(value: unknown): value is PickedAlbum {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    (value.artistName === null || typeof value.artistName === "string") &&
    (value.year === null || typeof value.year === "number")
  );
}

interface AlbumIdentityPickerProps {
  picked: PickedAlbum[];
  onChange: (next: PickedAlbum[]) => void;
  /** Audiencia efectiva de un favorito nuevo del usuario, para el aviso. */
  audience: Audience;
}

// Puerta 1 del onboarding: elegir hasta 6 álbumes (sugerencia 3–5) que se
// convertirán en favoritos de álbum del usuario. Solo mantiene la selección en
// estado; el guardado lo dispara `TwoDoorOnboarding`. Busca con el mismo motor
// que el diálogo "Añadir" (coincidencias locales primero, búsqueda completa
// después, con cancelación) y acota la búsqueda completa a álbumes de estudio:
// "los álbumes que te definen" no son sencillos ni versiones de desconocidos.
export function AlbumIdentityPicker({ picked, onChange, audience }: AlbumIdentityPickerProps) {
  const t = useTranslations("onboarding");
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const search = useTargetSearch("album", query, { category: "studio" });

  const pickedIds = new Set(picked.map((a) => a.id));
  const atMax = picked.length >= ONBOARDING_MAX_ALBUMS;
  const albums = search.candidates.filter((c) => !pickedIds.has(c.id));

  function pick(album: (typeof albums)[number]) {
    onChange([...picked, { id: album.id, title: album.title, artistName: album.subtitle, year: album.year }]);
    // El resultado elegido desaparece de la lista y el foco no debe caer al <body>: se limpia el
    // texto y se vuelve al campo para sumar el siguiente.
    setQuery("");
    inputRef.current?.focus();
  }

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
              <span aria-hidden="true" className="contents"><LazyCoverImage releaseGroupId={album.id} coverLabel="" className="size-10" /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-display text-sm text-paper">{album.title}</span>
                <span className="block truncate font-data text-xs text-paper-muted">
                  {[album.artistName, album.year].filter(Boolean).join(" · ")}
                </span>
              </span>
              <button
                type="button"
                aria-label={t("door1.removeLabel", { title: album.title })}
                onClick={() => {
                  onChange(picked.filter((a) => a.id !== album.id));
                  inputRef.current?.focus();
                }}
                className="min-h-11 rounded px-2 font-data text-xs text-danger underline"
              >
                {t("door1.remove")}
              </button>
            </li>
          ))}
        </ul>
      )}

      <p aria-live="polite" className="font-data text-xs text-paper-muted">
        {t("door1.selected", { count: picked.length })} · {t("door1.suggestion")}
      </p>

      {atMax ? (
        <p className="font-data text-xs text-paper-muted">{t("door1.max")}</p>
      ) : (
        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-1 font-data text-xs text-paper">
            {t("door1.searchLabel")}
            <input
              ref={inputRef}
              type="search"
              autoComplete="off"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("door1.searchPlaceholder")}
              className="rounded border border-ink-border bg-ink px-3 py-2 font-body text-base text-paper placeholder:text-paper-muted sm:text-sm"
            />
          </label>
          <SearchStatus
            searchable={search.searchable}
            pending={search.pending}
            failed={search.failed}
            resultCount={albums.length}
            labels={{ searching: t("door1.searching"), noResults: t("door1.noResults"), error: t("searchError") }}
          />
          <ul className="themed-scrollbar flex max-h-72 flex-col gap-1 overflow-y-auto">
            {albums.map((album) => {
              const category = categoryKey(album.category);
              const detail = [album.subtitle, album.year, category && t(`categories.${category}`)]
                .filter(Boolean)
                .join(" · ");
              return (
                <li key={album.id}>
                  <button
                    type="button"
                    onClick={() => pick(album)}
                    className="flex min-h-11 w-full items-center gap-2 rounded border border-ink-border bg-ink px-2 py-1.5 text-left transition-colors hover:border-amber"
                  >
                    <span aria-hidden="true" className="contents"><LazyCoverImage releaseGroupId={album.id} coverLabel="" className="size-8 shrink-0" /></span>
                    <span className="min-w-0">
                      <span className="block truncate font-body text-sm text-paper">{album.title}</span>
                      {detail && (
                        <span className="block truncate font-data text-xs text-paper-muted">{detail}</span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <AudienceNote kind="favorites" audience={audience} />
    </section>
  );
}
