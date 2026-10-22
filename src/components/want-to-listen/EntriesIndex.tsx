"use client";

import { Link } from "@/i18n/navigation";
import { EntryRemoveError } from "./EntryRemoveError";
import { RemoveEntryButton } from "./RemoveEntryButton";
import { WantToListenArtistJourneyAction } from "./WantToListenArtistJourneyAction";
import { wantToListenHref } from "./want-to-listen-shared";
import type { WantToListenRendererProps } from "./want-to-listen-items-view";

// Modo Índice: filas de texto compactas para escanear una lista larga. El
// resaltado de fondo al posar el puntero señala que la fila es interactiva.
// Las acciones van siempre a contraste normal (atenuadas al 40 % no se
// distinguían del fondo) y, en pantallas angostas, el artista pasa a una
// segunda línea para no cortar el título; si las acciones no le dejan ancho
// al título, bajan a su propia línea.
export function EntriesIndex({ entries, actions }: WantToListenRendererProps) {
  return (
    <ul className="flex flex-col">
      {entries.map((entry) => (
        <li
          key={entry.id}
          className="flex flex-col gap-1 rounded-md border-b border-ink-border px-2 py-2 transition-colors last:border-b-0 hover:bg-ink-surface"
        >
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Link
              href={wantToListenHref(entry)}
              className="flex min-w-0 flex-1 basis-40 flex-col font-display text-sm text-paper transition-colors hover:text-amber sm:flex-row sm:items-baseline sm:gap-1.5"
            >
              <span className="truncate">{entry.target.title}</span>
              {entry.target.artistName ? (
                <span className="truncate font-data text-xs text-paper-muted">{entry.target.artistName}</span>
              ) : null}
            </Link>
            <div className="flex shrink-0 items-center gap-3">
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
            </div>
          </div>
          {actions.errorId === entry.id ? <EntryRemoveError /> : null}
        </li>
      ))}
    </ul>
  );
}
