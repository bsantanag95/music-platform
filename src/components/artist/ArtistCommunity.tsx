import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ThresholdedTileValue } from "@/components/album/AlbumHeader";
import type { ThresholdedCount } from "@/services/catalog/album-community-shared";
import type { ArtistCommunityStats } from "@/services/catalog/artist-community";

// Comunidad del artista (openspec: redesign-artist-page, capability `artist-community-stats`; en una línea de la ficha
// desde modernize-artist-page-phase1): oyentes, seguidores con favoritos como detalle y listas, con el umbral de 5 del
// álbum ("<5" a la vista y "menos de 5" para lectores de pantalla). Cada cifra en 0 se omite y, si las tres son 0, la
// línea entera. Sin promedio de estrellas del artista ni agregado de recorridos.

const isZero = (count: ThresholdedCount) => count.kind === "exact" && count.value === 0;
/** Número para elegir el plural: "<5" se lee en plural. */
const pluralOf = (count: ThresholdedCount) => (count.kind === "exact" ? count.value : count.threshold);

/** `true` si la comunidad tiene algo que mostrar. */
export function hasCommunity(stats: ArtistCommunityStats): boolean {
  return !isZero(stats.listeners) || !isZero(stats.followers) || stats.listCount > 0;
}

export function ArtistCommunity({ stats, listsHref }: { stats: ArtistCommunityStats; listsHref: string }) {
  const t = useTranslations("catalog.artist.community");
  if (!hasCommunity(stats)) return null;
  const parts: React.ReactNode[] = [];
  if (!isZero(stats.listeners)) {
    parts.push(
      <span key="listeners">
        {t.rich("listenersLine", { n: pluralOf(stats.listeners), count: () => <ThresholdedTileValue count={stats.listeners} /> })}
      </span>,
    );
  }
  if (!isZero(stats.followers)) {
    parts.push(
      <span key="followers">
        {t.rich("followersLine", { n: pluralOf(stats.followers), count: () => <ThresholdedTileValue count={stats.followers} /> })}
        {!isZero(stats.favorites) && (
          <span className="text-paper-muted">
            {" ("}
            {t.rich("favorites", { count: () => <ThresholdedTileValue count={stats.favorites} /> })}
            {")"}
          </span>
        )}
      </span>,
    );
  }
  if (stats.listCount > 0) {
    parts.push(
      <Link key="lists" href={listsHref} className="hover:text-amber hover:underline">
        {t("listsLine", { count: stats.listCount })}
      </Link>,
    );
  }
  return (
    <span>
      {parts.map((part, index) => (
        <span key={index}>
          {index > 0 ? " · " : null}
          {part}
        </span>
      ))}
    </span>
  );
}
