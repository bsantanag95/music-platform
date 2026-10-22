"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { DiscPlaceholder } from "@/components/catalog/DiscPlaceholder";
import type { DiaryAudience, Favorite } from "@/lib/api/schemas";
import { ArtistPlate } from "./ArtistPlate";
import { favoriteArtistHref, favoriteTargetHref, formatFavoriteDate, typeLabelKey } from "./favorites-shared";

const AUDIENCES: DiaryAudience[] = ["private", "followers", "public"];

interface FavoriteTileProps {
  favorite: Favorite;
  readOnly?: boolean;
  selectionMode?: boolean;
  selected?: boolean;
  busy?: boolean;
  /** Muestra el aviso de error de guardado junto a la ficha. */
  error?: boolean;
  /** El tipo se omite bajo el encabezado de su sección (ya lo dice); por defecto se muestra. */
  showType?: boolean;
  /** Carga la carátula sin diferirla (las de arriba, sin scroll). */
  priority?: boolean;
  onToggleSelect?: (id: string) => void;
  onAudienceChange?: (favorite: Favorite, audience: DiaryAudience) => void;
  onRemove?: (favorite: Favorite) => void;
}

// Ficha de un favorito en el muro. Tres tratamientos según el tipo: álbum con
// carátula, artista con placa tipográfica, canción con la silueta de disco del
// sistema. En modo propio ofrece cambiar la audiencia y quitar; en modo selección
// muestra una casilla; en modo lectura solo enlaza al objetivo.
export function FavoriteTile({
  favorite,
  readOnly,
  selectionMode,
  selected,
  busy,
  error = false,
  showType = true,
  priority = false,
  onToggleSelect,
  onAudienceChange,
  onRemove,
}: FavoriteTileProps) {
  const t = useTranslations("favorites");
  const locale = useLocale();
  const href = favoriteTargetHref(favorite);

  const media =
    favorite.targetType === "release-group" ? (
      <CoverThumb cover={favorite.target.coverThumbUrl} label="" className="size-16" priority={priority} />
    ) : favorite.targetType === "recording" ? (
      <DiscPlaceholder alt="" className="size-16" />
    ) : (
      <ArtistPlate title={favorite.target.title} />
    );

  return (
    <article className="group flex gap-3 rounded-lg border border-ink-border bg-ink-surface p-3 transition-colors focus-within:border-amber hover:border-amber">
      {selectionMode && !readOnly ? (
        <input
          type="checkbox"
          checked={Boolean(selected)}
          onChange={() => onToggleSelect?.(favorite.id)}
          aria-label={t("selectItem", { title: favorite.target.title })}
          className="mt-1 size-4 shrink-0 accent-amber [@media(pointer:coarse)]:size-6"
        />
      ) : null}

      <Link href={href} tabIndex={-1} aria-hidden className="shrink-0">
        {media}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h3 className="truncate font-display text-base text-paper">
          <Link href={href} className="transition-colors hover:text-amber">
            {favorite.target.title}
          </Link>
        </h3>

        {favorite.target.artistName ? (
          <p className="truncate font-data text-xs text-paper-muted">
            {favoriteArtistHref(favorite) ? (
              <Link href={favoriteArtistHref(favorite)!} className="transition-colors hover:text-amber">
                {favorite.target.artistName}
              </Link>
            ) : (
              favorite.target.artistName
            )}
          </p>
        ) : null}

        <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-data text-xs text-paper-muted">
          {showType ? (
            <>
              <span>{t(typeLabelKey(favorite.targetType))}</span>
              <span aria-hidden>·</span>
            </>
          ) : null}
          <time dateTime={favorite.createdAt}>{formatFavoriteDate(favorite.createdAt, locale)}</time>
        </p>

        {readOnly ? null : selectionMode ? null : (
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor={`favorite-audience-${favorite.id}`}>
              {t("audienceLabel")}
            </label>
            <select
              id={`favorite-audience-${favorite.id}`}
              value={favorite.audience}
              disabled={busy}
              onChange={(event) =>
                onAudienceChange?.(favorite, event.target.value as DiaryAudience)
              }
              className="filter-select rounded border border-ink-border bg-ink px-2 py-1 font-data text-xs text-paper-muted transition-colors hover:text-paper disabled:opacity-50 [@media(pointer:coarse)]:min-h-11"
            >
              {AUDIENCES.map((audience) => (
                <option key={audience} value={audience}>
                  {t(`audience.${audience}`)}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={busy}
              onClick={() => onRemove?.(favorite)}
              className="font-data text-xs text-paper-muted underline decoration-dotted transition-colors hover:text-danger disabled:opacity-50 [@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:px-1"
            >
              {t("removeFavorite")}
            </button>
          </div>
        )}

        {error ? (
          <p role="alert" className="font-data text-xs text-danger">
            {t("saveError")}
          </p>
        ) : null}
      </div>
    </article>
  );
}
