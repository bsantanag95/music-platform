import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AlbumCard } from "@/components/catalog/AlbumCard";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { EmptyState } from "@/components/ui/EmptyState";
import type { AlbumPage } from "@/services/discovery/discovery";
import { exploreListFiltered, exploreListHref, type ExploreListParams } from "@/services/discovery/explore-params";
import type { ReleaseGroupCategory } from "@/lib/api/schemas";
import { CoverMosaic } from "./CoverMosaic";
import { ExploreFilterBar } from "./ExploreFilterBar";
import { FacetRow, type Facet, type SliceLink } from "./FacetRow";

export type { SliceLink } from "./FacetRow";

export interface TopicLink {
  key: string;
  label: string;
  href: string;
}

interface FilteredAlbumListProps {
  heading: string;
  /** Nombre corto del corte para la miga de pan ("1990s", "Rock"). */
  crumb: string;
  /** Niveles intermedios de la miga de pan antes de `crumb` (la década y el año, cuando el corte es un género), cada uno con enlace. */
  parentCrumbs?: { label: string; href: string }[];
  result: AlbumPage;
  /** Base del listado, ya con el corte (`/explore?decada=1990`). */
  baseHref: string;
  params: ExploreListParams;
  categoryLabels: Record<ReleaseGroupCategory, string>;
  coverLabel: string;
  /** Hay sesión: el menú de acciones de cada disco pide sus marcas. */
  authenticated?: boolean;
  /**
   * Cortes hermanos (las otras décadas o familias), para saltar sin volver a la portada. Con `collapsed` van en un
   * desplegable cerrado (veinte chips de familia empujaban el primer disco bajo el pliegue).
   */
  siblings?: { label: string; links: SliceLink[]; collapsed?: boolean };
  /**
   * Filas de filtros rotuladas del corte (openspec: redesign-decade-view): en la vista de década, "Año" y "Género", con chips que
   * filtran esta misma lista. Van encima de los temas. Una fila sin chips no se pinta.
   */
  facets?: Facet[];
  /** Carátulas del corte para el mosaico decorativo de la cabecera (desde `sm`); vacío = sin mosaico. */
  headerCovers?: string[];
  /** Tipos con discos en el corte: los demás chips de tipo salen deshabilitados. */
  availableCategories?: ReleaseGroupCategory[];
  /** Destino de "Quitar filtros" en el estado vacío cuando el corte tiene refinamientos propios (un género elegido). */
  clearHref?: string;
  /**
   * Temas del corte (los géneros de una familia), cada uno con su página: la forma de seguir navegando hacia dentro. Sin
   * cifras. No se pinta sin enlaces.
   */
  topics?: { label: string; links: TopicLink[] };
  /** Enlace relacionado bajo el título (la página completa del género). */
  related?: { href: string; label: string };
  /** Fecha de lanzamiento ya formateada por id de álbum; reemplaza al año en la tarjeta. */
  dateLabels?: Record<string, string>;
  /** Artista principal por id de álbum (línea bajo el título de cada tarjeta). */
  artistNames?: Record<string, string>;
  /** Etiqueta sobre la carátula por id de álbum (la cuenta regresiva de los próximos lanzamientos). */
  stats?: Record<string, string>;
  /** Sin selector de orden (el listado tiene un orden fijo, p. ej. cronológico). */
  hideSort?: boolean;
}

/** Los cortes hermanos como chips; en móvil, una fila que se desplaza. */
function SliceNav({ siblings, className = "" }: { siblings: { label: string; links: SliceLink[] }; className?: string }) {
  return (
    <nav
      aria-label={siblings.label}
      className={`themed-scrollbar -mx-4 w-[calc(100%+2rem)] overflow-x-auto px-4 pb-1 md:mx-0 md:w-full md:overflow-visible md:px-0 ${className}`}
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
  );
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
  heading,
  crumb,
  parentCrumbs,
  result,
  baseHref,
  params,
  categoryLabels,
  coverLabel,
  authenticated = false,
  siblings,
  facets,
  headerCovers,
  availableCategories,
  clearHref,
  topics,
  related,
  dateLabels,
  artistNames,
  stats,
  hideSort = false,
}: FilteredAlbumListProps) {
  const t = useTranslations("catalog.explore");
  const tCommon = useTranslations("common");
  const { albums, page, hasNext } = result;
  const filtered = clearHref !== undefined || (hideSort ? params.category !== undefined : exploreListFiltered(params));

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
          ...(parentCrumbs ?? []),
          { label: crumb },
        ]}
      />

      <header className="flex w-full items-start justify-between gap-6">
        <div className="flex min-w-0 flex-col gap-1.5">
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
        </div>
        {/* El eco de la tarjeta de la portada: decorativo y solo en pantallas anchas, para no empujar el contenido en móvil. */}
        {headerCovers && headerCovers.length > 0 ? (
          <CoverMosaic covers={headerCovers} className="hidden size-24 shrink-0 overflow-hidden rounded-md border border-ink-border sm:grid" />
        ) : null}
      </header>

      {facets && facets.some((facet) => facet.links.length > 0) ? (
        <div className="flex w-full flex-col gap-2.5">
          {facets.map((facet) => (
            <FacetRow key={facet.label} facet={facet} />
          ))}
        </div>
      ) : null}

      {topics && topics.links.length > 0 ? (
        <nav aria-label={topics.label} className="w-full">
          <ul className="flex flex-wrap gap-1.5">
            {topics.links.map((link) => (
              <li key={link.key}>
                <Link
                  href={link.href}
                  className="inline-flex rounded-full border border-ink-border px-3 py-1 font-data text-xs text-paper-muted transition-colors hover:border-amber hover:text-paper focus-visible:border-amber"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      {siblings && siblings.links.length > 1 ? (
        siblings.collapsed ? (
          <details className="group w-full">
            <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 font-data text-sm text-paper-muted transition-colors hover:text-paper focus-visible:text-paper [&::-webkit-details-marker]:hidden">
              {siblings.label}
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
                className="size-3.5 transition-transform group-open:rotate-180"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </summary>
            <SliceNav siblings={siblings} className="pt-3" />
          </details>
        ) : (
          <SliceNav siblings={siblings} />
        )
      ) : null}

      <ExploreFilterBar
        baseHref={baseHref}
        params={params}
        categoryLabels={categoryLabels}
        hideSort={hideSort}
        availableCategories={availableCategories}
      />

      {albums.length === 0 ? (
        <EmptyState
          title={heading}
          description={t("emptyFiltered")}
          action={
            filtered ? (
              <Link href={clearHref ?? baseHref} className={pageLink}>
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
                releaseDateLabel={dateLabels?.[album.id]}
                artistName={artistNames?.[album.id]}
                stat={stats?.[album.id]}
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
