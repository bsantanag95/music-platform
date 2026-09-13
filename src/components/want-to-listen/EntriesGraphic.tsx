"use client";

import { Link } from "@/i18n/navigation";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { ArtistPlate } from "./ArtistPlate";
import { RemoveEntryButton } from "./RemoveEntryButton";
import { wantToListenHref } from "./want-to-listen-shared";
import type { WantToListenRendererProps } from "./want-to-listen-items-view";

// Modo Gráfico: pared de carátulas/placas. El título va como caption visible
// (no solo atributo) para que cada ítem siga siendo texto accesible — mismo
// tratamiento que `ItemsGraphic`, sin la barra de reordenamiento (acá el
// orden es cronológico, no manual): quitar es una acción de texto bajo el
// caption.
export function EntriesGraphic({ entries, actions }: WantToListenRendererProps) {
  return (
    <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
      {entries.map((entry) => {
        const href = wantToListenHref(entry);
        return (
          <li key={entry.id} className="flex flex-col gap-1.5">
            <Link
              href={href}
              className="group relative block overflow-hidden rounded-md border border-ink-border transition-colors hover:border-amber"
            >
              {entry.targetType === "release-group" ? (
                <CoverThumb cover={entry.target.coverThumbUrl} label="" className="aspect-square w-full" />
              ) : (
                <ArtistPlate title={entry.target.title} className="aspect-square w-full" textClassName="text-3xl" />
              )}
            </Link>
            <Link
              href={href}
              className="truncate font-data text-xs text-paper-muted transition-colors hover:text-amber"
            >
              {entry.target.title}
            </Link>
            <RemoveEntryButton
              title={entry.target.title}
              busy={actions.busy}
              onRemove={() => actions.remove(entry.id)}
            />
          </li>
        );
      })}
    </ul>
  );
}
