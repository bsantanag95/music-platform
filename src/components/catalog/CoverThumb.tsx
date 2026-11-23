"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
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
// ícono de imagen rota del navegador; también si falló antes de que React se hidratara (el `onError` ya pasó: se
// revisa la imagen al montar, openspec: modernize-artist-page-phase3). `fallback` reemplaza al disco (la grilla de la
// discografía pone el título y el año). `onFail` avisa al caller de esa caída para que decida otra cosa
// (p. ej. el mosaico de una lista se reacomoda sin la imagen en vez de dejar un disco en un cuadrante).
export function CoverThumb({
  cover,
  label,
  className = "",
  onFail,
  priority = false,
  fallback,
}: {
  cover: string | null;
  label: string;
  className?: string;
  onFail?: () => void;
  /** Carga la imagen sin diferirla: para carátulas visibles sin hacer scroll (evita el aviso de LCP). */
  priority?: boolean;
  /** Qué mostrar sin imagen o si falla; por defecto, el disco dibujado. */
  fallback?: ReactNode;
}) {
  // Se guarda la URL que falló (no un booleano): si cambia `cover`, la nueva se intenta.
  const [failedCover, setFailedCover] = useState<string | null>(null);
  const frame = useRef<HTMLDivElement>(null);

  // Una imagen que falló antes de la hidratación ya disparó su `error` sin nadie escuchando: terminó (`complete`) sin
  // píxeles. Una que todavía carga, o diferida, no está `complete`.
  useEffect(() => {
    const img = frame.current?.querySelector("img");
    if (cover && img && img.complete && img.naturalWidth === 0) {
      setFailedCover(cover);
      onFail?.();
    }
    // Solo al montar o al cambiar la URL: `onFail` puede cambiar de identidad en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cover]);

  if (!cover || failedCover === cover) {
    if (fallback) return <>{fallback}</>;
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
    <div ref={frame} className={`relative shrink-0 overflow-hidden rounded ${className}`}>
      <AppImage
        src={cover}
        alt={label}
        fill
        sizes="250px"
        priority={priority}
        className="object-cover"
        onError={() => {
          setFailedCover(cover);
          onFail?.();
        }}
      />
    </div>
  );
}
