"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { CaminoCardMenu } from "./CaminoCardMenu";
import { CaminoDeleteConfirm } from "./CaminoDeleteConfirm";
import { caminoStateLabel, type MyCaminosRendererProps } from "./camino-list-shared";

// Modo Gráfico: pared de mosaicos/placeholders del Camino — calcado de
// `ArtistJourneysGraphic`. El estado va como punto de color + texto en su
// propia fila (menos ancho disponible por tarjeta); el menú "⋮" vive junto
// al título.
export function MyCaminosGraphic({ caminos, actions }: MyCaminosRendererProps) {
  const t = useTranslations("camino");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  return (
    <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
      {caminos.map((camino) => {
        const pendingDelete = pendingDeleteId === camino.id;

        return (
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
              <CaminoCardMenu
                camino={camino}
                actions={actions}
                onRequestDelete={() => setPendingDeleteId(camino.id)}
              />
            </div>

            <div className="border-t border-ink-border pt-1">
              {pendingDelete ? (
                <CaminoDeleteConfirm
                  busy={actions.busyId === camino.id}
                  onConfirm={() => actions.remove(camino.id)}
                  onCancel={() => setPendingDeleteId(null)}
                  sizeClassName="text-[0.65rem]"
                />
              ) : (
                <span className="flex items-center gap-1.5 font-data text-[0.65rem] text-paper-muted">
                  <span
                    aria-hidden="true"
                    className={`size-1.5 shrink-0 rounded-full ${camino.state === "complete" ? "bg-petrol" : "bg-paper-muted"}`}
                  />
                  {caminoStateLabel(camino.state, t)}
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
