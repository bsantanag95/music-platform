"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { DiscPlaceholder } from "@/components/catalog/DiscPlaceholder";
import { EmptyState } from "@/components/ui/EmptyState";
import { ApiError } from "@/lib/api/client";
import { createListenEntry, deleteListenEntry } from "@/lib/api/diary";
import {
  archiveCamino,
  deleteCamino,
  getMyCamino,
  removeAlbumFromCamino,
  unarchiveCamino,
} from "@/lib/api/camino";
import type { CaminoDetail, ListenEntry } from "@/lib/api/schemas";
import { CaminoAlbumList } from "./CaminoAlbumList";

interface CaminoManagerProps {
  initial: CaminoDetail;
}

function StateBadge({ state, t }: { state: CaminoDetail["state"]; t: ReturnType<typeof useTranslations> }) {
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

// Página de gestión de un Camino propio (`/me/caminos/[caminoId]`): mismo
// diseño de encabezado + lista de álbumes que la gestión de Recorrido
// (`ArtistJourneyManager`/`ArtistJourneySelectionView`, ambos tratan
// álbumes), pero sin el paso de "editor" de selección — el alta de álbumes
// sigue siendo la acción contextual "Añadir a..." de cada álbum (decisión ya
// cerrada, ver docs/05-features/caminos.md), así que "Quitar" actúa de
// inmediato contra el servidor en vez de acumularse en un borrador local.
export function CaminoManager({ initial }: CaminoManagerProps) {
  const t = useTranslations("camino");
  const router = useRouter();
  const [camino, setCamino] = useState(initial);
  const [busyAlbumId, setBusyAlbumId] = useState<string | null>(null);
  const [busyArchive, setBusyArchive] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [listenEntries, setListenEntries] = useState<Record<string, ListenEntry>>({});

  const { selectedCount, listenedCount } = camino.progress;
  const ratio = selectedCount > 0 ? listenedCount / selectedCount : 0;
  const coverThumbUrl = camino.albums[0]?.coverThumbUrl ?? null;

  async function handleRemove(releaseGroupId: string) {
    setBusyAlbumId(releaseGroupId);
    setErrorMessage(null);
    try {
      const updated = await removeAlbumFromCamino(camino.id, releaseGroupId);
      setCamino(updated);
    } catch {
      setErrorMessage(t("saveError"));
    } finally {
      setBusyAlbumId(null);
    }
  }

  async function handleArchiveToggle() {
    setBusyArchive(true);
    setErrorMessage(null);
    try {
      const updated =
        camino.state === "archived" ? await unarchiveCamino(camino.id) : await archiveCamino(camino.id);
      setCamino(updated);
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? t("archiveError") : t("saveError"));
    } finally {
      setBusyArchive(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setErrorMessage(null);
    try {
      await deleteCamino(camino.id);
      router.push("/me/caminos");
    } catch {
      setErrorMessage(t("deleteError"));
      setDeleting(false);
    }
  }

  // Registrar/quitar una escucha nunca toca `user_list_item` — solo el
  // diario — así que refrescar `camino` acá no puede desalinear los álbumes
  // actuales (mismo razonamiento que `ArtistJourneyManager.markListened`).
  async function markListened(albumId: string) {
    setErrorMessage(null);
    try {
      const entry = await createListenEntry({ type: "release-group", id: albumId });
      setListenEntries((current) => ({ ...current, [albumId]: entry }));
      setCamino(await getMyCamino(camino.id));
    } catch {
      setErrorMessage(t("saveError"));
    }
  }

  // Solo deshace la entrada creada por `markListened` en esta misma sesión
  // — un álbum ya escuchado por una entrada previa (diario, página del
  // álbum) no ofrece esta acción acá.
  async function unmarkListened(albumId: string) {
    const entry = listenEntries[albumId];
    if (!entry) return;
    setErrorMessage(null);
    try {
      await deleteListenEntry(entry.id);
      setListenEntries((current) => {
        const next = { ...current };
        delete next[albumId];
        return next;
      });
      setCamino(await getMyCamino(camino.id));
    } catch {
      setErrorMessage(t("saveError"));
    }
  }

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-lg border border-ink-border bg-ink-surface p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            {coverThumbUrl ? (
              <CoverThumb cover={coverThumbUrl} label="" className="size-16 shrink-0 rounded-full" />
            ) : (
              <DiscPlaceholder alt={camino.title} className="size-16 shrink-0 rounded-full" />
            )}
            <div className="flex min-w-0 flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="min-w-0 truncate font-display text-lg text-paper">{camino.title}</h1>
                <StateBadge state={camino.state} t={t} />
              </div>
              {camino.description && (
                <p className="font-body text-sm text-paper-muted">{camino.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 font-data text-xs">
            <button
              type="button"
              disabled={busyArchive}
              onClick={() => void handleArchiveToggle()}
              className="text-paper-muted underline decoration-dotted transition-colors hover:text-paper disabled:opacity-50"
            >
              {camino.state === "archived" ? t("unarchive") : t("archive")}
            </button>
            {pendingDelete ? (
              <>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => void handleDelete()}
                  className="text-danger underline decoration-dotted transition-colors hover:text-paper disabled:opacity-50"
                >
                  {deleting ? t("deleting") : t("confirmDelete")}
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

        {/* Progreso informativo (mismo tratamiento que Recorrido): sin
            fracción numérica fuera de esta página. */}
        {selectedCount > 0 && (
          <div className="flex flex-col gap-1">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-border">
              <div
                className="h-full rounded-full bg-petrol transition-[width]"
                style={{ width: `${Math.round(ratio * 100)}%` }}
              />
            </div>
            <p className="font-data text-xs text-paper-muted">
              {t("progress", { listened: listenedCount, total: selectedCount })}
            </p>
          </div>
        )}

        {errorMessage && (
          <span role="alert" className="font-data text-xs text-danger">
            {errorMessage}
          </span>
        )}
      </div>

      {camino.albums.length === 0 ? (
        <EmptyState title={camino.title} description={t("emptyAlbums")} />
      ) : (
        <CaminoAlbumList
          albums={camino.albums}
          listenEntries={listenEntries}
          onEntrySaved={(albumId, entry) =>
            setListenEntries((current) => ({ ...current, [albumId]: entry }))
          }
          progressActions={{ onMarkListened: markListened, onUnmarkListened: unmarkListened }}
          onRemove={(albumId) => void handleRemove(albumId)}
          removingId={busyAlbumId}
        />
      )}
    </section>
  );
}
