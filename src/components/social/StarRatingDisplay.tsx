import { StarGlyph } from "./StarRatingInput";

// Estrellas de solo lectura (openspec: rework-album-tracklist, D3; unify-rating-representation,
// D1/D2): la representación en fila de la nota de un usuario. Por defecto es una sola imagen
// accesible con el valor en `label` y los glifos decorativos. Con `decorative` no expone
// nada: la usa `StarRatingValue` cuando el contenedor ya lleva la etiqueta única que incluye
// el número y el puntaje detallado. Mismo trazado que `StarRatingInput`.

interface StarRatingDisplayProps {
  /** Valor ½…5. */
  value: number;
  /** Texto accesible (p. ej. "Tu nota: 4,5 estrellas"). */
  label: string;
  /** Tamaño de cada estrella. */
  starClassName?: string;
  /** Los glifos son decorativos: el contenedor que envuelve expone la etiqueta. */
  decorative?: boolean;
}

export function StarRatingDisplay({
  value,
  label,
  starClassName = "size-3",
  decorative = false,
}: StarRatingDisplayProps) {
  const glyphs = Array.from({ length: 5 }, (_, index) => {
    const star = index + 1;
    const fill = value >= star ? 1 : value >= star - 0.5 ? 0.5 : 0;
    return <StarGlyph key={star} fill={fill} className={starClassName} />;
  });

  if (decorative) {
    return (
      <span aria-hidden="true" className="inline-flex items-center">
        {glyphs}
      </span>
    );
  }

  return (
    <span role="img" aria-label={label} className="inline-flex items-center">
      {glyphs}
    </span>
  );
}
