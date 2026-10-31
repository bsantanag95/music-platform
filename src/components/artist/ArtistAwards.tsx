import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { albumHref } from "@/lib/catalog-links";
import { ceremonyHref, hallClassHref } from "@/components/awards/award-links";
import type { ArtistAwards as ArtistAwardsData } from "@/services/awards/artist-awards";

// Pestaña Premios del artista (openspec: refine-artist-page-phase3, capability `artist-awards-tab`): una tarjeta por
// ceremonia, de la más reciente a la más antigua, con lo ganado primero. Cada ceremonia enlaza a su página y cada disco
// nominado a su álbum. Los salones de la fama dicen "Incorporado", no "Ganó".

export function ArtistAwards({ awards, artistName }: { awards: ArtistAwardsData; artistName: string }) {
  const t = useTranslations("catalog.artist.awards");
  const tAwards = useTranslations("awards");
  const locale = useLocale();
  const summary = [
    awards.wins > 0 ? t("wins", { count: awards.wins }) : null,
    awards.nominations > 0 ? t("nominations", { count: awards.nominations }) : null,
    awards.inductions > 0 ? t("inductions", { count: awards.inductions }) : null,
  ].filter(Boolean);

  return (
    <section aria-labelledby="artist-awards-heading" className="flex flex-col gap-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="artist-awards-heading" className="font-display text-lg text-paper">
          {t("heading")}
        </h2>
        <p className="font-data text-xs text-paper-muted">{summary.join(" · ")}</p>
      </div>
      <ol className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {awards.ceremonies.map((ceremony) => {
          const name = tAwards.has(`names.${ceremony.awardSlug}`) ? tAwards(`names.${ceremony.awardSlug}`) : ceremony.awardSlug;
          const hall = ceremony.kind === "hall_of_fame";
          const won = ceremony.nominations.filter((n) => n.won).length;
          const href = hall ? hallClassHref(ceremony.awardSlug, ceremony.year) : ceremonyHref(ceremony.awardSlug, ceremony.year);
          return (
            <li
              key={`${ceremony.awardSlug}-${ceremony.year}`}
              className="flex flex-col gap-2 rounded border border-ink-border bg-ink-surface px-4 py-3"
            >
              <div className="flex items-baseline justify-between gap-3">
                <Link href={href} className="min-w-0 font-display text-sm text-paper hover:text-amber hover:underline">
                  {tAwards("ceremonyTitle", { award: name, year: ceremony.year })}
                </Link>
                {!hall && (
                  <span className="shrink-0 font-data text-xs text-paper-muted">
                    {won > 0 ? t("ceremonyWins", { won, count: ceremony.nominations.length }) : t("nominations", { count: ceremony.nominations.length })}
                  </span>
                )}
              </div>
              <ul className="flex flex-col gap-1.5">
                {ceremony.nominations.map((nomination) => (
                  <li key={nomination.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3">
                    <span className="min-w-0 font-body text-sm text-paper">
                      {locale.startsWith("es") ? nomination.category.es : nomination.category.en}
                      {nomination.album ? (
                        <>
                          {" · "}
                          <Link
                            href={albumHref(artistName, nomination.album.title, nomination.album.id)}
                            className="text-paper-muted hover:text-amber hover:underline"
                          >
                            {nomination.album.title}
                          </Link>
                        </>
                      ) : nomination.nomineeText !== artistName ? (
                        <span className="text-paper-muted"> · {nomination.nomineeText}</span>
                      ) : null}
                    </span>
                    <span className={`font-data text-xs ${nomination.won || hall ? "text-amber" : "text-paper-muted"}`}>
                      {hall ? t("inducted") : nomination.won ? t("won") : t("nominated")}
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
