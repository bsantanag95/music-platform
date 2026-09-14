"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArtistJourneyCardMenu } from "./ArtistJourneyCardMenu";
import { ArtistJourneyDeleteConfirm } from "./ArtistJourneyDeleteConfirm";
import { StateLabel, stateLabel, type ArtistJourneyRendererProps } from "./artist-journey-list-shared";

// Modo Índice: filas de texto compactas para escanear un listado largo, sin
// foto — mismo criterio que `EntriesIndex` de Want to Listen. El estado y,
// al lado, el menú "⋮" con las acciones secundarias (ver artista,
// archivar/desarchivar, eliminar) — mismo menú que Detallada y Gráfico
// (`ArtistJourneyCardMenu`).
export function ArtistJourneysIndex({ journeys, actions }: ArtistJourneyRendererProps) {
  const t = useTranslations("artistJourney");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  return (
    <ul className="flex flex-col">
      {journeys.map((journey) => {
        const pendingDelete = pendingDeleteId === journey.artistId;

        return (
          <li
            key={journey.artistId}
            className="flex items-center gap-3 border-b border-ink-border px-2 py-2 last:border-b-0"
          >
            <Link
              href={`/me/artist-journeys/${journey.artistId}`}
              className="min-w-0 flex-1 truncate font-display text-sm text-paper transition-colors hover:text-amber"
            >
              {journey.artistName}
            </Link>
            {pendingDelete ? (
              <ArtistJourneyDeleteConfirm
                busy={actions.busyId === journey.artistId}
                onConfirm={() => actions.remove(journey.artistId)}
                onCancel={() => setPendingDeleteId(null)}
              />
            ) : (
              <>
                <StateLabel state={journey.state} label={stateLabel(journey.state, t)} />
                <ArtistJourneyCardMenu
                  journey={journey}
                  actions={actions}
                  onRequestDelete={() => setPendingDeleteId(journey.artistId)}
                />
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
}
