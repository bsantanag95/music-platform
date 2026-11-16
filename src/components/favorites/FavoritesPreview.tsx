import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { ArtistPlate } from "./ArtistPlate";
import { favoriteTargetHref } from "./favorites-shared";
import type { FavoritesPreview as FavoritesPreviewData } from "@/services/favorites/favorites";

interface FavoritesPreviewProps {
  preview: FavoritesPreviewData;
}

// Previsualización de "Favoritos" en el perfil (openspec: redesign-user-profile-phase2,
// dirección D2): las carátulas de los álbumes favoritos más recientes a la
// izquierda y, al lado, una lista con los artistas y las canciones — un disco
// genérico repetido no distingue nada entre canciones, así que van como texto.
// El muro completo vive en `/users/[username]/favorites`, enlazado desde el título
// del estante. Server Component.
export async function FavoritesPreview({ preview }: FavoritesPreviewProps) {
  const t = await getTranslations("favorites");
  const { artists, albums, songs, counts } = preview;
  const total = counts.artist + counts["release-group"] + counts.recording;
  if (total === 0) return null;
  const hasList = artists.length > 0 || songs.length > 0;

  return (
    <div className="grid w-full gap-x-10 gap-y-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      {albums.length > 0 && (
        <ul aria-label={t("sectionAlbums")} className="grid grid-cols-3 gap-4 sm:grid-cols-5">
          {albums.map((favorite) => (
            <li key={favorite.id} className="min-w-0">
              <Link href={favoriteTargetHref(favorite)} className="group flex flex-col gap-2">
                <CoverThumb
                  cover={favorite.target.coverThumbUrl}
                  label=""
                  className="aspect-square w-full rounded border border-ink-border transition-colors group-hover:border-amber"
                />
                <span className="min-w-0">
                  <span className="line-clamp-2 font-display text-sm leading-snug text-paper transition-colors group-hover:text-amber">
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
      )}

      {hasList && (
        <ul className={`flex min-w-0 flex-col divide-y divide-ink-border ${albums.length === 0 ? "lg:col-span-2" : ""}`}>
          {artists.map((favorite) => (
            <li key={favorite.id} className="py-2 first:pt-0 last:pb-0">
              <Link href={favoriteTargetHref(favorite)} className="group flex items-center gap-3">
                <ArtistPlate title={favorite.target.title} className="size-8 shrink-0" />
                <span className="min-w-0 flex-1 truncate font-display text-sm text-paper transition-colors group-hover:text-amber">
                  {favorite.target.title}
                </span>
                <span className="shrink-0 font-data text-xs text-paper-muted">{t("profileArtistKind")}</span>
              </Link>
            </li>
          ))}
          {songs.map((favorite) => (
            <li key={favorite.id} className="py-2 first:pt-0 last:pb-0">
              <Link href={favoriteTargetHref(favorite)} className="group flex items-baseline gap-3">
                <span className="min-w-0 flex-1 truncate font-display text-sm text-paper transition-colors group-hover:text-amber">
                  {favorite.target.title}
                </span>
                {favorite.target.artistName && (
                  <span className="max-w-[45%] shrink-0 truncate font-data text-xs text-paper-muted">
                    {favorite.target.artistName}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
