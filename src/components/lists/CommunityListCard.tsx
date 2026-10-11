"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { RelativeDate } from "@/components/feed/feed-row-parts";
import { UserHoverCard } from "@/components/profiles/UserHoverCard";
import type { DiscoverListSummary } from "@/lib/api/schemas";
import { listHref } from "@/lib/catalog-links";
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

  const owner = (
    <UserHoverCard username={list.owner.username}>
      <Link href={`/users/${encodeURIComponent(list.owner.username)}`} className="transition-colors hover:text-paper">
        {t("byOwner", { name: ownerName })}
      </Link>
    </UserHoverCard>
  );

  // Marca "Oficial": contorno petróleo con check, no el bloque ámbar macizo de antes (la Regla de Rareza
  // reserva el ámbar; en Destacadas casi todas las tarjetas lo llevaban).
  const badge = list.isOfficial ? (
    <span className="inline-flex shrink-0 items-center gap-1 rounded border border-petrol/50 px-1.5 py-px font-data text-[10px] text-petrol">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true" className="size-2.5">
        <path d="M5 12.5 10 17.5 19 7" />
      </svg>
      {t("officialBadge")}
    </span>
  ) : undefined;

  return (
    <ListCard
      href={listHref(list.owner.username, list.title, list.id)}
      title={list.title}
      coverThumbs={list.coverThumbs}
      description={list.description}
      dense={dense}
      badge={badge}
      // Dos líneas en la tarjeta completa (qué es · cuánto; de quién · cuándo): antes era una sola línea que
      // se partía a mitad, dejando "hace 1 mes" suelto abajo.
      meta={
        <>
          <span>{t(entityTypeKey(list.entityType))}</span>
          <span aria-hidden>·</span>
          <span>{t("itemsCount", { count: list.itemCount })}</span>
          {dense ? (
            <>
              <span aria-hidden>·</span>
              {owner}
            </>
          ) : null}
          {!dense && typeof list.saveCount === "number" && list.saveCount > 0 ? (
            <>
              <span aria-hidden>·</span>
              <span>{t("savesCount", { count: list.saveCount })}</span>
            </>
          ) : null}
        </>
      }
      subMeta={
        dense ? undefined : (
          <>
            {owner}
            <span aria-hidden>·</span>
            <RelativeDate iso={list.createdAt} />
          </>
        )
      }
      actionPlacement={dense ? "footer" : "aside"}
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
