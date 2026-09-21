import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { ArtistPlate } from "./ArtistPlate";
import { favoriteTargetHref } from "./favorites-shared";
import type { FavoritesPreview as FavoritesPreviewData } from "@/services/favorites/favorites";

interface FavoritesPreviewProps {
  username: string;
  preview: FavoritesPreviewData;
}

// Previsualización de "Favoritos" en el Nivel 2 del perfil (Opción B elegida
// entre mockups estáticos — ver memoria profile-redesign): hasta 5 ejemplos
// recientes de cada tipo, mismo criterio visual que ya usa "En rotación" en
// esta misma página — álbumes en grilla de carátulas,
// canciones como lista de filas (un disco genérico repetido 5 veces no
// distingue nada entre canciones), artistas en grilla de placas tipográficas.
// Reemplaza al muro completo (`FavoritesWall`) que antes vivía embebido acá
// sin tope — ahora el muro completo vive en `/users/[username]/favorites`.
export async function FavoritesPreview({ username, preview }: FavoritesPreviewProps) {
  const t = await getTranslations("favorites");
  const { artists, albums, songs, counts } = preview;
  const total = counts.artist + counts["release-group"] + counts.recording;
  if (total === 0) return null;

  return (
    <div className="flex w-full flex-col gap-6">
      {artists.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-baseline gap-2">
            <h3 className="font-data text-xs uppercase tracking-wide text-paper-muted">
              {t("sectionArtists")}
            </h3>
            <span className="font-data text-xs text-paper-muted">{counts.artist}</span>
          </div>
          <ul className="grid grid-cols-3 gap-4 sm:grid-cols-5">
            {artists.map((favorite) => (
              <li key={favorite.id}>
                <Link href={favoriteTargetHref(favorite)} className="group flex flex-col gap-2">
                  <ArtistPlate
                    title={favorite.target.title}
                    className="aspect-square w-full transition-colors group-hover:border-amber"
                  />
                  <span className="block truncate font-display text-sm text-paper transition-colors group-hover:text-amber">
                    {favorite.target.title}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {albums.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-baseline gap-2">
            <h3 className="font-data text-xs uppercase tracking-wide text-paper-muted">
              {t("sectionAlbums")}
            </h3>
            <span className="font-data text-xs text-paper-muted">{counts["release-group"]}</span>
          </div>
          <ul className="grid grid-cols-3 gap-4 sm:grid-cols-5">
            {albums.map((favorite) => (
              <li key={favorite.id}>
                <Link href={favoriteTargetHref(favorite)} className="group flex flex-col gap-2">
                  <CoverThumb
                    cover={favorite.target.coverThumbUrl}
                    label=""
                    className="aspect-square w-full rounded-lg border border-ink-border transition-colors group-hover:border-amber"
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-display text-sm text-paper transition-colors group-hover:text-amber">
                      {favorite.target.title}
                    </span>
                    {favorite.target.artistName && (
                      <span className="block truncate font-data text-xs text-paper-muted">
                        {favorite.target.artistName}
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {songs.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-baseline gap-2">
            <h3 className="font-data text-xs uppercase tracking-wide text-paper-muted">
              {t("sectionSongs")}
            </h3>
            <span className="font-data text-xs text-paper-muted">{counts.recording}</span>
          </div>
          <ul className="flex flex-col divide-y divide-ink-border rounded-lg border border-ink-border">
            {songs.map((favorite) => (
              <li key={favorite.id}>
                <Link
                  href={favoriteTargetHref(favorite)}
                  className="group flex flex-col px-3 py-2 transition-colors hover:bg-ink-surface"
                >
                  <span className="truncate font-display text-sm text-paper transition-colors group-hover:text-amber">
                    {favorite.target.title}
                  </span>
                  {favorite.target.artistName && (
                    <span className="truncate font-data text-xs text-paper-muted">
                      {favorite.target.artistName}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Link
        href={`/users/${username}/favorites`}
        className="self-center rounded-md border border-ink-border bg-ink-surface px-4 py-2 font-data text-sm text-paper-muted transition-colors hover:border-amber hover:text-paper"
      >
        {t("profileMoreButton")}
      </Link>
    </div>
  );
}
