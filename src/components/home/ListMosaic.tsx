import { AppImage } from "@/components/ui/AppImage";
import { CoverThumb } from "@/components/catalog/CoverThumb";

// Mosaico 2×2 de carátulas de los primeros ítems de una lista; si la lista no
// es de álbumes (o aún no tiene carátulas resueltas) cae en un único disco de
// fallback. Decorativo: el título de la lista va siempre al lado como texto.
// Lo comparten "Retoma una lista" y "Listas públicas recientes" de Inicio.
export function ListMosaic({ covers, className }: { covers: string[]; className: string }) {
  if (covers.length === 0) {
    return <CoverThumb cover={null} label="" className={`${className} ring-1 ring-ink-border`} />;
  }

  return (
    <span
      aria-hidden
      className={`grid shrink-0 grid-cols-2 grid-rows-2 gap-px overflow-hidden rounded shadow-md shadow-black/40 ring-1 ring-ink-border ${className}`}
    >
      {[0, 1, 2, 3].map((i) => {
        const cover = covers[i % covers.length];
        return (
          <span key={i} className="relative bg-ink">
            {cover ? <AppImage src={cover} alt="" fill sizes="32px" className="object-cover" /> : null}
          </span>
        );
      })}
    </span>
  );
}
