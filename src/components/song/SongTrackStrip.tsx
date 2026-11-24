import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Chevron } from "@/components/ui/Chevron";
import { songHref } from "@/lib/catalog-links";
import type { StripTrack, TrackStrip } from "@/services/catalog/recording-detail";
import { trackNumber } from "./SongHeader";

// «Recorrer el disco» (openspec: redesign-song-page; desde modernize-song-page-phase1 en la columna lateral de la tarjeta): la
// pista anterior y la siguiente del disco principal, con su etiqueta y el número separado del título ("2 · Tears"). El disco y
// la posición los dice la ficha. En escritorio, una debajo de la otra; en el teléfono y la tableta, en una fila.

function Neighbor({ track, multiDisc, direction }: { track: StripTrack | null; multiDisc: boolean; direction: "previous" | "next" }) {
  const t = useTranslations("catalog.song.strip");
  // La siguiente se alinea a la derecha mientras van en una fila; en la columna de escritorio, a la izquierda.
  const align = direction === "next" ? "items-end text-right lg:items-start lg:text-left" : "items-start text-left";

  // En los extremos del disco no hay a dónde ir: se dice, en lugar de dejar un hueco.
  if (!track) {
    return (
      <span className={`flex flex-col justify-center py-1.5 font-data text-xs text-paper-muted/70 ${align}`}>
        {t(direction === "previous" ? "discStart" : "discEnd")}
      </span>
    );
  }

  return (
    <Link
      href={songHref(null, track.title, track.recordingId)}
      aria-label={t(direction, { number: trackNumber(track, multiDisc), title: track.title })}
      className={`group flex min-w-0 flex-col gap-0.5 py-1.5 ${align}`}
    >
      <span className="inline-flex items-center gap-1 font-data text-[11px] uppercase tracking-wider text-paper-muted">
        <Chevron direction={direction === "previous" ? "left" : "right"} className="size-3" />
        {direction === "previous" ? t("previousLabel") : t("nextLabel")}
      </span>
      <span className="flex min-w-0 max-w-full items-baseline gap-1.5 font-body text-sm text-paper group-hover:text-amber">
        <span className="shrink-0 font-data text-xs text-paper-muted">{trackNumber(track, multiDisc)} ·</span>
        <span className="truncate">{track.title}</span>
      </span>
    </Link>
  );
}

export function SongTrackStrip({ strip }: { strip: TrackStrip }) {
  const t = useTranslations("catalog.song.strip");
  return (
    <nav aria-label={t("label")} className="flex flex-col gap-1">
      <h2 className="hidden font-data text-xs uppercase tracking-wider text-paper-muted sm:block">{t("heading")}</h2>
      <div className="grid grid-cols-2 gap-x-3 lg:grid-cols-1 lg:divide-y lg:divide-ink-border">
        <Neighbor track={strip.previous} multiDisc={strip.multiDisc} direction="previous" />
        <Neighbor track={strip.next} multiDisc={strip.multiDisc} direction="next" />
      </div>
    </nav>
  );
}
