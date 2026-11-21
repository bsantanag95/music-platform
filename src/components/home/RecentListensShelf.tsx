import type { ReactNode } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { targetHref } from "@/components/feed/feed-target";
import { relativeFeedDate } from "@/components/feed/feed-dates";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { compactRatingValue } from "./compact-rating";
import type { HomeRecentListen } from "@/services/home/home";

// «Lo último que escuchaste» (openspec: redesign-signed-in-home-phase2): los últimos objetivos distintos que
// la persona anotó como escucha, como estante de carátulas —tu diario sin abrir el diario—. Cada uno lleva
// tu valoración en forma compacta (`rating-display`) o, si no lo valoraste, el contexto de la escucha. Desde
// `lg` es una rejilla; por debajo, un riel que se desplaza en horizontal. Reemplaza a «Tu rastro reciente».
export async function RecentListensShelf({
  listens,
  footer,
}: {
  listens: HomeRecentListen[];
  /** Fila al pie del estante («Retoma una lista», redesign-signed-in-home-phase3). */
  footer?: ReactNode;
}) {
  if (listens.length === 0) return null;

  const [t, tFeed, locale] = await Promise.all([getTranslations("home"), getTranslations("feed"), getLocale()]);
  const dates = await Promise.all(listens.map((listen) => relativeFeedDate(listen.createdAt)));

  return (
    <section aria-labelledby="home-recent-listens" className="flex flex-col gap-6">
      <SectionHeading
        id="home-recent-listens"
        title={t("recentListensTitle")}
        description={t("recentListensDescription")}
        seeAll={{ href: "/me/diary", label: t("recentListensSeeDiary") }}
      />
      <ul className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:-mx-0 sm:px-0 lg:grid lg:snap-none lg:grid-cols-8 lg:overflow-visible">
        {listens.map((listen, index) => {
          const { target } = listen;
          const href = targetHref(target.type, target.id, target.title, target.artistName);
          return (
            <li key={listen.id} className="w-[42%] shrink-0 snap-start sm:w-[28%] md:w-[22%] lg:w-auto">
              <Link href={href} className="group block">
                <CoverThumb
                  cover={target.coverThumbUrl}
                  label=""
                  className="aspect-square h-auto w-full rounded-lg ring-1 ring-ink-border transition-[box-shadow] group-hover:ring-amber/60"
                />
                <span className="mt-2.5 block truncate font-display text-[0.9375rem] leading-tight text-paper transition-colors group-hover:text-amber">
                  {target.title}
                </span>
              </Link>
              {target.artistName ? (
                <p className="truncate font-body text-sm text-paper-muted">{target.artistName}</p>
              ) : null}
              <p className="mt-1 flex flex-wrap items-baseline gap-x-1.5 font-data text-xs text-paper-muted">
                {listen.rating ? (
                  <span className="text-sm">
                    <span aria-hidden="true" className="text-amber">
                      ★
                    </span>{" "}
                    <span className="font-medium text-paper">
                      {compactRatingValue(listen.rating.stars, listen.rating.detailedScore, locale)}
                    </span>
                  </span>
                ) : (
                  <span>{tFeed(`context.${listen.listenContext}`)}</span>
                )}
                <span aria-hidden="true">·</span>
                <span>{dates[index]}</span>
              </p>
            </li>
          );
        })}
      </ul>
      {footer}
    </section>
  );
}
