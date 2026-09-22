"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { DiscPlaceholder } from "@/components/catalog/DiscPlaceholder";
import { EmptyState } from "@/components/ui/EmptyState";
import { UserHoverCard } from "@/components/profiles/UserHoverCard";
import { ApiError } from "@/lib/api/client";
import { createListenEntry, deleteListenEntry } from "@/lib/api/diary";
import { setListTracking } from "@/lib/api/camino";
import type { CaminoDetail, ListenEntry } from "@/lib/api/schemas";
import { CaminoAlbumList } from "./CaminoAlbumList";

interface CaminoReadViewProps {
  camino: CaminoDetail;
  owner: { username: string; displayName: string | null };
  tracking: boolean;
  trackingListenedIds: string[];
  canTrack: boolean;
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

// Vista de lectura de un Camino ajeno (`/users/[username]/caminos/[id]`):
// mismo encabezado + lista de álbumes que la gestión propia (comparten
// `CaminoAlbumList`), pero sin controles de gestión — nunca vive detrás de
// los endpoints de `lists` (openspec: add-camino). El ✓/registrar-escucha
// por álbum solo aparece si el visitante activó tracking, y ahí refleja SU
// PROPIO diario, no el del dueño (mismo criterio que el progreso agregado:
// "dos personas trackeando la misma lista ven progresos distintos") — antes
// de trackear, la lista es de solo exploración, sin progreso propio que
// mostrar. El progreso del dueño (informativo) vive únicamente en el badge
// de estado del encabezado, igual que en la tarjeta de un recorrido de
// artista.
export function CaminoReadView({ camino, owner, tracking: initialTracking, trackingListenedIds, canTrack }: CaminoReadViewProps) {
  const t = useTranslations("camino");
  const [tracking, setTracking] = useState(initialTracking);
  const [viewerListened, setViewerListened] = useState<Set<string>>(() => new Set(trackingListenedIds));
  const [listenEntries, setListenEntries] = useState<Record<string, ListenEntry>>({});
  const [toggling, setToggling] = useState(false);
  const [trackError, setTrackError] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const totalCount = camino.albums.length;
  const listenedCount = viewerListened.size;
  const ratio = totalCount > 0 ? listenedCount / totalCount : 0;
  const coverThumbUrl = camino.albums[0]?.coverThumbUrl ?? null;

  async function toggleTracking() {
    const next = !tracking;
    setToggling(true);
    setTrackError(false);
    try {
      const updated = await setListTracking(camino.id, next);
      setTracking(updated.tracking);
      if (!updated.tracking) {
        setViewerListened(new Set());
        setListenEntries({});
      }
    } catch (error) {
      if (!(error instanceof ApiError && error.code === "LIST_NOT_FOUND")) setTrackError(true);
    } finally {
      setToggling(false);
    }
  }

  // Como en `CaminoManager`, pero sin refrescar `camino`: acá el ✓ refleja
  // el diario de quien trackea, no el del dueño, así que no hay nada del
  // detalle del Camino que resincronizar.
  async function markListened(albumId: string) {
    setSaveError(false);
    try {
      const entry = await createListenEntry({ type: "release-group", id: albumId });
      setListenEntries((current) => ({ ...current, [albumId]: entry }));
      setViewerListened((current) => new Set(current).add(albumId));
    } catch {
      setSaveError(true);
    }
  }

  async function unmarkListened(albumId: string) {
    const entry = listenEntries[albumId];
    if (!entry) return;
    setSaveError(false);
    try {
      await deleteListenEntry(entry.id);
      setListenEntries((current) => {
        const next = { ...current };
        delete next[albumId];
        return next;
      });
      setViewerListened((current) => {
        const next = new Set(current);
        next.delete(albumId);
        return next;
      });
    } catch {
      setSaveError(true);
    }
  }

  const albums = camino.albums.map((album) => ({ ...album, listened: tracking && viewerListened.has(album.id) }));

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
              <UserHoverCard username={owner.username}>
                <Link
                  href={`/users/${encodeURIComponent(owner.username)}`}
                  className="w-fit font-data text-xs text-paper-muted transition-colors hover:text-amber"
                >
                  {t("ownedBy", { username: owner.displayName ?? owner.username })}
                </Link>
              </UserHoverCard>
            </div>
          </div>

          {canTrack && (
            <button
              type="button"
              disabled={toggling}
              onClick={() => void toggleTracking()}
              aria-pressed={tracking}
              className={`shrink-0 rounded border px-2.5 py-1 font-data text-xs transition-colors disabled:opacity-50 ${
                tracking
                  ? "border-petrol/50 text-petrol hover:border-petrol"
                  : "border-ink-border text-paper-muted hover:border-paper hover:text-paper"
              }`}
            >
              {tracking ? t("trackingOn") : t("trackingOff")}
            </button>
          )}
        </div>

        {/* Progreso propio de quien trackea — solo existe mientras el
            tracking está activo (D del criterio de tracking: informativo,
            nunca del dueño). */}
        {tracking && totalCount > 0 && (
          <div className="flex flex-col gap-1">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-border">
              <div
                className="h-full rounded-full bg-petrol transition-[width]"
                style={{ width: `${Math.round(ratio * 100)}%` }}
              />
            </div>
            <p className="font-data text-xs text-paper-muted">
              {t("progress", { listened: listenedCount, total: totalCount })}
            </p>
          </div>
        )}

        {(trackError || saveError) && (
          <span role="alert" className="font-data text-xs text-danger">
            {t("saveError")}
          </span>
        )}
      </div>

      {camino.albums.length === 0 ? (
        <EmptyState title={camino.title} description={t("emptyAlbums")} />
      ) : (
        <CaminoAlbumList
          albums={albums}
          listenEntries={listenEntries}
          onEntrySaved={(albumId, entry) =>
            setListenEntries((current) => ({ ...current, [albumId]: entry }))
          }
          progressActions={tracking ? { onMarkListened: markListened, onUnmarkListened: unmarkListened } : undefined}
        />
      )}
    </section>
  );
}
