"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { ArtistJourneyDetail, ReleaseGroup, ReleaseGroupCategory } from "@/lib/api/schemas";
import { ArtistJourneyStartModal } from "./ArtistJourneyStartModal";

interface ArtistJourneySectionProps {
  artistId: string;
  artistName: string;
  authenticated: boolean;
  initialJourney: ArtistJourneyDetail | null;
  albums: ReleaseGroup[];
  categoryLabels: Record<ReleaseGroupCategory, string>;
}

const linkButtonClass =
  "inline-flex items-center justify-center gap-2 rounded border border-ink-border bg-ink-surface px-4 py-2 font-display text-sm text-paper transition-colors hover:border-amber";

// "Recorrido de artista" (openspec: add-artist-journey,
// docs/00-product/product_philosophy.md §6.4): selección personal de álbumes
// que el usuario define como su propia versión de "discografía completa" de
// este artista. Sin curaduría editorial, sin comparación social.
//
// Rediseño (openspec: add-artist-journey-management-page): esta tarjeta es
// un resumen de solo lectura — estado y progreso discreto, sin fracción
// numérica (§6.4.1). "Armar recorrido" abre `ArtistJourneyStartModal` en vez
// de activar de inmediato: crear el recorrido y elegir la selección inicial
// es una sola acción explícita del usuario ("Guardar" en el modal), no un
// efecto secundario de un clic que podría ser accidental. Con un recorrido
// ya activo, el único punto de entrada es el enlace a la página de gestión,
// donde ocurre toda edición posterior (selección, archivar, borrar).
export function ArtistJourneySection({
  artistId,
  artistName,
  authenticated,
  initialJourney,
  albums,
  categoryLabels,
}: ArtistJourneySectionProps) {
  const t = useTranslations("artistJourney");
  const [journey] = useState(initialJourney);
  const [modalOpen, setModalOpen] = useState(false);

  if (!authenticated) {
    return (
      <Link href="/auth/login" className={linkButtonClass}>
        {t("signInToStart")}
      </Link>
    );
  }

  if (!journey) {
    return (
      <div className="flex flex-col items-start gap-2">
        <button type="button" onClick={() => setModalOpen(true)} className={linkButtonClass}>
          {t("start")}
        </button>
        <p className="max-w-md font-body text-xs text-paper-muted">{t("startHint")}</p>
        {modalOpen && (
          <ArtistJourneyStartModal
            artistId={artistId}
            artistName={artistName}
            albums={albums}
            categoryLabels={categoryLabels}
            onClose={() => setModalOpen(false)}
          />
        )}
      </div>
    );
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
        <Link href={`/me/artist-journeys/${artistId}`} className={linkButtonClass}>
          {t("manage")}
        </Link>
      </div>

      {selectedCount > 0 && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-border">
          <div
            className="h-full rounded-full bg-petrol transition-[width]"
            style={{ width: `${Math.round(progressRatio * 100)}%` }}
          />
        </div>
      )}
      {selectedCount === 0 && (
        <p className="font-body text-xs text-paper-muted">{t("emptySelection")}</p>
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
