import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ThresholdedTileValue } from "@/components/album/AlbumHeader";
import type { ArtistCommunityStats } from "@/services/catalog/artist-community";

// Bloque de comunidad del artista (openspec: redesign-artist-page, capability
// `artist-community-stats`): oyentes, seguidores con favoritos y listas, con el umbral de 5
// del álbum ("<5" a la vista y "menos de 5" para lectores de pantalla, también en el detalle de
// favoritos). Sin promedio de estrellas del artista ni agregado de recorridos. Es una franja
// compacta de tres celdas con la cifra primero y la etiqueta debajo (openspec:
// polish-artist-header): con la etiqueta a la izquierda y la cifra al borde derecho quedaban
// separadas por media celda vacía.

function Stat({ label, value, detail }: { label: string; value: React.ReactNode; detail?: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 px-4 py-2.5">
      {/* La cifra va primero a la vista; en el DOM el `dt` sigue antes del `dd`, como pide `<dl>`. */}
      <dt className="order-2 font-data text-xs text-paper-muted">{label}</dt>
      <dd className="order-1 font-display text-xl leading-tight text-paper tabular-nums">{value}</dd>
      {detail ? <dd className="order-3 font-data text-xs text-paper-muted">{detail}</dd> : null}
    </div>
  );
}

export function ArtistCommunity({ stats, listsHref }: { stats: ArtistCommunityStats; listsHref: string }) {
  const t = useTranslations("catalog.artist.community");
  const locale = useLocale();
  const hasFavorites = !(stats.favorites.kind === "exact" && stats.favorites.value === 0);

  return (
    <section aria-label={t("heading")}>
      <dl className="grid grid-cols-1 divide-y divide-ink-border rounded border border-ink-border bg-ink-surface sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <Stat label={t("listeners")} value={<ThresholdedTileValue count={stats.listeners} />} />
        <Stat
          label={t("followers")}
          value={<ThresholdedTileValue count={stats.followers} />}
          detail={
            hasFavorites
              ? t.rich("favorites", { count: () => <ThresholdedTileValue count={stats.favorites} /> })
              : undefined
          }
        />
        <Stat
          label={t("lists")}
          value={
            stats.listCount > 0 ? (
              <Link href={listsHref} className="hover:text-amber hover:underline">
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
