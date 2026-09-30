import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { albumHref, songHref } from "@/lib/catalog-links";
import type { ContainingAlbum, StripTrack, TrackStrip } from "@/services/catalog/recording-detail";
import { trackNumber } from "./SongHeader";

// Tira de pistas (openspec: redesign-song-page; pulida en polish-song-credits-strip): el disco
// principal con "N de M" y, a cada lado, la pista anterior y la siguiente con su etiqueta y el
// número separado del título ("2 · Tears"), para recorrer el disco canción por canción.

function Neighbor({ track, multiDisc, direction }: { track: StripTrack | null; multiDisc: boolean; direction: "previous" | "next" }) {
  const t = useTranslations("catalog.song.strip");
  const alignEnd = direction === "next" ? "items-end text-right" : "items-start text-left";

  // En los extremos del disco no hay a dónde ir: se dice, en lugar de dejar un hueco.
  if (!track) {
    return (
      <span className={`flex flex-col px-3 py-2 font-data text-xs text-paper-muted/70 ${alignEnd}`}>
        {t(direction === "previous" ? "discStart" : "discEnd")}
      </span>
    );
  }

  return (
    <Link
      href={songHref(null, track.title, track.recordingId)}
      aria-label={t(direction, { number: trackNumber(track, multiDisc), title: track.title })}
      className={`group flex min-w-0 flex-col gap-0.5 rounded px-3 py-2 transition-colors hover:bg-ink ${alignEnd}`}
    >
      <span className="font-data text-[11px] uppercase tracking-wider text-paper-muted">
        {direction === "previous" ? `← ${t("previousLabel")}` : `${t("nextLabel")} →`}
      </span>
      <span className="flex min-w-0 max-w-full items-baseline gap-1.5 font-body text-sm text-paper group-hover:text-amber">
        <span className="shrink-0 font-data text-xs text-paper-muted">{trackNumber(track, multiDisc)} ·</span>
        <span className="truncate">{track.title}</span>
      </span>
    </Link>
  );
}

export function SongTrackStrip({ strip, disc }: { strip: TrackStrip; disc: ContainingAlbum }) {
  const t = useTranslations("catalog.song.strip");
  return (
    <nav
      aria-label={t("label")}
      className="grid grid-cols-2 items-center gap-x-2 gap-y-1 rounded border border-ink-border bg-ink-surface p-1.5 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]"
    >
      <div className="col-span-2 px-3 pt-1 text-center sm:order-2 sm:col-span-1 sm:pt-0">
        <Link href={albumHref(null, disc.title, disc.releaseGroupId)} className="font-body text-sm text-amber hover:underline">
          {disc.title}
        </Link>
        <span className="font-data text-xs text-paper-muted"> · {t("position", { index: strip.index, total: strip.total })}</span>
      </div>
      <div className="min-w-0 sm:order-1">
        <Neighbor track={strip.previous} multiDisc={strip.multiDisc} direction="previous" />
      </div>
      <div className="flex min-w-0 justify-end sm:order-3">
        <Neighbor track={strip.next} multiDisc={strip.multiDisc} direction="next" />
      </div>
    </nav>
  );
}
