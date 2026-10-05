import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { GENRE_TABS, genrePageHref, type GenrePageParams } from "@/services/genres/page-params";

// Pestañas de la página de género (openspec: redesign-genre-page, capability `genre-pages`): enlaces
// de servidor a `?tab=`, sin estado en el cliente. La activa se marca con `aria-current="page"`.

interface GenreTabsProps {
  slug: string;
  params: GenrePageParams;
}

export function GenreTabs({ slug, params }: GenreTabsProps) {
  const t = useTranslations("catalog.genres.page");
  return (
    <nav aria-label={t("tabsLabel")} className="w-full border-b border-ink-border">
      <ul className="flex flex-wrap gap-x-5 gap-y-1">
        {GENRE_TABS.map((tab) => {
          const active = params.tab === tab;
          return (
            <li key={tab}>
              <Link
                href={genrePageHref(slug, params, { tab, page: 1 })}
                aria-current={active ? "page" : undefined}
                className={`inline-block border-b-2 py-2 font-data text-sm transition-colors ${
                  active ? "border-amber text-paper" : "border-transparent text-paper-muted hover:text-paper"
                }`}
              >
                {t(`tabs.${tab}`)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
