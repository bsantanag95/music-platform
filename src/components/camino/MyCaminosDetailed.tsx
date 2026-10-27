"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { ProgressBar } from "@/components/progress/ProgressBar";
import { ProgressRowMeta } from "@/components/progress/ProgressRowMeta";
import { CaminoCardMenu } from "./CaminoCardMenu";
import { CaminoStateLabel, caminoStateLabel, type MyCaminosRendererProps } from "./camino-list-shared";

// Modo Detallada (por defecto): una fila-tarjeta por Camino, con mosaico/
// placeholder, título (enlaza a la gestión), el estado y el menú "⋮" —
// calcado de `ArtistJourneysDetailed`. Segunda fila con progreso discreto
// (barra sin fracción numérica, mismo criterio que Recorridos) y la fecha de
// última actualización; desde redesign-progress-views, el disco que sigue y la última escucha. La etiqueta de estado
// solo aparece si no está en curso.
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
            {camino.state !== "in_progress" && (
              <CaminoStateLabel state={camino.state} label={caminoStateLabel(camino.state, t)} />
            )}
            <CaminoCardMenu camino={camino} actions={actions} />
          </div>

          <div className="flex flex-col items-start gap-1 pl-[3.25rem] sm:flex-row sm:items-center sm:gap-2">
            <ProgressBar listened={camino.progress.listenedCount} selected={camino.progress.selectedCount} />
            <ProgressRowMeta
              nextUp={camino.nextUp}
              lastListenedAt={camino.lastListenedAt}
              selectedCount={camino.progress.selectedCount}
              complete={camino.state === "complete"}
              emptyLabel={t("emptyCamino")}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
