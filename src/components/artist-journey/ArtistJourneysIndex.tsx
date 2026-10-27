"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArtistJourneyCardMenu } from "./ArtistJourneyCardMenu";
import { StateLabel, stateLabel, type ArtistJourneyRendererProps } from "./artist-journey-list-shared";

// Modo Índice: filas de texto compactas para escanear un listado largo, sin
// foto — mismo criterio que `EntriesIndex` de Want to Listen. El estado y,
// al lado, el menú "⋮" con las acciones secundarias (ver artista,
// archivar/desarchivar, eliminar) — mismo menú que Detallada y Gráfico
// (`ArtistJourneyCardMenu`).
export function ArtistJourneysIndex({ journeys, actions }: ArtistJourneyRendererProps) {
  const t = useTranslations("artistJourney");

  return (
    <ul className="flex flex-col">
      {journeys.map((journey) => (
        <li
          key={journey.artistId}
          className="flex items-center gap-3 border-b border-ink-border px-2 py-1 last:border-b-0"
        >
          <Link
            href={`/me/artist-journeys/${journey.artistId}`}
            className="min-w-0 flex-1 truncate font-display text-sm text-paper transition-colors hover:text-amber"
          >
            {journey.artistName}
          </Link>
          <StateLabel state={journey.state} label={stateLabel(journey.state, t)} />
          <ArtistJourneyCardMenu journey={journey} actions={actions} />
        </li>
      ))}
    </ul>
  );
}
