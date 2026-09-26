import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AppImage } from "@/components/ui/AppImage";
import type {
  DiscographyItem,
  DiscographyStrip as DiscographyStripData,
} from "@/services/catalog/album-neighbors";

// Franja de discografía al pie de la página de álbum (openspec: redesign-album-page, D15):
// álbumes del artista principal del mismo tipo, en orden cronológico, con el actual
// resaltado y accesos directos al anterior y al siguiente.

interface DiscographyStripProps {
  artistName: string;
  strip: DiscographyStripData;
}

export function DiscographyStrip({ artistName, strip }: DiscographyStripProps) {
  const t = useTranslations("catalog.album.discography");
  const { previous, next } = strip;

  return (
    <section aria-labelledby="discography-heading" className="flex w-full flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h2 id="discography-heading" className="font-display text-lg text-paper">
          {t("heading", { artist: artistName })}
        </h2>
        {(previous || next) && (
          <nav aria-label={t("neighbors")} className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
            {previous && <NeighborLink item={previous} label={t("previous")} side="previous" />}
            {next && <NeighborLink item={next} label={t("next")} side="next" />}
          </nav>
        )}
      </div>
      {/* El padding deja lugar al anillo del álbum actual: `overflow-x-auto` también recorta en vertical. */}
      <ol className="-mx-1 flex gap-3 overflow-x-auto px-1 pt-1 pb-2">
        {strip.items.map((item, index) => {
          const current = index === strip.currentIndex;
          const body = (
            <>
              <span
                className={`relative block aspect-square w-20 overflow-hidden rounded border bg-ink-surface ${
                  current
                    ? "border-amber ring-2 ring-amber ring-offset-2 ring-offset-ink"
                    : "border-ink-border opacity-75 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                }`}
              >
                {item.coverThumbUrl && (
                  <AppImage src={item.coverThumbUrl} alt="" fill sizes="80px" className="object-cover" />
                )}
              </span>
              {/* Dos líneas reservadas siempre, para que los años queden alineados entre álbumes. */}
              <span
                className={`line-clamp-2 min-h-[2lh] w-20 font-body text-xs ${
                  current ? "font-semibold text-amber" : "text-paper group-hover:underline"
                }`}
              >
                {item.title}
              </span>
              {item.firstReleaseYear !== null && (
                <span className="font-data text-xs text-paper-muted">{item.firstReleaseYear}</span>
              )}
            </>
          );
          return (
            <li key={item.id} className="shrink-0">
              {current ? (
                <span aria-current="page" className="flex flex-col gap-1">
                  <span className="sr-only">{t("current")}: </span>
                  {body}
                </span>
              ) : (
                <Link href={`/album/${item.id}`} className="group flex flex-col gap-1">
                  {body}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function NeighborLink({
  item,
  label,
  side,
}: {
  item: DiscographyItem;
  label: string;
  side: "previous" | "next";
}) {
  return (
    <Link
      href={`/album/${item.id}`}
      rel={side === "previous" ? "prev" : "next"}
      className={`group flex max-w-72 items-center gap-1.5 text-paper-muted transition-colors hover:text-paper ${
        side === "next" ? "flex-row-reverse" : ""
      }`}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="shrink-0"
      >
        <polyline points={side === "previous" ? "15 18 9 12 15 6" : "9 18 15 12 9 6"} />
      </svg>
      <span className="min-w-0 truncate">
        {label} · <span className="text-paper group-hover:underline">{item.title}</span>
        {item.firstReleaseYear !== null && <span className="font-data"> ({item.firstReleaseYear})</span>}
      </span>
    </Link>
  );
}
