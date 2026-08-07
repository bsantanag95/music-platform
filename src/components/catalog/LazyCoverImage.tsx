"use client";

import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { getReleaseGroupCover } from "@/lib/api/catalog";
import { queryKeys } from "@/lib/query/keys";
import { Skeleton } from "@/components/ui/Skeleton";
import { DiscPlaceholder } from "./DiscPlaceholder";

interface LazyCoverImageProps {
  releaseGroupId: string;
  coverLabel: string;
  className?: string;
}

// Cliente porque resuelve la carátula después del primer render (carga
// progresiva por álbum, ver Etapa 3.2). Consulta el endpoint cover-only del
// release-group vía `src/lib/api/catalog.ts` + TanStack Query: resuelve la
// carátula con un HEAD a Cover Art Archive sin ingestar el tracklist (0
// llamadas a MusicBrainz), y consume la URL `cover` con `next/image`, sin
// construir URLs de Cover Art Archive manualmente.
export function LazyCoverImage({ releaseGroupId, coverLabel, className = "" }: LazyCoverImageProps) {
  const t = useTranslations("catalog.artist");
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.releaseGroupCover(releaseGroupId),
    queryFn: () => getReleaseGroupCover(releaseGroupId),
  });

  if (isLoading) {
    return (
      <Skeleton
        variant="disc"
        ariaLabel={t("coverLoading")}
        className={className}
      />
    );
  }

  const cover = data?.cover;
  if (!cover) {
    return <DiscPlaceholder alt={t("coverPlaceholderAlt")} className={className} />;
  }

  return (
    <div className={`relative overflow-hidden rounded ${className}`}>
      <Image
        src={cover}
        alt={coverLabel ?? ""}
        fill
        sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
        className="object-cover"
        loading="lazy"
      />
    </div>
  );
}