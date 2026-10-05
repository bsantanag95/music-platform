import { useFormatter, useTranslations } from "next-intl";
import type { GenreStats } from "@/services/genres/stats";

// Cifras de la cabecera del género (openspec: redesign-genre-page, capability `genre-page-overview`).
// El servicio ya aplicó los umbrales: lo que llega `null` no se muestra, y aquí no se recalcula nada.

export function GenreStatsLine({ stats, movedBy = null }: { stats: GenreStats; movedBy?: number | null }) {
  const t = useTranslations("catalog.genres.page.stats");
  const format = useFormatter();
  if (stats.albumCount === 0 && stats.artistCount === 0) return null;

  const items: string[] = [t("albums", { count: stats.albumCount }), t("artists", { count: stats.artistCount })];
  if (stats.ratingCount !== null) items.push(t("ratings", { count: stats.ratingCount }));
  if (stats.peakDecade !== null) items.push(t("peakDecade", { decade: stats.peakDecade }));
  // Ya viene con umbral desde el servicio (`getMovedByCount`): `null` bajo 5 personas.
  if (movedBy !== null) items.push(t("movedBy", { count: movedBy }));

  const average =
    stats.averageStars !== null
      ? format.number(stats.averageStars, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
      : null;

  return (
    <div className="flex flex-col gap-1">
      {/* Un solo párrafo con separadores: al pasar a otra línea el punto queda al final de la anterior. */}
      <p className="font-data text-sm text-paper-muted">{items.join(" · ")}</p>
      {average !== null && <p className="font-data text-sm text-paper">★ {t("average", { average })}</p>}
    </div>
  );
}
