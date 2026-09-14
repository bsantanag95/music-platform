"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { ApiError } from "@/lib/api/client";
import {
  archiveArtistJourney,
  deleteArtistJourney,
  setArtistJourneySelection,
  unarchiveArtistJourney,
} from "@/lib/api/artist-journeys";
import {
  ReleaseGroupCategorySchema,
  type ArtistJourneyDetail,
  type ReleaseGroupCategory,
} from "@/lib/api/schemas";
import { ArtistJourneyAlbumGroups } from "./ArtistJourneyAlbumGroups";

interface ArtistJourneyManagerProps {
  artistId: string;
  artistName: string;
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
  initialJourney,
  categoryLabels,
}: ArtistJourneyManagerProps) {
  const t = useTranslations("artistJourney");
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

  const { selectedCount, listenedCount } = journey.progress;
  const progressRatio = selectedCount > 0 ? listenedCount / selectedCount : 0;

  return (
    <section className="flex w-full max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-lg border border-ink-border bg-ink-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h1 className="font-display text-lg text-paper">{t("manageTitle", { artist: artistName })}</h1>
            <StateBadge state={journey.state} t={t} />
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

      <div className="flex flex-col gap-4 rounded-lg border border-ink-border bg-ink-surface p-4">
        <ArtistJourneyAlbumGroups
          albums={journey.albums}
          selected={selected}
          collapsed={collapsed}
          categoryLabels={categoryLabels}
          onToggleAlbum={toggleAlbum}
          onToggleCategory={toggleCategorySelection}
          onToggleCollapsed={toggleCollapsed}
        />

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
      </div>
    </section>
  );
}
