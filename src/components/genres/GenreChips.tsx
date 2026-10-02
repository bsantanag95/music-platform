import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { genreHref } from "@/lib/catalog-links";
import { genreDisplayName, genreLocaleOf } from "@/services/genres/names";
import type { DisplayGenre } from "@/services/genres/display";

// Chips de género de las cabeceras de artista, álbum y canción (openspec: show-genres,
// capability `genre-display`). Muestra hasta `max` géneros enlazados a su página y un "+N" nativo
// (`<details>`, sin JavaScript) para el resto; los heredados van atenuados con texto accesible; los
// descriptores van en una fila aparte, sin enlace. No renderiza nada sin géneros ni descriptores.

export const GENRE_CHIPS_MAX = 5;

const CHIP = "inline-flex rounded-full border px-2.5 py-0.5 font-data text-xs transition-colors";

interface GenreChipsProps {
  genres: DisplayGenre[];
  /** Claves de descriptor (`instrumental`, `christmas`, `orchestral`, `soundtrack`). */
  descriptors?: string[];
  max?: number;
  /** Artista del que se heredan los géneros (álbum); sin él se usa "Del álbum" (canción). */
  inheritedFrom?: string | null;
}

function Chip({ genre, inheritedLabel }: { genre: DisplayGenre; inheritedLabel: string | null }) {
  const locale = genreLocaleOf(useLocale());
  const name = genreDisplayName(genre, locale);
  return (
    <Link
      href={genreHref(genre.slug)}
      title={inheritedLabel ?? undefined}
      data-inherited={genre.inherited ? "true" : undefined}
      className={`${CHIP} ${
        genre.inherited
          ? "border-ink-border/60 text-paper-muted/70 hover:border-amber hover:text-paper"
          : "border-ink-border text-paper-muted hover:border-amber hover:text-paper"
      }`}
    >
      {name}
      {inheritedLabel && <span className="sr-only"> ({inheritedLabel})</span>}
    </Link>
  );
}

export function GenreChips({ genres, descriptors = [], max = GENRE_CHIPS_MAX, inheritedFrom = null }: GenreChipsProps) {
  const t = useTranslations("catalog.genres");
  if (genres.length === 0 && descriptors.length === 0) return null;

  const inheritedLabel = inheritedFrom ? t("inheritedFromArtist", { artist: inheritedFrom }) : t("inheritedFromAlbum");
  const labelOf = (g: DisplayGenre) => (g.inherited ? inheritedLabel : null);
  const visible = genres.slice(0, max);
  const rest = genres.slice(max);

  return (
    <div className="flex flex-col gap-1.5">
      {genres.length > 0 && (
        <ul aria-label={t("chipsLabel")} className="flex flex-wrap gap-1.5">
          {visible.map((g) => (
            <li key={g.slug}>
              <Chip genre={g} inheritedLabel={labelOf(g)} />
            </li>
          ))}
          {rest.length > 0 && (
            <li>
              <details className="group">
                <summary
                  className={`${CHIP} cursor-pointer list-none border-ink-border text-paper-muted hover:border-amber [&::-webkit-details-marker]:hidden`}
                >
                  {t("moreCount", { count: rest.length })}
                </summary>
                <ul className="mt-1.5 flex flex-wrap gap-1.5">
                  {rest.map((g) => (
                    <li key={g.slug}>
                      <Chip genre={g} inheritedLabel={labelOf(g)} />
                    </li>
                  ))}
                </ul>
              </details>
            </li>
          )}
        </ul>
      )}
      {descriptors.length > 0 && (
        <ul aria-label={t("descriptorsLabel")} className="flex flex-wrap gap-1.5">
          {descriptors.map((key) => (
            <li key={key} className={`${CHIP} border-dashed border-ink-border text-paper-muted/80`}>
              {t(`descriptors.${key}`)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
