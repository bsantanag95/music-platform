import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { DiscographyScroller } from "./DiscographyScroller";
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
    <section
      aria-labelledby="discography-heading"
      className="flex w-full flex-col gap-3 border-t border-ink-border pt-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h2 id="discography-heading" className="font-display text-lg text-paper">
          {t("heading", { artist: artistName })}
        </h2>
        {(previous || next) && (
          <nav aria-label={t("neighbors")} className="flex min-w-0 flex-wrap gap-x-5 gap-y-1 text-sm">
            {previous && <NeighborLink item={previous} label={t("previous")} side="previous" />}
            {next && <NeighborLink item={next} label={t("next")} side="next" />}
          </nav>
        )}
      </div>
      <DiscographyScroller>
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
                <CoverThumb cover={item.coverThumbUrl} label="" className="size-full" />
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
            <li key={item.id} data-current={current || undefined} className="shrink-0">
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
      </DiscographyScroller>
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
  const chevron = (
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
  );

  // Solo el título se trunca: la etiqueta y el año quedan siempre completos.
  // En reposo, neutro (regla de rareza del ámbar, DESIGN.md); el ámbar llega con el hover.
  return (
    <Link
      href={`/album/${item.id}`}
      rel={side === "previous" ? "prev" : "next"}
      className="group flex min-w-0 max-w-80 items-center gap-1.5 whitespace-nowrap text-paper-muted transition-colors hover:text-paper"
    >
      {side === "previous" && chevron}
      <span className="shrink-0">{label} ·</span>
      <span className="min-w-0 truncate text-paper transition-colors group-hover:text-amber">{item.title}</span>
      {item.firstReleaseYear !== null && <span className="shrink-0 font-data">({item.firstReleaseYear})</span>}
      {side === "next" && chevron}
    </Link>
  );
}
