"use client";

import { AddToListPanel } from "@/components/lists/AddToListPanel";
import type { WantToListenEntry } from "@/lib/api/schemas";
import { EntryRemoveError } from "./EntryRemoveError";
import type { WantToListenRowActions } from "./want-to-listen-items-view";

// Lo que cuelga de una entrada en las tres vistas: el aviso de error y el panel "Añadir a una lista".
export function EntryExtras({ entry, actions }: { entry: WantToListenEntry; actions: WantToListenRowActions }) {
  return (
    <>
      {actions.errorId === entry.id ? <EntryRemoveError /> : null}
      {actions.listOpenId === entry.id ? (
        <AddToListPanel target={{ type: entry.targetType, id: entry.target.id }} onClose={actions.closeList} />
      ) : null}
    </>
  );
}
