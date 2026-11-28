import { CoverThumb } from "../CoverThumb";
import { LazyCoverImage } from "../LazyCoverImage";

// Carátula de un resultado de búsqueda. Si la respuesta ya la trae resuelta (`coverResolved`, fix/n-plus-one-queries), se
// pinta en la carga inicial sin pedir `/cover`; si no, se resuelve al entrar en pantalla. La usan las fichas de respuesta
// y el panel «x en otros tipos» (redesign-search-phase2), igual que las filas de Álbumes.
export function ResultCover({
  item,
  className,
  priority = false,
}: {
  item: { id: string; coverThumbUrl: string | null; coverResolved: boolean };
  className: string;
  /** Carátula principal de la página (ficha de respuesta): se carga sin esperar. */
  priority?: boolean;
}) {
  return item.coverResolved ? (
    <CoverThumb cover={item.coverThumbUrl} label="" className={className} priority={priority} />
  ) : (
    <LazyCoverImage releaseGroupId={item.id} coverLabel="" className={className} />
  );
}
