import { Link } from "@/i18n/navigation";
import { AlbumCard } from "@/components/catalog/AlbumCard";
import { EmptyState } from "@/components/ui/EmptyState";
import type { AlbumPage } from "@/services/discovery/discovery";
import type { ReleaseGroupCategory } from "@/lib/api/schemas";

interface FilteredAlbumListProps {
  heading: string;
  result: AlbumPage;
  /** Base del enlace de paginación, ya con el corte (`/explore?decada=1990`). */
  baseHref: string;
  categoryLabels: Record<ReleaseGroupCategory, string>;
  coverLabel: string;
  emptyMessage: string;
  prevLabel: string;
  nextLabel: string;
  backLabel: string;
}

/**
 * Listado filtrado por década o género de `/explore`: grilla de álbumes con
 * paginación server-side (anterior / siguiente por `?page=`). Sin JS ni
 * endpoint — es una superficie de browse, prev/next alcanza en Fase 1.
 */
export function FilteredAlbumList({
  heading,
  result,
  baseHref,
  categoryLabels,
  coverLabel,
  emptyMessage,
  prevLabel,
  nextLabel,
  backLabel,
}: FilteredAlbumListProps) {
  const { albums, page, hasNext } = result;
  const sep = baseHref.includes("?") ? "&" : "?";

  return (
    <main className="flex min-h-screen w-full flex-col items-start gap-6 px-4 py-12">
      <Link href="/explore" className="font-data text-sm text-amber underline">
        {backLabel}
      </Link>
      <h1 className="font-display text-3xl text-paper">{heading}</h1>

      {albums.length === 0 ? (
        <EmptyState title={heading} description={emptyMessage} />
      ) : (
        <ul className="grid w-full grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {albums.map((album) => (
            <li key={album.id}>
              <AlbumCard
                releaseGroup={album}
                categoryLabel={categoryLabels[album.category]}
                coverLabel={coverLabel}
              />
            </li>
          ))}
        </ul>
      )}

      {(page > 1 || hasNext) && (
        <nav className="flex gap-4 font-data text-sm">
          {page > 1 ? (
            <Link href={`${baseHref}${sep}page=${page - 1}`} className="text-amber underline">
              {prevLabel}
            </Link>
          ) : (
            <span className="text-paper-muted opacity-50">{prevLabel}</span>
          )}
          {hasNext ? (
            <Link href={`${baseHref}${sep}page=${page + 1}`} className="text-amber underline">
              {nextLabel}
            </Link>
          ) : (
            <span className="text-paper-muted opacity-50">{nextLabel}</span>
          )}
        </nav>
      )}
    </main>
  );
}
