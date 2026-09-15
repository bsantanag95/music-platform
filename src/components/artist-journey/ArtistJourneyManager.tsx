"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { DiscPlaceholder } from "@/components/catalog/DiscPlaceholder";
import { ApiError } from "@/lib/api/client";
import { createListenEntry, deleteListenEntry } from "@/lib/api/diary";
import {
  archiveArtistJourney,
  deleteArtistJourney,
  getArtistJourney,
  setArtistJourneySelection,
  unarchiveArtistJourney,
} from "@/lib/api/artist-journeys";
import {
  ReleaseGroupCategorySchema,
  type ArtistJourneyDetail,
  type ListenEntry,
  type ReleaseGroupCategory,
} from "@/lib/api/schemas";
import { ArtistJourneyAlbumGroups } from "./ArtistJourneyAlbumGroups";
import { ArtistJourneySelectionView } from "./ArtistJourneySelectionView";

interface ArtistJourneyManagerProps {
  artistId: string;
  artistName: string;
  artistPhotoUrl: string | null;
  initialJourney: ArtistJourneyDetail;
  categoryLabels: Record<ReleaseGroupCategory, string>;
}

const CATEGORY_ORDER = ReleaseGroupCategorySchema.options;

function StateBadge({
  state,
  t,
}: {
  state: ArtistJourneyDetail["state"];
  t: ReturnType<typeof useTranslations>;
}) {
  if (state === "archived") {
    return (
      <span className="rounded-full border border-ink-border px-2 py-0.5 font-data text-[0.65rem] uppercase tracking-wider text-paper-muted">
        {t("stateArchived")}
      </span>
    );
  }
  if (state === "complete") {
    return (
      <span className="rounded-full border border-petrol/50 px-2 py-0.5 font-data text-[0.65rem] uppercase tracking-wider text-petrol">
        {t("stateComplete")}
      </span>
    );
  }
  return (
    <span className="rounded-full border border-ink-border px-2 py-0.5 font-data text-[0.65rem] uppercase tracking-wider text-paper-muted">
      {t("stateInProgress")}
    </span>
  );
}

// Página de gestión (openspec: add-artist-journey-management-page): único
// lugar donde ocurre la edición de un recorrido ya activo. Absorbe
// archivar/desarchivar/borrar, que antes vivían en la tarjeta de la página
// del artista. La selección se edita como un **borrador local** —
// marcar/desmarcar y "Seleccionar todo"/"Deseleccionar todo" no llaman al
// servidor; solo "Guardar" envía el conjunto final completo en una sola
// petición (§ design D6). La grilla de selección agrupada
// (`ArtistJourneyAlbumGroups`) se comparte con `ArtistJourneyStartModal`,
// que la usa para elegir la selección inicial antes de crear el recorrido.
export function ArtistJourneyManager({
  artistId,
  artistName,
  artistPhotoUrl,
  initialJourney,
  categoryLabels,
}: ArtistJourneyManagerProps) {
  const t = useTranslations("artistJourney");
  const tCatalog = useTranslations("catalog");
  const router = useRouter();
  const [journey, setJourney] = useState(initialJourney);
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const [collapsed, setCollapsed] = useState<Set<ReleaseGroupCategory>>(
    () => new Set(CATEGORY_ORDER.filter((c) => c !== "studio")),
  );
  const originalSelected = useMemo(
    () => new Set(journey.albums.filter((a) => a.selected).map((a) => a.id)),
    [journey],
  );
  const [selected, setSelected] = useState<Set<string>>(() => new Set(originalSelected));
  const [saving, setSaving] = useState(false);
  // Editor oculto por defecto (openspec: redesign-artist-journey-management-view):
  // solo se abre solo si la selección con la que llega la página ya está
  // vacía (nada que mostrar en la vista de solo lectura), o si el
  // propietario lo pide con "Agregar o quitar álbumes". No reacciona a
  // cambios posteriores de `journey` — abrir/cerrar es una decisión de la
  // sesión de edición, no algo que deba saltar solo tras guardar.
  const [editorOpen, setEditorOpen] = useState(() => initialJourney.progress.selectedCount === 0);
  // Entradas de diario creadas en esta sesión de edición, por álbum — para
  // poder ofrecer "Ampliar" (Impresión/Contexto/Reacción/Audiencia) sobre la
  // entrada recién creada sin otra ida y vuelta al servidor (openspec:
  // add-artist-journey-mark-listened, revisión "ampliar en la misma fila").
  // `journey`/`getArtistJourney` no traen esta forma completa de la entrada,
  // solo `listened` agregado — de ahí guardarla aparte.
  const [listenEntries, setListenEntries] = useState<Record<string, ListenEntry>>({});

  const dirty =
    selected.size !== originalSelected.size ||
    [...selected].some((id) => !originalSelected.has(id));

  function toggleCollapsed(category: ReleaseGroupCategory) {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }

  function toggleAlbum(albumId: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(albumId)) next.delete(albumId);
      else next.add(albumId);
      return next;
    });
  }

  function toggleCategorySelection(albumIds: string[], allSelected: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      for (const id of albumIds) {
        if (allSelected) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setErrorCode(null);
    try {
      const updated = await setArtistJourneySelection(artistId, [...selected]);
      setJourney(updated);
      setSelected(new Set(updated.albums.filter((a) => a.selected).map((a) => a.id)));
    } catch (error) {
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    } finally {
      setSaving(false);
    }
  }

  async function toggleArchive() {
    setBusy(true);
    setErrorCode(null);
    try {
      setJourney(
        journey.state === "archived"
          ? await unarchiveArtistJourney(artistId)
          : await archiveArtistJourney(artistId),
      );
    } catch (error) {
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setErrorCode(null);
    try {
      await deleteArtistJourney(artistId);
      router.push("/me/artist-journeys");
    } catch (error) {
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
      setBusy(false);
    }
  }

  // Registrar/quitar una escucha (openspec: add-artist-journey-mark-listened)
  // nunca toca `user_list_item` — solo el diario — así que refrescar
  // `journey` acá no puede desalinear la membresía de la selección; a
  // propósito NO se toca `selected` (el borrador en curso), a diferencia de
  // `save()`, que sí resincroniza porque ahí la selección persistida cambió
  // de verdad.
  async function markListened(albumId: string) {
    setErrorCode(null);
    try {
      const entry = await createListenEntry({ type: "release-group", id: albumId });
      setListenEntries((current) => ({ ...current, [albumId]: entry }));
      const updated = await getArtistJourney(artistId);
      if (updated) setJourney(updated);
    } catch (error) {
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    }
  }

  // Deshace únicamente la entrada creada por `markListened` en esta misma
  // sesión de edición — la única que este componente conoce con certeza. Un
  // álbum marcado "escuchado" por una entrada previa (creada desde el diario
  // o la página del álbum, antes de abrir esta gestión) no ofrece esta
  // acción — ver Non-Goals de design.md: gestionar esas entradas sigue
  // siendo cosa del diario, no de este ícono rápido.
  async function unmarkListened(albumId: string) {
    const entry = listenEntries[albumId];
    if (!entry) return;
    setErrorCode(null);
    try {
      await deleteListenEntry(entry.id);
      setListenEntries((current) => {
        const next = { ...current };
        delete next[albumId];
        return next;
      });
      const updated = await getArtistJourney(artistId);
      if (updated) setJourney(updated);
    } catch (error) {
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    }
  }

  function saveListenEntry(albumId: string, entry: ListenEntry) {
    setListenEntries((current) => ({ ...current, [albumId]: entry }));
  }

  const { selectedCount, listenedCount } = journey.progress;
  const progressRatio = selectedCount > 0 ? listenedCount / selectedCount : 0;

  // Álbumes seleccionados según el borrador en curso (no `journey.albums`
  // crudo): quitar un álbum desde la vista de selección debe reflejarse ahí
  // al instante, aunque todavía no se haya guardado (D5 de design.md).
  const selectedAlbums = useMemo(
    () => journey.albums.filter((a) => selected.has(a.id)),
    [journey, selected],
  );
  // El editor se muestra si el propietario lo pidió, o si no hay selección
  // que mostrar en su lugar — nunca deja la página sin ningún contenido
  // útil (D2 de design.md, y cubre también el caso de quitar el último
  // álbum sin guardar desde la vista de selección).
  const editorVisible = editorOpen || selectedAlbums.length === 0;

  const footer = (
    <div className="flex items-center justify-between gap-3 border-t border-ink-border pt-4">
      {/* Guardar refleja un diff contra la selección ya persistida (p.ej.
          los álbumes de estudio que `activateArtistJourney` guarda al
          activar): sin cambios en el borrador no hay nada que enviar, y
          el botón queda deshabilitado. Esta señal aclara que no está
          trabado — ya está guardado. */}
      {!dirty && !saving ? (
        <span className="font-data text-xs text-paper-muted">{t("noChanges")}</span>
      ) : (
        <span />
      )}
      <Button variant="primary" disabled={!dirty || saving} onClick={() => void save()}>
        {saving ? t("saving") : t("save")}
      </Button>
    </div>
  );

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-lg border border-ink-border bg-ink-surface p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            {artistPhotoUrl ? (
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full">
                <Image src={artistPhotoUrl} alt={artistName} fill sizes="4rem" className="object-cover" />
              </div>
            ) : (
              <DiscPlaceholder
                alt={tCatalog("artist.noPhotoAlt")}
                className="h-16 w-16 shrink-0 rounded-full"
              />
            )}
            <div className="flex min-w-0 flex-col gap-1">
              <Link
                href={`/artist/${artistId}`}
                className="w-fit truncate font-data text-xs uppercase tracking-wider text-paper-muted transition-colors hover:text-paper"
              >
                {artistName}
              </Link>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-lg text-paper">{t("heading")}</h1>
                <StateBadge state={journey.state} t={t} />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 font-data text-xs">
            <button
              type="button"
              disabled={busy}
              onClick={() => void toggleArchive()}
              className="text-paper-muted underline decoration-dotted transition-colors hover:text-paper disabled:opacity-50"
            >
              {journey.state === "archived" ? t("unarchive") : t("archive")}
            </button>
            {pendingDelete ? (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void remove()}
                  className="text-danger underline decoration-dotted transition-colors hover:text-paper disabled:opacity-50"
                >
                  {busy ? t("deleting") : t("confirmDelete")}
                </button>
                <button
                  type="button"
                  onClick={() => setPendingDelete(false)}
                  className="text-paper-muted transition-colors hover:text-paper"
                >
                  {t("cancel")}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setPendingDelete(true)}
                className="text-paper-muted underline decoration-dotted transition-colors hover:text-danger"
              >
                {t("delete")}
              </button>
            )}
          </div>
        </div>

        {/* Progreso informativo y discreto (§6.4.1): sin fracción numérica
            fuera de esta página. */}
        {selectedCount > 0 && (
          <div className="flex flex-col gap-1">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-border">
              <div
                className="h-full rounded-full bg-petrol transition-[width]"
                style={{ width: `${Math.round(progressRatio * 100)}%` }}
              />
            </div>
            <p className="font-data text-xs text-paper-muted">
              {t("progress", { listened: listenedCount, total: selectedCount })}
            </p>
          </div>
        )}
        {selectedCount === 0 && (
          <p className="font-body text-xs text-paper-muted">{t("emptySelection")}</p>
        )}

        {errorCode && (
          <span role="alert" className="font-data text-xs text-danger">
            {t("genericError")}
          </span>
        )}
      </div>

      {editorVisible ? (
        <div className="flex flex-col gap-4 rounded-lg border border-ink-border bg-ink-surface p-4">
          {selectedAlbums.length > 0 && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                className="font-data text-xs text-paper-muted underline decoration-dotted transition-colors hover:text-paper"
              >
                {t("closeEditor")}
              </button>
            </div>
          )}
          <ArtistJourneyAlbumGroups
            albums={journey.albums}
            selected={selected}
            collapsed={collapsed}
            categoryLabels={categoryLabels}
            onToggleAlbum={toggleAlbum}
            onToggleCategory={toggleCategorySelection}
            onToggleCollapsed={toggleCollapsed}
          />
          {footer}
        </div>
      ) : (
        <div className="flex flex-col gap-4 rounded-lg border border-ink-border bg-ink-surface p-4">
          <div className="flex justify-end">
            <Button variant="secondary" onClick={() => setEditorOpen(true)}>
              {t("openEditor")}
            </Button>
          </div>
          <ArtistJourneySelectionView
            albums={selectedAlbums}
            categoryLabels={categoryLabels}
            onRemove={toggleAlbum}
            onMarkListened={markListened}
            onUnmarkListened={unmarkListened}
            listenEntries={listenEntries}
            onEntrySaved={saveListenEntry}
          />
          {footer}
        </div>
      )}
    </section>
  );
}
