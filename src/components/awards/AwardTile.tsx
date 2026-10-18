import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { LatestCeremony } from "@/services/awards/read";
import { ceremonyHref } from "./award-links";
import { NomineeVisual } from "./NominationItem";

// Tarjeta de un premio (openspec: add-music-awards, design D6; add-four-music-awards, design D6 y D7): su ceremonia más
// reciente con el ganador destacado. La comparten la sección "Premios" de Explorar y el hub `/awards`.
//
// Lleva el ganador destacado de la ceremonia (la categoría general de álbum, en los Grammy Álbum del año) con su
// carátula: tarjetas que solo repetían "PREMIOS GRAMMY" y un año no invitaban a entrar. El nombre del premio pasa a una
// línea apagada junto a la edición; el ámbar queda para el rótulo del ganador.

function Trophy() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-3 shrink-0"
    >
      <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4zM7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3" />
    </svg>
  );
}

export function AwardTile({ ceremony }: { ceremony: LatestCeremony }) {
  const t = useTranslations("awards");
  const locale = useLocale();
  const awardName = t.has(`names.${ceremony.awardSlug}`) ? t(`names.${ceremony.awardSlug}`) : ceremony.awardSlug;
  const headline = ceremony.headline;
  const subject = headline?.winner.subject;
  // Con el álbum resuelto en el catálogo, título y artista por separado (el texto curado los junta:
  // "Midnights — Taylor Swift"); sin resolver, el texto curado y su crédito.
  const album = subject?.kind === "release_group" ? subject.album : null;
  const title = album?.title ?? headline?.winner.text;
  const credit = album ? album.artistName : headline?.winner.credit;

  return (
    <li>
      <Link
        href={ceremonyHref(ceremony.awardSlug, ceremony.year)}
        className="group flex h-full flex-col gap-3 rounded-lg border border-ink-border bg-ink-surface p-4 transition-colors hover:border-amber focus-visible:border-amber"
      >
        <span className="flex flex-col gap-0.5">
          <span className="truncate font-data text-xs text-paper-muted">{awardName}</span>
          <span className="flex items-baseline justify-between gap-2">
            <span className="font-display text-3xl text-paper transition-colors group-hover:text-amber">{ceremony.year}</span>
            <span className="shrink-0 font-data text-xs text-paper-muted">{t("edition", { edition: ceremony.edition })}</span>
          </span>
        </span>
        {headline ? (
          <span className="mt-auto flex items-center gap-3 border-t border-ink-border pt-3">
            <NomineeVisual nomination={headline.winner} size="size-12 shrink-0" />
            <span className="flex min-w-0 flex-col">
              <span className="flex items-center gap-1 font-data text-[0.65rem] uppercase tracking-wide text-amber">
                <Trophy />
                <span className="truncate">{locale === "en" ? headline.category.en : headline.category.es}</span>
              </span>
              <span className="truncate font-display text-sm text-paper">{title}</span>
              {credit ? <span className="truncate font-data text-xs text-paper-muted">{credit}</span> : null}
            </span>
          </span>
        ) : null}
      </Link>
    </li>
  );
}

/** Una tarjeta por premio, en el orden recibido (la ceremonia más reciente primero). */
export function AwardTileGrid({ ceremonies }: { ceremonies: LatestCeremony[] }) {
  return (
    <ul className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
      {ceremonies.map((ceremony) => (
        <AwardTile key={ceremony.awardSlug} ceremony={ceremony} />
      ))}
    </ul>
  );
}
