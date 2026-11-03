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
import {
  albumOptions,
  artistFilters,
  hasCriteria,
  songFilters,
  type SearchCriteria,
} from "@/services/catalog/search/filters";
import type { ReleaseGroupCategoryValue } from "@/services/catalog/ingest-release-group";
import { getProfileByUsername, searchUsers } from "@/services/social/profiles";
import { suggestSpelling } from "@/services/catalog/search/spelling";
import { coverageLevel } from "@/services/catalog/search/coverage";
import { withViewerStars } from "@/services/catalog/search/activity";
import { getArtistGenres } from "@/services/genres/display";
import { getCurrentUser } from "@/services/auth/authorization";
import { SearchErrorState } from "@/components/catalog/SearchErrorState";
import { searchHref } from "@/components/catalog/search-types";
import { artistHref } from "@/lib/catalog-links";
import {
  BroadQueryHint,
  DidYouMean,
  FilterPills,
  PendingRemote,
  RefineHint,
  SearchEmpty,
  SearchSummary,
} from "@/components/catalog/search-results/SearchChrome";
import { RemoteFailedNotice } from "@/components/catalog/search-results/RemoteFailedNotice";
import { FiltersDisclosure } from "@/components/catalog/search-results/FiltersDisclosure";
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
// asíncronos que la página compone según `?type=`. La búsqueda avanzada
// (/search/advanced, openspec: redesign-advanced-search) usa las mismas con
// `advanced`: sin pastillas ni "Buscar en otro tipo" (el formulario y las
// pestañas ya lo cubren) y sin redirección por coincidencia exacta única.

const CATEGORIES: ReleaseGroupCategoryValue[] = [
  "studio",
  "single_ep",
  "compilation",
  "live_other",
];
const DECADES = [1960, 1970, 1980, 1990, 2000, 2010, 2020];

interface SectionProps {
  query: string;
  /** Criterios del tipo (`parseCriteria`): Persona/Grupo, categorías y los de la búsqueda avanzada. */
  criteria?: SearchCriteria;
  /** Página /search/advanced. */
  advanced?: boolean;
}

// ---------- Artistas

export async function ArtistSection({
  query,
  all = false,
  criteria = {},
  advanced = false,
}: SectionProps & { all?: boolean }) {
  const t = await getTranslations("catalog.search.results.artists");
  // Lo local se ve de inmediato y lo de MusicBrainz llega por streaming, como en Álbumes y
  // Canciones (openspec: speed-up-search).
  let local: ArtistSearchResponse;
  try {
    local = await searchArtists(query, { filters: artistFilters(criteria), localOnly: true });
  } catch {
    return <SearchErrorState />;
  }

  const { artistType } = criteria;
  const filterHref = (value?: "person" | "group") =>
    searchHref("artist", query, {
      artistType: value,
      all: all ? "1" : undefined,
    });
  const pills = advanced ? null : (
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
  );

  return (
    <Suspense
      fallback={
        <LocalFirst
          summary={
            <>
              <SearchSummary query={query} type="artist" count={null} advanced={advanced} />
              {pills}
            </>
          }
        >
          {local.results.length > 0 ? <ArtistResults query={query} results={local.results} /> : null}
        </LocalFirst>
      }
    >
      <ArtistRemote query={query} all={all} criteria={criteria} advanced={advanced} pills={pills} />
    </Suspense>
  );
}

async function ArtistRemote({
  query,
  all,
  criteria,
  advanced,
  pills,
}: {
  query: string;
  all: boolean;
  criteria: SearchCriteria;
  advanced: boolean;
  pills: ReactNode;
}) {
  let response: ArtistSearchResponse;
  try {
    response = await searchArtists(query, { filters: artistFilters(criteria) });
  } catch {
    return <SearchErrorState query={query} />;
  }

  // Coincidencia exacta única → perfil directo, con "¿No era este?" para
  // volver a la lista (`all=1`). Con un criterio la persona está explorando la
  // lista, no buscando un nombre: no se redirige. Se decide acá, con la
  // respuesta de MusicBrainz (sin ella no se sabe si hay homónimos), aunque lo
  // local ya se haya mostrado.
  const unique = !advanced && !all && !hasCriteria(criteria) ? uniqueExactArtist(response) : null;
  if (unique) {
    redirect({
      href: `${artistHref(unique.name, unique.id)}?${new URLSearchParams({ from: "search", q: query }).toString()}`,
      locale: await getLocale(),
    });
  }

  const empty = response.results.length === 0;
  const filtered = Boolean(criteria.artistType);
  // Géneros de la mejor coincidencia (la primera exacta), para distinguirla de sus homónimos.
  const best = response.results.find((artist) => artist.exact);
  const locale = await getLocale();
  const bestGenres = best
    ? (await getArtistGenres(best.id).catch(() => ({ genres: [] }))).genres
        .slice(0, 3)
        .map((genre) => (locale.startsWith("es") ? (genre.nameEs ?? genre.name) : genre.name))
    : [];
  // Sin resultados ni filtro, las pastillas no tienen nada que filtrar (openspec: refine-search-results-phase1).
  // Sugerencia con la lista vacía o débil: ningún nombre cubre todas las palabras de la consulta.
  const weak = !empty && response.results.every((artist) => coverageLevel(query, artist.name, []) === 4);
  const suggestion = (empty || weak) && !filtered && !advanced && query ? await suggestSpelling("artist", query) : null;
  return (
    <>
      <SearchSummary
        query={query}
        type="artist"
        count={response.total ?? response.results.length}
        advanced={advanced}
      />
      {empty && !filtered ? null : pills}
      {advanced && !query ? <BroadQueryHint total={response.total} /> : null}
      {response.remoteFailed ? <RemoteFailedNotice /> : null}
      {weak && suggestion ? <DidYouMean type="artist" suggestion={suggestion} /> : null}
      {empty ? (
        <SearchEmpty
          query={query}
          type="artist"
          advanced={advanced}
          suggestion={suggestion}
          clearFiltersHref={filtered && !advanced ? searchHref("artist", query) : null}
        />
      ) : (
        <div className="flex flex-col gap-4">
          <ArtistResults query={query} results={response.results} bestGenres={bestGenres} />
          {response.nextOffset !== null ? (
            <LoadMoreResults
              kind="artist"
              query={query}
              filters={{ criteria }}
              initialNextOffset={response.nextOffset}
              seen={response.results.map((artist) => artist.id)}
            />
          ) : null}
        </div>
      )}
    </>
  );
}

// ---------- Álbumes

export async function AlbumSection({
  query,
  decade,
  criteria = {},
  advanced = false,
}: SectionProps & {
  /** Ya resuelta: sin década si hay un rango de años (`effectiveDecade`). */
  decade?: number;
}) {
  const t = await getTranslations("catalog");
  // Sesión para el menú de acciones de cada disco (openspec: extend-album-quick-actions).
  const viewer = await getCurrentUser();
  const authenticated = viewer !== null;
  const options = { ...albumOptions(criteria), decade };
  const local = await searchAlbums(query, { ...options, localOnly: true });
  // Pastillas de la búsqueda rápida: una categoría y una década.
  const category = criteria.category?.[0];
  const href = (extra: { category?: string; decade?: number }) =>
    searchHref("album", query, { category, decade, ...extra });

  // Los filtros van debajo del encabezado de resultados, tanto mientras llega
  // MusicBrainz (fallback) como en la lista final.
  const pills = advanced ? null : (
    <FiltersDisclosure active={(category ? 1 : 0) + (decade !== undefined ? 1 : 0)}>
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
            href: searchHref("album", query, { category }),
            active: decade === undefined,
          },
          ...DECADES.map((value) => ({
            key: String(value),
            label: t("search.results.albums.decade", { decade: value }),
            href: href({ decade: value }),
            active: decade === value,
          })),
        ]}
      />
    </FiltersDisclosure>
  );

  return (
    <Suspense
      fallback={
        <LocalFirst
          summary={
            <>
              <SearchSummary query={query} type="album" count={null} advanced={advanced} />
              {pills}
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
        decade={decade}
        criteria={criteria}
        advanced={advanced}
        pills={pills}
        authenticated={authenticated}
        viewerId={viewer?.id ?? null}
      />
    </Suspense>
  );
}

async function AlbumRemote({
  query,
  decade,
  criteria,
  advanced,
  pills,
  authenticated,
  viewerId,
}: {
  query: string;
  decade?: number;
  criteria: SearchCriteria;
  advanced: boolean;
  pills: ReactNode;
  authenticated: boolean;
  viewerId?: string | null;
}) {
  let response: AlbumSearchResponse;
  try {
    response = await searchAlbums(query, { ...albumOptions(criteria), decade });
    response = { ...response, results: await withViewerStars(response.results, viewerId ?? null) };
  } catch {
    return <SearchErrorState query={query} />;
  }
  const empty = response.results.length === 0;
  const filtered = Boolean(criteria.category?.length) || decade !== undefined;
  const weak =
    !empty &&
    response.results.every((album) => coverageLevel(query, album.title, album.artistName ? [album.artistName] : []) === 4);
  const suggestion = (empty || weak) && !filtered && !advanced && query ? await suggestSpelling("album", query) : null;
  return (
    <>
      <SearchSummary
        query={query}
        type="album"
        count={response.total ?? response.results.length}
        advanced={advanced}
      />
      {empty && !filtered ? null : pills}
      {advanced && !query ? <BroadQueryHint total={response.total} /> : null}
      {response.remoteFailed ? <RemoteFailedNotice /> : null}
      {weak && suggestion ? <DidYouMean type="album" suggestion={suggestion} /> : null}
      {response.refine ? (
        <RefineHint kind="album" query={query} {...response.refine} />
      ) : null}
      {empty ? (
        <SearchEmpty
          query={query}
          type="album"
          advanced={advanced}
          suggestion={suggestion}
          clearFiltersHref={filtered && !advanced ? searchHref("album", query) : null}
        />
      ) : (
        <div className="flex flex-col gap-4">
          <AlbumList albums={response.results} authenticated={authenticated} />
          {response.nextOffset !== null ? (
            <LoadMoreResults
              kind="album"
              query={query}
              filters={{ decade, criteria }}
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

export async function SongSection({ query, criteria = {}, advanced = false }: SectionProps) {
  const local = await searchSongs(query, { localOnly: true, filters: songFilters(criteria) });
  return (
    <Suspense
      fallback={
        <LocalFirst
          summary={<SearchSummary query={query} type="song" count={null} advanced={advanced} />}
        >
          {local.results.length > 0 ? <SongResults response={local} /> : null}
        </LocalFirst>
      }
    >
      <SongRemote query={query} criteria={criteria} advanced={advanced} />
    </Suspense>
  );
}

async function SongRemote({
  query,
  criteria,
  advanced,
}: {
  query: string;
  criteria: SearchCriteria;
  advanced: boolean;
}) {
  let response: SongSearchResponse;
  try {
    response = await searchSongs(query, { filters: songFilters(criteria) });
  } catch {
    return <SearchErrorState query={query} />;
  }
  const empty = response.results.length === 0;
  const weak =
    !empty &&
    response.results.every((group) => coverageLevel(query, group.title, group.artistName ? [group.artistName] : []) === 4);
  const suggestion = (empty || weak) && !advanced && query ? await suggestSpelling("song", query) : null;
  return (
    <>
      <SearchSummary query={query} type="song" count={null} advanced={advanced} />
      {advanced ? null : (
        <SongInterpretation
          interpretation={response.interpretation}
          alternatives={response.alternatives}
        />
      )}
      {advanced && !query ? <BroadQueryHint total={response.total} /> : null}
      {response.remoteFailed ? <RemoteFailedNotice /> : null}
      {weak && suggestion ? <DidYouMean type="song" suggestion={suggestion} /> : null}
      {response.refine ? (
        <RefineHint kind="song" query={query} {...response.refine} />
      ) : null}
      {empty ? (
        <SearchEmpty query={query} type="song" advanced={advanced} suggestion={suggestion} />
      ) : (
        <div className="flex flex-col gap-4">
          <SongResults response={response} />
          {response.nextOffset !== null ? (
            <LoadMoreResults
              kind="song"
              query={query}
              filters={{ criteria }}
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
      {children}
      <PendingRemote />
    </>
  );
}
