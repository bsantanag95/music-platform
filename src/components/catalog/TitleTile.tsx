/**
 * Relleno tipográfico de un disco sin carátula (openspec: refine-artist-page-phase2, design D2; compartido desde
 * refine-album-page-phase2, D5): el título y el año en la tipografía de la página, para que el cuadro diga qué disco es
 * sin leer debajo. Decorativo para lectores de pantalla: el título ya está en el enlace.
 */
export function TitleTile({ title, year, className }: { title: string; year: number | null; className: string }) {
  return (
    <span
      aria-hidden="true"
      data-testid="title-tile"
      className={`flex flex-col justify-between overflow-hidden rounded border border-ink-border bg-ink-surface p-2 sm:p-2.5 ${className}`}
    >
      <span className="line-clamp-4 font-display text-xs leading-tight text-paper [overflow-wrap:anywhere] sm:text-sm">{title}</span>
      {year !== null && <span className="font-data text-xs text-paper-muted">{year}</span>}
    </span>
  );
}
