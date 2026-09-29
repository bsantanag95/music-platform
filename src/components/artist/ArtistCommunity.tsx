import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { StatTile, ThresholdedTileValue } from "@/components/album/AlbumHeader";
import type { ArtistCommunityStats } from "@/services/catalog/artist-community";
import type { ThresholdedCount } from "@/services/catalog/album-community-shared";

// Bloque de comunidad del artista (openspec: redesign-artist-page, capability
// `artist-community-stats`): oyentes, seguidores con favoritos y listas, con el umbral de 5
// del álbum ("<5" a la vista y "menos de 5" para lectores de pantalla). Sin promedio de
// estrellas del artista ni agregado de recorridos.

function useCountText() {
  const t = useTranslations("catalog.album.community");
  const locale = useLocale();
  return (count: ThresholdedCount) =>
    count.kind === "fewer" ? t("fewerLower", { threshold: count.threshold }) : new Intl.NumberFormat(locale).format(count.value);
}

export function ArtistCommunity({ stats, listsHref }: { stats: ArtistCommunityStats; listsHref: string }) {
  const t = useTranslations("catalog.artist.community");
  const locale = useLocale();
  const countText = useCountText();
  const hasFavorites = !(stats.favorites.kind === "exact" && stats.favorites.value === 0);

  return (
    <section aria-label={t("heading")} className="grid grid-cols-3 gap-2">
      <StatTile label={t("listeners")} value={<ThresholdedTileValue count={stats.listeners} />} />
      <StatTile
        label={t("followers")}
        value={<ThresholdedTileValue count={stats.followers} />}
        detail={hasFavorites ? t("favorites", { value: countText(stats.favorites) }) : undefined}
      />
      <StatTile
        label={t("lists")}
        value={
          stats.listCount > 0 ? (
            <Link href={listsHref} className="text-amber hover:underline">
              {new Intl.NumberFormat(locale).format(stats.listCount)} →
            </Link>
          ) : (
            "0"
          )
        }
      />
    </section>
  );
}
