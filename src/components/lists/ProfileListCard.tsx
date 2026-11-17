"use client";

import { useTranslations } from "next-intl";
import type { UserListSummary } from "@/lib/api/schemas";
import { listHref } from "@/lib/catalog-links";
import { ListCard } from "./ListCard";
import { SaveListButton } from "./SaveListButton";
import { entityTypeKey } from "./lists-shared";
import { AudienceMark } from "@/components/profiles/AudienceMark";

// Tarjeta de una lista en el perfil de OTRA persona (riel del Nivel 2 y página
// dedicada): mosaico + tipo · conteo, la marca "Fijada" cuando el dueño la
// fijó, y la acción Guardar/Seguir. La gestión de listas propias vive en
// /me/lists (`MyListsTab`), no acá.
export function ProfileListCard({
  list,
  username,
  className,
  canAct = true,
  showAudience = false,
}: {
  list: UserListSummary;
  username: string;
  className?: string;
  /** Guardar/Seguir solo para un visitante con sesión que no es el dueño (spec social-profiles). */
  canAct?: boolean;
  /** Vista del dueño: marca la lista si no es pública (redesign-owner-profile-phase2). */
  showAudience?: boolean;
}) {
  const t = useTranslations("lists");

  return (
    <ListCard
      href={listHref(username, list.title, list.id)}
      title={list.title}
      coverThumbs={list.coverThumbs}
      itemCount={list.itemCount}
      entityType={list.entityType}
      description={list.description}
      pinned={list.pinned}
      pinnedLabel={t("pinnedBadge")}
      className={className}
      meta={
        <>
          <span>{t(entityTypeKey(list.entityType))}</span>
          <span aria-hidden>·</span>
          <span>{t("itemsCount", { count: list.itemCount })}</span>
          {showAudience && list.audience !== "public" && (
            <>
              <span aria-hidden>·</span>
              <AudienceMark audience={list.audience} />
            </>
          )}
        </>
      }
      action={
        canAct ? (
          <SaveListButton
          key={`${list.id}:${list.saved ?? false}:${list.following ?? false}`}
          listId={list.id}
          initialSaved={list.saved ?? false}
          initialFollowing={list.following ?? false}
          />
        ) : null
      }
    />
  );
}
