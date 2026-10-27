"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ProgressBar } from "@/components/progress/ProgressBar";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { CaminoCardMenu } from "./CaminoCardMenu";
import { caminoStateLabel, type MyCaminosRendererProps } from "./camino-list-shared";

// Modo Gráfico: pared de mosaicos/placeholders del Camino — calcado de
// `ArtistJourneysGraphic`. El estado va como punto de color + texto en su
// propia fila (menos ancho disponible por tarjeta); el menú "⋮" vive junto
// al título. Desde redesign-progress-views lleva la barra discreta bajo la carátula y el estado solo si no está en curso.
export function MyCaminosGraphic({ caminos, actions }: MyCaminosRendererProps) {
  const t = useTranslations("camino");

  return (
    <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
      {caminos.map((camino) => (
        <li key={camino.id} className="flex flex-col gap-1.5">
          <Link
            href={`/me/caminos/${camino.id}`}
            className="group relative block overflow-hidden rounded-md border border-ink-border transition-colors hover:border-amber"
          >
            <CoverThumb cover={camino.coverThumbUrl} label="" className="aspect-square w-full" />
          </Link>

          <div className="flex items-center justify-between gap-1">
            <Link
              href={`/me/caminos/${camino.id}`}
              className="min-w-0 flex-1 truncate font-data text-xs text-paper-muted transition-colors hover:text-amber"
            >
              {camino.title}
            </Link>
            <CaminoCardMenu camino={camino} actions={actions} />
          </div>

          <ProgressBar
            listened={camino.progress.listenedCount}
            selected={camino.progress.selectedCount}
            className="w-full"
          />
          {camino.state !== "in_progress" && (
            <span className="flex items-center gap-1.5 font-data text-[0.65rem] text-paper-muted">
              <span
                aria-hidden="true"
                className={`size-1.5 shrink-0 rounded-full ${camino.state === "complete" ? "bg-petrol" : "bg-paper-muted"}`}
              />
              {caminoStateLabel(camino.state, t)}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
