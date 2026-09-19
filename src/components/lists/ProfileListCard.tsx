"use client";

import { useTranslations } from "next-intl";
import type { UserListSummary } from "@/lib/api/schemas";
import { ListCard } from "./ListCard";
import { SaveListButton } from "./SaveListButton";
import { entityTypeKey } from "./lists-shared";

// Tarjeta de una lista en el perfil de OTRA persona (riel del Nivel 2 y página
// dedicada): mosaico + tipo · conteo, la marca "Fijada" cuando el dueño la
// fijó, y la acción Guardar/Seguir. La gestión de listas propias vive en
// /me/lists (`MyListsTab`), no acá.
export function ProfileListCard({
  list,
  username,
  className,
}: {
  list: UserListSummary;
  username: string;
  className?: string;
}) {
  const t = useTranslations("lists");

  return (
    <ListCard
      href={`/users/${encodeURIComponent(username)}/lists/${list.id}`}
      title={list.title}
      coverThumbs={list.coverThumbs}
      description={list.description}
      pinned={list.pinned}
      pinnedLabel={t("pinnedBadge")}
      className={className}
      meta={
        <>
          <span>{t(entityTypeKey(list.entityType))}</span>
          <span aria-hidden>·</span>
          <span>{t("itemsCount", { count: list.itemCount })}</span>
        </>
      }
      action={
        <SaveListButton
          key={`${list.id}:${list.saved ?? false}:${list.following ?? false}`}
          listId={list.id}
          initialSaved={list.saved ?? false}
          initialFollowing={list.following ?? false}
        />
      }
    />
  );
}
