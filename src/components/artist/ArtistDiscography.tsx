"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { albumHref, artistHref } from "@/lib/catalog-links";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { LazyCoverImage } from "@/components/catalog/LazyCoverImage";
import { formatStars } from "@/components/album/album-format";
import { BookmarkIcon, HeartIcon } from "@/components/album/AlbumRelationPanel";
import type { ArtistDiscographyItem, DiscographyMarks } from "@/services/catalog/artist-discography-view";
import type { DiscographySection } from "@/services/catalog/discography-sections";
import { kindKey } from "./artist-format";
import { DISCOGRAPHY_SEARCH_MIN_DISCS, normalizeForSearch, searchDiscography } from "./discography-search";
import { SearchIcon } from "@/components/home/QuickLinkIcons";
import { AlbumQuickActions, type DiscMarks } from "@/components/catalog/AlbumQuickActions";

// Discografía de la página de artista (openspec: redesign-artist-page, capability
// `artist-discography-view`): selector de secciones con su cantidad (la sección vive en la
// URL, `?section=`), vistas grilla y tabla con la elección recordada por sección en el
// navegador, "Mostrar más" de a 48 en la grilla, "Mejor valorado" y las marcas del usuario. Cada
// disco tiene su menú "…" de acciones (openspec: add-discography-quick-actions); las marcas viven
// en estado local y el menú las actualiza. Con 20 discos o más, un buscador filtra todas las
// secciones (openspec: add-discography-search).

export const GRID_PAGE_SIZE = 48;

type View = "grid" | "table";

/** Vista por defecto: grilla en Principal (se reconoce por la carátula), tabla en el resto. */
export function defaultView(section: DiscographySection): View {
  return section === "main" ? "grid" : "table";
}

const STORAGE_PREFIX = "artist-discography-view:";

function readStoredView(section: DiscographySection): View | null {
  try {
    const value = window.localStorage.getItem(STORAGE_PREFIX + section);
    return value === "grid" || value === "table" ? value : null;
  } catch {
    return null;
  }
}

function storeView(section: DiscographySection, view: View) {
  try {
    window.localStorage.setItem(STORAGE_PREFIX + section, view);
  } catch {
    // Sin almacenamiento (modo privado, bloqueado): la elección dura hasta recargar.
  }
}

/**
 * Vista de una sección: la por defecto en el primer render (igual en servidor y cliente) y
 * la guardada, si hay, después de hidratar (design D4).
 */
function useSectionView(section: DiscographySection): [View, (view: View) => void] {
  const [view, setView] = useState<View>(defaultView(section));
  useEffect(() => {
    setView(readStoredView(section) ?? defaultView(section));
  }, [section]);
  return [
    view,
    (next) => {
      setView(next);
      storeView(section, next);
    },
  ];
}

interface ArtistDiscographyProps {
  artistId: string;
  /** Nombre del artista, para las direcciones con slug; opcional para los tests. */
  artistName?: string;
  sections: { key: DiscographySection; items: ArtistDiscographyItem[] }[];
  activeSection: DiscographySection;
  bestRatedId: string | null;
  /** Marcas del usuario en sesión; `null` para visitantes anónimos. */
  marks: DiscographyMarks | null;
  /** `false` mientras la discografía se sigue ingiriendo en segundo plano (primera visita). */
  discographyComplete?: boolean;
}

const NO_MARKS: DiscMarks = {
  listened: false,
  stars: null,
  detailedScore: null,
  favorite: false,
  pending: false,
  lists: [],
};

/** Marcas por disco a partir de las precargadas en lote. */
function marksByDisc(marks: DiscographyMarks): Record<string, DiscMarks> {
  const ids = new Set([
    ...marks.listened,
    ...Object.keys(marks.stars),
    ...marks.favorites,
    ...marks.pending,
    ...Object.keys(marks.lists),
  ]);
  const listened = new Set(marks.listened);
  const favorites = new Set(marks.favorites);
  const pending = new Set(marks.pending);
  return Object.fromEntries(
    [...ids].map((id) => [
      id,
      {
        listened: listened.has(id),
        stars: marks.stars[id] ?? null,
        detailedScore: marks.detailedScores[id] ?? null,
        favorite: favorites.has(id),
        pending: pending.has(id),
        lists: marks.lists[id] ?? [],
      },
    ]),
  );
}

/** Marcas y menú compartidos por la grilla y la tabla: un solo menú abierto a la vez. */
interface DiscActions {
  marksOf: (id: string) => DiscMarks | null;
  openId: string | null;
  setOpenId: (id: string | null) => void;
  updateMarks: (id: string, update: (current: DiscMarks) => DiscMarks) => void;
}

function sectionHref(artistName: string, artistId: string, section: DiscographySection, defaultSection: DiscographySection) {
  const base = artistHref(artistName, artistId);
  return section === defaultSection ? base : `${base}?section=${section}`;
}

export function ArtistDiscography({
  artistId,
  artistName = "",
  sections,
  activeSection,
  bestRatedId,
  marks,
  discographyComplete = true,
}: ArtistDiscographyProps) {
  const t = useTranslations("catalog.artist.discography");
  const [view, setView] = useSectionView(activeSection);
  const active = sections.find((s) => s.key === activeSection);
  const defaultSection = sections[0]?.key ?? "main";
  const [discMarks, setDiscMarks] = useState<Record<string, DiscMarks>>(() => (marks ? marksByDisc(marks) : {}));
  const [openId, setOpenId] = useState<string | null>(null);
  // Búsqueda temporal (openspec: add-discography-search, design D3): no va a la URL ni se recuerda.
  const [query, setQuery] = useState("");
  const [searchExpanded, setSearchExpanded] = useState(false);
  const searchInput = useRef<HTMLInputElement>(null);
  const totalDiscs = sections.reduce((sum, section) => sum + section.items.length, 0);
  const searchable = totalDiscs >= DISCOGRAPHY_SEARCH_MIN_DISCS;
  const searching = searchable && normalizeForSearch(query) !== "";
  const result = useMemo(() => (searching ? searchDiscography(sections, query) : null), [searching, sections, query]);

  useEffect(() => {
    if (searchExpanded) searchInput.current?.focus();
  }, [searchExpanded]);

  if (!active) {
    return <p className="font-body text-sm text-paper-muted">{t("empty")}</p>;
  }

  const actions: DiscActions = {
    marksOf: (id) => (marks ? (discMarks[id] ?? NO_MARKS) : null),
    openId,
    setOpenId,
    updateMarks: (id, update) => setDiscMarks((current) => ({ ...current, [id]: update(current[id] ?? NO_MARKS) })),
  };
  const clearSearch = () => {
    setQuery("");
    searchInput.current?.focus();
  };
  const pillClass = (current: boolean) =>
    `inline-flex items-baseline gap-1.5 rounded border px-2.5 py-1 font-body text-sm transition-colors ${
      current ? "border-amber text-paper" : "border-ink-border text-paper-muted hover:text-paper"
    }`;

  return (
    <section aria-labelledby="discography-heading" data-menu-bounds className="flex flex-col gap-4">
      <h2 id="discography-heading" className="sr-only">
        {t("heading")}
      </h2>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label={t("sectionsLabel")}>
          <ul className="flex flex-wrap gap-1.5">
            {sections.map((section) => {
              const label = t(`sections.${section.key}`);
              if (result) {
                // Durante la búsqueda cada pastilla lleva a su grupo de resultados (design D5).
                const count = result.counts[section.key] ?? 0;
                return (
                  <li key={section.key}>
                    <button
                      type="button"
                      disabled={count === 0}
                      onClick={() =>
                        document.getElementById(groupAnchor(section.key))?.scrollIntoView({ behavior: "smooth" })
                      }
                      className={`${pillClass(false)} disabled:cursor-default disabled:opacity-40 disabled:hover:text-paper-muted`}
                    >
                      {label}
                      <span className="font-data text-xs text-paper-muted">{count}</span>
                    </button>
                  </li>
                );
              }
              const current = section.key === activeSection;
              return (
                <li key={section.key}>
                  <Link
                    href={sectionHref(artistName, artistId, section.key, defaultSection)}
                    scroll={false}
                    aria-current={current ? "page" : undefined}
                    className={pillClass(current)}
                  >
                    {label}
                    <span className="font-data text-xs text-paper-muted">{section.items.length}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        {/* En móvil el buscador es un botón que despliega el campo en su propia fila (design D7). */}
        <div className={`flex items-center gap-2 ${searchExpanded ? "basis-full sm:basis-auto" : ""}`}>
          {searchable && !searchExpanded && (
            <button
              type="button"
              onClick={() => setSearchExpanded(true)}
              aria-label={t("search.open")}
              className="rounded border border-ink-border p-1.5 text-paper-muted transition-colors hover:text-paper sm:hidden"
            >
              <SearchIcon className="size-3.5" />
            </button>
          )}
          {searchable && (
            <div className={`${searchExpanded ? "flex" : "hidden"} relative flex-1 items-center sm:flex sm:flex-none`}>
              <SearchIcon className="pointer-events-none absolute left-2 size-3.5 text-paper-muted" />
              <input
                ref={searchInput}
                type="search"
                autoComplete="off"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== "Escape") return;
                  event.preventDefault();
                  if (query) setQuery("");
                  else setSearchExpanded(false);
                }}
                aria-label={t("search.label")}
                placeholder={t("search.placeholder")}
                className="w-full rounded border border-ink-border bg-transparent py-1 pl-7 pr-7 font-body text-sm text-paper placeholder:text-paper-muted focus:border-amber focus:outline-none sm:w-56 [&::-webkit-search-cancel-button]:hidden"
              />
              {query && (
                <button
                  type="button"
                  onClick={clearSearch}
                  aria-label={t("search.clear")}
                  className="absolute right-1.5 px-1 font-data text-sm text-paper-muted hover:text-paper"
                >
                  <span aria-hidden="true">×</span>
                </button>
              )}
            </div>
          )}
          {!result && (
            <div role="group" aria-label={t("viewLabel")} className="flex overflow-hidden rounded border border-ink-border">
              {(["grid", "table"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={view === option}
                  onClick={() => setView(option)}
                  className="px-2.5 py-1 font-data text-xs text-paper-muted transition-colors aria-pressed:bg-ink-surface aria-pressed:text-paper"
                >
                  {option === "grid" ? t("viewGrid") : t("viewTable")}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {searchable && (
        <p aria-live="polite" className={result ? "font-data text-xs text-paper-muted" : "sr-only"}>
          {result ? t("search.results", { count: result.total }) : ""}
        </p>
      )}

      {result ? (
        <div className="flex flex-col gap-3">
          {!discographyComplete && <p className="font-body text-xs text-paper-muted">{t("search.incomplete")}</p>}
          {result.total === 0 ? (
            <p className="font-body text-sm text-paper-muted">
              {t("search.empty", { query: query.trim() })}{" "}
              <Link
                href={`/search?type=album&q=${encodeURIComponent(query.trim())}`}
                className="text-amber hover:underline"
              >
                {t("search.searchCatalog")}
              </Link>
            </p>
          ) : (
            <DiscographyTable
              key="search"
              artistName={artistName}
              groups={result.groups.map((group) => ({
                key: group.key,
                heading: { id: groupAnchor(group.key), label: t(`sections.${group.key}`), count: group.items.length },
                items: group.items,
              }))}
              actions={actions}
            />
          )}
        </div>
      ) : view === "grid" ? (
        <DiscographyGrid
          key={activeSection}
          artistName={artistName}
          items={active.items}
          bestRatedId={activeSection === "main" ? bestRatedId : null}
          showEpBadge={activeSection === "main"}
          actions={actions}
        />
      ) : (
        // La clave de sección reinicia el orden al cambiar de sección.
        <DiscographyTable
          key={activeSection}
          artistName={artistName}
          groups={[{ key: activeSection, items: active.items }]}
          actions={actions}
        />
      )}
    </section>
  );
}

const groupAnchor = (section: DiscographySection) => `discography-group-${section}`;

function Cover({ item, className }: { item: ArtistDiscographyItem; className: string }) {
  const tArtist = useTranslations("catalog.artist");
  return item.coverResolved ? (
    <CoverThumb cover={item.coverThumbUrl} label="" className={className} />
  ) : (
    <LazyCoverImage releaseGroupId={item.id} coverLabel={tArtist("albumCoverLabel")} className={className} />
  );
}

/** Tus marcas sobre un disco: tu nota (o ✓ si solo lo escuchaste), favorito y Pendiente. */
function DiscMarksView({ marks }: { marks: DiscMarks }) {
  const t = useTranslations("catalog.artist.discography");
  const locale = useLocale();
  const stars = marks.stars !== null ? formatStars(marks.stars, locale) : null;
  const starsLabel = stars !== null
    ? marks.detailedScore !== null
      ? t("yourStarsScore", { stars, score: marks.detailedScore })
      : t("yourStars", { stars })
    : undefined;
  return (
    <span className="inline-flex items-center gap-1.5 font-data text-xs text-paper">
      {stars !== null ? (
        <span title={starsLabel}>
          <span aria-hidden="true">★ {stars}</span>
          <span className="sr-only">{starsLabel}</span>
        </span>
      ) : (
        marks.listened && (
          <span title={t("listened")}>
            <span aria-hidden="true">✓</span>
            <span className="sr-only">{t("listened")}</span>
          </span>
        )
      )}
      {marks.favorite && (
        <span title={t("favorite")} className="text-amber">
          <HeartIcon filled />
          <span className="sr-only">{t("favorite")}</span>
        </span>
      )}
      {marks.pending && (
        <span title={t("pendingMark")}>
          <BookmarkIcon filled />
          <span className="sr-only">{t("pendingMark")}</span>
        </span>
      )}
    </span>
  );
}

const hasMarks = (marks: DiscMarks | null): marks is DiscMarks =>
  marks !== null && (marks.listened || marks.stars !== null || marks.favorite || marks.pending);

function DiscographyGrid({
  artistName,
  items,
  bestRatedId,
  showEpBadge,
  actions,
}: {
  artistName: string;
  items: ArtistDiscographyItem[];
  bestRatedId: string | null;
  showEpBadge: boolean;
  actions: DiscActions;
}) {
  const t = useTranslations("catalog.artist.discography");
  const locale = useLocale();
  const [visible, setVisible] = useState(GRID_PAGE_SIZE);

  return (
    <div className="flex flex-col gap-4">
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
        {items.slice(0, visible).map((item) => {
          const best = item.id === bestRatedId;
          const marks = actions.marksOf(item.id);
          const open = actions.openId === item.id;
          return (
            <li key={item.id} className="group/card relative">
              <Link
                href={albumHref(item.primaryArtist?.name ?? (artistName || null), item.title, item.id)}
                className="group flex flex-col gap-1.5"
              >
                <span className="relative block">
                  <Cover item={item} className="aspect-square w-full" />
                  {(best || (showEpBadge && item.isEp)) && (
                    <span className="absolute left-1.5 top-1.5 flex flex-col items-start gap-1">
                      {best && (
                        <span className="rounded bg-ink/85 px-1.5 py-0.5 font-data text-xs text-amber">
                          ★ {t("bestRated")}
                        </span>
                      )}
                      {showEpBadge && item.isEp && (
                        <span className="rounded bg-ink/85 px-1.5 py-0.5 font-data text-xs text-paper">{t("ep")}</span>
                      )}
                    </span>
                  )}
                  {hasMarks(marks) && (
                    <span className="absolute bottom-1.5 right-1.5 rounded bg-ink/85 px-1.5 py-0.5">
                      <DiscMarksView marks={marks} />
                    </span>
                  )}
                </span>
                <span className="line-clamp-2 font-body text-sm text-paper group-hover:text-amber">{item.title}</span>
                <span className="font-data text-xs text-paper-muted">
                  {[
                    item.year,
                    best && item.community.average !== null ? `★ ${formatStars(item.community.average, locale)}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </Link>
              {/* Fuera del enlace (no se anidan controles): visible al pasar el mouse o con el
                  foco, siempre en pantallas táctiles y mientras su menú está abierto. */}
              <AlbumQuickActions
                item={item}
                marks={marks}
                open={open}
                onOpenChange={(next) => actions.setOpenId(next ? item.id : null)}
                onMarksChange={(update) => actions.updateMarks(item.id, update)}
                variant="cover"
                className={`!absolute right-1.5 top-1.5 ${
                  open
                    ? "opacity-100"
                    : "opacity-0 focus-within:opacity-100 group-hover/card:opacity-100 [@media(hover:none)]:opacity-100"
                }`}
              />
            </li>
          );
        })}
      </ul>
      {visible < items.length && (
        <button
          type="button"
          onClick={() => setVisible((current) => current + GRID_PAGE_SIZE)}
          className="self-center rounded border border-ink-border px-4 py-2 font-display text-sm text-paper transition-colors hover:border-amber"
        >
          {t("showMore")}
        </button>
      )}
    </div>
  );
}

/** Etiqueta de tipo: los secundarios si hay ("en vivo", "banda sonora"); si no, el primario. */
function useKindLabel() {
  const t = useTranslations("catalog.artist.discography.kinds");
  return (kinds: string[]) => {
    const [primary, ...secondary] = kinds;
    const shown = secondary.length > 0 ? secondary : primary ? [primary] : [];
    return shown
      .map((kind) => kindKey(kind))
      .map((key) => (t.has(key) ? t(key) : key))
      .join(", ");
  };
}

/** El tipo solo se muestra cuando algún tipo del disco no es "álbum" (EP, en vivo, remix…). */
function showsKind(kinds: string[]): boolean {
  return !(kinds.length === 1 && kindKey(kinds[0]!) === "album");
}

type SortKey = "year" | "title" | "average" | "you";
type SortDirection = "asc" | "desc";

/**
 * Sentido del primer uso de cada columna: el año de lo más viejo a lo más nuevo, el título de la A a
 * la Z y las notas, de la más alta.
 */
const NATURAL_DIRECTION: Record<SortKey, SortDirection> = { year: "asc", title: "asc", average: "desc", you: "desc" };

type SortableRow = { title: string; year: number | null };

/** Compara títulos según el idioma: acentos y ligaduras en su lugar y "Vol. 2" antes que "Vol. 10". */
export function titleCollator(locale: string): Intl.Collator {
  return new Intl.Collator(locale, { numeric: true, sensitivity: "base" });
}

/**
 * Orden de la tabla (openspec: extend-album-quick-actions, design D5; define-detailed-score, D10):
 * los discos sin valor en la columna van siempre al final, en cualquier sentido. Las columnas
 * numéricas desempatan por título; el título desempata por año, con los discos sin año al final.
 * `tiebreak` añade un segundo valor numérico (p. ej. el puntaje detallado propio en la columna
 * "Tú") que se compara dentro de los mismos valores primarios, en el mismo sentido y con los
 * ausentes al final, antes del título.
 */
export function sortDiscographyRows<T extends SortableRow>(
  rows: T[],
  value: (row: T) => number | string | null,
  direction: SortDirection,
  collator: Intl.Collator,
  tiebreak?: (row: T) => number | null,
): T[] {
  const sign = direction === "asc" ? 1 : -1;
  const byYear = (a: T, b: T) =>
    a.year === null || b.year === null ? (a.year === b.year ? 0 : a.year === null ? 1 : -1) : a.year - b.year;
  const byTitle = (a: T, b: T) => collator.compare(a.title, b.title);
  const byTiebreak = (a: T, b: T) => {
    if (!tiebreak) return 0;
    const ta = tiebreak(a);
    const tb = tiebreak(b);
    if (ta === null || tb === null) return ta === tb ? 0 : ta === null ? 1 : -1;
    return (ta - tb) * sign;
  };
  return [...rows].sort((a, b) => {
    const va = value(a);
    const vb = value(b);
    if (typeof va === "string" && typeof vb === "string") return collator.compare(va, vb) * sign || byYear(a, b);
    if (va === null || vb === null) return va === vb ? byTitle(a, b) : va === null ? 1 : -1;
    return (Number(va) - Number(vb)) * sign || byTiebreak(a, b) || byTitle(a, b);
  });
}

function SortIndicator({ direction }: { direction: SortDirection | null }) {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true" className={`size-3 ${direction ? "text-amber" : "text-paper-muted/60"}`}>
      {direction !== "desc" && <path d="M3 5l3-3 3 3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />}
      {direction !== "asc" && <path d="M3 7l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
  );
}

/** Grupo de filas de la tabla: una sección, o un grupo de resultados de la búsqueda (con encabezado). */
interface TableGroup {
  key: string;
  /** Encabezado del grupo; sin él, la tabla es la de una sección. */
  heading?: { id: string; label: string; count: number };
  items: ArtistDiscographyItem[];
}

function DiscographyTable({
  artistName,
  groups,
  actions,
}: {
  artistName: string;
  groups: TableGroup[];
  actions: DiscActions;
}) {
  const t = useTranslations("catalog.artist.discography");
  const locale = useLocale();
  const kindLabel = useKindLabel();
  const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection }>({ key: "year", direction: "asc" });
  const sortValue: Record<SortKey, (item: ArtistDiscographyItem) => number | string | null> = {
    year: (item) => item.year,
    title: (item) => item.title,
    average: (item) => item.community.average,
    you: (item) => actions.marksOf(item.id)?.stars ?? null,
  };
  // La columna "Tú" desempata por el puntaje detallado propio dentro de las mismas estrellas
  // (openspec: define-detailed-score, D10); el puntaje no se muestra en la tabla.
  const sortTiebreak: Partial<Record<SortKey, (item: ArtistDiscographyItem) => number | null>> = {
    you: (item) => actions.marksOf(item.id)?.detailedScore ?? null,
  };
  const collator = useMemo(() => titleCollator(locale), [locale]);
  // El orden se aplica dentro de cada grupo (openspec: add-discography-search, design D4).
  const sorted = groups.map((group) => ({
    ...group,
    rows: sortDiscographyRows(group.items, sortValue[sort.key], sort.direction, collator, sortTiebreak[sort.key]),
  }));
  const toggleSort = (key: SortKey) =>
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: NATURAL_DIRECTION[key] },
    );
  const sortHeader = (key: SortKey, label: string) => {
    const active = sort.key === key;
    return {
      "aria-sort": active ? (sort.direction === "asc" ? "ascending" : "descending") : "none",
      children: (
        <button
          type="button"
          onClick={() => toggleSort(key)}
          className={`inline-flex items-center gap-1 transition-colors hover:text-paper ${active ? "text-paper" : ""}`}
        >
          {label}
          <SortIndicator direction={active ? sort.direction : null} />
        </button>
      ),
    } as const;
  };
  // Con menos de 5 valoraciones, un "—" atenuado: "< 5 notas" en cada fila era ruido y
  // "notas" chocaba con las notas de la comunidad de la misma página.
  const average = (item: ArtistDiscographyItem) =>
    item.community.average !== null ? (
      t("communityValue", { average: formatStars(item.community.average, locale), count: item.community.count })
    ) : (
      <span title={t("fewRatingsLabel")}>
        <span aria-hidden="true">—</span>
        <span className="sr-only">{t("fewRatingsLabel")}</span>
      </span>
    );
  const kindChip = (item: ArtistDiscographyItem) =>
    showsKind(item.kinds) ? (
      <span className="shrink-0 rounded border border-ink-border px-1.5 py-0.5 font-data text-xs text-paper-muted">
        {kindLabel(item.kinds)}
      </span>
    ) : null;

  return (
    <table className="w-full table-fixed border-collapse text-left">
      <thead>
        <tr className="border-b border-ink-border font-data text-xs text-paper-muted">
          <th scope="col" className="w-14 py-2 pr-2 font-normal" {...sortHeader("year", t("columns.year"))} />
          <th scope="col" className="hidden w-11 py-2 pr-2 font-normal sm:table-cell">
            <span className="sr-only">{t("columns.cover")}</span>
          </th>
          <th scope="col" className="py-2 pr-2 font-normal" {...sortHeader("title", t("columns.title"))} />
          <th scope="col" className="hidden w-32 py-2 pr-2 font-normal sm:table-cell" {...sortHeader("average", t("columns.average"))} />
          <th scope="col" className="w-20 py-2 pr-2 font-normal sm:w-24" {...sortHeader("you", t("columns.you"))} />
          <th scope="col" className="w-10 py-2 font-normal">
            <span className="sr-only">{t("actionsColumn")}</span>
          </th>
        </tr>
      </thead>
      {sorted.map((group) => (
        <tbody key={group.key}>
          {group.heading && (
            <tr>
              <th
                scope="rowgroup"
                colSpan={6}
                id={group.heading.id}
                className="scroll-mt-6 pb-1.5 pt-5 text-left font-data text-xs font-normal uppercase tracking-wide text-paper-muted"
              >
                {group.heading.label} <span className="text-paper-muted/70">· {group.heading.count}</span>
              </th>
            </tr>
          )}
          {group.rows.map((item) => {
            const marks = actions.marksOf(item.id);
            return (
              <tr key={item.id} className="border-b border-ink-border align-middle">
                <td className="py-2 pr-2 font-data text-xs text-paper-muted">{item.year ?? "—"}</td>
                <td className="hidden py-2 pr-2 sm:table-cell">
                  <Cover item={item} className="aspect-square w-9" />
                </td>
                <td className="min-w-0 py-2 pr-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <Link
                      href={albumHref(item.primaryArtist?.name ?? (artistName || null), item.title, item.id)}
                      className="truncate font-body text-sm text-paper hover:text-amber"
                    >
                      {item.title}
                    </Link>
                    <span className="hidden sm:contents">{kindChip(item)}</span>
                  </span>
                  {item.primaryArtist && (
                    <span className="block truncate font-data text-xs text-paper-muted">
                      {t("withArtist", { name: item.primaryArtist.name })}
                    </span>
                  )}
                  {/* En móvil, el tipo (si no es álbum) y la media pasan a una segunda línea. */}
                  <span className="mt-0.5 flex min-w-0 items-center gap-2 font-data text-xs text-paper-muted sm:hidden">
                    {kindChip(item)}
                    <span className="truncate">{average(item)}</span>
                  </span>
                </td>
                <td className="hidden py-2 pr-2 font-data text-xs text-paper-muted sm:table-cell">{average(item)}</td>
                <td className="py-2 pr-2">{hasMarks(marks) && <DiscMarksView marks={marks} />}</td>
                <td className="py-2">
                  <AlbumQuickActions
                    item={item}
                    marks={marks}
                    open={actions.openId === item.id}
                    onOpenChange={(next) => actions.setOpenId(next ? item.id : null)}
                    onMarksChange={(update) => actions.updateMarks(item.id, update)}
                    variant="row"
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      ))}
    </table>
  );
}
