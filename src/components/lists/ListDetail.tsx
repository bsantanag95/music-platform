"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListDetailHeader } from "./ListDetailHeader";
import { ListItemsView } from "./ListItemsView";
import { removeItemFromList, reorderListItems } from "@/lib/api/lists";
import type { UserListDetail } from "@/lib/api/schemas";

interface ListDetailProps {
  initial: UserListDetail;
}

// Detalle de una lista propia: edición de metadatos y gestión interna de los
// ítems ya agregados (reordenar en cualquiera de los tres modos, quitar). El
// alta de ítems se hace desde las páginas de catálogo (artista/álbum/canción),
// no desde acá. El estado vive local — no hay caché de React Query para el
// detalle, así que no hay que invalidar nada.
export function ListDetail({ initial }: ListDetailProps) {
  const t = useTranslations("lists");
  const [list, setList] = useState<UserListDetail>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const reorder = async (orderedIds: string[]) => {
    setBusy(true);
    setError(false);
    try {
      setList(await reorderListItems(list.id, orderedIds));
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  const removeItem = async (itemId: string) => {
    setBusy(true);
    setError(false);
    try {
      setList(await removeItemFromList(list.id, itemId));
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex w-full max-w-3xl flex-col gap-6">
      <ListDetailHeader list={list} canManage onUpdated={setList} />

      {list.items.length === 0 ? (
        <EmptyState title={t("noItems")} description={t("emptyItemsHint")} />
      ) : (
        <ListItemsView
          items={list.items}
          entityType={list.entityType}
          manage={{ busy, onReorder: reorder, onRemove: removeItem }}
        />
      )}

      {error ? (
        <span role="alert" className="text-center font-data text-xs text-danger">
          {t("saveError")}
        </span>
      ) : null}
    </div>
  );
}
