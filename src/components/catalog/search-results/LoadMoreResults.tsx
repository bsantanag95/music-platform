"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { searchAlbums, searchArtists, searchSongs, type CatalogSearchFilters } from "@/lib/api/catalog";
import type { AlbumSearchResult, ArtistSearchResult, SongGroupResult } from "@/lib/api/schemas";
import { AlbumList } from "./AlbumResults";
import { ArtistList } from "./ArtistResults";
import { SongList } from "./SongResults";
import type { ResultHighlight } from "@/services/catalog/search/filters";
import { useResultsView } from "../advanced-search/ResultsView";
import { ResultsTable } from "../advanced-search/ResultsTable";

interface LoadMoreResultsProps {
  kind: "artist" | "album" | "song";
  query: string;
  filters: Omit<CatalogSearchFilters, "offset">;
  /** `nextOffset` de la primera página (resuelta en el servidor). */
  initialNextOffset: number;
  /** Ids (artistas, álbumes) o keys (canciones) ya mostrados, para no repetirlos. */
  seen: string[];
  /** Hay sesión: el menú de acciones de cada disco pide sus marcas al abrirse. */
  authenticated?: boolean;
  /** Búsqueda avanzada: datos filtrados que se destacan (openspec: refine-advanced-search-phase3). */
  highlight?: ResultHighlight[];
}

// "Cargar más" de Álbumes y Canciones (openspec: redesign-scoped-search): pide
// la página siguiente de MusicBrainz y la agrega debajo sin reemplazar lo ya
// mostrado. La primera página la resuelve el servidor. Estado explícito (como
// `UserSearch`): una acción de la persona, no un dato a cachear.
export function LoadMoreResults({
  kind,
  query,
  filters,
  initialNextOffset,
  seen,
  authenticated = false,
  highlight,
}: LoadMoreResultsProps) {
  const t = useTranslations("catalog.search.results");
  // Con la vista Tabla de la búsqueda avanzada, las páginas nuevas llegan como filas de tabla (desde `md`).
  const table = useResultsView() === "table";
  const asTable = (node: ReactNode, rows: ReactNode) =>
    table ? (
      <>
        <div className="md:hidden">{node}</div>
        <div className="hidden md:block">{rows}</div>
      </>
    ) : (
      node
    );
  const [artists, setArtists] = useState<ArtistSearchResult[]>([]);
  const [albums, setAlbums] = useState<AlbumSearchResult[]>([]);
  const [songs, setSongs] = useState<SongGroupResult[]>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(initialNextOffset);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [seenKeys] = useState(() => new Set(seen));

  const loadMore = async () => {
    if (loading || nextOffset === null) return;
    setLoading(true);
    setFailed(false);
    try {
      const params = { ...filters, offset: nextOffset };
      if (kind === "artist") {
        // Artistas pagina desde la búsqueda avanzada sin nombre (openspec: redesign-advanced-search).
        const page = await searchArtists(query, params);
        const fresh = page.results.filter((artist) => !seenKeys.has(artist.id));
        fresh.forEach((artist) => seenKeys.add(artist.id));
        setArtists((current) => [...current, ...fresh]);
        setNextOffset(page.nextOffset ?? null);
      } else if (kind === "album") {
        const page = await searchAlbums(query, params);
        const fresh = page.results.filter((album) => !seenKeys.has(album.id));
        fresh.forEach((album) => seenKeys.add(album.id));
        setAlbums((current) => [...current, ...fresh]);
        setNextOffset(page.nextOffset);
      } else {
        const page = await searchSongs(query, params);
        const fresh = page.results.filter((group) => !seenKeys.has(group.key));
        fresh.forEach((group) => seenKeys.add(group.key));
        setSongs((current) => [...current, ...fresh]);
        setNextOffset(page.nextOffset);
      }
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4" aria-busy={loading}>
      {artists.length > 0
        ? asTable(
            <ArtistList artists={artists} highlight={highlight} />,
            <ResultsTable type="artist" rows={artists} highlight={highlight ?? []} header={false} />,
          )
        : null}
      {albums.length > 0
        ? asTable(
            <AlbumList albums={albums} authenticated={authenticated} highlight={highlight} />,
            <ResultsTable type="album" rows={albums} highlight={highlight ?? []} header={false} />,
          )
        : null}
      {songs.length > 0
        ? asTable(
            <SongList groups={songs} highlight={highlight} />,
            <ResultsTable type="song" rows={songs} highlight={highlight ?? []} header={false} />,
          )
        : null}

      {failed ? (
        <p role="alert" className="font-body text-sm text-danger">
          {t("loadMoreError")}
        </p>
      ) : null}

      {loading ? (
        <p role="status" className="font-data text-xs text-paper-muted">
          {t("loadingMore")}
        </p>
      ) : nextOffset !== null ? (
        <button
          type="button"
          onClick={() => void loadMore()}
          className="self-start rounded border border-ink-border px-4 py-2 font-data text-xs text-paper transition-colors hover:border-amber"
        >
          {failed ? t("remoteFailed.retry") : t("loadMore")}
        </button>
      ) : null}
    </div>
  );
}
