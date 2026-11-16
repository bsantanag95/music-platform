import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { albumHref } from "@/lib/catalog-links";
import type { CollectionPreviewArtist } from "@/services/collection/types";

interface CollectionPreviewProps {
  artists: CollectionPreviewArtist[];
}

/** Copias que muestra la vista previa del perfil. */
export const COLLECTION_PROFILE_PREVIEW = 4;

// Colección física en el perfil (spec social-profiles, "Cuerpo del perfil en filas";
// openspec: redesign-user-profile-phase2): las copias más recientes como filas —
// carátula, álbum, artista · año y formato—, sin selector de modo de visualización
// ni agrupación: eso sigue en la colección completa (`/users/[username]/collection`),
// enlazada desde el título del estante. Solo lectura. Server Component.
export async function CollectionPreview({ artists }: CollectionPreviewProps) {
  const entries = artists
    .flatMap((artist) => artist.entries)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, COLLECTION_PROFILE_PREVIEW);
  if (entries.length === 0) return null;
  const t = await getTranslations("collection");

  return (
    <ul className="flex w-full flex-col divide-y divide-ink-border">
      {entries.map((entry) => (
        <li key={entry.id} className="py-3 first:pt-0 last:pb-0">
          <Link
            href={albumHref(entry.album.artistName, entry.album.title, entry.album.id)}
            className="group flex items-center gap-3"
          >
            <CoverThumb
              cover={entry.album.coverThumbUrl}
              label=""
              className="size-14 rounded border border-ink-border transition-colors group-hover:border-amber"
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-display text-sm text-paper transition-colors group-hover:text-amber">
                {entry.album.title}
              </span>
              <span className="block truncate font-data text-xs text-paper-muted">
                {[entry.album.artistName, entry.album.year].filter(Boolean).join(" · ")}
              </span>
            </span>
            <span className="shrink-0 rounded-full border border-ink-border px-2.5 py-0.5 font-data text-[0.6875rem] text-paper-muted">
              {t(`format.${entry.format}`)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
