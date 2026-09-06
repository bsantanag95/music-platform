"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListDetailHeader } from "./ListDetailHeader";
import { ListItemsView } from "./ListItemsView";
import { ListItemSearch } from "./ListItemSearch";
import { removeItemFromList, reorderListItems } from "@/lib/api/lists";
import type { UserListDetail } from "@/lib/api/schemas";

interface ListDetailProps {
  initial: UserListDetail;
}

// Detalle de una lista propia: cabecera con edición de metadatos, alta de ítems
// desde el catálogo y el cuerpo de ítems en el modo de visualización elegido,
// con gestión (reordenar / quitar). El estado vive local — no hay caché de
// React Query para el detalle, así que no hay que invalidar nada.
export function ListDetail({ initial }: ListDetailProps) {
  const t = useTranslations("lists");
  const [list, setList] = useState<UserListDetail>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const existingTargetIds = new Set(list.items.map((item) => item.target.id));

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

      <div className="flex flex-col gap-3">
        <Button
          variant="secondary"
          onClick={() => setShowSearch((v) => !v)}
          className="self-start"
        >
          {showSearch ? t("collapse") : t("addItem")}
        </Button>
        {showSearch ? (
          <ListItemSearch
            listId={list.id}
            entityType={list.entityType}
            existingTargetIds={existingTargetIds}
            onAdded={setList}
            onClose={() => setShowSearch(false)}
          />
        ) : null}
      </div>

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
