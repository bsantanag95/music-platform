"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { searchCatalog, getReleaseGroupDetail } from "@/lib/api/catalog";
import { addItemToList } from "@/lib/api/lists";
import { ApiError } from "@/lib/api/client";
import type {
  CatalogSearchResult,
  ListEntityType,
  Track,
  UserListDetail,
} from "@/lib/api/schemas";

interface ListItemSearchProps {
  listId: string;
  entityType: ListEntityType;
  /** Ids de objetivo ya presentes en la lista, para marcar "ya está". */
  existingTargetIds: Set<string>;
  onAdded: (list: UserListDetail) => void;
  onClose: () => void;
}

const MIN_QUERY = 2;

// Alta de ítems desde el detalle. Panel inline (no modal). Para listas de
// artistas y álbumes busca el catálogo directo; para listas de canciones busca
// un álbum y ofrece elegir pistas de su tracklist (el catálogo no tiene
// búsqueda de canciones). Reutiliza `POST /items` — sin endpoint nuevo.
export function ListItemSearch({
  listId,
  entityType,
  existingTargetIds,
  onAdded,
  onClose,
}: ListItemSearchProps) {
  const t = useTranslations("lists");
  const searchKind = entityType === "artist" ? "artist" : "release-group";

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CatalogSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Solo listas de canciones: álbum elegido y su tracklist.
  const [album, setAlbum] = useState<{ title: string; tracks: Track[] } | null>(null);
  const [albumLoading, setAlbumLoading] = useState(false);

  const reqId = useRef(0);

  useEffect(() => {
    const q = query.trim();
    if (q.length < MIN_QUERY) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const id = window.setTimeout(() => {
      const current = ++reqId.current;
      searchCatalog(q)
        .then((res) => {
          if (current !== reqId.current) return;
          setResults(res.results.filter((r) => r.kind === searchKind));
          setError(false);
        })
        .catch(() => {
          if (current !== reqId.current) return;
          setError(true);
        })
        .finally(() => {
          if (current === reqId.current) setLoading(false);
        });
    }, 300);
    return () => window.clearTimeout(id);
  }, [query, searchKind]);

  const add = async (targetId: string) => {
    setBusyId(targetId);
    setError(false);
    try {
      const list = await addItemToList(listId, { type: entityType, id: targetId });
      onAdded(list);
    } catch (err) {
      if (!(err instanceof ApiError && err.code === "VALIDATION_ERROR")) setError(true);
    } finally {
      setBusyId(null);
    }
  };

  const openAlbum = async (releaseGroupId: string, title: string) => {
    setAlbumLoading(true);
    setError(false);
    try {
      const detail = await getReleaseGroupDetail(releaseGroupId);
      setAlbum({ title, tracks: detail.tracks });
    } catch {
      setError(true);
    } finally {
      setAlbumLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-ink-border bg-ink-surface p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="font-display text-sm text-paper">{t("addItem")}</span>
        <button
          type="button"
          onClick={onClose}
          className="font-data text-xs text-paper-muted transition-colors hover:text-paper"
        >
          {t("collapse")}
        </button>
      </div>

      {album ? (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setAlbum(null)}
            className="self-start font-data text-xs text-paper-muted transition-colors hover:text-paper"
          >
            {t("itemSearchBack")}
          </button>
          <p className="font-data text-xs text-paper-muted">
            {t("itemSearchTracklistOf", { title: album.title })}
          </p>
          <ul className="flex flex-col">
            {album.tracks.map((track) => {
              const done = existingTargetIds.has(track.recordingId);
              return (
                <li
                  key={track.recordingId}
                  className="flex items-center gap-3 border-b border-ink-border py-2 last:border-b-0"
                >
                  <span className="w-6 shrink-0 text-right font-data text-xs text-paper-muted">
                    {track.position}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-display text-sm text-paper">
                    {track.title}
                  </span>
                  <AddButton
                    done={done}
                    busy={busyId === track.recordingId}
                    onAdd={() => void add(track.recordingId)}
                    doneLabel={t("itemAlreadyInList")}
                    addLabel={t("itemSearchAdd")}
                  />
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <input
            type="search"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              entityType === "artist"
                ? t("itemSearchPlaceholderArtist")
                : entityType === "release-group"
                  ? t("itemSearchPlaceholderAlbum")
                  : t("itemSearchPlaceholderSong")
            }
            aria-label={t("itemSearchLabel")}
            className="w-full rounded-md border border-ink-border bg-ink px-3.5 py-2 font-data text-sm text-paper placeholder:text-paper-muted"
          />

          <span role="status" aria-live="polite" className="sr-only">
            {loading ? t("itemSearchLoading") : t("itemSearchCount", { count: results.length })}
          </span>

          {query.trim().length > 0 && query.trim().length < MIN_QUERY ? (
            <p className="font-data text-xs text-paper-muted">{t("itemSearchMinChars")}</p>
          ) : null}

          {loading || albumLoading ? (
            <p className="font-data text-xs text-paper-muted">{t("itemSearchLoading")}</p>
          ) : null}

          {query.trim().length >= MIN_QUERY && !loading && results.length === 0 && !error ? (
            <p className="font-data text-xs text-paper-muted">{t("itemSearchNoResults")}</p>
          ) : null}

          <ul className="flex flex-col">
            {results.map((result) => {
              const done = existingTargetIds.has(result.id);
              return (
                <li
                  key={result.id}
                  className="flex items-center gap-3 border-b border-ink-border py-2 last:border-b-0"
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-display text-sm text-paper">{result.name}</span>
                    {result.subtitle ? (
                      <span className="truncate font-data text-xs text-paper-muted">
                        {result.subtitle}
                        {result.year !== null ? ` · ${result.year}` : ""}
                      </span>
                    ) : null}
                  </span>
                  {entityType === "recording" ? (
                    <button
                      type="button"
                      disabled={albumLoading}
                      onClick={() => void openAlbum(result.id, result.name)}
                      className="shrink-0 font-data text-xs text-paper-muted underline decoration-dotted transition-colors hover:text-paper disabled:opacity-40"
                    >
                      {t("itemSearchOpenAlbum")}
                    </button>
                  ) : (
                    <AddButton
                      done={done}
                      busy={busyId === result.id}
                      onAdd={() => void add(result.id)}
                      doneLabel={t("itemAlreadyInList")}
                      addLabel={t("itemSearchAdd")}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {error ? (
        <span role="alert" className="font-data text-xs text-danger">
          {t("itemSearchError")}
        </span>
      ) : null}
    </div>
  );
}

function AddButton({
  done,
  busy,
  onAdd,
  doneLabel,
  addLabel,
}: {
  done: boolean;
  busy: boolean;
  onAdd: () => void;
  doneLabel: string;
  addLabel: string;
}) {
  if (done) {
    return <span className="shrink-0 font-data text-xs text-paper-muted">{doneLabel}</span>;
  }
  return (
    <Button variant="secondary" disabled={busy} onClick={onAdd} className="shrink-0 px-3 py-1 text-xs">
      {addLabel}
    </Button>
  );
}
