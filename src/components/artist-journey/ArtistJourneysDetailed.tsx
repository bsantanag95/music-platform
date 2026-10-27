"use client";

import { AppImage } from "@/components/ui/AppImage";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { DiscPlaceholder } from "@/components/catalog/DiscPlaceholder";
import { ProgressBar } from "@/components/progress/ProgressBar";
import { ProgressRowMeta } from "@/components/progress/ProgressRowMeta";
import { ArtistJourneyCardMenu } from "./ArtistJourneyCardMenu";
import { StateLabel, stateLabel, type ArtistJourneyRendererProps } from "./artist-journey-list-shared";

// Modo Detallada (por defecto): una fila-tarjeta por recorrido, con
// foto/placeholder del artista, nombre (enlaza a la gestión del recorrido),
// el estado y, al lado, el menú "⋮" con las acciones secundarias — mismo
// menú que Índice y Gráfico (`ArtistJourneyCardMenu`). A diferencia de
// Índice (deliberadamente compacto, sin foto ni detalle), agrega una
// segunda fila con progreso discreto (barra sin fracción numérica — §6.4.1,
// nunca "X de Y" fuera de la página de gestión) y la fecha de última
// actualización: lo que justifica que Detallada exista como modo aparte.
// La foto tiene fondo mientras carga (openspec: refine-progress-page-phase1). Desde redesign-progress-views la segunda
// fila dice qué disco sigue y cuándo fue la última escucha, y la etiqueta de estado solo aparece si no está en curso.
export function ArtistJourneysDetailed({ journeys, actions }: ArtistJourneyRendererProps) {
  const t = useTranslations("artistJourney");

  return (
    <ul className="flex w-full flex-col divide-y divide-ink-border rounded-lg border border-ink-border">
      {journeys.map((journey) => (
        <li key={journey.artistId} className="flex flex-col gap-1.5 px-3 py-2.5">
          <div className="flex items-center gap-3">
            {journey.artistPhotoUrl ? (
              <div className="relative size-10 shrink-0 overflow-hidden rounded-full bg-ink-surface">
                <AppImage src={journey.artistPhotoUrl} alt="" fill sizes="2.5rem" className="object-cover" />
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
            {journey.state !== "in_progress" && (
              <StateLabel state={journey.state} label={stateLabel(journey.state, t)} />
            )}
            <ArtistJourneyCardMenu journey={journey} actions={actions} />
          </div>

          <div className="flex flex-col items-start gap-1 pl-[3.25rem] sm:flex-row sm:items-center sm:gap-2">
            <ProgressBar listened={journey.progress.listenedCount} selected={journey.progress.selectedCount} />
            <ProgressRowMeta
              nextUp={journey.nextUp}
              lastListenedAt={journey.lastListenedAt}
              selectedCount={journey.progress.selectedCount}
              complete={journey.state === "complete"}
              emptyLabel={t("emptySelection")}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
