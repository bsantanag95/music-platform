"use client";

import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState, useEffect, useCallback } from "react";
import { getReleaseGroupCover } from "@/lib/api/catalog";
import { queryKeys } from "@/lib/query/keys";
import { Skeleton } from "@/components/ui/Skeleton";
import { DiscPlaceholder } from "./DiscPlaceholder";

interface LazyCoverImageProps {
  releaseGroupId: string;
  coverLabel: string;
  className?: string;
}

import type { Cover } from "@/lib/api/schemas";

const MAX_QUERY_RETRIES = 2;
const MAX_IMAGE_RETRIES = 2;
const BACKOFF_DELAYS = [250, 750];

// Cliente porque resuelve la carátula después del primer render (carga
// progresiva por álbum, ver Etapa 3.2). Consulta el endpoint cover-only del
// release-group vía `src/lib/api/catalog.ts` + TanStack Query: resuelve la
// carátula con un HEAD a Cover Art Archive sin ingestar el tracklist (0
// llamadas a MusicBrainz), y consume la URL `cover` con `next/image`, sin
// construir URLs de Cover Art Archive manualmente.
//
// Resiliencia: limita reintentos de consulta (máx 2 con backoff) y errores
// de carga de imagen (máx 2 reintentos visuales). Tras agotar intentos,
// muestra placeholder estable sin loops de requests.
export function LazyCoverImage({ releaseGroupId, coverLabel, className = "" }: LazyCoverImageProps) {
  const t = useTranslations("catalog.artist");
  const [imageRetries, setImageRetries] = useState(0);

  const { data, isLoading, isError } = useQuery<Cover>({
    queryKey: queryKeys.releaseGroupCover(releaseGroupId),
    queryFn: () => getReleaseGroupCover(releaseGroupId),
    retry: (failureCount) => failureCount < MAX_QUERY_RETRIES,
    retryDelay: (failureCount) => {
      const index = Math.min(failureCount, BACKOFF_DELAYS.length - 1);
      return BACKOFF_DELAYS[index] as number;
    },
  });

  // Resetear estado de imagen cuando cambia el releaseGroupId
  useEffect(() => {
    setImageRetries(0);
  }, [releaseGroupId]);

  const handleImageError = useCallback(() => {
    setImageRetries((prev) => prev + 1);
  }, []);

  // Determinar si se agotaron los reintentos
  const imageError = imageRetries > MAX_IMAGE_RETRIES;

  // Durante carga de consulta
  if (isLoading) {
    return (
      <Skeleton
        variant="disc"
        ariaLabel={t("coverLoading")}
        className={className}
      />
    );
  }

  // Error de consulta después de reintentos
  if (isError) {
    return <DiscPlaceholder alt={t("coverFailed")} className={className} />;
  }

  const cover = data?.cover;

  // Sin carátula disponible
  if (!cover) {
    return <DiscPlaceholder alt={t("coverPlaceholderAlt")} className={className} />;
  }

  // Error de imagen después de reintentos
  if (imageError) {
    return <DiscPlaceholder alt={t("coverFailed")} className={className} />;
  }

  return (
    <div className={`relative overflow-hidden rounded ${className}`}>
      <Image
        key={`cover-${releaseGroupId}-${imageRetries}`}
        src={cover}
        alt={coverLabel ?? ""}
        fill
        sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
        className="object-cover"
        loading="lazy"
        onError={handleImageError}
      />
    </div>
  );
}