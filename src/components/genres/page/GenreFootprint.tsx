import { useFormatter, useLocale, useTranslations } from "next-intl";
import { formatStars } from "@/components/album/album-format";
import { Link } from "@/i18n/navigation";
import { albumHref } from "@/lib/catalog-links";
import { footprintIsEmpty, type GenreFootprint as Footprint } from "@/services/genres/footprint";

// "Tu huella en este género" (openspec: redesign-genre-page, capability `genre-page-personal`): solo
// con sesión y solo del propio lector. Sin actividad no muestra cifras en cero, sino la invitación a
// empezar: por los Esenciales si el género los tiene y, si no, por la pestaña Álbumes.

interface GenreFootprintProps {
  footprint: Footprint;
  /** Dónde empezar: el riel de Esenciales de esta página o la pestaña Álbumes. */
  start: { kind: "essentials"; href: string } | { kind: "albums"; href: string };
}

export function GenreFootprint({ footprint, start }: GenreFootprintProps) {
  const t = useTranslations("catalog.genres.page.footprint");
  const format = useFormatter();
  const locale = useLocale();
  const empty = footprintIsEmpty(footprint);

  return (
    <section aria-labelledby="genre-footprint-heading" className="flex flex-col gap-3 rounded-lg border border-ink-border bg-ink-surface p-4">
      <h2 id="genre-footprint-heading" className="font-display text-lg text-paper">
        {t("heading")}
      </h2>
      {empty ? (
        <>
          <p className="font-body text-sm text-paper-muted">{t("empty")}</p>
          <Link href={start.href} className="font-data text-sm text-amber underline-offset-2 hover:underline">
            {start.kind === "essentials" ? t("startEssentials") : t("startAlbums")}
          </Link>
        </>
      ) : (
        <>
          <ul className="flex flex-col gap-1 font-data text-sm text-paper-muted">
            {footprint.ratedCount > 0 && (
              <li>
                {t("rated", { count: footprint.ratedCount })}
                {footprint.averageStars !== null && (
                  <>
                    {" · "}
                    {t("average", { average: format.number(footprint.averageStars, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) })}
                  </>
                )}
              </li>
            )}
            {footprint.pendingCount > 0 && <li>{t("pending", { count: footprint.pendingCount })}</li>}
          </ul>
          {footprint.favorites.length > 0 && (
            <div className="flex flex-col gap-1">
              <h3 className="font-data text-xs uppercase tracking-wide text-paper-muted">{t("favorites")}</h3>
              <ol className="flex flex-col gap-1">
                {footprint.favorites.map((album) => (
                  <li key={album.id} className="flex items-baseline justify-between gap-3">
                    <Link href={albumHref(null, album.title, album.id)} className="truncate font-body text-sm text-paper hover:text-amber">
                      {album.title}
                    </Link>
                    <span className="shrink-0 font-data text-xs text-paper-muted">★ {formatStars(album.stars, locale)}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </>
      )}
    </section>
  );
}
