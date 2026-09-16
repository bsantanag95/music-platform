"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { DiscPlaceholder } from "@/components/catalog/DiscPlaceholder";
import type { DiaryAudience, Favorite } from "@/lib/api/schemas";
import { ArtistPlate } from "./ArtistPlate";
import { favoriteTargetHref } from "./favorites-shared";
import type { FavoritesRendererProps } from "./favorites-items-view";

const AUDIENCES: DiaryAudience[] = ["private", "followers", "public"];

function tileMedia(favorite: Favorite) {
  if (favorite.targetType === "release-group") {
    return <CoverThumb cover={favorite.target.coverThumbUrl} label="" className="aspect-square w-full" />;
  }
  if (favorite.targetType === "recording") {
    return <DiscPlaceholder alt="" className="aspect-square w-full" />;
  }
  return <ArtistPlate title={favorite.target.title} className="aspect-square w-full" textClassName="text-3xl" />;
}

// Modo Gráfico: pared de carátulas/placas, mismo tratamiento que
// `EntriesGraphic` de Want to Listen. El título y el artista acreditado van
// como caption visible bajo la imagen; los controles de selección, audiencia
// y quitar quedan debajo, condensados.
export function FavoritesGraphic({ favorites, actions }: FavoritesRendererProps) {
  const t = useTranslations("favorites");

  return (
    <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
      {favorites.map((favorite) => {
        const href = favoriteTargetHref(favorite);
        const busy = actions.busyId === favorite.id || actions.bulkBusy;
        const selected = actions.selectedIds.has(favorite.id);
        return (
          <li key={favorite.id} className="flex flex-col gap-1.5">
            <div className="group relative">
              <Link
                href={href}
                className="block overflow-hidden rounded-md border border-ink-border transition-colors hover:border-amber"
              >
                {tileMedia(favorite)}
              </Link>
              {actions.selectionMode && !actions.readOnly ? (
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => actions.onToggleSelect(favorite.id)}
                  aria-label={t("selectItem", { title: favorite.target.title })}
                  className="absolute left-1.5 top-1.5 size-4 shrink-0 accent-amber"
                />
              ) : null}
            </div>

            <Link
              href={href}
              className="truncate font-data text-xs text-paper-muted transition-colors hover:text-amber"
            >
              {favorite.target.title}
            </Link>
            {favorite.target.artistName ? (
              <span className="truncate font-data text-[0.65rem] text-paper-muted/80">
                {favorite.target.artistName}
              </span>
            ) : null}

            {actions.readOnly || actions.selectionMode ? null : (
              <div className="flex flex-wrap items-center gap-1.5">
                <label className="sr-only" htmlFor={`favorite-graphic-audience-${favorite.id}`}>
                  {t("audienceLabel")}
                </label>
                <select
                  id={`favorite-graphic-audience-${favorite.id}`}
                  value={favorite.audience}
                  disabled={busy}
                  onChange={(event) =>
                    actions.onAudienceChange(favorite, event.target.value as DiaryAudience)
                  }
                  className="filter-select rounded border border-ink-border bg-ink px-1 py-0.5 font-data text-[0.65rem] text-paper-muted transition-colors hover:text-paper disabled:opacity-50"
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
                  onClick={() => actions.onRemove(favorite)}
                  className="font-data text-[0.65rem] text-paper-muted underline decoration-dotted transition-colors hover:text-danger disabled:opacity-50"
                >
                  {t("removeFavorite")}
                </button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
