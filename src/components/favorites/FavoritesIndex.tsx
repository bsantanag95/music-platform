"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { FavoriteActions } from "./FavoriteActions";
import { favoriteTargetHref, formatFavoriteDate } from "./favorites-shared";
import type { FavoritesRendererProps } from "./favorites-items-view";

const HEAD = "px-2 py-1.5 text-left font-data text-[0.65rem] font-normal uppercase tracking-wide text-paper-muted/70";

// Modo Índice como tabla (openspec: redesign-favorites-views): título (con el artista acreditado), fecha, y en la
// vista propia la audiencia y las acciones, con las columnas alineadas entre filas. Los encabezados se ven desde
// `sm` y solo los oye un lector de pantalla debajo. Sin columna de tipo: el encabezado de la sección ya lo dice.
// En modo lectura no hay columnas de audiencia ni de acciones.
export function FavoritesIndex({ favorites, actions }: FavoritesRendererProps) {
  const t = useTranslations("favorites");
  const locale = useLocale();
  const own = !actions.readOnly && !actions.selectionMode;
  const selecting = Boolean(actions.selectionMode) && !actions.readOnly;

  return (
    <table className="w-full border-collapse">
      <thead className="sr-only sm:not-sr-only">
        <tr className="border-b border-ink-border">
          {selecting ? <th scope="col" className={`${HEAD} w-8`} /> : null}
          <th scope="col" className={HEAD}>
            {t("colTitle")}
          </th>
          <th scope="col" className={`${HEAD} hidden sm:table-cell`}>
            {t("colDate")}
          </th>
          {own ? (
            <th scope="col" className={HEAD}>
              {t("colAudience")}
            </th>
          ) : null}
        </tr>
      </thead>
      <tbody>
        {favorites.map((favorite) => {
          const href = favoriteTargetHref(favorite);
          const busy = actions.busyId === favorite.id || actions.bulkBusy;
          const selected = actions.selectedIds.has(favorite.id);
          return (
            <tr
              key={favorite.id}
              className={`border-b border-ink-border transition-colors last:border-b-0 ${
                selected ? "bg-amber/10" : "hover:bg-ink-surface"
              }`}
            >
              {selecting ? (
                <td className="w-8 px-2 py-2">
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => actions.onToggleSelect(favorite.id)}
                    aria-label={t("selectItem", { title: favorite.target.title })}
                    className="size-6 shrink-0 accent-amber"
                  />
                </td>
              ) : null}
              <td className="w-full max-w-0 px-2 py-2">
                <Link
                  href={href}
                  className="block font-display text-sm text-paper transition-colors hover:text-amber sm:truncate"
                >
                  <span className="block truncate sm:inline">{favorite.target.title}</span>
                  {favorite.target.artistName ? (
                    <span className="block truncate font-data text-xs text-paper-muted sm:ml-1.5 sm:inline">
                      {favorite.target.artistName}
                    </span>
                  ) : null}
                </Link>
                {actions.errorId === favorite.id ? (
                  <p role="alert" className="font-data text-xs text-danger">
                    {t("saveError")}
                  </p>
                ) : null}
              </td>
              <td className="hidden whitespace-nowrap px-2 py-2 font-data text-xs text-paper-muted sm:table-cell">
                <time dateTime={favorite.createdAt}>{formatFavoriteDate(favorite.createdAt, locale)}</time>
              </td>
              {own ? (
                <td className="whitespace-nowrap px-1 py-1 text-right">
                  <div className="flex justify-end">
                    <FavoriteActions
                      favorite={favorite}
                      busy={busy}
                      onAudienceChange={actions.onAudienceChange}
                      onRemove={actions.onRemove}
                    />
                  </div>
                </td>
              ) : null}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
