import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AlbumCard } from "@/components/catalog/AlbumCard";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { EmptyState } from "@/components/ui/EmptyState";
import type { AlbumPage } from "@/services/discovery/discovery";
import { exploreListFiltered, exploreListHref, type ExploreListParams } from "@/services/discovery/explore-params";
import type { ReleaseGroupCategory } from "@/lib/api/schemas";
import { ExploreFilterBar } from "./ExploreFilterBar";

export interface SliceLink {
  key: string;
  label: string;
  href: string;
  current: boolean;
}

interface FilteredAlbumListProps {
  /** Qué tipo de corte es ("Década", "Familia de géneros", "Género"). */
  kicker: string;
  heading: string;
  /** Nombre corto del corte para la miga de pan ("1990s", "Rock"). */
  crumb: string;
  result: AlbumPage;
  /** Base del listado, ya con el corte (`/explore?decada=1990`). */
  baseHref: string;
  params: ExploreListParams;
  categoryLabels: Record<ReleaseGroupCategory, string>;
  coverLabel: string;
  /** Hay sesión: el menú de acciones de cada disco pide sus marcas. */
  authenticated?: boolean;
  /** Cortes hermanos (las otras décadas o familias), para saltar sin volver a la portada. */
  siblings?: { label: string; links: SliceLink[] };
  /** Enlace relacionado bajo el título (la página completa del género). */
  related?: { href: string; label: string };
}

function PageArrow({ direction }: { direction: "prev" | "next" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-3.5"
    >
      <path d={direction === "prev" ? "M19 12H5M11 6l-6 6 6 6" : "M5 12h14M13 6l6 6-6 6"} />
    </svg>
  );
}

/**
 * Listado filtrado de `/explore` (década, familia o género): cabecera con el tipo de corte,
 * cortes hermanos para saltar entre décadas o familias, tipo y orden en la URL, grilla de
 * álbumes y paginación en servidor (`?page=`, anterior / siguiente). Sin endpoint propio.
 */
export function FilteredAlbumList({
  kicker,
  heading,
  crumb,
  result,
  baseHref,
  params,
  categoryLabels,
  coverLabel,
  authenticated = false,
  siblings,
  related,
}: FilteredAlbumListProps) {
  const t = useTranslations("catalog.explore");
  const tCommon = useTranslations("common");
  const { albums, page, hasNext } = result;
  const filtered = exploreListFiltered(params);

  const pageLink =
    "inline-flex items-center gap-1.5 rounded-md border border-ink-border px-3 py-1.5 font-data text-sm text-paper transition-colors hover:border-amber";
  const pageDisabled =
    "inline-flex items-center gap-1.5 rounded-md border border-ink-border/50 px-3 py-1.5 font-data text-sm text-paper-muted/50";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col items-start gap-6 px-4 py-12">
      <Breadcrumbs
        items={[
          { label: tCommon("home"), href: "/" },
          { label: t("heading"), href: "/explore" },
          { label: crumb },
        ]}
      />

      <header className="flex w-full flex-col gap-1.5">
        <p className="font-data text-xs uppercase tracking-wider text-paper-muted">{kicker}</p>
        <h1 className="font-display text-3xl text-paper">{heading}</h1>
        {related ? (
          <Link
            href={related.href}
            className="group inline-flex w-fit items-center gap-1 font-data text-sm text-paper-muted transition-colors hover:text-amber"
          >
            {related.label}
            <span aria-hidden="true" className="transition-transform duration-150 group-hover:translate-x-0.5">
              →
            </span>
          </Link>
        ) : null}
      </header>

      {siblings && siblings.links.length > 1 ? (
        <nav
          aria-label={siblings.label}
          className="themed-scrollbar -mx-4 w-[calc(100%+2rem)] overflow-x-auto px-4 pb-1 md:mx-0 md:w-full md:overflow-visible md:px-0"
        >
          <ul className="flex w-max gap-1.5 md:w-auto md:flex-wrap">
            {siblings.links.map((link) => (
              <li key={link.key}>
                <Link
                  href={link.href}
                  aria-current={link.current ? "page" : undefined}
                  className={`inline-flex rounded-md px-2.5 py-1 font-data text-xs transition-colors ${
                    link.current
                      ? "bg-ink-surface text-paper ring-1 ring-inset ring-amber"
                      : "text-paper-muted hover:bg-ink-surface hover:text-paper"
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      <ExploreFilterBar baseHref={baseHref} params={params} categoryLabels={categoryLabels} />

      {albums.length === 0 ? (
        <EmptyState
          title={heading}
          description={t("emptyFiltered")}
          action={
            filtered ? (
              <Link href={baseHref} className={pageLink}>
                {t("clearFilters")}
              </Link>
            ) : (
              <Link href="/explore" className={pageLink}>
                {t("backToExplore")}
              </Link>
            )
          }
        />
      ) : (
        <ul className="grid w-full grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {albums.map((album) => (
            <li key={album.id}>
              <AlbumCard
                releaseGroup={album}
                categoryLabel={categoryLabels[album.category]}
                coverLabel={coverLabel}
                authenticated={authenticated}
              />
            </li>
          ))}
        </ul>
      )}

      {(page > 1 || hasNext) && (
        <nav aria-label={t("paginationLabel")} className="flex w-full items-center justify-center gap-3 pt-2">
          {page > 1 ? (
            <Link href={exploreListHref(baseHref, params, { page: page - 1 })} rel="prev" className={pageLink}>
              <PageArrow direction="prev" />
              {t("prevPage")}
            </Link>
          ) : (
            <span aria-disabled="true" className={pageDisabled}>
              <PageArrow direction="prev" />
              {t("prevPage")}
            </span>
          )}
          <span className="font-data text-xs tabular-nums text-paper-muted">{t("pageIndicator", { page })}</span>
          {hasNext ? (
            <Link href={exploreListHref(baseHref, params, { page: page + 1 })} rel="next" className={pageLink}>
              {t("nextPage")}
              <PageArrow direction="next" />
            </Link>
          ) : (
            <span aria-disabled="true" className={pageDisabled}>
              {t("nextPage")}
              <PageArrow direction="next" />
            </span>
          )}
        </nav>
      )}
    </main>
  );
}
