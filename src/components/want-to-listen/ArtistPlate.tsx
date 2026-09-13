// Placa tipográfica del artista: sin imagen (los artistas no exponen
// carátula), la inicial en la tipografía de display sobre Vinyl Surface — se
// lee como el lomo de una funda, no como un recuadro vacío. Mismo tratamiento
// que `FavoriteTile.ArtistPlate`, con tamaño y tipografía parametrizables
// para reusarse en los tres modos de visualización.
export function ArtistPlate({
  title,
  className = "size-16",
  textClassName = "text-2xl",
}: {
  title: string;
  className?: string;
  textClassName?: string;
}) {
  const initial = title.trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded border border-ink-border bg-ink-surface font-display text-paper-muted ${textClassName} ${className}`}
    >
      {initial}
    </span>
  );
}
