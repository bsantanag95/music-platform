import Image from "next/image";
import { DiscPlaceholder } from "./DiscPlaceholder";

// Miniatura cuadrada de carátula para listados densos (feed, actividad de
// Inicio). Renderiza el disco de vinilo cuando no hay arte. El tamaño lo fija
// el caller vía `className` (ej. `size-10`, `size-14 sm:size-16`).
//
// `label` vacío = imagen decorativa: el `<img>` va con `alt=""` y el disco se
// oculta del árbol de accesibilidad (el título del ítem ya está al lado como
// texto, no hace falta repetirlo).
export function CoverThumb({
  cover,
  label,
  className = "",
}: {
  cover: string | null;
  label: string;
  className?: string;
}) {
  if (!cover) {
    const disc = <DiscPlaceholder alt={label} className={`shrink-0 ${className}`} />;
    return label === "" ? (
      <span aria-hidden className="contents">
        {disc}
      </span>
    ) : (
      disc
    );
  }

  return (
    <div className={`relative shrink-0 overflow-hidden rounded ${className}`}>
      <Image src={cover} alt={label} fill sizes="64px" className="object-cover" />
    </div>
  );
}
