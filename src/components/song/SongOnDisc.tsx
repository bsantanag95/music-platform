import { Fragment } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SECONDARY_LINK } from "@/components/ui/segmented";
import { formatDuration } from "@/components/album/album-format";
import { songHref } from "@/lib/catalog-links";
import { discYear, type ContainingAlbum, type TrackStrip } from "@/services/catalog/recording-detail";
import { trackNumber } from "./SongHeader";
import { onDiscRange, onDiscTotal } from "./on-disc";

// Columna «En el disco» (openspec: modernize-song-page-phase2, `song-page-layout`): las pistas de la edición representativa del
// disco principal, con la de esta página marcada, para recorrer el disco entero sin volver al álbum. Sale de la misma consulta
// que «Recorrer el disco». Componente de servidor.

const rowClass = "grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-baseline gap-x-2 border-b border-ink-border px-1.5 py-1.5";

/** `discHref`: la URL canónica del disco (con el artista), la misma de las migas. */
export function SongOnDisc({ strip, disc, discHref }: { strip: TrackStrip; disc: ContainingAlbum; discHref: string }) {
  const t = useTranslations("catalog.song.onDisc");
  const { tracks, multiDisc } = strip;
  const current = strip.index - 1;
  const { start, end } = onDiscRange(tracks.length, current);
  const shown = tracks.slice(start, end);
  const year = discYear(disc);
  const total = onDiscTotal(tracks.map((track) => track.durationSec));

  return (
    <aside aria-labelledby="song-on-disc" className="flex min-w-0 flex-col gap-2">
      <h2 id="song-on-disc" className="font-data text-xs uppercase tracking-wider text-paper-muted">
        {year !== null ? t("headingYear", { year }) : t("heading")}
      </h2>
      <ol className="flex flex-col border-t border-ink-border">
        {start > 0 && (
          <li aria-hidden="true" className="border-b border-ink-border px-1.5 py-1 font-data text-xs text-paper-muted">
            …
          </li>
        )}
        {shown.map((track, i) => {
          const isCurrent = start + i === current;
          const previous = shown[i - 1];
          // Rótulo de cada medio en discos de varios (y al empezar la ventana en otro medio que el primero).
          const discLabel = multiDisc && (!previous || previous.discNumber !== track.discNumber);
          const number = trackNumber(track, multiDisc);
          const duration = (
            <span className="font-data text-xs text-paper-muted">
              {track.durationSec != null ? formatDuration(track.durationSec) : ""}
            </span>
          );
          return (
            <Fragment key={`${track.discNumber}-${track.position}-${track.recordingId}`}>
              {discLabel && (
                <li className="border-b border-ink-border px-1.5 pb-1 pt-3 font-data text-[11px] uppercase tracking-wider text-paper-muted">
                  {t("disc", { number: track.discNumber })}
                </li>
              )}
              <li>
                {isCurrent ? (
                  <span aria-current="page" className={`${rowClass} rounded-sm bg-amber/10`}>
                    <span className="font-data text-xs text-amber">{number}</span>
                    <span className="min-w-0 font-body text-sm text-amber [overflow-wrap:anywhere]">{track.title}</span>
                    {duration}
                  </span>
                ) : (
                  <Link href={songHref(null, track.title, track.recordingId)} className={`group ${rowClass}`}>
                    <span className="font-data text-xs text-paper-muted">{number}</span>
                    <span className="min-w-0 font-body text-sm text-paper [overflow-wrap:anywhere] group-hover:text-amber">
                      {track.title}
                    </span>
                    {duration}
                  </Link>
                )}
              </li>
            </Fragment>
          );
        })}
        {end < tracks.length && (
          <li aria-hidden="true" className="border-b border-ink-border px-1.5 py-1 font-data text-xs text-paper-muted">
            …
          </li>
        )}
      </ol>
      <p className="font-data text-xs text-paper-muted">
        {t("count", { count: tracks.length })}
        {total && ` · ${total.approximate ? "≈" : ""}${formatDuration(total.seconds)}`}
      </p>
      {(start > 0 || end < tracks.length) && (
        <Link href={discHref} className={`self-start font-data text-xs ${SECONDARY_LINK}`}>
          {t("seeAll", { count: tracks.length })} →
        </Link>
      )}
    </aside>
  );
}
