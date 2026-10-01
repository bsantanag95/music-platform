"use client";

import { useLocale } from "next-intl";
import { formatStars } from "@/components/album/album-format";
import { StarRatingDisplay } from "./StarRatingDisplay";

// "Estrellas + número" para la nota de un usuario (openspec: unify-rating-representation,
// D1/D2; define-detailed-score, D6/D8): la fila de estrellas de `StarRatingDisplay` junto al
// valor exacto (`4,5`) o, en las superficies que lo muestran (`showScore`), el puntaje
// detallado `86/100` en lugar del número de estrellas. El número usa un tono neutro con
// `font-medium` (sin ámbar ni color por valor). La `label` ya viene localizada del caller y es
// quien decide si incluye el puntaje. Es una sola imagen accesible: la etiqueta vive en el
// contenedor y los glifos/número son decorativos.

interface StarRatingValueProps {
  // Estrellas como las devuelve el servicio: "0.5" .. "5.0".
  stars: string;
  detailedScore: number | null;
  // aria-label ya localizada (la arma el caller, que tiene el catálogo).
  label: string;
  /** Tamaño de cada estrella. */
  starClassName?: string;
  /** Muestra `86/100` en lugar de `4,5` cuando hay puntaje detallado. */
  showScore?: boolean;
}

export function StarRatingValue({ stars, detailedScore, label, starClassName, showScore = false }: StarRatingValueProps) {
  const locale = useLocale();
  const value = formatStars(Number(stars), locale);
  const shown = showScore && detailedScore != null ? `${detailedScore}/100` : value;

  return (
    <span className="mt-1 inline-flex items-center gap-2 font-data text-xs" role="img" aria-label={label}>
      <StarRatingDisplay value={Number(stars)} label={label} starClassName={starClassName} decorative />
      <span aria-hidden className="font-medium text-paper">
        {shown}
      </span>
    </span>
  );
}
