import type { AlbumTrack } from "@/services/catalog/album-detail";

interface TrackListProps {
  tracks: AlbumTrack[];
  tracklistHeading: string;
  discLabel: (discNumber: number) => string;
  durationLabel: string;
  durationUnknown: string;
  creditsLabel: string;
}

function formatDuration(seconds: number | null, durationUnknown: string): string {
  if (seconds === null) return durationUnknown;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

function formatCredits(track: AlbumTrack): string | null {
  const featured = track.credits.filter((c) => c.role === "featured");
  if (featured.length === 0) return null;

  return featured
    .map((c, i) => {
      const joinPhrase = c.joinPhrase ?? (i < featured.length - 1 ? ", " : "");
      return `${c.name}${joinPhrase}`;
    })
    .join("");
}

// Componente de presentación (Server Component): recibe las etiquetas ya
// traducidas. Los títulos de canciones y nombres de artistas son datos de
// MusicBrainz y no se traducen.
export function TrackList({
  tracks,
  tracklistHeading,
  discLabel,
  durationLabel,
  durationUnknown,
  creditsLabel,
}: TrackListProps) {
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
                {discLabel(discNumber)}
              </h3>
            )}
            <ol className="flex flex-col divide-y divide-ink-border">
              {discTracks.map((track) => {
                const credits = formatCredits(track);
                return (
                  <li
                    key={`${track.discNumber}-${track.position}`}
                    className="flex items-baseline gap-4 py-3"
                  >
                    <span className="w-8 shrink-0 text-right font-data text-xs text-paper-muted">
                      {track.position}
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate font-body text-paper">{track.title}</span>
                      {credits && (
                        <span className="font-data text-xs text-paper-muted">
                          {creditsLabel}: {credits}
                        </span>
                      )}
                    </div>
                    <span
                      className="shrink-0 font-data text-xs text-paper-muted"
                      aria-label={`${durationLabel}: ${formatDuration(track.durationSec, durationUnknown)}`}
                    >
                      {formatDuration(track.durationSec, durationUnknown)}
                    </span>
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
