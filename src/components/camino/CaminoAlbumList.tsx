"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { ListenEntryForm } from "@/components/diary/ListenEntryForm";
import type { ListenEntry } from "@/lib/api/schemas";
import { sortAlphabetically, sortByYear } from "@/components/artist-journey/artist-journey-sort";

export interface CaminoAlbumRow {
  id: string;
  title: string;
  artistName: string | null;
  firstReleaseYear: number | null;
  coverThumbUrl: string | null;
  listened: boolean;
}

type Sort = "year" | "alpha";
type Mode = "list" | "graphic";

interface ProgressActions {
  onMarkListened: (albumId: string) => Promise<void>;
  onUnmarkListened: (albumId: string) => Promise<void>;
}

interface CaminoAlbumListProps {
  albums: CaminoAlbumRow[];
  listenEntries: Record<string, ListenEntry>;
  onEntrySaved: (albumId: string, entry: ListenEntry) => void;
  /** Presente solo cuando quien mira puede registrar/quitar su propia escucha
   * (dueño siempre; visitante trackeando, nunca de lo contrario) — su
   * ausencia oculta el ✓ y las acciones de escucha por completo, no solo las
   * deshabilita, porque sin esto no hay progreso propio que mostrar. */
  progressActions?: ProgressActions;
  /** Presente solo en la gestión propia — un visitante nunca quita álbumes
   * de un Camino ajeno. A diferencia del editor de Recorrido, acá "Quitar"
   * pega contra el servidor al instante (no hay borrador local que
   * guardar), así que necesita su propio indicador de ocupado por fila. */
  onRemove?: (albumId: string) => void;
  removingId?: string | null;
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="13"
      height="13"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

// Lista de álbumes de un Camino, compartida entre la gestión propia
// (`CaminoManager`) y la lectura trackeada (`CaminoReadView`): mismo diseño
// que `ArtistJourneySelectionView`, pero sin agrupar por categoría — un
// Camino es un único conjunto plano, sin el eje "de estudio / en vivo" de la
// discografía de un artista. A cambio, cada fila muestra el artista
// acreditado (`artistName`): un Camino puede mezclar álbumes de artistas
// distintos, a diferencia de un Recorrido, que es siempre del mismo.
export function CaminoAlbumList({
  albums,
  listenEntries,
  onEntrySaved,
  progressActions,
  onRemove,
  removingId = null,
}: CaminoAlbumListProps) {
  const t = useTranslations("camino");
  const tDiary = useTranslations("diary");
  const [sort, setSort] = useState<Sort>("year");
  const [mode, setMode] = useState<Mode>("list");
  const [listeningId, setListeningId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (expandedId) panelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [expandedId]);

  async function toggleListened(album: CaminoAlbumRow) {
    if (!progressActions) return;
    const hasEntry = Boolean(listenEntries[album.id]);
    if (!album.listened) {
      setListeningId(album.id);
      try {
        await progressActions.onMarkListened(album.id);
        setExpandedId((current) => current ?? album.id);
      } finally {
        setListeningId(null);
      }
      return;
    }
    if (!hasEntry) return;
    setListeningId(album.id);
    try {
      await progressActions.onUnmarkListened(album.id);
      setExpandedId((current) => (current === album.id ? null : current));
    } finally {
      setListeningId(null);
    }
  }

  const sorted = useMemo(
    () => (sort === "year" ? sortByYear(albums) : sortAlphabetically(albums)),
    [albums, sort],
  );

  function listenForm(albumId: string) {
    const entry = listenEntries[albumId];
    if (!entry) return null;
    return (
      <ListenEntryForm
        entryId={entry.id}
        target={entry.target}
        initial={{
          listenContext: entry.listenContext,
          body: entry.body,
          reaction: entry.reaction,
          audience: entry.audience,
        }}
        onSaved={(saved) => onEntrySaved(albumId, saved)}
      />
    );
  }

  const expandedAlbum = sorted.find((a) => a.id === expandedId);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <FilterSelect
          value={sort}
          onChange={(value) => setSort(value as Sort)}
          ariaLabel={t("selection.sortLabel")}
          widthClassName="w-[25ch]"
        >
          <option value="year">{t("selection.sortYear")}</option>
          <option value="alpha">{t("selection.sortAlpha")}</option>
        </FilterSelect>

        <div
          role="radiogroup"
          aria-label={t("selection.modeLabel")}
          className="flex shrink-0 items-center gap-1 rounded-md border border-ink-border p-0.5"
        >
          {(["list", "graphic"] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={mode === value}
              onClick={() => setMode(value)}
              className={`rounded px-2.5 py-1 font-data text-xs transition-colors ${
                mode === value ? "bg-amber/10 text-amber" : "text-paper-muted hover:text-paper"
              }`}
            >
              {t(`selection.mode${value === "list" ? "List" : "Graphic"}`)}
            </button>
          ))}
        </div>
      </div>

      {mode === "list" ? (
        <ul className="flex flex-col divide-y divide-ink-border border-t border-ink-border">
          {sorted.map((album) => {
            const hasEntry = Boolean(listenEntries[album.id]);
            const canUndo = album.listened && hasEntry;
            const expanded = expandedId === album.id && hasEntry;
            return (
              <li key={album.id} className="flex flex-col gap-3 py-2">
                <div className="flex items-center gap-3">
                  <Link href={`/album/${album.id}`} className="shrink-0" tabIndex={-1} aria-hidden>
                    <CoverThumb cover={album.coverThumbUrl} label="" className="size-12" />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/album/${album.id}`}
                      className="block truncate font-body text-sm text-paper transition-colors hover:text-amber"
                    >
                      {album.title}
                    </Link>
                    {album.artistName && (
                      <span className="block truncate font-data text-xs text-paper-muted">
                        {album.artistName}
                      </span>
                    )}
                  </div>
                  {album.firstReleaseYear !== null && (
                    <span className="shrink-0 font-data text-xs text-paper-muted">
                      {album.firstReleaseYear}
                    </span>
                  )}
                  {progressActions && album.listened && (
                    <span className="shrink-0 font-data text-xs text-petrol">
                      ✓ {t("selection.listened")}
                    </span>
                  )}
                  {progressActions && hasEntry && (
                    <button
                      type="button"
                      onClick={() => setExpandedId((cur) => (cur === album.id ? null : album.id))}
                      className="shrink-0 font-data text-xs text-paper-muted underline decoration-dotted transition-colors hover:text-paper"
                    >
                      {expanded ? tDiary("collapse") : tDiary("expand")}
                    </button>
                  )}
                  {progressActions && (!album.listened || canUndo) && (
                    <button
                      type="button"
                      disabled={listeningId === album.id}
                      onClick={() => void toggleListened(album)}
                      aria-label={
                        canUndo
                          ? t("selection.removeListenAlbum", { title: album.title })
                          : t("selection.registerListenAlbum", { title: album.title })
                      }
                      className={`shrink-0 font-data text-xs underline decoration-dotted transition-colors disabled:opacity-50 ${
                        canUndo ? "text-paper-muted hover:text-danger" : "text-paper-muted hover:text-amber"
                      }`}
                    >
                      {listeningId === album.id
                        ? t("selection.registeringListen")
                        : canUndo
                          ? t("selection.removeListen")
                          : t("selection.registerListen")}
                    </button>
                  )}
                  {onRemove && (
                    <button
                      type="button"
                      disabled={removingId === album.id}
                      onClick={() => onRemove(album.id)}
                      aria-label={t("removeAlbum", { title: album.title })}
                      className="shrink-0 font-data text-xs text-paper-muted underline decoration-dotted transition-colors hover:text-danger disabled:opacity-50"
                    >
                      {t("selection.remove")}
                    </button>
                  )}
                </div>
                {expanded && <div ref={panelRef}>{listenForm(album.id)}</div>}
              </li>
            );
          })}
        </ul>
      ) : (
        <>
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
            {sorted.map((album) => {
              const hasEntry = Boolean(listenEntries[album.id]);
              const canUndo = album.listened && hasEntry;
              const expanded = expandedId === album.id && hasEntry;
              return (
                <li key={album.id} className="flex flex-col gap-1.5">
                  <div className="relative overflow-hidden rounded-md border border-ink-border">
                    <Link href={`/album/${album.id}`}>
                      <CoverThumb cover={album.coverThumbUrl} label="" className="aspect-square w-full" />
                    </Link>
                    {progressActions && (
                      <button
                        type="button"
                        disabled={(album.listened && !hasEntry) || listeningId === album.id}
                        onClick={() => void toggleListened(album)}
                        aria-label={
                          canUndo
                            ? t("selection.removeListenAlbum", { title: album.title })
                            : album.listened
                              ? t("selection.listenedAlbum", { title: album.title })
                              : t("selection.registerListenAlbum", { title: album.title })
                        }
                        className={`absolute left-1 top-1 flex size-6 items-center justify-center rounded-full border shadow-sm transition-colors ${
                          canUndo
                            ? "border-petrol bg-petrol text-ink hover:border-danger hover:bg-danger hover:text-paper"
                            : album.listened
                              ? "cursor-default border-petrol/70 bg-petrol/90 text-ink"
                              : "border-paper-muted/70 bg-ink/80 text-paper-muted hover:border-amber hover:text-amber"
                        }`}
                      >
                        <CheckIcon />
                      </button>
                    )}
                    {onRemove && (
                      <button
                        type="button"
                        disabled={removingId === album.id}
                        onClick={() => onRemove(album.id)}
                        aria-label={t("removeAlbum", { title: album.title })}
                        className="absolute right-1 top-1 flex size-5 items-center justify-center rounded bg-ink/80 font-data text-xs text-paper-muted transition-colors hover:text-danger disabled:opacity-50"
                      >
                        <span aria-hidden="true">✕</span>
                      </button>
                    )}
                  </div>
                  <Link
                    href={`/album/${album.id}`}
                    className="truncate font-data text-xs text-paper-muted transition-colors hover:text-amber"
                  >
                    {album.title}
                  </Link>
                  {album.artistName && (
                    <span className="truncate font-data text-[0.65rem] text-paper-muted/80">
                      {album.artistName}
                    </span>
                  )}
                  {progressActions && hasEntry && (
                    <button
                      type="button"
                      onClick={() => setExpandedId((cur) => (cur === album.id ? null : album.id))}
                      className="truncate text-left font-data text-xs text-paper-muted underline decoration-dotted transition-colors hover:text-paper"
                    >
                      {expanded ? tDiary("collapse") : tDiary("expand")}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
          {expandedAlbum && (
            <div ref={panelRef} className="flex flex-col gap-2">
              <span className="font-data text-xs text-paper-muted">{expandedAlbum.title}</span>
              {listenForm(expandedAlbum.id)}
            </div>
          )}
        </>
      )}
    </div>
  );
}
