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
  albumCatalogFilters,
  albumOptions,
  artistCatalogFilters,
  artistFilters,
  hasCriteria,
  isCatalogOnly,
  songFilters,
  type SearchCriteria,
} from "@/services/catalog/search/filters";
import type { ReleaseGroupCategoryValue } from "@/services/catalog/ingest-release-group";
import { getProfileByUsername, searchUsers } from "@/services/social/profiles";
import { suggestSpelling } from "@/services/catalog/search/spelling";
import { coverageLevel } from "@/services/catalog/search/coverage";
import { withViewerStars } from "@/services/catalog/search/activity";
import { getArtistGenres } from "@/services/genres/display";
import { displayCount } from "@/services/catalog/search/display-count";
import { getCurrentUser } from "@/services/auth/authorization";
import { SearchErrorState } from "@/components/catalog/SearchErrorState";
import { searchHref } from "@/components/catalog/search-types";
import { artistHref } from "@/lib/catalog-links";
import {
  BroadQueryHint,
  CatalogOnlyNotice,
  DidYouMean,
  FilterPills,
  PendingRemote,
  RefineHint,
  SearchEmpty,
  SearchSummary,
} from "@/components/catalog/search-results/SearchChrome";
import { RemoteFailedNotice } from "@/components/catalog/search-results/RemoteFailedNotice";
import { FiltersDisclosure } from "@/components/catalog/search-results/FiltersDisclosure";
import { AsidePanel, ResultsLayout } from "@/components/catalog/search-results/ResultsLayout";
import { ArtistAnswerResults, ArtistResults } from "@/components/catalog/search-results/ArtistResults";
import { answeredIds, pickArtistAnswer } from "@/services/catalog/search/artist-answer";
import { AlbumList } from "@/components/catalog/search-results/AlbumResults";
import { AlbumGrid } from "@/components/catalog/search-results/AlbumGrid";
import { albumView } from "@/services/catalog/search/same-title";
import { AlbumAnswer, albumAnswerOf, albumSiblingsOf } from "@/components/catalog/search-results/AlbumAnswer";
import { ResultsGroupHeading } from "@/components/catalog/search-results/ResultsGroupHeading";
import { OtherTypePanel } from "@/components/catalog/search-results/OtherTypePanel";
import { SearchNoResults } from "@/components/catalog/search-results/SearchNoResults";
import { RecentSearches } from "@/components/catalog/RecentSearches";
import { getStoredTracklistPreview } from "@/services/catalog/search/tracklist-preview";
import {
  SongInterpretation,
  SongResults,
} from "@/components/catalog/search-results/SongResults";
import { LoadMoreResults } from "@/components/catalog/search-results/LoadMoreResults";
import {
  AdvancedEmpty,
  AlternativeCount,
  MAX_COUNTED_ALTERNATIVES,
} from "@/components/catalog/advanced-search/AdvancedEmpty";
import {
  criterionChips,
  highlightFields,
  removeCriterion,
  type CriterionChip,
} from "@/services/catalog/search/filters";
import { ResultsViewSwitch } from "@/components/catalog/advanced-search/ResultsView";
import { ResultsTable } from "@/components/catalog/advanced-search/ResultsTable";
import type { SearchType } from "@/services/catalog/search/types";
import { UserResults } from "@/components/catalog/search-results/UserResults";

// Secciones de /search por tipo (openspec: redesign-scoped-search). Viven
// fuera de page.tsx para poder probarlas directamente: son Server Components
// asíncronos que la página compone según `?type=`. La búsqueda avanzada
// (/search/advanced, openspec: redesign-advanced-search) usa las mismas con
// `advanced`: sin pastillas ni "Buscar en otro tipo" (el formulario y las
// pestañas ya lo cubren) y sin redirección por coincidencia exacta única.
// Desde redesign-search-phase1 la rápida reparte cada tipo en `ResultsLayout`: pestañas arriba, resultados y una
// columna lateral con los filtros y «Acotar»; la avanzada conserva su secuencia.

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
  // Solo del catálogo: una consulta local paginada, sin MusicBrainz que esperar ni streaming
  // (openspec: add-catalog-search-fields).
  if (isCatalogOnly(criteria)) {
    return <ArtistRemote query={query} all={all} criteria={criteria} advanced={advanced} pills={null} />;
  }
  // Lo local se ve de inmediato y lo de MusicBrainz llega por streaming, como en Álbumes y
  // Canciones (openspec: speed-up-search).
  let local: ArtistSearchResponse;
  try {
    local = await searchArtists(query, { filters: artistFilters(criteria), localOnly: true });
  } catch {
    return <SearchErrorState />;
  }

  const { artistType } = criteria;
  const filterHref = (value?: "solo" | "group") =>
    searchHref("artist", query, {
      artistType: value,
      all: all ? "1" : undefined,
    });
  const pills = advanced ? null : (
    <AsidePanel>
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
            key: "solo",
            label: t("filterPerson"),
            href: filterHref("solo"),
            active: artistType === "solo",
          },
          {
            key: "group",
            label: t("filterGroup"),
            href: filterHref("group"),
            active: artistType === "group",
          },
        ]}
      />
    </AsidePanel>
  );

  return (
    <Suspense
      fallback={
        <LocalFirst
          summary={<SearchSummary query={query} type="artist" count={null} advanced={advanced} artistType={criteria.artistType} />}
          aside={pills}
          advanced={advanced}
        >
          {local.results.length === 0 ? null : advanced ? (
            <ArtistResults query={query} results={local.results} compactHeadings />
          ) : (
            // Lo local ya permite elegir la respuesta con la misma regla (openspec: redesign-search-phase2).
            <ArtistAnswerResults query={query} results={local.results} answer={pickArtistAnswer(query, local.results)} />
          )}
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
    response = await searchArtists(query, {
      filters: artistFilters(criteria),
      catalog: artistCatalogFilters(criteria),
    });
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
  const highlight = advanced ? highlightFields("artist", criteria) : undefined;
  // La respuesta de la rápida se elige por presencia en el catálogo (openspec: redesign-search-phase2, design D1); la
  // avanzada conserva la primera exacta como mejor coincidencia.
  const answer = advanced ? null : pickArtistAnswer(query, response.results);
  const best = response.results.find((artist) => artist.exact);
  const locale = await getLocale();
  const genresOf = async (id: string) =>
    (await getArtistGenres(id).catch(() => ({ genres: [] }))).genres
      .slice(0, 3)
      .map((genre) => (locale.startsWith("es") ? (genre.nameEs ?? genre.name) : genre.name));
  // Géneros de lo que va arriba: la mejor coincidencia de la avanzada, o la respuesta o cada opción de la elección.
  const genreIds = answer ? [...answeredIds(answer)] : best ? [best.id] : [];
  const genresById = Object.fromEntries(await Promise.all(genreIds.map(async (id) => [id, await genresOf(id)] as const)));
  const bestGenres = best ? (genresById[best.id] ?? []) : [];
  // Sin resultados ni filtro, las pastillas no tienen nada que filtrar (openspec: refine-search-results-phase1).
  // Sugerencia con la lista vacía o débil: ningún nombre cubre todas las palabras de la consulta.
  const weak = !empty && response.results.every((artist) => coverageLevel(query, artist.name, []) === 4);
  const suggestion = (empty || weak) && !filtered && !advanced && query ? await suggestSpelling("artist", query) : null;
  const summary = (
    <SearchSummary
      query={query}
      type="artist"
      count={displayCount(response.total, response.results.length)}
      advanced={advanced}
      artistType={criteria.artistType}
    />
  );
  const aside = empty && !filtered ? <RecentSearches /> : pills;
  const body = (
    <>
      {response.catalogOnly ? <CatalogOnlyNotice type="artist" /> : null}
      {advanced && !query && !response.catalogOnly ? <BroadQueryHint total={response.total} type="artist" criteria={criteria} /> : null}
      {response.remoteFailed ? <RemoteFailedNotice /> : null}
      {weak && suggestion ? <DidYouMean type="artist" suggestion={suggestion} /> : null}
      {empty && advanced ? (
        <AdvancedNoResults type="artist" query={query} criteria={criteria} />
      ) : empty ? (
        filtered ? (
          <SearchEmpty query={query} type="artist" suggestion={suggestion} clearFiltersHref={searchHref("artist", query)} />
        ) : (
          <SearchNoResults query={query} type="artist" suggestion={suggestion} searchedRemote={!response.remoteFailed} />
        )
      ) : (
        <div className="flex flex-col gap-4">
          {advanced ? (
            // Lista o tabla, con los datos filtrados destacados (openspec: refine-advanced-search-phase3).
            <ResultsViewSwitch
              list={
                <ArtistResults
                  query={query}
                  results={response.results}
                  bestGenres={bestGenres}
                  highlight={highlight}
                  compactHeadings
                />
              }
              table={<ResultsTable type="artist" rows={response.results} highlight={highlight ?? []} />}
            />
          ) : (
            <ArtistAnswerResults query={query} results={response.results} answer={answer ?? { kind: "none" }} genresById={genresById} />
          )}
          {response.nextOffset !== null ? (
            <LoadMoreResults
              kind="artist"
              query={query}
              filters={{ criteria }}
              initialNextOffset={response.nextOffset}
              seen={response.results.map((artist) => artist.id)}
              highlight={highlight}
            />
          ) : null}
        </div>
      )}
    </>
  );
  return (
    <Layout
      advanced={advanced}
      summary={summary}
      aside={aside}
      asideAfter={empty && !filtered ? null : <OtherTypes type="artist" query={query} />}
    >
      {body}
    </Layout>
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
  // Solo del catálogo: una consulta local paginada, sin streaming (openspec: add-catalog-search-fields).
  if (isCatalogOnly(criteria)) {
    return (
      <AlbumRemote
        query={query}
        decade={decade}
        criteria={criteria}
        advanced={advanced}
        pills={null}
        authenticated={authenticated}
        viewerId={viewer?.id ?? null}
      />
    );
  }
  const local = await searchAlbums(query, { ...options, localOnly: true });
  // Pastillas de la búsqueda rápida: una categoría y una década.
  const category = criteria.category?.[0];
  const href = (extra: { category?: string; decade?: number }) =>
    searchHref("album", query, { category, decade, ...extra });

  // Los filtros van debajo del encabezado de resultados, tanto mientras llega
  // MusicBrainz (fallback) como en la lista final.
  const pills = advanced ? null : (
    <AsidePanel>
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
    </AsidePanel>
  );

  return (
    <Suspense
      fallback={
        <LocalFirst
          summary={<SearchSummary query={query} type="album" count={null} advanced={advanced} />}
          aside={pills}
          advanced={advanced}
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
    response = await searchAlbums(query, { ...albumOptions(criteria), catalog: albumCatalogFilters(criteria), decade });
    response = { ...response, results: await withViewerStars(response.results, viewerId ?? null) };
  } catch {
    return <SearchErrorState query={query} />;
  }
  const empty = response.results.length === 0;
  const filtered = Boolean(criteria.category?.length) || decade !== undefined;
  const highlight = advanced ? highlightFields("album", criteria) : undefined;
  const weak =
    !empty &&
    response.results.every((album) => coverageLevel(query, album.title, album.artistName ? [album.artistName] : []) === 4);
  const suggestion = (empty || weak) && !filtered && !advanced && query ? await suggestSpelling("album", query) : null;
  const summary = (
    <SearchSummary query={query} type="album" count={displayCount(response.total, response.results.length)} advanced={advanced} />
  );
  // «Acotar» por artista: en la lateral (en la avanzada, en su lugar de siempre).
  const refine = response.refine?.artists.length ? <RefineHint kind="album" query={query} {...response.refine} /> : null;
  const shownPills = empty && !filtered ? null : pills;
  // Ficha del disco buscado en la rápida (openspec: redesign-search-phase2, design D3); su tracklist solo si ya está
  // guardada: la búsqueda no ingiere.
  const tAlbums = await getTranslations("catalog.search.results.albums");
  const answer = advanced ? null : albumAnswerOf(query, response.results);
  const siblings = answer ? albumSiblingsOf(answer, response.results) : [];
  const tracks = answer ? await getStoredTracklistPreview(answer.id).catch(() => null) : null;
  const shownAbove = new Set([answer?.id, ...siblings.map((album) => album.id)]);
  const others = response.results.filter((album) => !shownAbove.has(album.id));
  // Con títulos repetidos, rejilla de carátulas con el artista como titular (openspec: redesign-search-phase3, D1).
  const view = answer ? albumView(query, others) : "rows";
  const aside =
    empty && !filtered ? (
      <RecentSearches />
    ) : shownPills || refine ? (
      <>
        {shownPills}
        {refine}
      </>
    ) : null;
  const body = (
    <>
      {response.catalogOnly ? <CatalogOnlyNotice type="album" /> : null}
      {advanced && !query && !response.catalogOnly ? <BroadQueryHint total={response.total} type="album" criteria={criteria} /> : null}
      {response.remoteFailed ? <RemoteFailedNotice /> : null}
      {weak && suggestion ? <DidYouMean type="album" suggestion={suggestion} /> : null}
      {advanced ? refine : null}
      {empty && advanced ? (
        <AdvancedNoResults type="album" query={query} criteria={criteria} />
      ) : empty ? (
        filtered ? (
          <SearchEmpty query={query} type="album" suggestion={suggestion} clearFiltersHref={searchHref("album", query)} />
        ) : (
          <SearchNoResults query={query} type="album" suggestion={suggestion} searchedRemote={!response.remoteFailed} />
        )
      ) : (
        <div className="flex flex-col gap-4">
          {advanced && highlight ? (
            <ResultsViewSwitch
              list={<AlbumList albums={response.results} authenticated={authenticated} highlight={highlight} />}
              table={<ResultsTable type="album" rows={response.results} highlight={highlight} />}
            />
          ) : answer ? (
            <div className="flex flex-col gap-8">
              <AlbumAnswer album={answer} siblings={siblings} tracks={tracks} />
              {others.length > 0 ? (
                <section className="flex flex-col gap-4">
                  <ResultsGroupHeading>
                    {view === "grid" ? tAlbums("othersNamed", { query }) : tAlbums("others")}
                  </ResultsGroupHeading>
                  {view === "grid" ? (
                    <AlbumGrid albums={others} query={query} authenticated={authenticated} />
                  ) : (
                    <AlbumList albums={others} authenticated={authenticated} />
                  )}
                </section>
              ) : null}
            </div>
          ) : (
            <AlbumList albums={response.results} authenticated={authenticated} />
          )}
          {response.nextOffset !== null ? (
            <LoadMoreResults
              kind="album"
              query={query}
              filters={{ decade, criteria }}
              initialNextOffset={response.nextOffset}
              seen={response.results.map((album) => album.id)}
              authenticated={authenticated}
              highlight={highlight}
              view={view}
            />
          ) : null}
        </div>
      )}
    </>
  );
  return (
    <Layout
      advanced={advanced}
      summary={summary}
      aside={advanced ? null : aside}
      asideAfter={empty && !filtered ? null : <OtherTypes type="album" query={query} />}
    >
      {body}
    </Layout>
  );
}

// ---------- Canciones

export async function SongSection({ query, criteria = {}, advanced = false }: SectionProps) {
  const local = await searchSongs(query, { localOnly: true, filters: songFilters(criteria) });
  return (
    <Suspense
      fallback={
        <LocalFirst summary={<SearchSummary query={query} type="song" count={null} advanced={advanced} />} advanced={advanced}>
          {local.results.length > 0 ? <SongResults response={local} plain={advanced && !query} compactHeadings={advanced} /> : null}
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
  const highlight = advanced ? highlightFields("song", criteria) : undefined;
  const summary = (
    <SearchSummary
      query={query}
      type="song"
      count={advanced ? displayCount(response.total, response.results.length) : null}
      advanced={advanced}
    />
  );
  const refine = response.refine?.artists.length ? <RefineHint kind="song" query={query} {...response.refine} /> : null;
  const body = (
    <>
      {advanced ? null : (
        <SongInterpretation
          interpretation={response.interpretation}
          alternatives={response.alternatives}
        />
      )}
      {advanced && !query ? <BroadQueryHint total={response.total} type="song" criteria={criteria} /> : null}
      {response.remoteFailed ? <RemoteFailedNotice /> : null}
      {weak && suggestion ? <DidYouMean type="song" suggestion={suggestion} /> : null}
      {advanced ? refine : null}
      {empty && advanced ? (
        <AdvancedNoResults type="song" query={query} criteria={criteria} />
      ) : empty ? (
        <SearchNoResults query={query} type="song" suggestion={suggestion} searchedRemote={!response.remoteFailed} />
      ) : (
        <div className="flex flex-col gap-4">
          {/* Sin título no hay "mejor coincidencia": lista simple (openspec: refine-advanced-search-phase1). */}
          {advanced && highlight ? (
            <ResultsViewSwitch
              list={<SongResults response={response} plain={!query} highlight={highlight} compactHeadings />}
              table={<ResultsTable type="song" rows={response.results} highlight={highlight} />}
            />
          ) : (
            <SongResults response={response} query={query} />
          )}
          {response.nextOffset !== null ? (
            <LoadMoreResults
              kind="song"
              query={query}
              filters={{ criteria }}
              initialNextOffset={response.nextOffset}
              seen={response.results.map((group) => group.key)}
              highlight={highlight}
            />
          ) : null}
        </div>
      )}
    </>
  );
  return (
    <Layout
      advanced={advanced}
      summary={summary}
      aside={advanced ? null : empty ? <RecentSearches /> : refine}
      asideAfter={empty ? null : <OtherTypes type="song" query={query} />}
    >
      {body}
    </Layout>
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
    <ResultsLayout summary={<SearchSummary query={query} type="user" count={response.hasNext ? null : response.users.length} />}>
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
    </ResultsLayout>
  );
}

// ---------- Sin coincidencias en la búsqueda avanzada

/**
 * Alternativas sin cada criterio (openspec: refine-advanced-search-phase1, design D3). Con 2 a 4 criterios cada enlace
 * suma la cifra que daría, por streaming: los enlaces se ven de inmediato.
 */
function AdvancedNoResults({
  type,
  query,
  criteria,
}: {
  type: Exclude<SearchType, "user">;
  query: string;
  criteria: SearchCriteria;
}) {
  const chips = criterionChips(type, query, criteria);
  const counted = chips.length > 1 && chips.length <= MAX_COUNTED_ALTERNATIVES;
  return (
    <AdvancedEmpty
      type={type}
      query={query}
      criteria={criteria}
      countOf={
        counted
          ? (chip: CriterionChip) => (
              <Suspense fallback={null}>
                <AlternativeCountFor type={type} query={query} criteria={criteria} chip={chip} />
              </Suspense>
            )
          : undefined
      }
    />
  );
}

async function AlternativeCountFor({
  type,
  query,
  criteria,
  chip,
}: {
  type: Exclude<SearchType, "user">;
  query: string;
  criteria: SearchCriteria;
  chip: CriterionChip;
}) {
  const next = removeCriterion(query, criteria, chip);
  let count: number | null = null;
  try {
    if (type === "artist") {
      const response = await searchArtists(next.query, {
        filters: artistFilters(next.criteria),
        catalog: artistCatalogFilters(next.criteria),
      });
      count = displayCount(response.total, response.results.length);
    } else if (type === "album") {
      const response = await searchAlbums(next.query, {
        ...albumOptions(next.criteria),
        catalog: albumCatalogFilters(next.criteria),
      });
      count = displayCount(response.total, response.results.length);
    } else {
      const response = await searchSongs(next.query, { filters: songFilters(next.criteria) });
      count = displayCount(response.total, response.results.length);
    }
  } catch {
    count = null;
  }
  return <AlternativeCount count={count} />;
}

// ---------- Streaming local → remoto

/** Fallback del streaming: lo local ya visible y la pata remota pendiente. */
function LocalFirst({
  summary,
  aside = null,
  advanced,
  children,
}: {
  summary: ReactNode;
  aside?: ReactNode;
  advanced: boolean;
  children: ReactNode;
}) {
  return (
    <Layout advanced={advanced} summary={summary} aside={aside}>
      {children}
      <PendingRemote />
    </Layout>
  );
}

/** La rápida en dos columnas (`ResultsLayout`); la avanzada, en la secuencia de siempre (resumen, lateral, cuerpo). */
function Layout({
  advanced,
  summary,
  aside,
  asideAfter,
  children,
}: {
  advanced: boolean;
  summary: ReactNode;
  aside: ReactNode;
  /** En el teléfono, después de los resultados (`ResultsLayout`); la avanzada no lo muestra. */
  asideAfter?: ReactNode;
  children: ReactNode;
}) {
  if (advanced) {
    return (
      <>
        {summary}
        {aside}
        {children}
      </>
    );
  }
  return (
    <ResultsLayout summary={summary} aside={aside} asideAfter={asideAfter}>
      {children}
    </ResultsLayout>
  );
}

/** «x» en otros tipos (openspec: redesign-search-phase2, design D5): aparte, sin retrasar los resultados. */
function OtherTypes({ type, query }: { type: SearchType; query: string }) {
  return (
    <Suspense fallback={null}>
      <OtherTypePanel type={type} query={query} />
    </Suspense>
  );
}
