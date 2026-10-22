"use client";

import { useTranslations } from "next-intl";
import { EntriesDetailed } from "./EntriesDetailed";
import { EntriesIndex } from "./EntriesIndex";
import { EntriesGraphic } from "./EntriesGraphic";
import { sectionTitleKey } from "./want-to-listen-shared";
import type { WantToListenViewMode } from "./want-to-listen-view-mode";
import type { WantToListenGroup } from "./want-to-listen-shared";
import type { WantToListenRowActions } from "./want-to-listen-items-view";

// Una sección del muro (artistas o álbumes): encabezado con conteo y el
// renderer del modo elegido. El conteo es el total del tipo según el servidor
// (`total`), no lo cargado: con páginas por cargar sigue siendo verdadero. Las dos secciones comparten el mismo modo de
// visualización — el conmutador vive una sola vez, en `WantToListenList`.
export function WantToListenSection({
  group,
  mode,
  total,
  priorityIds,
  actions,
}: {
  group: WantToListenGroup;
  mode: WantToListenViewMode;
  total: number;
  priorityIds: ReadonlySet<string>;
  actions: WantToListenRowActions;
}) {
  const t = useTranslations("wantToListen");
  const Renderer = mode === "index" ? EntriesIndex : mode === "graphic" ? EntriesGraphic : EntriesDetailed;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-lg text-paper">
        {t(sectionTitleKey(group.type))}{" "}
        <span className="font-data text-sm text-paper-muted">({total})</span>
      </h2>
      <Renderer entries={group.entries} actions={actions} priorityIds={priorityIds} />
    </section>
  );
}
