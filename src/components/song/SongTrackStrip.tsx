import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { ContainingAlbum, StripTrack, TrackStrip } from "@/services/catalog/recording-detail";
import { trackNumber } from "./SongHeader";

// Tira de pistas (openspec: redesign-song-page, `song-page-layout`): el disco principal con
// "pista N de M" y la pista anterior y la siguiente, para recorrer el disco canción por canción.

function Neighbor({ track, multiDisc, direction }: { track: StripTrack | null; multiDisc: boolean; direction: "previous" | "next" }) {
  const t = useTranslations("catalog.song.strip");
  if (!track) return <span aria-hidden="true" />;
  return (
    <Link
      href={`/song/${track.recordingId}`}
      aria-label={t(direction, { number: trackNumber(track, multiDisc), title: track.title })}
      className={`flex min-w-0 items-baseline gap-1.5 font-data text-xs text-paper-muted hover:text-amber ${
        direction === "next" ? "justify-end text-right" : ""
      }`}
    >
      {direction === "previous" && <span aria-hidden="true">←</span>}
      <span className="shrink-0">{trackNumber(track, multiDisc)}</span>
      <span className="truncate">{track.title}</span>
      {direction === "next" && <span aria-hidden="true">→</span>}
    </Link>
  );
}

export function SongTrackStrip({ strip, disc }: { strip: TrackStrip; disc: ContainingAlbum }) {
  const t = useTranslations("catalog.song.strip");
  return (
    <nav
      aria-label={t("label")}
      className="grid grid-cols-2 items-center gap-x-4 gap-y-2 rounded border border-ink-border bg-ink-surface px-4 py-2.5 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]"
    >
      <div className="col-span-2 text-center sm:order-2 sm:col-span-1">
        <Link href={`/album/${disc.releaseGroupId}`} className="font-body text-sm text-amber hover:underline">
          {disc.title}
        </Link>
        <span className="font-data text-xs text-paper-muted"> · {t("position", { index: strip.index, total: strip.total })}</span>
      </div>
      <div className="min-w-0 sm:order-1">
        <Neighbor track={strip.previous} multiDisc={strip.multiDisc} direction="previous" />
      </div>
      <div className="min-w-0 sm:order-3">
        <Neighbor track={strip.next} multiDisc={strip.multiDisc} direction="next" />
      </div>
    </nav>
  );
}
