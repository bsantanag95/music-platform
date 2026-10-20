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
  showDate = false,
  large = false,
}: {
  list: DiscoverListSummary;
  /** Hay sesión: se ofrece la acción Guardar/Seguir. */
  canSave: boolean;
  /** Variante compacta para las secciones de navegación (no Destacadas): recorta
   * guardados y antigüedad del meta para que la línea entre en una card angosta. */
  dense?: boolean;
  /** En la variante densa, muestra la antigüedad en lugar de los guardados (De la gente que sigues). */
  showDate?: boolean;
  /** Tarjeta grande: una única Destacada ocupa la fila (con dos o más, la normal). */
  large?: boolean;
}) {
  const t = useTranslations("lists");
  const ownerName = list.owner.displayName ?? `@${list.owner.username}`;
  const hasSaves = typeof list.saveCount === "number" && list.saveCount > 0;

  const owner = (
    <UserHoverCard username={list.owner.username}>
      <Link href={`/users/${encodeURIComponent(list.owner.username)}`} className="transition-colors hover:text-paper">
        {t("byOwner", { name: ownerName })}
      </Link>
    </UserHoverCard>
  );

  // Marca "Oficial": contorno petróleo con check, no el bloque ámbar macizo de antes (la Regla de Rareza
  // reserva el ámbar; en Destacadas casi todas las tarjetas lo llevaban). Texto en `petrol-hover` y 12 px: el
  // `petrol` base sobre la tarjeta da ~3,6:1 de contraste y a 10 px no se lee.
  const badge = list.isOfficial ? (
    <span className="inline-flex shrink-0 items-center gap-1 rounded border border-petrol-hover/50 px-1.5 py-px font-data text-xs text-petrol-hover">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true" className="size-3">
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
      large={large}
      badge={badge}
      // Siempre dos líneas: qué es · cuánto (· guardados en la tarjeta completa), y de quién · cuándo (en las
      // secciones densas, de quién · guardados: la cifra que ordena Populares). Antes era una sola línea que
      // se partía a mitad y dejaba "hace 1 mes" o "por Fran" sueltos abajo.
      meta={
        <>
          <span>{t(entityTypeKey(list.entityType))}</span>
          <span aria-hidden>·</span>
          <span>{t("itemsCount", { count: list.itemCount })}</span>
          {!dense && hasSaves ? (
            <>
              <span aria-hidden>·</span>
              <span>{t("savesCount", { count: list.saveCount! })}</span>
            </>
          ) : null}
        </>
      }
      subMeta={
        <>
          {owner}
          {dense && !showDate ? (
            hasSaves ? (
              <>
                <span aria-hidden>·</span>
                <span>{t("savesCount", { count: list.saveCount! })}</span>
              </>
            ) : null
          ) : (
            <>
              <span aria-hidden>·</span>
              <RelativeDate iso={list.createdAt} />
            </>
          )}
        </>
      }
      actionPlacement="aside"
      action={
        canSave && !list.isOwn ? (
          <SaveListButton
            key={`${list.id}:${list.saved}:${list.following}`}
            listId={list.id}
            initialSaved={list.saved}
            initialFollowing={list.following}
            variant={dense ? "compact" : "full"}
          />
        ) : undefined
      }
    />
  );
}
