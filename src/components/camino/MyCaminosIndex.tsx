"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CaminoCardMenu } from "./CaminoCardMenu";
import { CaminoDeleteConfirm } from "./CaminoDeleteConfirm";
import { CaminoStateLabel, caminoStateLabel, type MyCaminosRendererProps } from "./camino-list-shared";

// Modo Índice: filas de texto compactas para escanear un listado largo, sin
// mosaico — calcado de `ArtistJourneysIndex`.
export function MyCaminosIndex({ caminos, actions }: MyCaminosRendererProps) {
  const t = useTranslations("camino");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  return (
    <ul className="flex flex-col">
      {caminos.map((camino) => {
        const pendingDelete = pendingDeleteId === camino.id;

        return (
          <li
            key={camino.id}
            className="flex items-center gap-3 border-b border-ink-border px-2 py-2 last:border-b-0"
          >
            <Link
              href={`/me/caminos/${camino.id}`}
              className="min-w-0 flex-1 truncate font-display text-sm text-paper transition-colors hover:text-amber"
            >
              {camino.title}
            </Link>
            {pendingDelete ? (
              <CaminoDeleteConfirm
                busy={actions.busyId === camino.id}
                onConfirm={() => actions.remove(camino.id)}
                onCancel={() => setPendingDeleteId(null)}
              />
            ) : (
              <>
                <CaminoStateLabel state={camino.state} label={caminoStateLabel(camino.state, t)} />
                <CaminoCardMenu
                  camino={camino}
                  actions={actions}
                  onRequestDelete={() => setPendingDeleteId(camino.id)}
                />
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
}
