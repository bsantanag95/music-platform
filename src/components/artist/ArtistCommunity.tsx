import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ThresholdedTileValue } from "@/components/album/AlbumHeader";
import type { ArtistCommunityStats } from "@/services/catalog/artist-community";
import type { ThresholdedCount } from "@/services/catalog/album-community-shared";

// Bloque de comunidad del artista (openspec: redesign-artist-page, capability
// `artist-community-stats`): oyentes, seguidores con favoritos y listas, con el umbral de 5
// del álbum ("<5" a la vista y "menos de 5" para lectores de pantalla). Sin promedio de
// estrellas del artista ni agregado de recorridos. Es una franja compacta de tres celdas, con
// etiqueta y cifra en la misma línea: con cifras chicas ("<5", "0") tres tarjetas altas se veían
// vacías frente al resto de la cabecera.

function Stat({ label, value, detail }: { label: string; value: React.ReactNode; detail?: string }) {
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-2 gap-y-0.5 px-3 py-2">
      <dt className="font-data text-xs text-paper-muted">{label}</dt>
      <dd className="font-display text-base text-paper">{value}</dd>
      {detail ? <dd className="col-span-2 font-data text-xs text-paper-muted">{detail}</dd> : null}
    </div>
  );
}

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
    <section aria-label={t("heading")}>
      <dl className="grid grid-cols-1 divide-y divide-ink-border rounded border border-ink-border bg-ink-surface sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <Stat label={t("listeners")} value={<ThresholdedTileValue count={stats.listeners} />} />
        <Stat
          label={t("followers")}
          value={<ThresholdedTileValue count={stats.followers} />}
          detail={hasFavorites ? t("favorites", { value: countText(stats.favorites) }) : undefined}
        />
        <Stat
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
      </dl>
    </section>
  );
}
