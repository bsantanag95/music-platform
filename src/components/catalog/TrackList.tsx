import { Link } from "@/i18n/navigation";
import type { AlbumTrack, AlbumCredit } from "@/services/catalog/album-detail";

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

function getFeaturedCredits(track: AlbumTrack): AlbumCredit[] {
  return track.credits.filter((c) => c.role === "featured");
}

// Componente de presentación (Server Component): recibe las etiquetas ya
// traducidas. Los títulos de canciones y nombres de artistas son datos de
// MusicBrainz y no se traducen. Los créditos destacados enlazan al perfil
// del artista acreditado preservando el locale activo.
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
                const featured = getFeaturedCredits(track);
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
