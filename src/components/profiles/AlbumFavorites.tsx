import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import type { AlbumFavorite } from "@/services/profiles/album-favorites";

interface AlbumFavoritesProps {
  albums: AlbumFavorite[];
}

// Sección "Álbumes favoritos": la cabeza del bloque de identidad cultural del
// perfil. Rejilla 3×2 de carátulas — las obras que definen a esta persona.
// Sin números de posición ni estrellas: es una declaración, no un ranking
// (openspec: redesign-profile-album-identity). Server Component. No renderiza
// nada si el conjunto visible está vacío.
export async function AlbumFavorites({ albums }: AlbumFavoritesProps) {
  const t = await getTranslations("users");
  if (albums.length === 0) return null;

  return (
    <section className="flex w-full max-w-2xl flex-col gap-4">
      <h2 className="font-display text-xl text-paper">{t("albumFavorites.heading")}</h2>
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {albums.map((album) => (
          <li key={album.id}>
            <Link href={`/album/${album.target.id}`} className="group flex flex-col gap-2">
              <CoverThumb
                cover={album.target.coverThumbUrl}
                label=""
                className="aspect-square w-full rounded-lg border border-ink-border transition-colors group-hover:border-amber"
              />
              <span className="min-w-0">
                <span className="block truncate font-display text-sm text-paper transition-colors group-hover:text-amber">
                  {album.target.title}
                </span>
                {album.target.artistName && (
                  <span className="block truncate font-data text-xs text-paper-muted">
                    {album.target.artistName}
                  </span>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
