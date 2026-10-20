import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AppImage } from "@/components/ui/AppImage";
import type { HallOfFameClass, NominationView } from "@/services/awards/read";
import { hallClassHref } from "./award-links";
import { NomineeVisual } from "./NominationItem";

// Tarjeta de un salón de la fama (openspec: add-national-recording-registry, design D4) para la sección "Salón de la Fama" de
// Explorar, con el mismo esqueleto que `AwardTile` para que midan y se vean igual que las de
// Premios: fondo teñido por la carátula, nombre, año de la clase en grande y cuatro carátulas de sus incorporaciones.
// Enlaza a la clase más reciente (`/hall-of-fame/<salón>` redirige a ella). Un salón no tiene un ganador destacado, así que el lugar
// de la fila del trofeo lo ocupan las carátulas.
//
// Con pocos salones (hoy dos) la tarjeta es ancha (`wide`): dos tarjetas en una grilla de cinco columnas dejaban vacíos tres
// quintos de la fila. Ancha, la fila de carátulas pasa de cuatro a ocho desde `lg`. Junto al año va cuántas grabaciones
// ingresaron (el rótulo "Clase" no decía nada que el año no dijera). Sin carátula, la portada tipográfica (openspec:
// polish-hall-of-fame-page). El índice `/hall-of-fame` ya no la usa: muestra un bloque por salón con su riel.

const COVERS = 4;
const WIDE_COVERS = 8;
/** Hasta cuántos salones la grilla usa tarjetas anchas (dos por fila). */
export const WIDE_TILES_MAX = 2;

function coverUrl(nomination: NominationView): string | null {
  const subject = nomination.subject;
  if (subject?.kind === "release_group") return subject.album.cover.coverThumbUrl;
  if (subject?.kind === "recording" && subject.anchor) return subject.anchor.cover.coverThumbUrl;
  return null;
}

/**
 * Carátulas de la tarjeta, por prioridad: con carátula de verdad, luego con disco en el catálogo (sin carátula, la silueta del
 * disco) y al final el resto, cada grupo en el orden curado. Antes se priorizaba tener disco ancla aunque no tuviera carátula, y
 * la tarjeta salía llena de siluetas habiendo carátulas más abajo.
 */
export function tileCovers(inductees: NominationView[], max: number): NominationView[] {
  const rank = (n: NominationView) => {
    if (coverUrl(n)) return 0;
    const subject = n.subject;
    return subject?.kind === "release_group" || (subject?.kind === "recording" && subject.anchor !== null) ? 1 : 2;
  };
  return inductees
    .map((nomination, index) => ({ nomination, index, rank: rank(nomination) }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .slice(0, max)
    .map((entry) => entry.nomination);
}

export function HallOfFameTile({ hall, wide = false }: { hall: HallOfFameClass; wide?: boolean }) {
  const t = useTranslations("awards");
  const name = t.has(`names.${hall.awardSlug}`) ? t(`names.${hall.awardSlug}`) : hall.awardSlug;
  const covers = tileCovers(hall.inductees, wide ? WIDE_COVERS : COVERS);
  const backdrop = covers.map(coverUrl).find((url): url is string => url !== null) ?? null;

  // La tarjeta entera abre la clase (el enlace principal se estira sobre ella con `after:inset-0`).
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
        href={hallClassHref(hall.awardSlug, hall.year)}
        className="flex flex-1 flex-col gap-3 outline-none after:absolute after:inset-0 after:content-['']"
      >
        <span className="flex flex-col gap-0.5">
          <span className="line-clamp-2 font-body text-sm leading-snug text-paper">{name}</span>
          <span className="flex items-baseline justify-between gap-2">
            <span className="font-display text-3xl text-paper transition-colors group-hover:text-amber">{hall.year}</span>
            <span className="shrink-0 font-data text-xs text-paper-muted">{t("hall.inducteesCount", { count: hall.inductees.length })}</span>
          </span>
        </span>
        <span className={`mt-auto grid grid-cols-4 gap-2 border-t border-ink-border/70 pt-3 ${wide ? "lg:grid-cols-8" : ""}`}>
          {covers.map((nomination, index) => (
            // En la tarjeta ancha, las carátulas de la quinta en adelante solo desde `lg` (debajo, la tarjeta es angosta).
            <span key={nomination.id} className={index >= COVERS ? "hidden lg:block" : "block"}>
              <NomineeVisual nomination={nomination} size="aspect-square w-full rounded-md" typeCover />
            </span>
          ))}
        </span>
      </Link>
    </li>
  );
}

/** Una tarjeta por salón (la clase más reciente primero): en la cuadrícula de Premios o, con pocos salones, dos anchas por fila. */
export function HallOfFameTileGrid({ halls }: { halls: HallOfFameClass[] }) {
  const wide = halls.length <= WIDE_TILES_MAX;
  return (
    <ul className={`grid w-full grid-cols-1 gap-3 ${wide ? "sm:grid-cols-2" : "sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5"}`}>
      {halls.map((hall) => (
        <HallOfFameTile key={hall.awardSlug} hall={hall} wide={wide} />
      ))}
    </ul>
  );
}
