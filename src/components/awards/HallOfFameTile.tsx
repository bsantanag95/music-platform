import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AppImage } from "@/components/ui/AppImage";
import type { HallOfFameClass, NominationView } from "@/services/awards/read";
import { ceremonyHref } from "./award-links";
import { NomineeVisual } from "./NominationItem";

// Tarjeta de un salón de la fama (openspec: add-national-recording-registry, design D4): la comparten la sección "Salón de la
// Fama" de Explorar y el hub `/awards`, con el mismo esqueleto que `AwardTile` para que midan y se vean igual que las de
// Premios: fondo teñido por la carátula, nombre, año de la clase en grande y cuatro carátulas de sus incorporaciones.
// Enlaza a la clase más reciente (`/awards/<salón>` redirige a ella). Un salón no tiene un ganador destacado, así que el lugar
// de la fila del trofeo lo ocupan las carátulas.

const COVERS = 4;

/** Clases anteriores que se ofrecen como atajo en la tarjeta del hub; el resto, desde la fila de años de la clase. */
const PREVIOUS_YEARS_SHOWN = 5;

function coverUrl(nomination: NominationView): string | null {
  const subject = nomination.subject;
  if (subject?.kind === "release_group") return subject.album.cover.coverThumbUrl;
  if (subject?.kind === "recording" && subject.anchor) return subject.anchor.cover.coverThumbUrl;
  return null;
}

export function HallOfFameTile({ hall, detailed = false }: { hall: HallOfFameClass; detailed?: boolean }) {
  const t = useTranslations("awards");
  const name = t.has(`names.${hall.awardSlug}`) ? t(`names.${hall.awardSlug}`) : hall.awardSlug;
  // Preferimos las incorporaciones con carátula del catálogo: una tarjeta de siluetas no invita a entrar.
  const withCover = hall.inductees.filter(
    (n) => n.subject?.kind === "release_group" || (n.subject?.kind === "recording" && n.subject.anchor !== null),
  );
  const covers = (withCover.length >= COVERS ? withCover : hall.inductees).slice(0, COVERS);
  const backdrop = covers.map(coverUrl).find((url): url is string => url !== null) ?? null;
  const oldest = hall.years.at(-1) ?? hall.year;
  const previous = hall.years.filter((year) => year !== hall.year).slice(0, PREVIOUS_YEARS_SHOWN);
  const facts = [
    oldest === hall.year ? String(oldest) : t("yearRange", { from: oldest, to: hall.year }),
    t("hall.hubClasses", { count: hall.years.length }),
    hall.voting ? t(`votingHall.${hall.voting}`) : null,
  ].filter(Boolean);

  // La tarjeta entera abre la clase (el enlace principal se estira sobre ella con `after:inset-0`); las clases anteriores
  // son enlaces propios por encima, porque un enlace no puede ir dentro de otro.
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
        href={ceremonyHref(hall.awardSlug, hall.year)}
        className="flex flex-1 flex-col gap-3 outline-none after:absolute after:inset-0 after:content-['']"
      >
        <span className="flex flex-col gap-0.5">
          <span className="line-clamp-2 font-body text-sm leading-snug text-paper">{name}</span>
          <span className="flex items-baseline justify-between gap-2">
            <span className="font-display text-3xl text-paper transition-colors group-hover:text-amber">{hall.year}</span>
            <span className="shrink-0 font-data text-xs text-paper-muted">{t("hall.classYearRow")}</span>
          </span>
          {detailed ? <span className="mt-0.5 font-data text-xs leading-snug text-paper-muted">{facts.join(" · ")}</span> : null}
        </span>
        <span className="mt-auto grid grid-cols-4 gap-2 border-t border-ink-border/70 pt-3">
          {covers.map((nomination) => (
            <NomineeVisual key={nomination.id} nomination={nomination} size="aspect-square w-full rounded-md" />
          ))}
        </span>
      </Link>
      {detailed && previous.length > 0 ? (
        <nav aria-label={t("hall.previousClasses", { award: name })} className="relative z-10">
          <ul className="flex flex-wrap gap-1.5">
            {previous.map((year) => (
              <li key={year}>
                <Link
                  href={ceremonyHref(hall.awardSlug, year)}
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

/** Una tarjeta por salón, en la cuadrícula de las tarjetas de Premios (la clase más reciente primero). */
export function HallOfFameTileGrid({ halls, detailed = false }: { halls: HallOfFameClass[]; detailed?: boolean }) {
  return (
    <ul className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
      {halls.map((hall) => (
        <HallOfFameTile key={hall.awardSlug} hall={hall} detailed={detailed} />
      ))}
    </ul>
  );
}
