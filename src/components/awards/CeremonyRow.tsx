import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { LatestCeremony } from "@/services/awards/read";
import { ceremonyHref } from "./award-links";
import { headlineText, Trophy } from "./AwardTile";

/**
 * Fila de ceremonias de la sección Premios de `/explore` (openspec: redesign-explore-phase3): una columna por premio, de la ceremonia
 * más reciente a la más antigua, con el premio, el año, la edición y el ganador destacado **como texto**. Sin carátulas: un mismo
 * disco puede ganar varias ceremonias y las tarjetas repetían la misma imagen; lo que distingue una ceremonia es el premio y el año.
 * Desde `lg`, todas las columnas en una fila separadas por filetes; por debajo, una fila táctil. El hub `/awards` sigue con
 * `AwardTileGrid`.
 */
export function CeremonyRow({ ceremonies }: { ceremonies: LatestCeremony[] }) {
  const t = useTranslations("awards");
  const locale = useLocale();
  if (ceremonies.length === 0) return null;

  return (
    <ul className="-mx-4 flex snap-x snap-mandatory overflow-x-auto border-y border-ink-border px-4 [scrollbar-width:none] sm:-mx-8 sm:px-8 lg:mx-0 lg:grid lg:auto-cols-fr lg:grid-flow-col lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden">
      {ceremonies.map((ceremony, index) => {
        const awardName = t.has(`names.${ceremony.awardSlug}`) ? t(`names.${ceremony.awardSlug}`) : ceremony.awardSlug;
        const headline = ceremony.headline;
        const { title, credit } = headlineText(ceremony);
        return (
          <li
            key={ceremony.awardSlug}
            className={`w-[72%] shrink-0 snap-start sm:w-[40%] lg:w-auto ${index > 0 ? "border-l border-ink-border" : ""}`}
          >
            <Link
              href={ceremonyHref(ceremony.awardSlug, ceremony.year)}
              className="group flex h-full flex-col gap-3 px-4 py-5 transition-colors hover:bg-ink-surface/60 focus-visible:bg-ink-surface/60 lg:px-5"
            >
              <span className="flex flex-col gap-0.5">
                <span className="truncate font-body text-sm text-paper-muted">{awardName}</span>
                <span className="flex items-baseline justify-between gap-2">
                  <span className="font-display text-3xl font-bold tracking-[-0.02em] text-paper tabular-nums transition-colors group-hover:text-amber">
                    {ceremony.year}
                  </span>
                  {ceremony.edition !== null ? (
                    <span className="shrink-0 font-data text-xs text-paper-muted">{t("edition", { edition: ceremony.edition })}</span>
                  ) : null}
                </span>
              </span>
              {headline ? (
                <span className="mt-auto flex flex-col gap-1 border-t border-ink-border pt-3">
                  <span className="flex items-start gap-1 font-data text-[0.6875rem] uppercase leading-tight tracking-wide text-amber">
                    <span className="mt-px">
                      <Trophy />
                    </span>
                    <span className="line-clamp-2">{locale === "en" ? headline.category.en : headline.category.es}</span>
                  </span>
                  {title ? <span className="line-clamp-2 font-display text-base leading-snug text-paper">{title}</span> : null}
                  {credit ? <span className="truncate font-body text-sm text-paper-muted">{credit}</span> : null}
                </span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
