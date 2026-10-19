import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AppImage } from "@/components/ui/AppImage";
import type { LatestCeremony } from "@/services/awards/read";
import { ceremonyHref } from "./award-links";
import { NomineeVisual } from "./NominationItem";

// Tarjeta de un premio (openspec: add-music-awards, design D6; add-four-music-awards, design D6 y D7): su ceremonia más
// reciente con el ganador destacado. La comparten la sección "Premios" de Explorar y el hub `/awards`.
//
// Lleva el ganador destacado de la ceremonia (la categoría general de álbum, en los Grammy Álbum del año) con su
// carátula: tarjetas que solo repetían "PREMIOS GRAMMY" y un año no invitaban a entrar. El nombre del premio pasa a una
// línea apagada junto a la edición; el ámbar queda para el rótulo del ganador.
//
// La carátula del ganador también tiñe la tarjeta (difuminada de fondo, como la cabecera de la ceremonia): cinco tarjetas
// iguales en gris se distinguían solo por el texto. Categoría y título pueden ocupar dos líneas ("Álbum británico del
// año" o "DeBÍ TiRAR MáS FOTos" se cortaban a la mitad).

export function Trophy({ className = "size-3" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4zM7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3" />
    </svg>
  );
}

interface AwardTileProps {
  ceremony: LatestCeremony;
  /**
   * Tarjeta del hub `/awards` (openspec: enrich-awards-hub): suma el rango de años cargados, cuántas ceremonias hay, quién
   * vota y las ediciones anteriores como enlaces directos. En Explorar no: ahí la tarjeta es solo la puerta de entrada.
   */
  detailed?: boolean;
}

/** Ediciones anteriores que se ofrecen como atajo en la tarjeta del hub; el resto, desde la fila de años de la ceremonia. */
const PREVIOUS_YEARS_SHOWN = 5;

export function AwardTile({ ceremony, detailed = false }: AwardTileProps) {
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
  const backdrop =
    album?.cover.coverThumbUrl ?? (subject?.kind === "recording" && subject.anchor ? subject.anchor.cover.coverThumbUrl : null);
  const oldest = ceremony.years.at(-1) ?? ceremony.year;
  const previous = ceremony.years.filter((year) => year !== ceremony.year).slice(0, PREVIOUS_YEARS_SHOWN);
  const facts = [
    oldest === ceremony.year ? String(oldest) : t("yearRange", { from: oldest, to: ceremony.year }),
    t("ceremonyCount", { count: ceremony.years.length }),
    ceremony.voting ? t(`votingShort.${ceremony.voting}`) : null,
  ].filter(Boolean);

  // La tarjeta entera abre la ceremonia (el enlace principal se estira sobre ella con `after:inset-0`); los años
  // anteriores son enlaces propios por encima, porque un enlace no puede ir dentro de otro.
  return (
    <li className="group relative isolate flex h-full flex-col gap-3 overflow-hidden rounded-lg border border-ink-border bg-ink-surface p-4 transition-colors hover:border-amber has-[a:focus-visible]:border-amber">
      {backdrop ? (
        <span aria-hidden="true" className="absolute inset-0 -z-10">
          <AppImage
            src={backdrop}
            alt=""
            fill
            sizes="320px"
            className="scale-150 object-cover opacity-25 blur-2xl saturate-150 transition-opacity group-hover:opacity-35"
          />
          <span className="absolute inset-0 bg-gradient-to-b from-ink/30 via-ink-surface/80 to-ink-surface" />
        </span>
      ) : null}
      <Link
        href={ceremonyHref(ceremony.awardSlug, ceremony.year)}
        className="flex flex-1 flex-col gap-3 outline-none after:absolute after:inset-0 after:content-['']"
      >
        <span className="flex flex-col gap-0.5">
          <span className="truncate font-body text-sm text-paper">{awardName}</span>
          <span className="flex items-baseline justify-between gap-2">
            <span className="font-display text-3xl text-paper transition-colors group-hover:text-amber">{ceremony.year}</span>
            {ceremony.edition !== null ? (
              <span className="shrink-0 font-data text-xs text-paper-muted">{t("edition", { edition: ceremony.edition })}</span>
            ) : null}
          </span>
          {detailed ? <span className="mt-0.5 font-data text-xs leading-snug text-paper-muted">{facts.join(" · ")}</span> : null}
        </span>
        {headline ? (
          <span className="mt-auto flex items-center gap-3 border-t border-ink-border/70 pt-3">
            <NomineeVisual nomination={headline.winner} size="size-14 shrink-0 rounded-md shadow-[0_4px_16px_rgba(0,0,0,0.45)]" />
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="flex items-start gap-1 font-data text-[0.65rem] uppercase leading-tight tracking-wide text-amber">
                <span className="mt-px">
                  <Trophy />
                </span>
                <span className="line-clamp-2">{locale === "en" ? headline.category.en : headline.category.es}</span>
              </span>
              <span className="line-clamp-2 font-display text-sm leading-snug text-paper">{title}</span>
              {credit ? <span className="truncate font-data text-xs text-paper-muted">{credit}</span> : null}
            </span>
          </span>
        ) : null}
      </Link>
      {detailed && previous.length > 0 ? (
        <nav aria-label={t("previousEditions", { award: awardName })} className="relative z-10">
          <ul className="flex flex-wrap gap-1.5">
            {previous.map((year) => (
              <li key={year}>
                <Link
                  href={ceremonyHref(ceremony.awardSlug, year)}
                  className="inline-flex rounded-full border border-ink-border bg-ink/60 px-2.5 py-0.5 font-data text-xs tabular-nums text-paper-muted transition-colors hover:border-paper-muted/60 hover:text-paper focus-visible:border-amber focus-visible:text-paper"
                >
                  {year}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </li>
  );
}

/** Una tarjeta por premio, en el orden recibido (la ceremonia más reciente primero). */
export function AwardTileGrid({ ceremonies, detailed = false }: { ceremonies: LatestCeremony[]; detailed?: boolean }) {
  return (
    <ul className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
      {ceremonies.map((ceremony) => (
        <AwardTile key={ceremony.awardSlug} ceremony={ceremony} detailed={detailed} />
      ))}
    </ul>
  );
}
