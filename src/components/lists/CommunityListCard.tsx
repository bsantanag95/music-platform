"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { RelativeDate } from "@/components/feed/feed-row-parts";
import type { DiscoverListSummary } from "@/lib/api/schemas";
import { ListCard } from "./ListCard";
import { SaveListButton } from "./SaveListButton";
import { entityTypeKey } from "./lists-shared";

// Tarjeta de una lista de la comunidad para la superficie `/lists`: tipo ·
// conteo · dueño · (guardados) · antigüedad, con la acción Guardar/Seguir. Se
// usa en las cuatro secciones (Destacadas, Populares, De seguidos, Recientes).
export function CommunityListCard({
  list,
  canSave,
  dense = false,
}: {
  list: DiscoverListSummary;
  /** Hay sesión: se ofrece la acción Guardar/Seguir. */
  canSave: boolean;
  /** Variante compacta para las secciones de navegación (no Destacadas): recorta
   * guardados y antigüedad del meta para que la línea entre en una card angosta. */
  dense?: boolean;
}) {
  const t = useTranslations("lists");
  const ownerName = list.owner.displayName ?? `@${list.owner.username}`;

  return (
    <ListCard
      href={`/users/${encodeURIComponent(list.owner.username)}/lists/${list.id}`}
      title={list.title}
      coverThumbs={list.coverThumbs}
      description={list.description}
      dense={dense}
      meta={
        <>
          {list.isOfficial ? <span className="rounded bg-amber px-1.5 py-0.5 font-data text-[10px] text-ink">{t("officialBadge")}</span> : null}
          <span>{t(entityTypeKey(list.entityType))}</span>
          <span aria-hidden>·</span>
          <span>{t("itemsCount", { count: list.itemCount })}</span>
          <span aria-hidden>·</span>
          <Link
            href={`/users/${encodeURIComponent(list.owner.username)}`}
            className="transition-colors hover:text-paper"
          >
            {t("byOwner", { name: ownerName })}
          </Link>
          {!dense && typeof list.saveCount === "number" && list.saveCount > 0 ? (
            <>
              <span aria-hidden>·</span>
              <span>{t("savesCount", { count: list.saveCount })}</span>
            </>
          ) : null}
          {!dense ? (
            <>
              <span aria-hidden>·</span>
              <RelativeDate iso={list.createdAt} />
            </>
          ) : null}
        </>
      }
      action={
        canSave && !list.isOwn ? (
          <SaveListButton
            key={`${list.id}:${list.saved}:${list.following}`}
            listId={list.id}
            initialSaved={list.saved}
            initialFollowing={list.following}
          />
        ) : undefined
      }
    />
  );
}
