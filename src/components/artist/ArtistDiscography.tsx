"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { LazyCoverImage } from "@/components/catalog/LazyCoverImage";
import { formatStars } from "@/components/album/album-format";
import type { ArtistDiscographyItem } from "@/services/catalog/artist-discography-view";
import type { DiscographySection } from "@/services/catalog/discography-sections";
import { kindKey } from "./artist-format";

// Discografía de la página de artista (openspec: redesign-artist-page, capability
// `artist-discography-view`): selector de secciones con su cantidad (la sección vive en la
// URL, `?section=`), vistas grilla y tabla con la elección recordada por sección en el
// navegador, "Mostrar más" de a 48 en la grilla, "Mejor valorado" y las marcas del usuario.

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

export interface DiscographyMarksProps {
  listened: string[];
  stars: Record<string, number>;
}

interface ArtistDiscographyProps {
  artistId: string;
  sections: { key: DiscographySection; items: ArtistDiscographyItem[] }[];
  activeSection: DiscographySection;
  bestRatedId: string | null;
  /** Marcas del usuario en sesión; `null` para visitantes anónimos. */
  marks: DiscographyMarksProps | null;
}

function sectionHref(artistId: string, section: DiscographySection, defaultSection: DiscographySection) {
  return section === defaultSection ? `/artist/${artistId}` : `/artist/${artistId}?section=${section}`;
}

export function ArtistDiscography({ artistId, sections, activeSection, bestRatedId, marks }: ArtistDiscographyProps) {
  const t = useTranslations("catalog.artist.discography");
  const [view, setView] = useSectionView(activeSection);
  const active = sections.find((s) => s.key === activeSection);
  const defaultSection = sections[0]?.key ?? "main";

  if (!active) {
    return <p className="font-body text-sm text-paper-muted">{t("empty")}</p>;
  }

  const listened = new Set(marks?.listened ?? []);
  return (
    <section aria-labelledby="discography-heading" className="flex flex-col gap-4">
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
          listened={listened}
          stars={marks?.stars ?? {}}
        />
      ) : (
        <DiscographyTable items={active.items} listened={listened} stars={marks?.stars ?? {}} />
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

function PersonalMarks({ listened, stars }: { listened: boolean; stars: number | undefined }) {
  const t = useTranslations("catalog.artist.discography");
  const locale = useLocale();
  if (!listened && stars === undefined) return null;
  return (
    <span className="inline-flex items-center gap-1.5 font-data text-xs text-paper">
      {listened && (
        <span title={t("listened")}>
          <span aria-hidden="true">✓</span>
          <span className="sr-only">{t("listened")}</span>
        </span>
      )}
      {stars !== undefined && (
        <span title={t("yourStars", { stars: formatStars(stars, locale) })}>
          <span aria-hidden="true">★ {formatStars(stars, locale)}</span>
          <span className="sr-only">{t("yourStars", { stars: formatStars(stars, locale) })}</span>
        </span>
      )}
    </span>
  );
}

function DiscographyGrid({
  items,
  bestRatedId,
  showEpBadge,
  listened,
  stars,
}: {
  items: ArtistDiscographyItem[];
  bestRatedId: string | null;
  showEpBadge: boolean;
  listened: Set<string>;
  stars: Record<string, number>;
}) {
  const t = useTranslations("catalog.artist.discography");
  const locale = useLocale();
  const [visible, setVisible] = useState(GRID_PAGE_SIZE);

  return (
    <div className="flex flex-col gap-4">
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
        {items.slice(0, visible).map((item) => {
          const best = item.id === bestRatedId;
          return (
            <li key={item.id}>
              <Link href={`/album/${item.id}`} className="group flex flex-col gap-1.5">
                <span className="relative block">
                  <Cover item={item} className="aspect-square w-full" />
                  {(best || (showEpBadge && item.isEp)) && (
                    <span className="absolute left-1.5 top-1.5 flex flex-col items-start gap-1">
                      {best && (
                        <span className="rounded bg-ink/85 px-1.5 py-0.5 font-data text-xs text-amber">★ {t("bestRated")}</span>
                      )}
                      {showEpBadge && item.isEp && (
                        <span className="rounded bg-ink/85 px-1.5 py-0.5 font-data text-xs text-paper">{t("ep")}</span>
                      )}
                    </span>
                  )}
                  {(listened.has(item.id) || stars[item.id] !== undefined) && (
                    <span className="absolute bottom-1.5 right-1.5 rounded bg-ink/85 px-1.5 py-0.5">
                      <PersonalMarks listened={listened.has(item.id)} stars={stars[item.id]} />
                    </span>
                  )}
                </span>
                <span className="line-clamp-2 font-body text-sm text-paper group-hover:text-amber">{item.title}</span>
                <span className="font-data text-xs text-paper-muted">
                  {[item.year, best && item.community.average !== null ? `★ ${formatStars(item.community.average, locale)}` : null]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </Link>
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

function DiscographyTable({
  items,
  listened,
  stars,
}: {
  items: ArtistDiscographyItem[];
  listened: Set<string>;
  stars: Record<string, number>;
}) {
  const t = useTranslations("catalog.artist.discography");
  const locale = useLocale();
  const kindLabel = useKindLabel();
  const community = (item: ArtistDiscographyItem) =>
    item.community.average !== null
      ? t("communityValue", { average: formatStars(item.community.average, locale), count: item.community.count })
      : t("fewRatings");

  return (
    <table className="w-full table-fixed border-collapse text-left">
      <thead>
        <tr className="border-b border-ink-border font-data text-xs text-paper-muted">
          <th scope="col" className="w-12 py-2 pr-2 font-normal">
            {t("columns.year")}
          </th>
          <th scope="col" className="w-11 py-2 pr-2 font-normal">
            <span className="sr-only">{t("columns.cover")}</span>
          </th>
          <th scope="col" className="py-2 pr-2 font-normal">
            {t("columns.title")}
          </th>
          <th scope="col" className="hidden w-36 py-2 pr-2 font-normal sm:table-cell">
            {t("columns.type")}
          </th>
          <th scope="col" className="hidden w-32 py-2 pr-2 font-normal sm:table-cell">
            {t("columns.community")}
          </th>
          <th scope="col" className="w-20 py-2 font-normal">
            {t("columns.you")}
          </th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.id} className="border-b border-ink-border align-middle">
            <td className="py-2 pr-2 font-data text-xs text-paper-muted">{item.year ?? "—"}</td>
            <td className="py-2 pr-2">
              <Cover item={item} className="aspect-square w-9" />
            </td>
            <td className="min-w-0 py-2 pr-2">
              <Link href={`/album/${item.id}`} className="block truncate font-body text-sm text-paper hover:text-amber">
                {item.title}
              </Link>
              {item.primaryArtist && (
                <span className="block truncate font-data text-xs text-paper-muted">
                  {t("withArtist", { name: item.primaryArtist.name })}
                </span>
              )}
              {/* En móvil, tipo y comunidad pasan a una segunda línea bajo el título. */}
              <span className="block truncate font-data text-xs text-paper-muted sm:hidden">
                {kindLabel(item.kinds)} · {community(item)}
              </span>
            </td>
            <td className="hidden truncate py-2 pr-2 font-data text-xs text-paper-muted sm:table-cell">
              <span className="rounded border border-ink-border px-1.5 py-0.5">{kindLabel(item.kinds)}</span>
            </td>
            <td className="hidden py-2 pr-2 font-data text-xs text-paper-muted sm:table-cell">{community(item)}</td>
            <td className="py-2">
              <PersonalMarks listened={listened.has(item.id)} stars={stars[item.id]} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
