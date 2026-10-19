import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { HallOfFameClass } from "@/services/awards/read";
import { awardHref } from "./award-links";
import { NomineeVisual } from "./NominationItem";

// Tarjeta de un salón de la fama del hub `/awards` (openspec: add-grammy-hall-of-fame, design D7): su nombre, cuántas clases
// hay cargadas y la última con cuatro carátulas. Enlaza a la clase más reciente (`/awards/<salón>` redirige a ella).

const COVERS = 4;

export function HallOfFameTile({ hall }: { hall: HallOfFameClass }) {
  const t = useTranslations("awards");
  const name = t.has(`names.${hall.awardSlug}`) ? t(`names.${hall.awardSlug}`) : hall.awardSlug;
  // Preferimos las incorporaciones con carátula del catálogo: una tarjeta de siluetas no invita a entrar.
  const withCover = hall.inductees.filter(
    (n) => n.subject?.kind === "release_group" || (n.subject?.kind === "recording" && n.subject.anchor !== null),
  );
  const covers = (withCover.length >= COVERS ? withCover : hall.inductees).slice(0, COVERS);

  return (
    <Link
      href={awardHref(hall.awardSlug)}
      className="group flex h-full flex-col gap-3 rounded-lg border border-ink-border bg-ink-surface p-4 transition-colors hover:border-amber focus-visible:border-amber"
    >
      <span className="flex flex-col gap-0.5">
        <span className="truncate font-body text-sm text-paper">{name}</span>
        <span className="font-data text-xs text-paper-muted">
          {t("hall.hubClasses", { count: hall.years.length })} · {t("hall.latestClass", { year: hall.year })}
        </span>
      </span>
      <span className="mt-auto grid grid-cols-4 gap-2">
        {covers.map((nomination) => (
          <NomineeVisual key={nomination.id} nomination={nomination} size="aspect-square w-full rounded-md" />
        ))}
      </span>
    </Link>
  );
}

export function HallOfFameTileGrid({ halls }: { halls: HallOfFameClass[] }) {
  return (
    <ul className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {halls.map((hall) => (
        <li key={hall.awardSlug}>
          <HallOfFameTile hall={hall} />
        </li>
      ))}
    </ul>
  );
}
