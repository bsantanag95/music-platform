import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { genreHref } from "@/lib/catalog-links";
import { GENRE_TREE_VISIBLE_CHILDREN } from "@/services/genres/constants";
import { genreDisplayName, genreLocaleOf, type GenreLocale } from "@/services/genres/names";
import type { RelatedGenre, TreeGenre } from "@/services/genres/page";

// Lugar del género en la taxonomía (openspec: redesign-genre-page, capability `genre-page-overview`):
// padres → género actual → subgéneros directos con su cantidad de álbumes, más géneros cercanos. Los
// subgéneros llegan ordenados por tamaño; los que no tienen música van atenuados al final y, si
// ninguno la tiene, la fila entera se omite. Pasados 12, el resto queda tras un `<details>` sin JS.

interface GenreTreeProps {
  name: string;
  parents: RelatedGenre[];
  subgenres: TreeGenre[];
  related: RelatedGenre[];
}

const LINK =
  "font-data text-sm text-paper-muted underline-offset-2 transition-colors hover:text-paper hover:underline";

function ChildItem({ genre, locale }: { genre: TreeGenre; locale: GenreLocale }) {
  const t = useTranslations("catalog.genres.page.tree");
  const empty = genre.albumCount === 0;
  return (
    <li className={empty ? "opacity-60" : undefined}>
      <Link href={genreHref(genre.slug)} className={`${LINK} flex items-baseline justify-between gap-3`}>
        <span>{genreDisplayName(genre, locale)}</span>
        <span className="shrink-0 text-xs">{empty ? t("noChildMusic") : t("childAlbums", { count: genre.albumCount })}</span>
      </Link>
    </li>
  );
}

function RelatedList({ label, genres, locale }: { label: string; genres: RelatedGenre[]; locale: GenreLocale }) {
  if (genres.length === 0) return null;
  return (
    <div className="flex flex-col gap-1">
      <h3 className="font-data text-xs uppercase tracking-wide text-paper-muted">{label}</h3>
      <ul className="flex flex-wrap gap-x-3 gap-y-1">
        {genres.map((g) => (
          <li key={g.slug}>
            <Link href={genreHref(g.slug)} className={LINK}>
              {genreDisplayName(g, locale)}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function GenreTree({ name, parents, subgenres, related }: GenreTreeProps) {
  const t = useTranslations("catalog.genres.page.tree");
  const locale = genreLocaleOf(useLocale());
  const hasChildMusic = subgenres.some((c) => c.albumCount > 0);
  const visible = subgenres.slice(0, GENRE_TREE_VISIBLE_CHILDREN);
  const rest = subgenres.slice(GENRE_TREE_VISIBLE_CHILDREN);

  if (parents.length === 0 && !hasChildMusic && related.length === 0) return null;

  return (
    <section aria-labelledby="genre-tree-heading" className="flex flex-col gap-3 rounded-lg border border-ink-border bg-ink-surface p-4">
      <h2 id="genre-tree-heading" className="font-display text-lg text-paper">
        {t("heading")}
      </h2>
      <RelatedList label={t("parentsLabel")} genres={parents} locale={locale} />
      <p className="font-display text-base text-paper" aria-label={t("current")}>
        {name}
      </p>
      {hasChildMusic && (
        <div className="flex flex-col gap-1">
          <h3 className="font-data text-xs uppercase tracking-wide text-paper-muted">{t("childrenLabel")}</h3>
          <ul className="flex flex-col gap-1">
            {visible.map((g) => (
              <ChildItem key={g.slug} genre={g} locale={locale} />
            ))}
          </ul>
          {rest.length > 0 && (
            <details className="group">
              <summary className="cursor-pointer font-data text-sm text-amber underline-offset-2 hover:underline">
                {t("moreChildren", { count: rest.length })}
              </summary>
              <ul className="mt-1 flex flex-col gap-1">
                {rest.map((g) => (
                  <ChildItem key={g.slug} genre={g} locale={locale} />
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
      <RelatedList label={t("relatedLabel")} genres={related} locale={locale} />
    </section>
  );
}
