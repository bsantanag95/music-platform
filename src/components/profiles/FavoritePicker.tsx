"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { ArtistPlate } from "@/components/favorites/ArtistPlate";
import { ApiError } from "@/lib/api/client";
import { getMyFavorites } from "@/lib/api/favorites";
import type { Favorite, SocialTargetType } from "@/lib/api/schemas";

// Cuántos favoritos se traen por consulta: los primeros de la lista; el resto se
// alcanza con el buscador (que filtra en el servidor sobre el conjunto completo).
const PAGE_SIZE = 50;
const DEBOUNCE_MS = 300;

interface FavoritePickerProps {
  /** Texto del desplegable que abre el selector. */
  summary: string;
  /** Limita los favoritos a un tipo (artista, álbum o canción). Sin él, todos. */
  type?: SocialTargetType;
  /** Ids de entidad (`favorite.target.id`) que no se ofrecen, p. ej. lo ya elegido. */
  excludeIds?: ReadonlySet<string>;
  /** Aviso cuando el dueño no tiene ningún favorito elegible. */
  emptyLabel: string;
  disabled?: boolean;
  onPick: (favorite: Favorite) => void;
}

// Selector de "elegir de mis favoritos" con un buscador chico, compartido por el
// editor de la Tarjeta de Identidad y el de "Empieza por aquí" (openspec:
// simplify-profile-curation). Sigue siendo una elección entre favoritos, no una
// búsqueda de catálogo (memoria list-detail-scope): el `q` lo filtra el servidor
// (`GET /api/me/favorites`) sobre el título, con debounce. Solo consulta cuando el
// desplegable se abre, para no traer tres listas al montar el editor de la Tarjeta.
export function FavoritePicker({
  summary,
  type,
  excludeIds,
  emptyLabel,
  disabled = false,
  onPick,
}: FavoritePickerProps) {
  const t = useTranslations("users");
  const tErrors = useTranslations("errors");
  const [opened, setOpened] = useState(false);
  const [query, setQuery] = useState("");
  const [favorites, setFavorites] = useState<Favorite[] | null>(null);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const runId = useRef(0);

  useEffect(() => {
    if (!opened) return;
    const trimmed = query.trim();
    const id = ++runId.current;
    setLoading(true);
    // La primera carga y el vaciado del buscador no esperan; escribir sí.
    const timer = setTimeout(
      async () => {
        try {
          const result = await getMyFavorites(1, PAGE_SIZE, {
            ...(trimmed ? { q: trimmed } : {}),
            ...(type ? { type } : {}),
          });
          if (runId.current !== id) return;
          setFavorites(result.favorites);
          setHasNext(result.hasNext);
          setErrorCode(null);
        } catch (error) {
          if (runId.current === id) setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
        } finally {
          if (runId.current === id) setLoading(false);
        }
      },
      trimmed ? DEBOUNCE_MS : 0,
    );
    return () => clearTimeout(timer);
  }, [opened, query, type]);

  const trimmedQuery = query.trim();
  const visible = (favorites ?? []).filter((favorite) => !excludeIds?.has(favorite.target.id));

  let status: string | null = null;
  if (favorites === null) {
    if (loading) status = t("favoritePicker.loading");
  } else if (visible.length === 0) {
    status = trimmedQuery ? t("favoritePicker.noResults", { query: trimmedQuery }) : emptyLabel;
  }

  return (
    <details
      onToggle={(event) => {
        if (event.currentTarget.open) setOpened(true);
      }}
    >
      <summary className="cursor-pointer font-data text-sm text-paper-muted hover:text-paper">{summary}</summary>
      {opened && (
        <div className="mt-2 flex flex-col gap-2">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label={t("favoritePicker.searchLabel")}
            placeholder={t("favoritePicker.searchPlaceholder")}
            maxLength={100}
            className="w-full rounded border border-ink-border bg-ink-surface px-3 py-2 font-body text-sm text-paper placeholder:text-paper-muted focus:border-amber focus:outline-none"
          />

          {errorCode && (
            <span role="alert" className="font-data text-sm text-danger">
              {tErrors(`${errorCode}.description`)}
            </span>
          )}
          {status && (
            <p role="status" className="font-body text-sm text-paper-muted">
              {status}
            </p>
          )}

          {visible.length > 0 && (
            <ul className="flex max-h-72 flex-col gap-1.5 overflow-y-auto">
              {visible.map((favorite) => (
                <li key={favorite.id}>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onPick(favorite)}
                    className="flex w-full items-center gap-3 rounded border border-ink-border bg-ink-surface px-3 py-2 text-left transition-colors hover:border-amber disabled:opacity-50"
                  >
                    {favorite.targetType === "artist" ? (
                      <ArtistPlate title={favorite.target.title} className="size-10" textClassName="text-base" />
                    ) : (
                      <CoverThumb cover={favorite.target.coverThumbUrl} label="" className="size-10" />
                    )}
                    <span className="min-w-0">
                      <span className="block truncate font-display text-sm text-paper">{favorite.target.title}</span>
                      {favorite.target.artistName && (
                        <span className="block truncate font-data text-xs text-paper-muted">
                          {favorite.target.artistName}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {hasNext && !trimmedQuery && (
            <p className="font-body text-sm text-paper-muted">{t("favoritePicker.moreHint", { count: PAGE_SIZE })}</p>
          )}
        </div>
      )}
    </details>
  );
}
