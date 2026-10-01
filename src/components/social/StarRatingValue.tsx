"use client";

import { useLocale } from "next-intl";
import { formatStars } from "@/components/album/album-format";
import { StarRatingDisplay } from "./StarRatingDisplay";

// "Estrellas + número" para la nota de un usuario (openspec: unify-rating-representation,
// D1/D2): la fila de estrellas de `StarRatingDisplay` junto al valor exacto (`4,5`, o
// `4,5 · 87` cuando hay puntaje detallado). Conserva la firma del antiguo `FeedRatingMeter`
// (`stars: string`, `detailedScore`, `label`). El número se formatea con `formatStars` (coma
// en español) igual que el resto de las superficies; la `label` ya viene localizada del
// caller. Es una sola imagen accesible: la etiqueta vive en el contenedor y los
// glifos/número son decorativos.

interface StarRatingValueProps {
  // Estrellas como las devuelve el servicio: "0.5" .. "5.0".
  stars: string;
  detailedScore: number | null;
  // aria-label ya localizada (la arma el caller, que tiene el catálogo).
  label: string;
  /** Tamaño de cada estrella. */
  starClassName?: string;
}

export function StarRatingValue({ stars, detailedScore, label, starClassName }: StarRatingValueProps) {
  const locale = useLocale();
  const value = formatStars(Number(stars), locale);
  const numeric = detailedScore != null ? `${value} · ${detailedScore}` : value;

  return (
    <span className="mt-1 inline-flex items-center gap-2 font-data text-xs" role="img" aria-label={label}>
      <StarRatingDisplay value={Number(stars)} label={label} starClassName={starClassName} decorative />
      <span aria-hidden className="text-amber">
        {numeric}
      </span>
    </span>
  );
}
