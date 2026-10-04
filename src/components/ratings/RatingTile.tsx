"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { formatStars } from "@/components/album/album-format";
import { StarRatingDisplay } from "@/components/social/StarRatingDisplay";
import type { MyRatingEntry } from "@/lib/api/schemas";
import { ratingHref, typeLabelKey } from "./ratings-shared";

// Visible con el cursor encima, con el foco dentro y, en pantallas sin hover, siempre: sin
// esto último la nota sería inaccesible en un teléfono. Ahí el overlay se reduce al chip de
// nota y al botón (sin degradé ni título, que siguen en la etiqueta accesible) para no tapar
// la carátula en una cuadrícula de tres columnas.
const REVEAL =
  "opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100";

// Marca fija de tipo (se ve también sin hover): disco para álbum, nota musical para canción.
function TypeIcon({ type }: { type: MyRatingEntry["targetType"] }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="size-3" fill="none" stroke="currentColor" strokeWidth="1.4">
      {type === "release-group" ? (
        <>
          <circle cx="8" cy="8" r="6" />
          <circle cx="8" cy="8" r="1.6" />
        </>
      ) : (
        <>
          <path d="M6 12V3l7-1.5V10" />
          <circle cx="4.5" cy="12" r="1.6" />
          <circle cx="11.5" cy="10" r="1.6" />
        </>
      )}
    </svg>
  );
}

interface RatingTileProps {
  entry: MyRatingEntry;
  onEdit: (entry: MyRatingEntry) => void;
  /** El artista y el tipo se omiten del overlay cuando el encabezado de la sección ya los dice. */
  showArtist?: boolean;
  showType?: boolean;
}

// Ficha del modo Gráfico: carátula cuadrada sin caption y, encima, un overlay que muestra la
// nota (estrellas y `86/100`, o "Sin afinar"), el título, el artista y la acción "Editar
// nota". El overlay es `pointer-events-none` salvo sus botones, así un clic en cualquier otro
// punto navega a la ficha a través del enlace que cubre la carátula. La etiqueta del enlace
// lleva título, artista, estrellas y puntaje, de modo que la nota no depende del hover.
export function RatingTile({ entry, onEdit, showArtist = true, showType = true }: RatingTileProps) {
  const t = useTranslations("ratings");
  const locale = useLocale();
  const { target } = entry;
  const starsLabel = t("starValue", { value: formatStars(entry.stars, locale) });
  const hasScore = entry.detailedScore !== null;
  const typeLabel = t(typeLabelKey(entry.targetType));

  const ariaLabel = [
    target.title,
    target.artistName,
    typeLabel,
    starsLabel,
    hasScore ? `${entry.detailedScore}/100` : t("untuned"),
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <li className="group relative">
      <Link
        href={ratingHref(entry)}
        aria-label={ariaLabel}
        className="block overflow-hidden rounded-md border border-ink-border transition-colors hover:border-amber focus-visible:border-amber"
      >
        <CoverThumb cover={target.coverThumbUrl} label="" className="aspect-square w-full" />
      </Link>

      <div
        data-testid="rating-overlay"
        className={`pointer-events-none absolute inset-0 flex flex-col justify-between rounded-md bg-linear-to-b from-ink/85 via-ink/60 to-ink/85 p-2 [@media(hover:none)]:bg-none ${REVEAL}`}
      >
        <div className="flex flex-col items-start gap-0.5 self-start rounded bg-ink/80 px-1.5 py-1 font-data text-xs text-paper">
          <StarRatingDisplay value={entry.stars} label={starsLabel} starClassName="size-2.5" />
          {hasScore ? (
            <span className="whitespace-nowrap font-medium">{entry.detailedScore}/100</span>
          ) : (
            <button
              type="button"
              onClick={() => onEdit(entry)}
              aria-label={t("untunedAction")}
              className="pointer-events-auto whitespace-nowrap italic text-paper-muted underline decoration-dotted transition-colors hover:text-paper"
            >
              {t("untuned")}
            </button>
          )}
        </div>

        <div className="flex min-w-0 flex-col items-center gap-0.5 text-center [@media(hover:none)]:hidden">
          <span className="line-clamp-3 font-display text-sm text-paper">{target.title}</span>
          {showArtist && target.artistName ? (
            <span className="truncate font-data text-xs text-paper-muted">{target.artistName}</span>
          ) : null}
          {showType || target.year ? (
            <span className="font-data text-[0.65rem] text-paper-muted/80">
              {[showType ? typeLabel : null, target.year].filter(Boolean).join(" · ")}
            </span>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => onEdit(entry)}
          aria-label={t("editRatingFor", { title: target.title })}
          className="pointer-events-auto self-center whitespace-nowrap rounded-full border border-ink-border bg-ink/80 px-2.5 py-1 font-data text-[0.7rem] text-paper transition-colors hover:border-amber hover:text-amber"
        >
          {t("editRating")}
        </button>
      </div>

      <span
        data-testid="rating-type-badge"
        data-type={entry.targetType}
        className="pointer-events-none absolute right-1.5 top-1.5 rounded bg-ink/80 p-1 text-paper"
      >
        <TypeIcon type={entry.targetType} />
      </span>
    </li>
  );
}
