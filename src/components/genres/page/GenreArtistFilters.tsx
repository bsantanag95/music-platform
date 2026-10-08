"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { Link, useRouter } from "@/i18n/navigation";
import {
  ARTIST_SORT_PARAM,
  artistFiltersActive,
  genrePageHref,
  parseGenreParams,
  type GenrePageParams,
} from "@/services/genres/page-params";
import type { GenreArtistSort } from "@/services/genres/artists";

// Barra de filtros de la pestaña Artistas (openspec: add-genre-artist-discovery, capability
// `genre-page-catalog`): búsqueda, país, década de debut, discografía corta, «que aún no conozco» (solo con
// sesión) y orden. El estado vive en la URL: cada cambio navega a `genrePageHref` (que vuelve a la página 1).
// Sin JavaScript funciona como un formulario `GET`: los campos llevan el nombre de su parámetro. Los
// selectores solo se ofrecen con opciones reales.

const SORTS = Object.keys(ARTIST_SORT_PARAM) as GenreArtistSort[];
const SORT_LABEL_KEY = {
  albums: "sortAlbums",
  followed: "sortFollowed",
  az: "sortAz",
  recent: "sortRecent",
  discover: "sortDiscover",
} as const;

export interface GenreArtistFacetOptions {
  /** País con su nombre ya traducido y su cantidad de artistas. */
  countries: { code: string; label: string; count: number }[];
  /** Décadas de debut con su cantidad de artistas. */
  debutDecades: { decade: number; count: number }[];
}

interface GenreArtistFiltersProps {
  slug: string;
  params: GenrePageParams;
  facets: GenreArtistFacetOptions;
  /** Hay sesión: se ofrece «que aún no conozco». */
  authenticated: boolean;
}

export function GenreArtistFilters({ slug, params, facets, authenticated }: GenreArtistFiltersProps) {
  const t = useTranslations("catalog.genres.page.artists");
  const tFilters = useTranslations("catalog.genres.page.filters");
  const router = useRouter();
  const [q, setQ] = useState(params.q);
  const active = artistFiltersActive(params);

  const go = (overrides: Partial<GenrePageParams>) => router.replace(genrePageHref(slug, params, overrides));
  const clearHref = genrePageHref(slug, parseGenreParams({ tab: "artists" }));

  return (
    <form
      method="get"
      role="search"
      aria-label={t("searchPlaceholder")}
      onSubmit={(event) => {
        event.preventDefault();
        go({ q: q.trim() });
      }}
      className="flex w-full flex-col gap-2"
    >
      <input type="hidden" name="tab" value="artists" />
      <div className="flex gap-2">
        <input
          type="search"
          autoComplete="off"
          name="q"
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchPlaceholder")}
          className="min-w-0 flex-1 rounded-md border border-ink-border bg-ink-surface px-3.5 py-2 font-data text-sm text-paper placeholder:text-paper-muted"
        />
        <button type="submit" className="shrink-0 rounded-md border border-ink-border px-3 font-data text-sm text-paper hover:border-amber">
          {tFilters("searchSubmit")}
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
        {facets.countries.length > 0 && (
          <FilterSelect
            name="pais"
            value={params.country ?? ""}
            onChange={(value) => go({ country: value || undefined })}
            ariaLabel={t("countryLabel")}
            label={t("countryLabel")}
            widthClassName="w-[18ch]"
          >
            <option value="">{t("countryAll")}</option>
            {facets.countries.map((country) => (
              <option key={country.code} value={country.code}>
                {t("facetOption", { label: country.label, count: country.count })}
              </option>
            ))}
          </FilterSelect>
        )}
        {facets.debutDecades.length > 0 && (
          <FilterSelect
            name="debut"
            value={params.debutDecade !== undefined ? String(params.debutDecade) : ""}
            onChange={(value) => go({ debutDecade: value ? Number(value) : undefined })}
            ariaLabel={t("debutLabel")}
            label={t("debutLabel")}
            widthClassName="w-[16ch]"
          >
            <option value="">{t("debutAll")}</option>
            {facets.debutDecades.map((d) => (
              <option key={d.decade} value={d.decade}>
                {t("facetOption", { label: `${d.decade}s`, count: d.count })}
              </option>
            ))}
          </FilterSelect>
        )}
        <FilterSelect
          name="orden"
          value={ARTIST_SORT_PARAM[params.artistSort]}
          onChange={(value) => go({ artistSort: SORTS.find((s) => ARTIST_SORT_PARAM[s] === value) ?? "albums" })}
          ariaLabel={t("sortLabel")}
          label={t("sortLabel")}
          widthClassName="w-[20ch]"
        >
          {SORTS.map((sort) => (
            <option key={sort} value={ARTIST_SORT_PARAM[sort]}>
              {t(SORT_LABEL_KEY[sort])}
            </option>
          ))}
        </FilterSelect>
        <label className="flex items-center gap-1.5 pb-1.5 font-data text-sm text-paper-muted">
          <input
            type="checkbox"
            name="tam"
            value="corta"
            checked={params.shortOnly}
            onChange={(event) => go({ shortOnly: event.target.checked })}
            className="accent-amber"
          />
          {t("shortLabel")}
        </label>
        {authenticated && (
          <label className="flex items-center gap-1.5 pb-1.5 font-data text-sm text-paper-muted">
            <input
              type="checkbox"
              name="conocidos"
              value="no"
              checked={params.hideKnown}
              onChange={(event) => go({ hideKnown: event.target.checked })}
              className="accent-amber"
            />
            {t("unknownLabel")}
          </label>
        )}
        {active && (
          <Link href={clearHref} className="pb-1.5 font-data text-sm text-amber underline-offset-2 hover:underline">
            {tFilters("clear")}
          </Link>
        )}
      </div>
    </form>
  );
}
