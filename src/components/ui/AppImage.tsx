import Image, { type ImageProps } from "next/image";
import { isPreprocessedImageSrc } from "@/lib/image-source";

/**
 * Único punto que importa `next/image` (openspec: mirror-cover-art, ADR 0018).
 * Saltea el optimizador solo para fuentes ya preprocesadas a su tamaño final
 * —carátulas espejadas y avatares en el storage propio—; cualquier otra
 * fuente, incluidas las no previstas, pasa por el optimizador.
 *
 * `unoptimized` se calcula desde el `src` y se aplica después del spread, así
 * el componente que lo usa no puede sobrescribirlo.
 */
export function AppImage({ src, alt, ...props }: ImageProps) {
  return (
    <Image
      {...props}
      src={src}
      alt={alt}
      unoptimized={typeof src === "string" && isPreprocessedImageSrc(src)}
    />
  );
}
