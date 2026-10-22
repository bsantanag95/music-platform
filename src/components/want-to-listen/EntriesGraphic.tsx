"use client";

import { Link } from "@/i18n/navigation";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { ArtistPlate } from "./ArtistPlate";
import { EntryRemoveError } from "./EntryRemoveError";
import { RemoveEntryButton } from "./RemoveEntryButton";
import { WantToListenArtistJourneyAction } from "./WantToListenArtistJourneyAction";
import { wantToListenHref } from "./want-to-listen-shared";
import type { WantToListenRendererProps } from "./want-to-listen-items-view";

// Modo Gráfico: pared de carátulas/placas. El título va como caption visible
// (no solo atributo) para que cada ítem siga siendo texto accesible — mismo
// tratamiento que `ItemsGraphic`, sin la barra de reordenamiento (acá el
// orden es cronológico, no manual): quitar es una acción de texto bajo el
// caption. Las acciones se apilan y su texto se parte dentro de la tarjeta:
// en una fila desbordaban y pisaban las de la tarjeta vecina.
export function EntriesGraphic({ entries, actions, priorityIds }: WantToListenRendererProps) {
  return (
    <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
      {entries.map((entry) => {
        const href = wantToListenHref(entry);
        return (
          <li key={entry.id} className="flex min-w-0 flex-col gap-1.5">
            <Link
              href={href}
              className="group relative block overflow-hidden rounded-md border border-ink-border transition-colors hover:border-amber"
            >
              {entry.targetType === "release-group" ? (
                <CoverThumb
                  cover={entry.target.coverThumbUrl}
                  label=""
                  className="aspect-square w-full"
                  priority={priorityIds.has(entry.id)}
                />
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
            {entry.target.artistName ? (
              <span className="truncate font-data text-[0.7rem] text-paper-muted/80">
                {entry.target.artistName}
              </span>
            ) : null}
            <div className="flex flex-col items-start gap-1">
              {entry.targetType === "artist" ? (
                <WantToListenArtistJourneyAction
                  artistId={entry.target.id}
                  status={actions.journeyStatus(entry.target.id)}
                  onAdded={actions.journeyAdded}
                  onError={actions.journeyError}
                />
              ) : null}
              <RemoveEntryButton
                title={entry.target.title}
                busy={actions.busy}
                onRemove={() => actions.remove(entry.id)}
              />
              {actions.errorId === entry.id ? <EntryRemoveError /> : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
