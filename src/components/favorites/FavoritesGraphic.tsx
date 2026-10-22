"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { DiscPlaceholder } from "@/components/catalog/DiscPlaceholder";
import type { Favorite } from "@/lib/api/schemas";
import { ArtistPlate } from "./ArtistPlate";
import { AudienceIcon, FavoriteActions } from "./FavoriteActions";
import { favoriteTargetHref } from "./favorites-shared";
import type { FavoritesRendererProps } from "./favorites-items-view";

function tileMedia(favorite: Favorite, priority: boolean) {
  if (favorite.targetType === "release-group") {
    return (
      <CoverThumb cover={favorite.target.coverThumbUrl} label="" className="aspect-square w-full" priority={priority} />
    );
  }
  if (favorite.targetType === "recording") {
    return <DiscPlaceholder alt="" className="aspect-square w-full" />;
  }
  return <ArtistPlate title={favorite.target.title} className="aspect-square w-full" textClassName="text-3xl" />;
}

// Modo Gráfico limpio (openspec: redesign-favorites-views): la portada o placa sola, con título y artista debajo y
// el menú `⋯`. Una marca con el icono de la audiencia sobre la portada indica solo cuando el favorito no es
// público (y solo en la vista propia: el visitante no ve audiencias). Sin selector ni enlace de quitar.
export function FavoritesGraphic({ favorites, actions, priorityIds }: FavoritesRendererProps) {
  const t = useTranslations("favorites");

  return (
    <ul className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 lg:grid-cols-5">
      {favorites.map((favorite) => {
        const href = favoriteTargetHref(favorite);
        const busy = actions.busyId === favorite.id || actions.bulkBusy;
        const selected = actions.selectedIds.has(favorite.id);
        const showPin = !actions.readOnly && favorite.audience !== "public";
        return (
          <li key={favorite.id} className="flex min-w-0 flex-col gap-1.5">
            <div className="group relative">
              <Link
                href={href}
                className={`block overflow-hidden rounded-md border transition-colors hover:border-amber ${
                  selected ? "border-amber ring-2 ring-amber" : "border-ink-border"
                }`}
              >
                {tileMedia(favorite, priorityIds?.has(favorite.id) ?? false)}
              </Link>
              {actions.selectionMode && !actions.readOnly ? (
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => actions.onToggleSelect(favorite.id)}
                  aria-label={t("selectItem", { title: favorite.target.title })}
                  className="absolute left-1.5 top-1.5 size-6 shrink-0 accent-amber"
                />
              ) : showPin ? (
                <span
                  data-testid="audience-pin"
                  title={t(`audience.${favorite.audience}`)}
                  className="pointer-events-none absolute right-1.5 top-1.5 rounded bg-ink/80 p-1 text-paper"
                >
                  <AudienceIcon audience={favorite.audience} />
                </span>
              ) : null}
            </div>

            <div className="flex min-w-0 items-start gap-0.5">
              <div className="flex min-w-0 flex-1 flex-col">
                <Link
                  href={href}
                  className="truncate font-display text-[0.8rem] leading-tight text-paper transition-colors hover:text-amber"
                >
                  {favorite.target.title}
                </Link>
                {favorite.target.artistName ? (
                  <span className="truncate font-data text-[0.7rem] text-paper-muted">{favorite.target.artistName}</span>
                ) : null}
              </div>
              {actions.readOnly || actions.selectionMode ? null : (
                <div className="-mr-1.5 -mt-1 [@media(pointer:coarse)]:-my-2">
                  <FavoriteActions
                    favorite={favorite}
                    busy={busy}
                    showBadge={false}
                    onAudienceChange={actions.onAudienceChange}
                    onRemove={actions.onRemove}
                  />
                </div>
              )}
            </div>

            {actions.errorId === favorite.id ? (
              <p role="alert" className="font-data text-[0.7rem] text-danger">
                {t("saveError")}
              </p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
