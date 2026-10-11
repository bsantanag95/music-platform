import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { DiscPlaceholder } from "@/components/catalog/DiscPlaceholder";
import { LazyCoverImage } from "@/components/catalog/LazyCoverImage";
import { AppImage } from "@/components/ui/AppImage";
import { albumHref, artistHref, songHref } from "@/lib/catalog-links";
import type { AlbumRef, CoverInfo, NominationView } from "@/services/awards/read";

// Un nominado de una categoría de premios (openspec: add-music-awards, design D5). El texto visible es el curado
// (título y artista tal como los nombra la ceremonia) y enlaza al sujeto del catálogo cuando está resuelto; sin
// resolver se muestra solo el texto. El ganador va destacado y más grande.

function Cover({ cover, label, className }: { cover: CoverInfo; label: string; className: string }) {
  return cover.coverResolved ? (
    <CoverThumb cover={cover.coverThumbUrl} label={label} className={className} />
  ) : (
    <LazyCoverImage releaseGroupId={cover.releaseGroupId} coverLabel={label} className={className} />
  );
}

/** Carátula, foto o silueta del nominado (también en la tarjeta de ceremonia de Explorar). */
export function NomineeVisual({ nomination, size }: { nomination: NominationView; size: string }) {
  const t = useTranslations("catalog.explore");
  const subject = nomination.subject;
  if (subject?.kind === "release_group") return <Cover cover={subject.album.cover} label={t("albumCoverLabel")} className={size} />;
  if (subject?.kind === "recording" && subject.anchor) {
    return <Cover cover={subject.anchor.cover} label={t("albumCoverLabel")} className={size} />;
  }
  if (subject?.kind === "artist" && subject.photoUrl) {
    return (
      <div className={`relative shrink-0 overflow-hidden rounded-full ${size}`}>
        <AppImage src={subject.photoUrl} alt="" fill sizes="96px" className="object-cover" />
      </div>
    );
  }
  // Decorativo: el nombre ya está en el texto del nominado.
  return (
    <span aria-hidden className="contents">
      <DiscPlaceholder alt="" className={`shrink-0 ${size} ${subject?.kind === "artist" ? "rounded-full" : ""}`} />
    </span>
  );
}

function subjectHref(nomination: NominationView): string | null {
  const subject = nomination.subject;
  if (!subject) return null;
  if (subject.kind === "release_group") return albumHref(subject.album.artistName, subject.album.title, subject.album.id);
  if (subject.kind === "recording") return songHref(subject.artistName, subject.title, subject.id);
  return artistHref(subject.name, subject.id);
}

const anchorHref = (album: AlbumRef) => albumHref(album.artistName, album.title, album.id);

export function NominationItem({ nomination, featured = false }: { nomination: NominationView; featured?: boolean }) {
  const t = useTranslations("awards");
  const href = subjectHref(nomination);
  const anchor = nomination.subject?.kind === "recording" ? nomination.subject.anchor : null;
  const label = (
    <span className={`line-clamp-2 ${featured ? "font-display text-lg text-paper" : "font-body text-sm text-paper"}`}>{nomination.text}</span>
  );

  return (
    <div className={`flex min-w-0 items-center ${featured ? "gap-4" : "gap-3"}`}>
      <NomineeVisual nomination={nomination} size={featured ? "size-20 shrink-0" : "size-12 shrink-0"} />
      <div className="flex min-w-0 flex-col gap-0.5">
        {nomination.won ? (
          <span className="w-fit rounded-sm bg-amber px-1.5 py-0.5 font-data text-[10px] font-semibold uppercase tracking-wider text-ink">
            {t("winner")}
          </span>
        ) : null}
        {href ? (
          <Link href={href} className="min-w-0 transition-colors hover:text-amber">
            {label}
          </Link>
        ) : (
          <span className="min-w-0">{label}</span>
        )}
        {anchor ? (
          <Link href={anchorHref(anchor)} className="truncate font-data text-xs text-paper-muted transition-colors hover:text-amber">
            {t("fromAlbum", { album: anchor.title })}
          </Link>
        ) : null}
        {nomination.credit ? <span className="truncate font-data text-xs text-paper-muted">{nomination.credit}</span> : null}
      </div>
    </div>
  );
}
