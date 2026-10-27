"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CaminoCardMenu } from "./CaminoCardMenu";
import { CaminoStateLabel, caminoStateLabel, type MyCaminosRendererProps } from "./camino-list-shared";

// Modo Índice: filas de texto compactas para escanear un listado largo, sin
// mosaico — calcado de `ArtistJourneysIndex`.
export function MyCaminosIndex({ caminos, actions }: MyCaminosRendererProps) {
  const t = useTranslations("camino");

  return (
    <ul className="flex flex-col">
      {caminos.map((camino) => (
        <li key={camino.id} className="flex items-center gap-3 border-b border-ink-border px-2 py-1 last:border-b-0">
          <Link
            href={`/me/caminos/${camino.id}`}
            className="min-w-0 flex-1 truncate font-display text-sm text-paper transition-colors hover:text-amber"
          >
            {camino.title}
          </Link>
          {camino.state !== "in_progress" && (
            <CaminoStateLabel state={camino.state} label={caminoStateLabel(camino.state, t)} />
          )}
          <CaminoCardMenu camino={camino} actions={actions} />
        </li>
      ))}
    </ul>
  );
}
