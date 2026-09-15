"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { ListenEntryForm } from "@/components/diary/ListenEntryForm";
import { ReleaseGroupCategorySchema, type ListenEntry, type ReleaseGroupCategory } from "@/lib/api/schemas";
import type { ArtistJourneyAlbum } from "@/services/artist-journeys/artist-journeys";
import { sortAlphabetically, sortByYear } from "./artist-journey-sort";

type SelectionSort = "year" | "alpha";
type SelectionMode = "list" | "graphic";

interface ArtistJourneySelectionViewProps {
  albums: ArtistJourneyAlbum[];
  categoryLabels: Record<ReleaseGroupCategory, string>;
  onRemove: (albumId: string) => void;
  onMarkListened: (albumId: string) => Promise<void>;
  onUnmarkListened: (albumId: string) => Promise<void>;
  listenEntries: Record<string, ListenEntry>;
  onEntrySaved: (albumId: string, entry: ListenEntry) => void;
}

const CATEGORY_ORDER = ReleaseGroupCategorySchema.options;

// Trazo grueso (no el glifo "✓" de fuente, que se lee débil a tamaño
// pequeño) — mismo lenguaje visual de ícono que `ChevronIcon` del editor de
// selección, pero con `strokeWidth` mayor para que se perciba marcado de un
// vistazo, incluso sobre una carátula clara (revisión: "el ✓ debiese tener
// un diseño más pronunciado").
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

// Vista de solo lectura de la selección ya elegida del recorrido —
// contenido principal de la página de gestión (openspec:
// redesign-artist-journey-management-view), distinta del editor de
// casilleros (`ArtistJourneyAlbumGroups`), que ahora vive oculto detrás de
// una acción explícita. Orden y modo de visualización son estado local sin
// persistencia: a diferencia del switcher de `/me/artist-journeys`, esta
// subvista vive dentro de una sola página, sin necesidad de recordarse
// entre visitas (D4 de design.md). "Quitar" reutiliza el mismo borrador
// local que ya maneja el editor — no llama al servidor, solo habilita
// "Guardar". "Registrar escucha" crea un registro rápido (mismo primer paso
// que el resto del catálogo); una vez creada la entrada, "Ampliar" despliega
// el mismo `ListenEntryForm` que usa `MarkAsListened` para completar
// Impresión/Contexto/Reacción/Audiencia sin salir de esta página (openspec:
// add-artist-journey-mark-listened, revisión "ampliar en la misma fila").
export function ArtistJourneySelectionView({
  albums,
  categoryLabels,
  onRemove,
  onMarkListened,
  onUnmarkListened,
  listenEntries,
  onEntrySaved,
}: ArtistJourneySelectionViewProps) {
  const t = useTranslations("artistJourney");
  const tDiary = useTranslations("diary");
  const [sort, setSort] = useState<SelectionSort>("year");
  const [mode, setMode] = useState<SelectionMode>("list");
  // Un registro por vez: alcanza para la interacción real (un clic a la vez)
  // y evita tener que rastrear un set de ids en vuelo.
  const [listeningId, setListeningId] = useState<string | null>(null);
  // Un panel de ampliación abierto por vez, igual que `listeningId`.
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // El panel recién abierto puede quedar lejos del click que lo abrió (modo
  // gráfico: siempre debajo de toda la grilla de la categoría) — sin este
  // scroll, pasa desapercibido (revisión: "no pasa desapercibido que se abre
  // el panel").
  useEffect(() => {
    if (expandedId) panelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [expandedId]);

  // Registrar/Quitar registro, no "repetir escucha" (revisión: el ícono/botón
  // se leía como un checklist que invitaba a clics repetidos, cada uno
  // creando una entrada nueva de diario sin que el propietario lo esperara).
  // Solo se puede deshacer la entrada que este mismo componente creó en esta
  // sesión de edición (`listenEntries[albumId]`) — un álbum ya escuchado por
  // una entrada previa (diario, página del álbum) no ofrece esta acción acá;
  // gestionar esas entradas sigue siendo cosa del diario.
  async function toggleListened(album: ArtistJourneyAlbum) {
    const hasEntry = Boolean(listenEntries[album.id]);
    if (!album.listened) {
      setListeningId(album.id);
      try {
        await onMarkListened(album.id);
        // Solo abre el panel si no hay otro ya abierto: registrar varios
        // álbumes seguidos no debe reemplazar en silencio un panel que el
        // propietario ya empezó a completar — eso descartaría, sin aviso,
        // cualquier texto sin guardar. Abrir el panel de otro álbum sigue
        // siendo posible, pero solo a través de "Ampliar", una acción
        // explícita.
        setExpandedId((current) => current ?? album.id);
      } finally {
        setListeningId(null);
      }
      return;
    }
    if (!hasEntry) return;
    setListeningId(album.id);
    try {
      await onUnmarkListened(album.id);
      setExpandedId((current) => (current === album.id ? null : current));
    } finally {
      setListeningId(null);
    }
  }

  const grouped = useMemo(() => {
    const sorter = sort === "year" ? sortByYear : sortAlphabetically;
    const map = new Map<ReleaseGroupCategory, ArtistJourneyAlbum[]>();
    for (const category of CATEGORY_ORDER) {
      const inGroup = albums.filter((a) => a.category === category);
      if (inGroup.length > 0) map.set(category, sorter(inGroup));
    }
    return map;
  }, [albums, sort]);

  function listenForm(albumId: string) {
    const entry = listenEntries[albumId];
    if (!entry) return null;
    return (
      <ListenEntryForm
        entryId={entry.id}
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <FilterSelect
          value={sort}
          onChange={(value) => setSort(value as SelectionSort)}
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

      <div className="flex flex-col gap-5">
        {[...grouped.entries()].map(([category, groupAlbums]) => {
          const expandedAlbum = groupAlbums.find((a) => a.id === expandedId);
          return (
            <div key={category} className="flex flex-col gap-2">
              <span className="font-data text-xs uppercase tracking-wider text-paper-muted">
                {categoryLabels[category]}
              </span>

              {mode === "list" ? (
                <ul className="flex flex-col divide-y divide-ink-border border-t border-ink-border">
                  {groupAlbums.map((album) => {
                    const hasEntry = Boolean(listenEntries[album.id]);
                    const canUndo = album.listened && hasEntry;
                    const expanded = expandedId === album.id && hasEntry;
                    return (
                      <li key={album.id} className="flex flex-col gap-3 py-2">
                        <div className="flex items-center gap-3">
                          <Link href={`/album/${album.id}`} className="shrink-0" tabIndex={-1} aria-hidden>
                            <CoverThumb cover={album.coverThumbUrl} label="" className="size-12" />
                          </Link>
                          <Link
                            href={`/album/${album.id}`}
                            className="min-w-0 flex-1 truncate font-body text-sm text-paper transition-colors hover:text-amber"
                          >
                            {album.title}
                          </Link>
                          {album.firstReleaseYear !== null && (
                            <span className="shrink-0 font-data text-xs text-paper-muted">
                              {album.firstReleaseYear}
                            </span>
                          )}
                          {album.listened && (
                            <span className="shrink-0 font-data text-xs text-petrol">
                              ✓ {t("selection.listened")}
                            </span>
                          )}
                          {hasEntry && (
                            <button
                              type="button"
                              onClick={() => setExpandedId((cur) => (cur === album.id ? null : album.id))}
                              className="shrink-0 font-data text-xs text-paper-muted underline decoration-dotted transition-colors hover:text-paper"
                            >
                              {expanded ? tDiary("collapse") : tDiary("expand")}
                            </button>
                          )}
                          {(!album.listened || canUndo) && (
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
                                canUndo
                                  ? "text-paper-muted hover:text-danger"
                                  : "text-paper-muted hover:text-amber"
                              }`}
                            >
                              {listeningId === album.id
                                ? t("selection.registeringListen")
                                : canUndo
                                  ? t("selection.removeListen")
                                  : t("selection.registerListen")}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onRemove(album.id)}
                            aria-label={t("selection.removeAlbum", { title: album.title })}
                            className="shrink-0 font-data text-xs text-paper-muted underline decoration-dotted transition-colors hover:text-danger"
                          >
                            {t("selection.remove")}
                          </button>
                        </div>
                        {expanded && (
                          <div ref={panelRef}>{listenForm(album.id)}</div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <>
                  <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
                    {groupAlbums.map((album) => {
                      const hasEntry = Boolean(listenEntries[album.id]);
                      const canUndo = album.listened && hasEntry;
                      const expanded = expandedId === album.id && hasEntry;
                      return (
                        <li key={album.id} className="flex flex-col gap-1.5">
                          <div className="relative overflow-hidden rounded-md border border-ink-border">
                            <Link href={`/album/${album.id}`}>
                              <CoverThumb cover={album.coverThumbUrl} label="" className="aspect-square w-full" />
                            </Link>
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
                            <button
                              type="button"
                              onClick={() => onRemove(album.id)}
                              aria-label={t("selection.removeAlbum", { title: album.title })}
                              className="absolute right-1 top-1 flex size-5 items-center justify-center rounded bg-ink/80 font-data text-xs text-paper-muted transition-colors hover:text-danger"
                            >
                              <span aria-hidden="true">✕</span>
                            </button>
                          </div>
                          <Link
                            href={`/album/${album.id}`}
                            className="truncate font-data text-xs text-paper-muted transition-colors hover:text-amber"
                          >
                            {album.title}
                          </Link>
                          {hasEntry && (
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
        })}
      </div>
    </div>
  );
}
