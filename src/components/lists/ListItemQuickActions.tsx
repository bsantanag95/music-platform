"use client";

import { useTranslations } from "next-intl";
import { AlbumQuickActions } from "@/components/catalog/AlbumQuickActions";
import type { UserListItem } from "@/lib/api/schemas";

// Menú de acciones de un disco en la lista de álbumes de otra persona (openspec:
// extend-album-quick-actions): guardar en Pendiente o en tus listas lo que descubrís ahí. Solo en
// modo lectura; el dueño gestiona su lista con sus propios controles.

export interface ListQuickActions {
  authenticated: boolean;
  /** Un solo menú abierto a la vez en la lista (id del ítem). */
  openId: string | null;
  setOpenId: (id: string | null) => void;
}

export function ListItemQuickActions({
  item,
  quick,
  variant,
  className = "",
}: {
  item: UserListItem;
  quick: ListQuickActions;
  variant: "cover" | "row";
  className?: string;
}) {
  const t = useTranslations("lists");
  return (
    <AlbumQuickActions
      item={{ id: item.target.id, title: item.target.title || t("itemUnavailable") }}
      authenticated={quick.authenticated}
      open={quick.openId === item.id}
      onOpenChange={(next) => quick.setOpenId(next ? item.id : null)}
      variant={variant}
      className={className}
    />
  );
}
