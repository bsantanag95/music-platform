import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { genrePageHref, type GenrePageParams } from "@/services/genres/page-params";

// Anterior / siguiente de las pestañas de la página de género (paginación en servidor por `?page=`).

interface GenrePaginationProps {
  slug: string;
  params: GenrePageParams;
  page: number;
  hasNext: boolean;
}

export function GenrePagination({ slug, params, page, hasNext }: GenrePaginationProps) {
  const t = useTranslations("catalog.explore");
  const tPage = useTranslations("catalog.genres.page.pagination");
  if (page <= 1 && !hasNext) return null;
  return (
    <nav aria-label={tPage("label")} className="flex gap-4 font-data text-sm">
      {page > 1 ? (
        <Link href={genrePageHref(slug, params, { page: page - 1 })} rel="prev" className="text-amber underline">
          {t("prevPage")}
        </Link>
      ) : (
        <span className="text-paper-muted opacity-50">{t("prevPage")}</span>
      )}
      {hasNext ? (
        <Link href={genrePageHref(slug, params, { page: page + 1 })} rel="next" className="text-amber underline">
          {t("nextPage")}
        </Link>
      ) : (
        <span className="text-paper-muted opacity-50">{t("nextPage")}</span>
      )}
    </nav>
  );
}
