"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { ApiError } from "@/lib/api/client";
import {
  activateArtistJourney,
  archiveArtistJourney,
  deleteArtistJourney,
  unarchiveArtistJourney,
} from "@/lib/api/artist-journeys";
import type { ArtistJourneyDetail, ReleaseGroupCategory } from "@/lib/api/schemas";
import { ArtistJourneyModal } from "./ArtistJourneyModal";

interface ArtistJourneySectionProps {
  artistId: string;
  artistName: string;
  authenticated: boolean;
  initialJourney: ArtistJourneyDetail | null;
  categoryLabels: Record<ReleaseGroupCategory, string>;
}

// "Recorrido de artista" (openspec: add-artist-journey,
// docs/00-product/product_philosophy.md §6.4): selección personal de álbumes
// que el usuario define como su propia versión de "discografía completa" de
// este artista. Sin curaduría editorial, sin comparación social. El estado
// "completo" es la única señal con tratamiento visual afirmativo (petrol) —
// constatación sobria, nunca lenguaje de logro. Fuera de esta tarjeta no se
// muestra ninguna fracción ni mensaje de "álbumes restantes" (§6.4.1).
//
// La selección de álbumes vive en un modal aparte (`ArtistJourneyModal`,
// rediseño 2026-09): esta tarjeta solo resume estado/progreso y las acciones
// de archivar/eliminar, integrada al lenguaje visual del resto de acciones de
// la página en vez de embeber el checklist completo inline.
export function ArtistJourneySection({
  artistId,
  artistName,
  authenticated,
  initialJourney,
  categoryLabels,
}: ArtistJourneySectionProps) {
  const t = useTranslations("artistJourney");
  const [journey, setJourney] = useState(initialJourney);
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  if (!authenticated) {
    return (
      <Link
        href="/auth/login"
        className="inline-flex items-center justify-center gap-2 rounded border border-ink-border bg-ink-surface px-4 py-2 font-display text-sm text-paper transition-colors hover:border-amber"
      >
        {t("signInToStart")}
      </Link>
    );
  }

  async function activate() {
    setBusy(true);
    setErrorCode(null);
    try {
      setJourney(await activateArtistJourney(artistId));
    } catch (error) {
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    } finally {
      setBusy(false);
    }
  }

  if (!journey) {
    return (
      <div className="flex flex-col items-start gap-2">
        <Button variant="secondary" disabled={busy} onClick={() => void activate()}>
          {busy ? t("activating") : t("start")}
        </Button>
        <p className="max-w-md font-body text-xs text-paper-muted">{t("startHint")}</p>
        {errorCode && (
          <span role="alert" className="font-data text-xs text-danger">
            {t("genericError")}
          </span>
        )}
      </div>
    );
  }

  async function toggleArchive() {
    if (!journey) return;
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
      setJourney(null);
      setPendingDelete(false);
    } catch (error) {
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    } finally {
      setBusy(false);
    }
  }

  const { selectedCount, listenedCount } = journey.progress;
  const progressRatio = selectedCount > 0 ? listenedCount / selectedCount : 0;

  return (
    <section className="flex w-full max-w-2xl flex-col gap-4 rounded-lg border border-ink-border bg-ink-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-lg text-paper">{t("heading")}</h2>
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
          fuera de esta tarjeta ni del modal de selección. */}
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

      <Button variant="secondary" className="self-start" onClick={() => setModalOpen(true)}>
        {t("editSelection")}
      </Button>

      {errorCode && (
        <span role="alert" className="font-data text-xs text-danger">
          {t("genericError")}
        </span>
      )}

      {modalOpen && (
        <ArtistJourneyModal
          artistId={artistId}
          artistName={artistName}
          journey={journey}
          categoryLabels={categoryLabels}
          onSaved={setJourney}
          onClose={() => setModalOpen(false)}
        />
      )}
    </section>
  );
}

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
