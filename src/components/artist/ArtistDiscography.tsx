"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { LazyCoverImage } from "@/components/catalog/LazyCoverImage";
import { formatStars } from "@/components/album/album-format";
import { BookmarkIcon, HeartIcon } from "@/components/album/AlbumRelationPanel";
import type { ArtistDiscographyItem, DiscographyMarks } from "@/services/catalog/artist-discography-view";
import type { DiscographySection } from "@/services/catalog/discography-sections";
import { kindKey } from "./artist-format";
import { AlbumQuickActions, type DiscMarks } from "@/components/catalog/AlbumQuickActions";

// Discografía de la página de artista (openspec: redesign-artist-page, capability
// `artist-discography-view`): selector de secciones con su cantidad (la sección vive en la
// URL, `?section=`), vistas grilla y tabla con la elección recordada por sección en el
// navegador, "Mostrar más" de a 48 en la grilla, "Mejor valorado" y las marcas del usuario. Cada
// disco tiene su menú "…" de acciones (openspec: add-discography-quick-actions); las marcas viven
// en estado local y el menú las actualiza.

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
  sections: { key: DiscographySection; items: ArtistDiscographyItem[] }[];
  activeSection: DiscographySection;
  bestRatedId: string | null;
  /** Marcas del usuario en sesión; `null` para visitantes anónimos. */
  marks: DiscographyMarks | null;
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

function sectionHref(artistId: string, section: DiscographySection, defaultSection: DiscographySection) {
  return section === defaultSection ? `/artist/${artistId}` : `/artist/${artistId}?section=${section}`;
}

export function ArtistDiscography({ artistId, sections, activeSection, bestRatedId, marks }: ArtistDiscographyProps) {
  const t = useTranslations("catalog.artist.discography");
  const [view, setView] = useSectionView(activeSection);
  const active = sections.find((s) => s.key === activeSection);
  const defaultSection = sections[0]?.key ?? "main";
  const [discMarks, setDiscMarks] = useState<Record<string, DiscMarks>>(() => (marks ? marksByDisc(marks) : {}));
  const [openId, setOpenId] = useState<string | null>(null);

  if (!active) {
    return <p className="font-body text-sm text-paper-muted">{t("empty")}</p>;
  }

  const actions: DiscActions = {
    marksOf: (id) => (marks ? (discMarks[id] ?? NO_MARKS) : null),
    openId,
    setOpenId,
    updateMarks: (id, update) => setDiscMarks((current) => ({ ...current, [id]: update(current[id] ?? NO_MARKS) })),
  };
  return (
    <section aria-labelledby="discography-heading" data-menu-bounds className="flex flex-col gap-4">
      <h2 id="discography-heading" className="sr-only">
        {t("heading")}
      </h2>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label={t("sectionsLabel")}>
          <ul className="flex flex-wrap gap-1.5">
            {sections.map((section) => {
              const current = section.key === activeSection;
              return (
                <li key={section.key}>
                  <Link
                    href={sectionHref(artistId, section.key, defaultSection)}
                    scroll={false}
                    aria-current={current ? "page" : undefined}
                    className={`inline-flex items-baseline gap-1.5 rounded border px-2.5 py-1 font-body text-sm transition-colors ${
                      current ? "border-amber text-paper" : "border-ink-border text-paper-muted hover:text-paper"
                    }`}
                  >
                    {t(`sections.${section.key}`)}
                    <span className="font-data text-xs text-paper-muted">{section.items.length}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
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
      </div>

      {view === "grid" ? (
        <DiscographyGrid
          key={activeSection}
          items={active.items}
          bestRatedId={activeSection === "main" ? bestRatedId : null}
          showEpBadge={activeSection === "main"}
          actions={actions}
        />
      ) : (
        // La clave de sección reinicia el orden al cambiar de sección.
        <DiscographyTable key={activeSection} items={active.items} actions={actions} />
      )}
    </section>
  );
}

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
  return (
    <span className="inline-flex items-center gap-1.5 font-data text-xs text-paper">
      {stars !== null ? (
        <span title={t("yourStars", { stars })}>
          <span aria-hidden="true">★ {stars}</span>
          <span className="sr-only">{t("yourStars", { stars })}</span>
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
  items,
  bestRatedId,
  showEpBadge,
  actions,
}: {
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
              <Link href={`/album/${item.id}`} className="group flex flex-col gap-1.5">
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
 * Orden de la tabla (openspec: extend-album-quick-actions, design D5): los discos sin valor en la
 * columna van siempre al final, en cualquier sentido. Las columnas numéricas desempatan por título;
 * el título desempata por año, con los discos sin año al final.
 */
export function sortDiscographyRows<T extends SortableRow>(
  rows: T[],
  value: (row: T) => number | string | null,
  direction: SortDirection,
  collator: Intl.Collator,
): T[] {
  const sign = direction === "asc" ? 1 : -1;
  const byYear = (a: T, b: T) =>
    a.year === null || b.year === null ? (a.year === b.year ? 0 : a.year === null ? 1 : -1) : a.year - b.year;
  return [...rows].sort((a, b) => {
    const va = value(a);
    const vb = value(b);
    if (typeof va === "string" && typeof vb === "string") return collator.compare(va, vb) * sign || byYear(a, b);
    const byTitle = collator.compare(a.title, b.title);
    if (va === null || vb === null) return va === vb ? byTitle : va === null ? 1 : -1;
    return (Number(va) - Number(vb)) * sign || byTitle;
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

function DiscographyTable({ items, actions }: { items: ArtistDiscographyItem[]; actions: DiscActions }) {
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
  const collator = useMemo(() => titleCollator(locale), [locale]);
  const rows = sortDiscographyRows(items, sortValue[sort.key], sort.direction, collator);
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
      <tbody>
        {rows.map((item) => {
          const marks = actions.marksOf(item.id);
          return (
            <tr key={item.id} className="border-b border-ink-border align-middle">
              <td className="py-2 pr-2 font-data text-xs text-paper-muted">{item.year ?? "—"}</td>
              <td className="hidden py-2 pr-2 sm:table-cell">
                <Cover item={item} className="aspect-square w-9" />
              </td>
              <td className="min-w-0 py-2 pr-2">
                <span className="flex min-w-0 items-center gap-2">
                  <Link href={`/album/${item.id}`} className="truncate font-body text-sm text-paper hover:text-amber">
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
    </table>
  );
}
