"use client";

import { useState } from "react";
import { AppImage } from "@/components/ui/AppImage";
import { DiscPlaceholder } from "./DiscPlaceholder";

// Miniatura cuadrada de carátula para listados densos (feed, actividad de
// Inicio). Renderiza el disco de vinilo cuando no hay arte. El tamaño lo fija
// el caller vía `className` (ej. `size-10`, `size-14 sm:size-16`).
//
// `label` vacío = imagen decorativa: el `<img>` va con `alt=""` y el disco se
// oculta del árbol de accesibilidad (el título del ítem ya está al lado como
// texto, no hace falta repetirlo).
//
// Si la imagen falla al cargar (Cover Art Archive devuelve 5xx de forma
// intermitente para algunas carátulas), cae al mismo disco en vez de dejar el
// ícono de imagen rota del navegador.
export function CoverThumb({
  cover,
  label,
  className = "",
}: {
  cover: string | null;
  label: string;
  className?: string;
}) {
  // Se guarda la URL que falló (no un booleano): si cambia `cover`, la nueva se intenta.
  const [failedCover, setFailedCover] = useState<string | null>(null);

  if (!cover || failedCover === cover) {
    const disc = <DiscPlaceholder alt={label} className={`shrink-0 ${className}`} />;
    return label === "" ? (
      <span aria-hidden className="contents">
        {disc}
      </span>
    ) : (
      disc
    );
  }

  // La fuente mide 250 px como máximo (espejo o `front-250`): `sizes` se acota
  // a ese ancho para no pedir variantes mayores (openspec: mirror-cover-art).
  return (
    <div className={`relative shrink-0 overflow-hidden rounded ${className}`}>
      <AppImage
        src={cover}
        alt={label}
        fill
        sizes="250px"
        className="object-cover"
        onError={() => setFailedCover(cover)}
      />
    </div>
  );
}
