import Image from "next/image";
import { DiscPlaceholder } from "./DiscPlaceholder";

interface AlbumCoverProps {
  cover: string | null;
  coverLabel: string;
  coverPlaceholderAlt: string;
  className?: string;
}

// Componente de presentación para la carátula del álbum. Usa `next/image`
// y la URL proporcionada por el backend (miniatura de 250px). No construye
// URLs de Cover Art Archive manualmente.
export function AlbumCover({
  cover,
  coverLabel,
  coverPlaceholderAlt,
  className = "",
}: AlbumCoverProps) {
  if (!cover) {
    return <DiscPlaceholder alt={coverPlaceholderAlt} className={className} />;
  }

  return (
    <div className={`relative overflow-hidden rounded ${className}`}>
      <Image
        src={cover}
        alt={coverLabel}
        fill
        sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
        className="object-cover"
      />
    </div>
  );
}
