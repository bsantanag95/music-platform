"use client";

import Image from "next/image";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { DiscPlaceholder } from "@/components/catalog/DiscPlaceholder";
import { RelativeDate } from "@/components/feed/feed-row-parts";
import { ArtistJourneyCardMenu } from "./ArtistJourneyCardMenu";
import { ArtistJourneyDeleteConfirm } from "./ArtistJourneyDeleteConfirm";
import { StateLabel, stateLabel, type ArtistJourneyRendererProps } from "./artist-journey-list-shared";

// Modo Detallada (por defecto): una fila-tarjeta por recorrido, con
// foto/placeholder del artista, nombre (enlaza a la gestión del recorrido),
// el estado y, al lado, el menú "⋮" con las acciones secundarias — mismo
// menú que Índice y Gráfico (`ArtistJourneyCardMenu`). A diferencia de
// Índice (deliberadamente compacto, sin foto ni detalle), agrega una
// segunda fila con progreso discreto (barra sin fracción numérica — §6.4.1,
// nunca "X de Y" fuera de la página de gestión) y la fecha de última
// actualización: lo que justifica que Detallada exista como modo aparte.
export function ArtistJourneysDetailed({ journeys, actions }: ArtistJourneyRendererProps) {
  const t = useTranslations("artistJourney");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  return (
    <ul className="flex w-full flex-col divide-y divide-ink-border rounded-lg border border-ink-border">
      {journeys.map((journey) => {
        const pendingDelete = pendingDeleteId === journey.artistId;
        const { selectedCount, listenedCount } = journey.progress;
        const progressRatio = selectedCount > 0 ? listenedCount / selectedCount : 0;

        return (
          <li key={journey.artistId} className="flex flex-col gap-1.5 px-3 py-2.5">
            <div className="flex items-center gap-3">
              {journey.artistPhotoUrl ? (
                <div className="relative size-10 shrink-0 overflow-hidden rounded-full">
                  <Image src={journey.artistPhotoUrl} alt="" fill sizes="2.5rem" className="object-cover" />
                </div>
              ) : (
                <DiscPlaceholder alt="" className="size-10 shrink-0 rounded-full" />
              )}
              <Link
                href={`/me/artist-journeys/${journey.artistId}`}
                className="min-w-0 flex-1 truncate font-display text-sm text-paper hover:text-amber"
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
            </div>

            <div className="flex items-center gap-2 pl-[3.25rem]">
              {selectedCount > 0 && (
                <div className="h-1 w-20 shrink-0 overflow-hidden rounded-full bg-ink-border">
                  <div
                    className="h-full rounded-full bg-petrol"
                    style={{ width: `${Math.round(progressRatio * 100)}%` }}
                  />
                </div>
              )}
              <span className="font-data text-[0.65rem] text-paper-muted">
                {t("lastUpdatedLabel")} <RelativeDate iso={journey.updatedAt} />
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
