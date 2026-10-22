"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { formatStars } from "@/components/album/album-format";
import { StarRatingDisplay } from "@/components/social/StarRatingDisplay";
import type { MyRatingEntry } from "@/lib/api/schemas";
import { RatingScore } from "./RatingScore";
import { ratingHref, typeLabelKey } from "./ratings-shared";

// Marca fija de tipo (siempre visible): disco para álbum, nota musical para canción.
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
  /** El artista y el tipo se omiten de la leyenda cuando el encabezado de la sección ya los dice. */
  showArtist?: boolean;
  showType?: boolean;
  /** Carga la carátula sin diferirla (las de la primera fila). */
  priority?: boolean;
}

// Ficha del modo Gráfico (openspec: redesign-ratings-views): carátula cuadrada que enlaza a la ficha, con la
// marca de tipo encima, y debajo su leyenda siempre visible — título, línea de detalle (artista, tipo y año
// según la agrupación), estrellas y puntaje. No hay overlay: el puntaje es un botón que abre el diálogo de
// puntaje, así que ratón, teclado y táctil usan lo mismo. El título repite el enlace de la carátula sin ser
// un segundo punto de tabulación (`aria-hidden`, `tabIndex=-1`); la etiqueta del enlace de la carátula lleva
// título, artista, tipo, estrellas y puntaje, de modo que la nota no depende de lo visible.
export function RatingTile({ entry, onEdit, showArtist = true, showType = true, priority = false }: RatingTileProps) {
  const t = useTranslations("ratings");
  const locale = useLocale();
  const { target } = entry;
  const starsLabel = t("starValue", { value: formatStars(entry.stars, locale) });
  const hasScore = entry.detailedScore !== null;
  const typeLabel = t(typeLabelKey(entry.targetType));
  const href = ratingHref(entry);

  const ariaLabel = [
    target.title,
    target.artistName,
    typeLabel,
    starsLabel,
    hasScore ? `${entry.detailedScore}/100` : t("untuned"),
  ]
    .filter(Boolean)
    .join(", ");

  // Línea de detalle: solo el artista se trunca; tipo y año (cortos) siempre se ven, porque en una ficha de
  // ~110 px un artista largo se comería el año.
  const artist = showArtist ? target.artistName : null;
  const rest = [showType ? typeLabel : null, target.year].filter(Boolean).join(" · ");

  return (
    <li className="flex min-w-0 flex-col gap-1.5">
      <div className="relative">
        <Link
          href={href}
          aria-label={ariaLabel}
          className="block overflow-hidden rounded-md border border-ink-border transition-colors hover:border-amber focus-visible:border-amber"
        >
          <CoverThumb cover={target.coverThumbUrl} label="" className="aspect-square w-full" priority={priority} />
        </Link>
        <span
          data-testid="rating-type-badge"
          data-type={entry.targetType}
          className="pointer-events-none absolute right-1.5 top-1.5 rounded bg-ink/80 p-1 text-paper"
        >
          <TypeIcon type={entry.targetType} />
        </span>
      </div>

      <div data-testid="rating-caption" className="flex min-w-0 flex-col gap-0.5">
        <Link
          href={href}
          aria-hidden
          tabIndex={-1}
          title={target.title}
          className="truncate font-display text-[0.8rem] leading-tight text-paper transition-colors hover:text-amber"
        >
          {target.title}
        </Link>
        {artist || rest ? (
          <span className="flex min-w-0 font-data text-[0.7rem] text-paper-muted">
            {artist ? <span className="truncate">{artist}</span> : null}
            {rest ? (
              <span className="shrink-0 whitespace-pre">
                {artist ? " · " : ""}
                {rest}
              </span>
            ) : null}
          </span>
        ) : null}
        <div className="flex items-center justify-between gap-1">
          <StarRatingDisplay value={entry.stars} label={starsLabel} starClassName="size-2.5" />
          <RatingScore
            entry={entry}
            onEdit={onEdit}
            variant="compact"
            // Con puntero grueso el botón mide 44 px; el margen negativo evita que ese alto estire la ficha.
            className="[@media(pointer:coarse)]:-my-2"
            ariaLabel={hasScore ? t("editRatingFor", { title: target.title }) : t("untunedAction")}
          />
        </div>
      </div>
    </li>
  );
}
