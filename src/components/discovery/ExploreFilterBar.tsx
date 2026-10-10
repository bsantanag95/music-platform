"use client";

import { useTranslations } from "next-intl";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { Link, useRouter } from "@/i18n/navigation";
import type { ReleaseGroupCategory } from "@/lib/api/schemas";
import { ALBUM_SORT_PARAM } from "@/services/genres/page-params";
import { exploreListHref, type ExploreListParams } from "@/services/discovery/explore-params";
import type { AlbumSort } from "@/services/discovery/discovery";

const CATEGORIES: ReleaseGroupCategory[] = ["studio", "single_ep", "compilation", "live_other"];
const SORTS = Object.keys(ALBUM_SORT_PARAM) as AlbumSort[];
const SORT_LABEL_KEY = {
  best: "sortBest",
  popular: "sortPopular",
  newest: "sortNewest",
  oldest: "sortOldest",
  az: "sortAz",
} as const;

interface ExploreFilterBarProps {
  /** Base del listado, con el corte (`/explore?decada=1990`). */
  baseHref: string;
  params: ExploreListParams;
  categoryLabels: Record<ReleaseGroupCategory, string>;
}

// Tipo y orden de los listados filtrados de Explorar. El estado vive en la URL (`tipo`, `orden`):
// el tipo es una fila de enlaces (funciona sin JavaScript) y el orden un `<select>` que navega al
// cambiar. Cambiar cualquiera vuelve a la página 1. Textos compartidos con la página de género.
export function ExploreFilterBar({ baseHref, params, categoryLabels }: ExploreFilterBarProps) {
  const t = useTranslations("catalog.genres.page.filters");
  const router = useRouter();

  const pill = (active: boolean) =>
    `inline-flex shrink-0 items-center rounded-full border px-3 py-1 font-data text-xs transition-colors ${
      active
        ? "border-amber bg-amber text-ink"
        : "border-ink-border text-paper-muted hover:border-paper-muted/60 hover:text-paper"
    }`;

  const options: { value: ReleaseGroupCategory | undefined; label: string }[] = [
    { value: undefined, label: t("typeAll") },
    ...CATEGORIES.map((category) => ({ value: category, label: categoryLabels[category] })),
  ];

  return (
    <div className="flex w-full flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-ink-border pb-3">
      <nav aria-label={t("typeLabel")} className="themed-scrollbar -mx-1 flex max-w-full gap-1.5 overflow-x-auto px-1 py-0.5">
        {options.map((option) => {
          const active = params.category === option.value;
          return (
            <Link
              key={option.value ?? "all"}
              href={exploreListHref(baseHref, params, { category: option.value })}
              aria-current={active ? "page" : undefined}
              scroll={false}
              className={pill(active)}
            >
              {option.label}
            </Link>
          );
        })}
      </nav>
      <FilterSelect
        name="orden"
        value={ALBUM_SORT_PARAM[params.sort]}
        onChange={(value) =>
          router.replace(
            exploreListHref(baseHref, params, { sort: SORTS.find((s) => ALBUM_SORT_PARAM[s] === value) ?? "best" }),
            { scroll: false },
          )
        }
        ariaLabel={t("sortLabel")}
        label={t("sortLabel")}
        widthClassName="w-[20ch]"
      >
        {SORTS.map((sort) => (
          <option key={sort} value={ALBUM_SORT_PARAM[sort]}>
            {t(SORT_LABEL_KEY[sort])}
          </option>
        ))}
      </FilterSelect>
    </div>
  );
}
