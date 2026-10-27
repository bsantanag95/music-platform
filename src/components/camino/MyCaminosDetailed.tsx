"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { RelativeDate } from "@/components/feed/feed-row-parts";
import { ProgressBar } from "@/components/progress/ProgressBar";
import { CaminoCardMenu } from "./CaminoCardMenu";
import { CaminoStateLabel, caminoStateLabel, type MyCaminosRendererProps } from "./camino-list-shared";

// Modo Detallada (por defecto): una fila-tarjeta por Camino, con mosaico/
// placeholder, título (enlaza a la gestión), el estado y el menú "⋮" —
// calcado de `ArtistJourneysDetailed`. Segunda fila con progreso discreto
// (barra sin fracción numérica, mismo criterio que Recorridos) y la fecha de
// última actualización.
export function MyCaminosDetailed({ caminos, actions }: MyCaminosRendererProps) {
  const t = useTranslations("camino");

  return (
    <ul className="flex w-full flex-col divide-y divide-ink-border rounded-lg border border-ink-border">
      {caminos.map((camino) => (
        <li key={camino.id} className="flex flex-col gap-1.5 px-3 py-2.5">
          <div className="flex items-center gap-3">
            <CoverThumb cover={camino.coverThumbUrl} label="" className="size-10 shrink-0 rounded" />
            <Link
              href={`/me/caminos/${camino.id}`}
              className="min-w-0 flex-1 truncate font-display text-sm text-paper hover:text-amber"
            >
              {camino.title}
            </Link>
            <CaminoStateLabel state={camino.state} label={caminoStateLabel(camino.state, t)} />
            <CaminoCardMenu camino={camino} actions={actions} />
          </div>

          <div className="flex items-center gap-2 pl-[3.25rem]">
            <ProgressBar listened={camino.progress.listenedCount} selected={camino.progress.selectedCount} />
            <span className="font-data text-[0.65rem] text-paper-muted">
              {t("lastUpdatedLabel")} <RelativeDate iso={camino.updatedAt} />
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
