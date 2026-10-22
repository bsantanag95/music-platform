"use client";

import { Link } from "@/i18n/navigation";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { ArtistPlate } from "./ArtistPlate";
import { EntryRemoveError } from "./EntryRemoveError";
import { RemoveEntryButton } from "./RemoveEntryButton";
import { WantToListenArtistJourneyAction } from "./WantToListenArtistJourneyAction";
import { wantToListenArtistHref, wantToListenHref } from "./want-to-listen-shared";
import type { WantToListenRendererProps } from "./want-to-listen-items-view";

// Modo Detallada: una fila-tarjeta por entrada con carátula/placa y título.
// Es el modo por defecto — mismo tratamiento visual que `ItemsDetailed`.
// En pantallas angostas las acciones bajan a una línea propia: en la misma
// fila le quitaban el ancho al título (un artista se leía "D.").
export function EntriesDetailed({ entries, actions, priorityIds }: WantToListenRendererProps) {
  return (
    <ul className="flex flex-col gap-2">
      {entries.map((entry) => {
        const href = wantToListenHref(entry);
        const artistHref = wantToListenArtistHref(entry);
        const media =
          entry.targetType === "release-group" ? (
            <CoverThumb
              cover={entry.target.coverThumbUrl}
              label=""
              className="size-14 sm:size-16"
              priority={priorityIds.has(entry.id)}
            />
          ) : (
            <ArtistPlate title={entry.target.title} className="size-14 sm:size-16" textClassName="text-xl sm:text-2xl" />
          );

        return (
          <li
            key={entry.id}
            className="flex gap-3 rounded-lg border border-ink-border bg-ink-surface p-3 transition-colors focus-within:border-amber"
          >
            <Link href={href} className="shrink-0" tabIndex={-1} aria-hidden>
              {media}
            </Link>
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
              <div className="flex min-w-0 flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                <div className="flex w-full min-w-0 flex-col gap-0.5 sm:w-auto">
                  <Link
                    href={href}
                    className="truncate font-display text-base text-paper transition-colors hover:text-amber"
                  >
                    {entry.target.title}
                  </Link>
                  {entry.target.artistName ? (
                    <p className="truncate font-data text-xs text-paper-muted">
                      {artistHref ? (
                        <Link href={artistHref} className="transition-colors hover:text-amber">
                          {entry.target.artistName}
                        </Link>
                      ) : (
                        entry.target.artistName
                      )}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-x-3 sm:shrink-0 sm:flex-nowrap">
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
            </div>
          </li>
        );
      })}
    </ul>
  );
}
