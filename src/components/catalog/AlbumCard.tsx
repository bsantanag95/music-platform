import { Link } from "@/i18n/navigation";
import { LazyCoverImage } from "./LazyCoverImage";
import type { ReleaseGroup } from "@/lib/api/schemas";

interface AlbumCardProps {
  releaseGroup: ReleaseGroup;
  categoryLabel: string;
  coverLabel: string;
}

// Tarjeta de álbum dentro de la discografía. Usa `Link` de next-intl para
// preservar el locale activo al navegar al detalle del álbum.
export function AlbumCard({ releaseGroup, categoryLabel, coverLabel }: AlbumCardProps) {
  return (
    <Link
      href={`/album/${releaseGroup.id}`}
      className="group flex w-full flex-col gap-2 rounded-lg border border-ink-border bg-ink-surface p-3 transition-colors hover:border-amber"
    >
      <LazyCoverImage
        releaseGroupId={releaseGroup.id}
        coverLabel={coverLabel}
        className="aspect-square w-full"
      />
      <div className="min-w-0">
        <h3 className="truncate font-display text-sm text-paper">{releaseGroup.title}</h3>
        <p className="font-data text-xs text-paper-muted">{categoryLabel}</p>
      </div>
    </Link>
  );
}
