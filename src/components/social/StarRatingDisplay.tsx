import { StarGlyph } from "./StarRatingInput";

// Estrellas de solo lectura (openspec: rework-album-tracklist, D3): la valoración propia en
// cada fila de la tracklist. Una sola imagen accesible con el valor en `label`; los glifos
// son decorativos. Mismo trazado que `StarRatingInput`.

interface StarRatingDisplayProps {
  /** Valor ½…5. */
  value: number;
  /** Texto accesible (p. ej. "Tu nota: 4,5 estrellas"). */
  label: string;
  /** Tamaño de cada estrella. */
  starClassName?: string;
}

export function StarRatingDisplay({ value, label, starClassName = "size-3" }: StarRatingDisplayProps) {
  return (
    <span role="img" aria-label={label} className="inline-flex items-center">
      {Array.from({ length: 5 }, (_, index) => {
        const star = index + 1;
        const fill = value >= star ? 1 : value >= star - 0.5 ? 0.5 : 0;
        return <StarGlyph key={star} fill={fill} className={starClassName} />;
      })}
    </span>
  );
}
