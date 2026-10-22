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
// renderer del modo elegido. El conteo solo aparece con la lista completa
// (`complete`): con páginas por cargar contaría solo lo cargado. Las dos secciones comparten el mismo modo de
// visualización — el conmutador vive una sola vez, en `WantToListenList`.
export function WantToListenSection({
  group,
  mode,
  complete,
  priorityIds,
  actions,
}: {
  group: WantToListenGroup;
  mode: WantToListenViewMode;
  complete: boolean;
  priorityIds: ReadonlySet<string>;
  actions: WantToListenRowActions;
}) {
  const t = useTranslations("wantToListen");
  const Renderer = mode === "index" ? EntriesIndex : mode === "graphic" ? EntriesGraphic : EntriesDetailed;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-lg text-paper">
        {t(sectionTitleKey(group.type))}
        {complete ? (
          <>
            {" "}
            <span className="font-data text-sm text-paper-muted">({group.entries.length})</span>
          </>
        ) : null}
      </h2>
      <Renderer entries={group.entries} actions={actions} priorityIds={priorityIds} />
    </section>
  );
}
