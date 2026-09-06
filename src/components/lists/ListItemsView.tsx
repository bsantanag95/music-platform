"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import type { ListEntityType, UserListItem } from "@/lib/api/schemas";
import { ListModeSwitcher } from "./ListModeSwitcher";
import { ItemsDetailed } from "./ItemsDetailed";
import { ItemsIndex } from "./ItemsIndex";
import { ItemsGraphic } from "./ItemsGraphic";
import { moveByOffset, moveToEdge } from "./list-item-order";
import { useListViewMode } from "./use-list-view-mode";
import type { ListItemsRowActions } from "./list-items-view";

export interface ListItemsManage {
  busy: boolean;
  /** Persiste el orden completo resultante (una sola operación). */
  onReorder: (orderedIds: string[]) => void;
  onRemove: (itemId: string) => void;
}

// Cuerpo de ítems del detalle de lista, compartido entre el detalle propio y la
// vista de lectura ajena. Elige el modo de visualización (preferencia global del
// visitante) y delega el render en uno de los tres renderers. En modo lectura
// `manage` es `undefined` y no se muestra ningún control.
export function ListItemsView({
  items,
  entityType,
  manage,
}: {
  items: UserListItem[];
  entityType: ListEntityType;
  manage?: ListItemsManage;
}) {
  const t = useTranslations("lists");
  const [mode, setMode] = useListViewMode();

  const actions: ListItemsRowActions | null = useMemo(() => {
    if (!manage) return null;
    const order = () => items.map((item) => item.id);
    return {
      busy: manage.busy,
      move: (id, delta) => manage.onReorder(moveByOffset(order(), id, delta)),
      moveToEdge: (id, edge) => manage.onReorder(moveToEdge(order(), id, edge)),
      remove: (id) => manage.onRemove(id),
    };
  }, [manage, items]);

  const Renderer = mode === "index" ? ItemsIndex : mode === "graphic" ? ItemsGraphic : ItemsDetailed;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-lg text-paper">
          {t("items")}{" "}
          <span className="font-data text-sm text-paper-muted">({items.length})</span>
        </h2>
        <ListModeSwitcher mode={mode} onChange={setMode} />
      </div>

      <Renderer items={items} entityType={entityType} actions={actions} />
    </section>
  );
}
