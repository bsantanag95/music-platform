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
import { getCurrentUser } from "@/services/auth/authorization";
import { SearchErrorState } from "@/components/catalog/SearchErrorState";
import { searchHref } from "@/components/catalog/search-types";
import { artistHref } from "@/lib/catalog-links";
import {
  BroadQueryHint,
  FilterPills,
  PendingRemote,
  RefineHint,
  SearchEmpty,
  SearchSummary,
} from "@/components/catalog/search-results/SearchChrome";
import { RemoteFailedNotice } from "@/components/catalog/search-results/RemoteFailedNotice";
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
  let response: ArtistSearchResponse | null = null;
  try {
    response = await searchArtists(query, { filters: artistFilters(criteria) });
  } catch {
    return <SearchErrorState />;
  }

  // Coincidencia exacta única → perfil directo, con "¿No era este?" para
  // volver a la lista (`all=1`). Con un criterio la persona está explorando la
  // lista, no buscando un nombre: no se redirige.
  const unique = !advanced && !all && !hasCriteria(criteria) ? uniqueExactArtist(response) : null;
  if (unique) {
    redirect({
      href: `${artistHref(unique.name, unique.id)}?${new URLSearchParams({ from: "search", q: query }).toString()}`,
      locale: await getLocale(),
    });
  }

  const { artistType } = criteria;
  const filterHref = (value?: "person" | "group") =>
    searchHref("artist", query, {
      artistType: value,
      all: all ? "1" : undefined,
    });

  return (
    <>
      <SearchSummary
        query={query}
        type="artist"
        count={response.total ?? response.results.length}
        advanced={advanced}
      />
      {advanced ? null : (
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
      )}
      {advanced && !query ? <BroadQueryHint total={response.total} /> : null}
      {response.remoteFailed ? <RemoteFailedNotice /> : null}
      {response.results.length === 0 ? (
        <SearchEmpty query={query} type="artist" advanced={advanced} />
      ) : (
        <div className="flex flex-col gap-4">
          <ArtistResults query={query} results={response.results} />
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
  const authenticated = (await getCurrentUser()) !== null;
  const options = { ...albumOptions(criteria), decade };
  const local = await searchAlbums(query, { ...options, localOnly: true });
  // Pastillas de la búsqueda rápida: una categoría y una década.
  const category = criteria.category?.[0];
  const href = (extra: { category?: string; decade?: number }) =>
    searchHref("album", query, { category, decade, ...extra });

  // Los filtros van debajo del encabezado de resultados, tanto mientras llega
  // MusicBrainz (fallback) como en la lista final.
  const pills = advanced ? null : (
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
    </div>
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
}: {
  query: string;
  decade?: number;
  criteria: SearchCriteria;
  advanced: boolean;
  pills: ReactNode;
  authenticated: boolean;
}) {
  let response: AlbumSearchResponse;
  try {
    response = await searchAlbums(query, { ...albumOptions(criteria), decade });
  } catch {
    return <SearchErrorState />;
  }
  return (
    <>
      <SearchSummary
        query={query}
        type="album"
        count={response.total ?? response.results.length}
        advanced={advanced}
      />
      {pills}
      {advanced && !query ? <BroadQueryHint total={response.total} /> : null}
      {response.remoteFailed ? <RemoteFailedNotice /> : null}
      {response.refine ? (
        <RefineHint kind="album" query={query} {...response.refine} />
      ) : null}
      {response.results.length === 0 ? (
        <SearchEmpty query={query} type="album" advanced={advanced} />
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
    return <SearchErrorState />;
  }
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
      {response.refine ? (
        <RefineHint kind="song" query={query} {...response.refine} />
      ) : null}
      {response.results.length === 0 ? (
        <SearchEmpty query={query} type="song" advanced={advanced} />
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
      <PendingRemote />
      {children}
    </>
  );
}
