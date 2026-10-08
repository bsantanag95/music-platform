"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { Link, useRouter } from "@/i18n/navigation";
import type { ReleaseGroupCategory } from "@/lib/api/schemas";
import {
  ALBUM_SORT_PARAM,
  albumFiltersActive,
  genrePageHref,
  parseGenreParams,
  type GenrePageParams,
} from "@/services/genres/page-params";

// Barra de filtros de la pestaña Álbumes (openspec: redesign-genre-page, capability
// `genre-page-catalog`). El estado vive en la URL: cada cambio navega a `genrePageHref` (que vuelve
// a la página 1) y no hay estado de filtros en el cliente más allá del texto que se está escribiendo.
// Sin JavaScript funciona como un formulario `GET`: los campos llevan el nombre de su parámetro.

const CATEGORIES: ReleaseGroupCategory[] = ["studio", "single_ep", "compilation", "live_other"];
const SORTS = Object.keys(ALBUM_SORT_PARAM) as (keyof typeof ALBUM_SORT_PARAM)[];
const SORT_LABEL_KEY = {
  best: "sortBest",
  popular: "sortPopular",
  newest: "sortNewest",
  oldest: "sortOldest",
  az: "sortAz",
} as const;

export interface GenreFilterOption {
  value: string;
  label: string;
}

interface GenreFilterBarProps {
  slug: string;
  params: GenrePageParams;
  categoryLabels: Record<ReleaseGroupCategory, string>;
  /** Décadas con álbumes, de la más reciente a la más antigua. */
  decades: number[];
  /** Subgéneros con música (vacío: el selector no se ofrece). */
  subgenres: GenreFilterOption[];
}

export function GenreFilterBar({ slug, params, categoryLabels, decades, subgenres }: GenreFilterBarProps) {
  const t = useTranslations("catalog.genres.page.filters");
  const router = useRouter();
  const [q, setQ] = useState(params.q);
  const active = albumFiltersActive(params);

  const go = (overrides: Partial<GenrePageParams>) => router.replace(genrePageHref(slug, params, overrides));
  const clearHref = genrePageHref(slug, parseGenreParams({ tab: "albums", vista: params.view === "list" ? "lista" : undefined }));

  return (
    <form
      method="get"
      role="search"
      aria-label={t("searchLabel")}
      onSubmit={(event) => {
        event.preventDefault();
        go({ q: q.trim() });
      }}
      className="flex w-full flex-col gap-2"
    >
      <input type="hidden" name="tab" value="albums" />
      {params.view === "list" && <input type="hidden" name="vista" value="lista" />}
      <div className="flex gap-2">
        <input
          type="search"
          autoComplete="off"
          name="q"
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchLabel")}
          className="w-full rounded-md border border-ink-border bg-ink-surface px-3.5 py-2 font-data text-sm text-paper placeholder:text-paper-muted"
        />
        <button
          type="submit"
          className="shrink-0 rounded-md border border-ink-border px-3 font-data text-sm text-paper transition-colors hover:border-amber"
        >
          {t("searchSubmit")}
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
        <FilterSelect
          name="tipo"
          value={params.category ?? ""}
          onChange={(value) => go({ category: (value || undefined) as ReleaseGroupCategory | undefined })}
          ariaLabel={t("typeLabel")}
          label={t("typeLabel")}
          widthClassName="w-[14ch]"
        >
          <option value="">{t("typeAll")}</option>
          {CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {categoryLabels[category]}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect
          name="decada"
          value={params.decade !== undefined ? String(params.decade) : ""}
          onChange={(value) => go({ decade: value ? Number(value) : undefined })}
          ariaLabel={t("decadeLabel")}
          label={t("decadeLabel")}
          widthClassName="w-[11ch]"
        >
          <option value="">{t("decadeAll")}</option>
          {decades.map((decade) => (
            <option key={decade} value={decade}>
              {decade}s
            </option>
          ))}
        </FilterSelect>
        {subgenres.length > 0 && (
          <FilterSelect
            name="sub"
            value={params.sub ?? ""}
            onChange={(value) => go({ sub: value || undefined })}
            ariaLabel={t("subLabel")}
            label={t("subLabel")}
            widthClassName="w-[18ch]"
          >
            <option value="">{t("subAll")}</option>
            {subgenres.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </FilterSelect>
        )}
        <FilterSelect
          name="orden"
          value={ALBUM_SORT_PARAM[params.albumSort]}
          onChange={(value) => go({ albumSort: SORTS.find((s) => ALBUM_SORT_PARAM[s] === value) ?? "best" })}
          ariaLabel={t("sortLabel")}
          label={t("sortLabel")}
          widthClassName="w-[16ch]"
        >
          {SORTS.map((sort) => (
            <option key={sort} value={ALBUM_SORT_PARAM[sort]}>
              {t(SORT_LABEL_KEY[sort])}
            </option>
          ))}
        </FilterSelect>
        <label className="flex items-center gap-1.5 pb-1.5 font-data text-sm text-paper-muted">
          <input
            type="checkbox"
            name="solo"
            value="1"
            checked={params.exact}
            onChange={(event) => go({ exact: event.target.checked })}
            className="accent-amber"
          />
          {t("exactLabel")}
        </label>
        {active && (
          <Link href={clearHref} className="pb-1.5 font-data text-sm text-amber underline-offset-2 hover:underline">
            {t("clear")}
          </Link>
        )}
      </div>
    </form>
  );
}
