import { Suspense, type ReactNode } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import {
  searchAlbums,
  searchArtists,
  searchSongs,
  uniqueExactArtist,
} from "@/services/catalog/search";
import type {
  AlbumSearchResponse,
  ArtistSearchResponse,
  SongSearchResponse,
} from "@/services/catalog/search/types";
import type { ArtistTypeFilter } from "@/services/catalog/search/mb-query";
import { filtersToParams, hasActiveFilters, type AdvancedFilters } from "@/services/catalog/search/filters";
import type { ReleaseGroupCategoryValue } from "@/services/catalog/ingest-release-group";
import { getProfileByUsername, searchUsers } from "@/services/social/profiles";
import { getCurrentUser } from "@/services/auth/authorization";
import { SearchErrorState } from "@/components/catalog/SearchErrorState";
import { searchHref } from "@/components/catalog/search-types";
import { artistHref } from "@/lib/catalog-links";
import {
  FilterPills,
  PendingRemote,
  RefineHint,
  SearchEmpty,
  SearchSummary,
} from "@/components/catalog/search-results/SearchChrome";
import { RemoteFailedNotice } from "@/components/catalog/search-results/RemoteFailedNotice";
import { ActiveFilterChips } from "@/components/catalog/search-results/ActiveFilterChips";
import { ArtistResults } from "@/components/catalog/search-results/ArtistResults";
import { AlbumList } from "@/components/catalog/search-results/AlbumResults";
import {
  SongInterpretation,
  SongResults,
} from "@/components/catalog/search-results/SongResults";
import { LoadMoreResults } from "@/components/catalog/search-results/LoadMoreResults";
import { UserResults } from "@/components/catalog/search-results/UserResults";

// Secciones de /search por tipo (openspec: redesign-scoped-search). Viven
// fuera de page.tsx para poder probarlas directamente: son Server Components
// asíncronos que la página compone según `?type=`.

const CATEGORIES: ReleaseGroupCategoryValue[] = [
  "studio",
  "single_ep",
  "compilation",
  "live_other",
];
const DECADES = [1960, 1970, 1980, 1990, 2000, 2010, 2020];

// ---------- Artistas

export async function ArtistSection({
  query,
  all,
  artistType,
  filters = {},
}: {
  query: string;
  all: boolean;
  artistType?: ArtistTypeFilter;
  /** País, inicio de actividad y estado (openspec: add-advanced-search-phase1). */
  filters?: AdvancedFilters;
}) {
  const t = await getTranslations("catalog.search.results.artists");
  let response: ArtistSearchResponse | null = null;
  try {
    response = await searchArtists(query, { artistType, filters });
  } catch {
    return <SearchErrorState />;
  }

  // Coincidencia exacta única → perfil directo, con "¿No era este?" para
  // volver a la lista (`all=1`). Con un filtro (tipo o panel) la persona está
  // explorando la lista, no buscando un nombre: no se redirige.
  const unique = !all && !artistType && !hasActiveFilters(filters) ? uniqueExactArtist(response) : null;
  if (unique) {
    redirect({
      href: `${artistHref(unique.name, unique.id)}?${new URLSearchParams({ from: "search", q: query }).toString()}`,
      locale: await getLocale(),
    });
  }

  const filterHref = (value?: ArtistTypeFilter) =>
    searchHref("artist", query, {
      artistType: value,
      all: all ? "1" : undefined,
      ...filtersToParams(filters),
    });
  const pillParams: Record<string, string> = artistType ? { artistType } : {};

  return (
    <>
      <SearchSummary
        query={query}
        type="artist"
        count={response.results.length}
        filters={filters}
      />
      <ActiveFilterChips type="artist" query={query} filters={filters} pillParams={pillParams} />
      <FilterPills
        label={t("filterLabel")}
        options={[
          {
            key: "all",
            label: t("filterAll"),
            href: filterHref(),
            active: !artistType,
          },
          {
            key: "person",
            label: t("filterPerson"),
            href: filterHref("person"),
            active: artistType === "person",
          },
          {
            key: "group",
            label: t("filterGroup"),
            href: filterHref("group"),
            active: artistType === "group",
          },
        ]}
      />
      {response.remoteFailed ? <RemoteFailedNotice /> : null}
      {response.results.length === 0 ? (
        <SearchEmpty query={query} type="artist" filters={filters} pillParams={pillParams} />
      ) : (
        <ArtistResults query={query} results={response.results} />
      )}
    </>
  );
}

// ---------- Álbumes

export async function AlbumSection({
  query,
  category,
  decade,
  filters = {},
}: {
  query: string;
  category?: ReleaseGroupCategoryValue;
  /** Ya resuelta: sin década si hay un rango de años (`effectiveDecade`). */
  decade?: number;
  /** Rango de años y artista (openspec: add-advanced-search-phase1). */
  filters?: AdvancedFilters;
}) {
  const t = await getTranslations("catalog");
  // Sesión para el menú de acciones de cada disco (openspec: extend-album-quick-actions).
  const authenticated = (await getCurrentUser()) !== null;
  const local = await searchAlbums(query, {
    category,
    decade,
    ...filters,
    localOnly: true,
  });
  // Las pastillas conservan los filtros del panel; elegir una década quita el rango de años.
  const advanced = filtersToParams(filters);
  const withoutYears = filtersToParams({ ...filters, yearFrom: undefined, yearTo: undefined });
  const href = (extra: { category?: string; decade?: number }) =>
    searchHref("album", query, {
      category,
      decade,
      ...(extra.decade !== undefined ? withoutYears : advanced),
      ...extra,
    });
  const pillParams: Record<string, string> = category ? { category } : {};

  // Los filtros van debajo del encabezado de resultados, tanto mientras llega
  // MusicBrainz (fallback) como en la lista final.
  const pills = (
    <div className="flex flex-col gap-3">
      <FilterPills
        label={t("search.results.albums.categoryLabel")}
        options={[
          {
            key: "all",
            label: t("search.results.albums.categoryAll"),
            href: href({ category: "" }),
            active: !category,
          },
          ...CATEGORIES.map((value) => ({
            key: value,
            label: t(`artist.categories.${value}`),
            href: href({ category: value }),
            active: category === value,
          })),
        ]}
      />
      <FilterPills
        label={t("search.results.albums.decadeLabel")}
        options={[
          {
            key: "all",
            label: t("search.results.albums.decadeAll"),
            href: searchHref("album", query, { category, ...advanced }),
            active: decade === undefined && filters.yearFrom === undefined && filters.yearTo === undefined,
          },
          ...DECADES.map((value) => ({
            key: String(value),
            label: t("search.results.albums.decade", { decade: value }),
            href: href({ decade: value }),
            active: decade === value,
          })),
        ]}
      />
    </div>
  );

  return (
    <Suspense
      fallback={
        <LocalFirst
          summary={
            <>
              <SearchSummary query={query} type="album" count={null} filters={filters} />
              {pills}
              <ActiveFilterChips type="album" query={query} filters={filters} pillParams={pillParams} />
            </>
          }
        >
          {local.results.length > 0 ? (
            <AlbumList albums={local.results} authenticated={authenticated} />
          ) : null}
        </LocalFirst>
      }
    >
      <AlbumRemote
        query={query}
        category={category}
        decade={decade}
        filters={filters}
        pillParams={pillParams}
        pills={pills}
        authenticated={authenticated}
      />
    </Suspense>
  );
}

async function AlbumRemote({
  query,
  category,
  decade,
  filters,
  pillParams,
  pills,
  authenticated,
}: {
  query: string;
  category?: ReleaseGroupCategoryValue;
  decade?: number;
  filters: AdvancedFilters;
  pillParams: Record<string, string>;
  pills: ReactNode;
  authenticated: boolean;
}) {
  let response: AlbumSearchResponse;
  try {
    response = await searchAlbums(query, { category, decade, ...filters });
  } catch {
    return <SearchErrorState />;
  }
  return (
    <>
      <SearchSummary
        query={query}
        type="album"
        count={response.total ?? response.results.length}
        filters={filters}
      />
      {pills}
      <ActiveFilterChips type="album" query={query} filters={filters} pillParams={pillParams} />
      {response.remoteFailed ? <RemoteFailedNotice /> : null}
      {response.refine ? (
        <RefineHint kind="album" query={query} {...response.refine} />
      ) : null}
      {response.results.length === 0 ? (
        <SearchEmpty query={query} type="album" filters={filters} pillParams={pillParams} />
      ) : (
        <div className="flex flex-col gap-4">
          <AlbumList albums={response.results} authenticated={authenticated} />
          {response.nextOffset !== null ? (
            <LoadMoreResults
              kind="album"
              query={query}
              filters={{ category, decade, advanced: filters }}
              initialNextOffset={response.nextOffset}
              seen={response.results.map((album) => album.id)}
              authenticated={authenticated}
            />
          ) : null}
        </div>
      )}
    </>
  );
}

// ---------- Canciones

export async function SongSection({
  query,
  filters = {},
}: {
  query: string;
  /** Artista y duración (openspec: add-advanced-search-phase1). */
  filters?: AdvancedFilters;
}) {
  const local = await searchSongs(query, { localOnly: true, filters });
  return (
    <Suspense
      fallback={
        <LocalFirst
          summary={
            <>
              <SearchSummary query={query} type="song" count={null} filters={filters} />
              <ActiveFilterChips type="song" query={query} filters={filters} />
            </>
          }
        >
          {local.results.length > 0 ? <SongResults response={local} /> : null}
        </LocalFirst>
      }
    >
      <SongRemote query={query} filters={filters} />
    </Suspense>
  );
}

async function SongRemote({ query, filters }: { query: string; filters: AdvancedFilters }) {
  let response: SongSearchResponse;
  try {
    response = await searchSongs(query, { filters });
  } catch {
    return <SearchErrorState />;
  }
  return (
    <>
      <SearchSummary query={query} type="song" count={null} filters={filters} />
      <ActiveFilterChips type="song" query={query} filters={filters} />
      <SongInterpretation
        interpretation={response.interpretation}
        alternatives={response.alternatives}
      />
      {response.remoteFailed ? <RemoteFailedNotice /> : null}
      {response.refine ? (
        <RefineHint kind="song" query={query} {...response.refine} />
      ) : null}
      {response.results.length === 0 ? (
        <SearchEmpty query={query} type="song" filters={filters} />
      ) : (
        <div className="flex flex-col gap-4">
          <SongResults response={response} />
          {response.nextOffset !== null ? (
            <LoadMoreResults
              kind="song"
              query={query}
              filters={{ advanced: filters }}
              initialNextOffset={response.nextOffset}
              seen={response.results.map((group) => group.key)}
            />
          ) : null}
        </div>
      )}
    </>
  );
}

// ---------- Usuarios

export async function UserSection({
  query,
  all,
}: {
  query: string;
  all: boolean;
}) {
  const viewer = await getCurrentUser();

  // Un username exacto abre el perfil (mismas reglas de cuentas activas que
  // /users). Sin coincidencia exacta, la lista.
  if (!all && /^[a-z0-9_.-]+$/i.test(query)) {
    const exact = await getProfileByUsername(
      query.toLowerCase(),
      viewer?.id ?? null,
    ).catch(() => null);
    if (exact) {
      redirect({
        href: `/users/${encodeURIComponent(exact.username)}`,
        locale: await getLocale(),
      });
    }
  }

  const response = await searchUsers(query, viewer?.id ?? null, 1, 20);
  return (
    <>
      <SearchSummary
        query={query}
        type="user"
        count={response.hasNext ? null : response.users.length}
      />
      {response.users.length === 0 ? (
        <SearchEmpty query={query} type="user" />
      ) : (
        <UserResults
          query={query}
          authenticated={viewer !== null}
          initialUsers={response.users}
          initialHasNext={response.hasNext}
        />
      )}
    </>
  );
}

// ---------- Streaming local → remoto

/** Fallback del streaming: lo local ya visible y la pata remota pendiente. */
function LocalFirst({
  summary,
  children,
}: {
  summary: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      {summary}
      <PendingRemote />
      {children}
    </>
  );
}
