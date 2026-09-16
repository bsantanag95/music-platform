"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { DiaryAudience } from "@/lib/api/schemas";
import { favoriteTargetHref, typeLabelKey } from "./favorites-shared";
import type { FavoritesRendererProps } from "./favorites-items-view";

const AUDIENCES: DiaryAudience[] = ["private", "followers", "public"];

// Modo Índice: filas de texto compactas para escanear una lista larga —
// mismo tratamiento que `EntriesIndex` de Want to Listen, con el artista
// acreditado como subtítulo y los controles de audiencia/quitar de
// `FavoriteTile` condensados en la fila.
export function FavoritesIndex({ favorites, actions }: FavoritesRendererProps) {
  const t = useTranslations("favorites");

  return (
    <ul className="flex flex-col">
      {favorites.map((favorite) => {
        const href = favoriteTargetHref(favorite);
        const busy = actions.busyId === favorite.id || actions.bulkBusy;
        return (
          <li
            key={favorite.id}
            className="group flex items-center gap-3 rounded-md border-b border-ink-border px-2 py-2 transition-colors last:border-b-0 hover:bg-ink-surface"
          >
            {actions.selectionMode && !actions.readOnly ? (
              <input
                type="checkbox"
                checked={actions.selectedIds.has(favorite.id)}
                onChange={() => actions.onToggleSelect(favorite.id)}
                aria-label={t("selectItem", { title: favorite.target.title })}
                className="size-4 shrink-0 accent-amber"
              />
            ) : null}

            <Link
              href={href}
              className="min-w-0 flex-1 truncate font-display text-sm text-paper transition-colors hover:text-amber"
            >
              {favorite.target.title}
              {favorite.target.artistName ? (
                <span className="ml-1.5 font-data text-xs text-paper-muted">
                  {favorite.target.artistName}
                </span>
              ) : null}
            </Link>

            <span className="hidden shrink-0 font-data text-xs text-paper-muted sm:inline">
              {t(typeLabelKey(favorite.targetType))}
            </span>

            {actions.readOnly || actions.selectionMode ? null : (
              <div className="flex shrink-0 items-center gap-2 opacity-100 transition-opacity focus-within:opacity-100 sm:opacity-40 sm:group-hover:opacity-100">
                <label className="sr-only" htmlFor={`favorite-index-audience-${favorite.id}`}>
                  {t("audienceLabel")}
                </label>
                <select
                  id={`favorite-index-audience-${favorite.id}`}
                  value={favorite.audience}
                  disabled={busy}
                  onChange={(event) =>
                    actions.onAudienceChange(favorite, event.target.value as DiaryAudience)
                  }
                  className="filter-select rounded border border-ink-border bg-ink px-1.5 py-0.5 font-data text-xs text-paper-muted transition-colors hover:text-paper disabled:opacity-50"
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
                  className="font-data text-xs text-paper-muted underline decoration-dotted transition-colors hover:text-danger disabled:opacity-50"
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
