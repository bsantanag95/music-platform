"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { RowMenu, RowMenuItem, RowMenuSeparator } from "@/components/ui/RowMenu";
import { listHref } from "@/lib/catalog-links";
import type { UserListSummary } from "@/lib/api/schemas";

// Menú ⋯ de una lista propia en la estantería de Mis listas (openspec: redesign-me-lists-views, D3): fijar o desfijar,
// editar los datos en un diálogo, ver la página pública (si no es privada) y eliminar con confirmación. Reemplaza los
// tres enlaces de texto de la tarjeta.
export function MyListCardMenu({
  list,
  ownerUsername,
  onTogglePin,
  onEdit,
  onDelete,
}: {
  list: Pick<UserListSummary, "id" | "title" | "audience" | "pinned">;
  /** Usuario del dueño, para el enlace a la página pública de la lista. */
  ownerUsername: string;
  onTogglePin: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const t = useTranslations("lists");
  const router = useRouter();
  return (
    <RowMenu
      label={t("cardMenuLabel", { title: list.title })}
      triggerClassName="size-8 [@media(pointer:coarse)]:size-11"
    >
      <RowMenuItem onSelect={onTogglePin}>{list.pinned ? t("unpin") : t("pinToTop")}</RowMenuItem>
      <RowMenuItem onSelect={onEdit}>{t("editDetails")}</RowMenuItem>
      {list.audience !== "private" ? (
        <RowMenuItem onSelect={() => router.push(listHref(ownerUsername, list.title, list.id))}>
          {t("viewAsOthers")}
        </RowMenuItem>
      ) : null}
      <RowMenuSeparator />
      <RowMenuItem danger onSelect={onDelete}>
        {t("deleteListEllipsis")}
      </RowMenuItem>
    </RowMenu>
  );
}
