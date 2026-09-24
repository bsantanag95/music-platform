"use client";

import { AppImage } from "@/components/ui/AppImage";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { DiscPlaceholder } from "@/components/catalog/DiscPlaceholder";
import { ArtistJourneyCardMenu } from "./ArtistJourneyCardMenu";
import { ArtistJourneyDeleteConfirm } from "./ArtistJourneyDeleteConfirm";
import { stateLabel, type ArtistJourneyRendererProps } from "./artist-journey-list-shared";

// Modo Gráfico: pared de fotos/placeholders del artista. El nombre va como
// caption visible bajo la foto — mismo tratamiento que `EntriesGraphic` de
// Want to Listen. A diferencia de Detallada/Índice, el estado se muestra
// como punto de color + texto en su propia fila (menos ancho disponible por
// tarjeta) — el menú "⋮" (`ArtistJourneyCardMenu`, compartido con los otros
// dos modos) vive junto al nombre.
export function ArtistJourneysGraphic({ journeys, actions }: ArtistJourneyRendererProps) {
  const t = useTranslations("artistJourney");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  return (
    <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
      {journeys.map((journey) => {
        const pendingDelete = pendingDeleteId === journey.artistId;

        return (
          <li key={journey.artistId} className="flex flex-col gap-1.5">
            <Link
              href={`/me/artist-journeys/${journey.artistId}`}
              className="group relative block overflow-hidden rounded-md border border-ink-border transition-colors hover:border-amber"
            >
              {journey.artistPhotoUrl ? (
                <div className="relative aspect-square w-full">
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
              <ArtistJourneyCardMenu
                journey={journey}
                actions={actions}
                onRequestDelete={() => setPendingDeleteId(journey.artistId)}
              />
            </div>

            <div className="border-t border-ink-border pt-1">
              {pendingDelete ? (
                <ArtistJourneyDeleteConfirm
                  busy={actions.busyId === journey.artistId}
                  onConfirm={() => actions.remove(journey.artistId)}
                  onCancel={() => setPendingDeleteId(null)}
                  sizeClassName="text-[0.65rem]"
                />
              ) : (
                <span className="flex items-center gap-1.5 font-data text-[0.65rem] text-paper-muted">
                  <span
                    aria-hidden="true"
                    className={`size-1.5 shrink-0 rounded-full ${journey.state === "complete" ? "bg-petrol" : "bg-paper-muted"}`}
                  />
                  {stateLabel(journey.state, t)}
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
