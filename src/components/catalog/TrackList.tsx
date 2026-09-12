"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { RowMenu, RowMenuItem } from "@/components/ui/RowMenu";
import { ListsContainingItemPanel } from "@/components/lists/ListsContainingItemPanel";
import type { AlbumTrack, AlbumCredit } from "@/services/catalog/album-detail";

interface TrackListProps {
  tracks: AlbumTrack[];
  tracklistHeading: string;
  /** Etiqueta de cada disco ya traducida, por número de disco — no una
   * función: al ser Client Component (menú "···" por fila), sus props deben
   * cruzar el límite servidor/cliente serializadas. */
  discLabels: Record<number, string>;
  durationLabel: string;
  durationUnknown: string;
  creditsLabel: string;
  /** Hay sesión: habilita Guardar/Seguir en las listas de "Mostrar en listas". */
  authenticated?: boolean;
}

function formatDuration(seconds: number | null, durationUnknown: string): string {
  if (seconds === null) return durationUnknown;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

function getFeaturedCredits(track: AlbumTrack): AlbumCredit[] {
  return track.credits.filter((c) => c.role === "featured");
}

// Cliente porque cada fila tiene su menú "···" con "Mostrar en listas"
// (openspec: show-item-in-lists), que abre `ListsContainingItemPanel` debajo
// de la fila — mismo patrón que el menú de una fila del diario. Los títulos y
// nombres de artistas son datos de MusicBrainz y no se traducen; el resto de
// las etiquetas ya llega traducida desde la página (Server Component).
export function TrackList({
  tracks,
  tracklistHeading,
  discLabels,
  durationLabel,
  durationUnknown,
  creditsLabel,
  authenticated = false,
}: TrackListProps) {
  const t = useTranslations("lists");
  const [showInListsTrackId, setShowInListsTrackId] = useState<string | null>(null);

  const discs = new Map<number, AlbumTrack[]>();
  for (const track of tracks) {
    const list = discs.get(track.discNumber) ?? [];
    list.push(track);
    discs.set(track.discNumber, list);
  }

  const discNumbers = Array.from(discs.keys()).sort((a, b) => a - b);

  return (
    <section className="flex w-full flex-col gap-6">
      <h2 className="font-display text-xl text-paper">{tracklistHeading}</h2>
      {discNumbers.map((discNumber) => {
        const discTracks = discs.get(discNumber) ?? [];
        return (
          <div key={discNumber} className="flex flex-col gap-2">
            {discNumbers.length > 1 && (
              <h3 className="font-data text-xs uppercase tracking-wider text-paper-muted">
                {discLabels[discNumber]}
              </h3>
            )}
            <ol className="flex flex-col divide-y divide-ink-border">
              {discTracks.map((track) => {
                const featured = getFeaturedCredits(track);
                const trackKey = `${track.discNumber}-${track.position}`;
                const showingInLists = showInListsTrackId === trackKey;
                return (
                  <li key={trackKey} className="flex flex-col py-3">
                    <div className="flex items-baseline gap-4">
                      <span className="w-8 shrink-0 text-right font-data text-xs text-paper-muted">
                        {track.position}
                      </span>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <Link href={`/song/${track.recordingId}`} className="truncate font-body text-paper hover:text-accent">
                          {track.title}
                        </Link>
                        {featured.length > 0 && (
                          <span className="font-data text-xs text-paper-muted">
                            {creditsLabel}:{" "}
                            {featured.map((credit, i) => {
                              const joinPhrase =
                                credit.joinPhrase ?? (i < featured.length - 1 ? ", " : "");
                              return (
                                <span key={credit.artistId}>
                                  <Link
                                    href={`/artist/${credit.artistId}`}
                                    className="transition-colors hover:text-paper"
                                  >
                                    {credit.name}
                                  </Link>
                                  {joinPhrase}
                                </span>
                              );
                            })}
                          </span>
                        )}
                      </div>
                      <span
                        className="shrink-0 font-data text-xs text-paper-muted"
                        aria-label={`${durationLabel}: ${formatDuration(track.durationSec, durationUnknown)}`}
                      >
                        {formatDuration(track.durationSec, durationUnknown)}
                      </span>
                      <RowMenu label={t("itemMenuLabel")}>
                        <RowMenuItem
                          onSelect={() =>
                            setShowInListsTrackId((current) => (current === trackKey ? null : trackKey))
                          }
                        >
                          {t("showInLists")}
                        </RowMenuItem>
                      </RowMenu>
                    </div>
                    {showingInLists && (
                      <div className="mt-3">
                        <ListsContainingItemPanel
                          target={{ type: "recording", id: track.recordingId }}
                          canSave={authenticated}
                          onClose={() => setShowInListsTrackId(null)}
                        />
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        );
      })}
    </section>
  );
}
