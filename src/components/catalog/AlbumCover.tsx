"use client";

import Image from "next/image";
import { useState, useEffect, useCallback } from "react";
import { DiscPlaceholder } from "./DiscPlaceholder";

interface AlbumCoverProps {
  cover: string | null;
  coverLabel: string;
  coverPlaceholderAlt: string;
  coverFailed?: string;
  className?: string;
}

const MAX_IMAGE_RETRIES = 2;

// Componente de presentación para la carátula del álbum. Usa `next/image`
// y la URL proporcionada por el backend (miniatura de 250px). No construye
// URLs de Cover Art Archive manualmente.
//
// Resiliencia: maneja errores de carga de imagen con máximo 2 reintentos
// visuales. Tras agotar intentos, muestra placeholder estable.
export function AlbumCover({
  cover,
  coverLabel,
  coverPlaceholderAlt,
  coverFailed,
  className = "",
}: AlbumCoverProps) {
  const [imageRetries, setImageRetries] = useState(0);

  // Resetear estado cuando cambia la URL de carátula
  useEffect(() => {
    setImageRetries(0);
  }, [cover]);

  const handleImageError = useCallback(() => {
    setImageRetries((prev) => prev + 1);
  }, []);

  // Determinar si se agotaron los reintentos
  const imageError = imageRetries > MAX_IMAGE_RETRIES;

  // Sin carátula disponible
  if (!cover) {
    return <DiscPlaceholder alt={coverPlaceholderAlt} className={className} />;
  }

  // Error de imagen después de reintentos
  if (imageError) {
    return <DiscPlaceholder alt={coverFailed ?? coverPlaceholderAlt} className={className} />;
  }

  return (
    <div className={`relative overflow-hidden rounded ${className}`}>
      <Image
        key={`cover-${cover}-${imageRetries}`}
        src={cover}
        alt={coverLabel}
        fill
        sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
        className="object-cover"
        onError={handleImageError}
      />
    </div>
  );
}
