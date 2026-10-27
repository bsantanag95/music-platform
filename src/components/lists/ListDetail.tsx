"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/ui/EmptyState";
import { Link } from "@/i18n/navigation";
import { ListDetailHeader } from "./ListDetailHeader";
import { ListItemsView } from "./ListItemsView";
import { UndoToast } from "@/components/ui/UndoToast";
import { addItemToList, removeItemFromList, reorderListItems } from "@/lib/api/lists";
import type { UserListDetail, UserListItem } from "@/lib/api/schemas";

// Último ítem quitado, con el orden de antes para devolverlo a su posición (openspec: redesign-me-lists-views, D7).
interface RemovedItem {
  key: number;
  item: UserListItem;
  previousOrder: string[];
  undoing: boolean;
  failed: boolean;
}

interface ListDetailProps {
  initial: UserListDetail;
  /** Conteo agregado de guardados de la lista (dato público si es `public`). */
  saveCount?: number;
}

// Detalle de una lista propia: edición de metadatos y gestión interna de los
// ítems ya agregados (reordenar en cualquiera de los tres modos, quitar). El
// alta de ítems se hace desde las páginas de catálogo (artista/álbum/canción),
// no desde acá. El estado vive local — no hay caché de React Query para el
// detalle, así que no hay que invalidar nada.
export function ListDetail({ initial, saveCount }: ListDetailProps) {
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

  const [removed, setRemoved] = useState<RemovedItem | null>(null);

  // Quitar es inmediato; el aviso ofrece Deshacer durante 6 s.
  const removeItem = async (itemId: string) => {
    const item = list.items.find((candidate) => candidate.id === itemId);
    if (!item) return;
    const previousOrder = list.items.map((candidate) => candidate.id);
    setBusy(true);
    setError(false);
    try {
      setList(await removeItemFromList(list.id, itemId));
      setRemoved({ key: Date.now(), item, previousOrder, undoing: false, failed: false });
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  // Deshacer vuelve a agregar el objetivo (queda al final, con otro id) y repone el orden de antes.
  const undoRemove = async () => {
    if (!removed) return;
    setRemoved({ ...removed, undoing: true });
    setBusy(true);
    try {
      const restored = await addItemToList(list.id, { type: list.entityType, id: removed.item.target.id });
      const readded = restored.items.find((candidate) => candidate.target.id === removed.item.target.id);
      const present = new Set(restored.items.map((candidate) => candidate.id));
      const order = removed.previousOrder
        .map((id) => (id === removed.item.id ? readded?.id : id))
        .filter((id): id is string => id !== undefined && present.has(id));
      const extra = restored.items.map((candidate) => candidate.id).filter((id) => !order.includes(id));
      setList(await reorderListItems(list.id, [...order, ...extra]));
      setRemoved(null);
    } catch {
      setRemoved({ ...removed, undoing: false, failed: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <Link
        href="/me/lists"
        className="-my-2 inline-flex min-h-8 items-center self-start font-data text-xs text-paper-muted transition-colors hover:text-amber [@media(pointer:coarse)]:min-h-11"
      >
        {t("backToLists")}
      </Link>
      <ListDetailHeader list={list} canManage saveCount={saveCount} onUpdated={setList} />

      {list.items.length === 0 ? (
        <EmptyState title={t("noItems")} description={t("emptyItemsHint")} />
      ) : (
        <ListItemsView
          items={list.items}
          entityType={list.entityType}
          manage={{ busy, onReorder: reorder, onRemove: removeItem }}
        />
      )}

      {removed ? (
        <UndoToast
          key={removed.key}
          message={removed.failed ? t("undoError") : t("removedItem", { title: removed.item.target.title })}
          undoLabel={t("undo")}
          onUndo={removed.failed ? undefined : () => void undoRemove()}
          undoing={removed.undoing}
          onExpire={() => setRemoved(null)}
        />
      ) : null}

      {error ? (
        <span role="alert" className="text-center font-data text-xs text-danger">
          {t("saveError")}
        </span>
      ) : null}
    </div>
  );
}
