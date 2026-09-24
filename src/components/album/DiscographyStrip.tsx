import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AppImage } from "@/components/ui/AppImage";
import type { DiscographyStrip as DiscographyStripData } from "@/services/catalog/album-neighbors";

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
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="discography-heading" className="font-display text-lg text-paper">
          {t("heading", { artist: artistName })}
        </h2>
        <div className="flex gap-4 font-data text-sm">
          {previous && (
            <Link href={`/album/${previous.id}`} className="text-amber hover:underline">
              ◀ {t("previous")}: {previous.title}
            </Link>
          )}
          {next && (
            <Link href={`/album/${next.id}`} className="text-amber hover:underline">
              {t("next")}: {next.title} ▶
            </Link>
          )}
        </div>
      </div>
      <ol className="flex gap-3 overflow-x-auto pb-2">
        {strip.items.map((item, index) => {
          const current = index === strip.currentIndex;
          const body = (
            <>
              <span
                className={`relative block aspect-square w-20 overflow-hidden rounded border bg-ink-surface ${
                  current ? "border-amber" : "border-ink-border"
                }`}
              >
                {item.coverThumbUrl && (
                  <AppImage src={item.coverThumbUrl} alt="" fill sizes="80px" className="object-cover" />
                )}
              </span>
              <span className="line-clamp-2 w-20 font-body text-xs text-paper">{item.title}</span>
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
                <Link href={`/album/${item.id}`} className="flex flex-col gap-1 hover:opacity-80">
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
