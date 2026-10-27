"use client";

import { AppImage } from "@/components/ui/AppImage";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ProgressBar } from "@/components/progress/ProgressBar";
import { DiscPlaceholder } from "@/components/catalog/DiscPlaceholder";
import { ArtistJourneyCardMenu } from "./ArtistJourneyCardMenu";
import { stateLabel, type ArtistJourneyRendererProps } from "./artist-journey-list-shared";

// Modo Gráfico: pared de fotos/placeholders del artista. El nombre va como
// caption visible bajo la foto — mismo tratamiento que `EntriesGraphic` de
// Want to Listen. A diferencia de Detallada/Índice, el estado se muestra
// como punto de color + texto en su propia fila (menos ancho disponible por
// tarjeta) — el menú "⋮" (`ArtistJourneyCardMenu`, compartido con los otros
// dos modos) vive junto al nombre. Desde redesign-progress-views lleva la barra discreta bajo la foto y el estado solo
// si no está en curso.
export function ArtistJourneysGraphic({ journeys, actions }: ArtistJourneyRendererProps) {
  const t = useTranslations("artistJourney");

  return (
    <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
      {journeys.map((journey) => (
        <li key={journey.artistId} className="flex flex-col gap-1.5">
          <Link
            href={`/me/artist-journeys/${journey.artistId}`}
            className="group relative block overflow-hidden rounded-md border border-ink-border transition-colors hover:border-amber"
          >
            {journey.artistPhotoUrl ? (
              <div className="relative aspect-square w-full bg-ink-surface">
                <AppImage src={journey.artistPhotoUrl} alt="" fill sizes="20vw" className="object-cover" />
              </div>
            ) : (
              <DiscPlaceholder alt="" className="aspect-square w-full" />
            )}
          </Link>

          <div className="flex items-center justify-between gap-1">
            <Link
              href={`/me/artist-journeys/${journey.artistId}`}
              className="min-w-0 flex-1 truncate font-data text-xs text-paper-muted transition-colors hover:text-amber"
            >
              {journey.artistName}
            </Link>
            <ArtistJourneyCardMenu journey={journey} actions={actions} />
          </div>

          <ProgressBar
            listened={journey.progress.listenedCount}
            selected={journey.progress.selectedCount}
            className="w-full"
          />
          {journey.state !== "in_progress" && (
            <span className="flex items-center gap-1.5 font-data text-[0.65rem] text-paper-muted">
              <span
                aria-hidden="true"
                className={`size-1.5 shrink-0 rounded-full ${journey.state === "complete" ? "bg-petrol" : "bg-paper-muted"}`}
              />
              {stateLabel(journey.state, t)}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
