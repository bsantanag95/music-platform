"use client";

import { Fragment, type ReactNode } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { FollowRelation, UserSummary } from "@/lib/api/schemas";
import { FollowButton } from "@/components/social/FollowButton";
import { UserAvatar } from "@/components/social/UserAvatar";
import { Button } from "@/components/ui/Button";
import { RowMenu, RowMenuItem, RowMenuSeparator } from "@/components/ui/RowMenu";

/** `followsYou`: la persona sigue al visitante con relación aceptada (redesign-connections-toolbar, D3). */
/**
 * `followedAt`: desde cuándo existe la relación listada; `sharedAlbums`: discos en común con el visitante, ya con el
 * umbral aplicado (enrich-connections-rows, D1–D2).
 */
export type ConnectionUser = UserSummary & {
  relation?: FollowRelation;
  followsYou?: boolean;
  followedAt?: string;
  sharedAlbums?: number | null;
};

/** Qué dice ya la vista: en los Seguidores propios todos siguen al visitante; en los Seguidos propios, él a todos. */
export type ConnectionContext = "ownFollowers" | "ownFollowing" | "other";

type Badge = "mutual" | "youFollow" | "followsYou" | "you";

// Insignia de la relación entre la persona y el visitante, sin repetir lo que la vista ya dice (D3).
export function connectionBadge(
  relation: FollowRelation | null,
  followsYou: boolean,
  context: ConnectionContext,
): Badge | null {
  if (relation === null) return null;
  if (relation === "self") return "you";
  if (relation === "following") {
    if (followsYou) return "mutual";
    return context === "ownFollowing" ? null : "youFollow";
  }
  if (followsYou && relation !== "blocked" && context !== "ownFollowers") return "followsYou";
  return null;
}

interface ConnectionRowProps {
  user: ConnectionUser;
  authenticated: boolean;
  /** Seguidores propios: el menú suma "Eliminar seguidor…". */
  removable: boolean;
  context?: ConnectionContext;
  busy: boolean;
  /**
   * Dejar de seguir está pendiente (el aviso con Deshacer sigue abierto): "Seguir" deshace en vez de volver a seguir,
   * que repetiría la notificación y, en un perfil privado, convertiría la relación en solicitud (D4).
   */
  pendingUnfollow?: boolean;
  onUndoPending?: () => void;
  onRelationChange: (user: ConnectionUser, relation: FollowRelation) => void;
  onUnfollow: (user: ConnectionUser) => void;
  onCancelRequest: (user: ConnectionUser) => void;
  onRemove: (user: ConnectionUser) => void;
}

// Fila de una persona en Seguidos / Seguidores (openspec: refine-connections-page-phase1, D3): avatar, nombre y
// @usuario, y a lo sumo una acción visible según la relación del visitante; lo que quita algo va al menú ⋯. Sin sesión
// no hay acciones.
export function ConnectionRow({
  user,
  authenticated,
  removable,
  context = "other",
  busy,
  pendingUnfollow = false,
  onUndoPending,
  onRelationChange,
  onUnfollow,
  onCancelRequest,
  onRemove,
}: ConnectionRowProps) {
  const t = useTranslations("users");
  const format = useFormatter();
  const name = user.displayName ?? user.username;
  // Línea de detalle: @usuario · desde cuándo · discos en común; parte entre unidades y, si hace falta, dentro (D1).
  const details: ReactNode[] = [`@${user.username}`];
  if (user.followedAt) {
    const date = format.dateTime(new Date(user.followedAt), { month: "short", year: "numeric" });
    details.push(t(`connections.since.${context}`, { date }));
  }
  if (authenticated && user.sharedAlbums) {
    details.push(
      <span className="text-amber">{t("connections.sharedAlbums", { count: user.sharedAlbums })}</span>,
    );
  }
  const relation = authenticated ? (user.relation ?? "none") : null;
  const followsYou = Boolean(user.followsYou);
  const badge = connectionBadge(relation, followsYou, context);
  // Te sigue y tú no a ella: la acción principal es seguir de vuelta (D3).
  const followLabel = followsYou ? t("connections.followBack") : t("follow");

  let visible: ReactNode = null;
  if (pendingUnfollow) {
    visible = (
      <Button variant="primary" onClick={onUndoPending}>
        {user.profileVisibility === "private" ? t("requestFollow") : followLabel}
      </Button>
    );
  } else if (relation === "none" || relation === "incoming") {
    visible = (
      <FollowButton
        key={relation}
        username={user.username}
        relation={relation}
        authenticated
        requestId={user.id}
        requestApproval={user.profileVisibility === "private"}
        followLabel={followLabel}
        onChange={(next) => onRelationChange(user, next)}
      />
    );
  } else if (relation === "requested" || relation === "blocked") {
    visible = <span className="font-data text-xs text-paper-muted">{t(relation)}</span>;
  }

  const items: ReactNode[] = [];
  if (relation === "following") {
    items.push(
      <RowMenuItem key="unfollow" onSelect={() => (busy ? undefined : onUnfollow(user))}>
        {t("unfollow")}
      </RowMenuItem>,
    );
  }
  if (relation === "requested") {
    items.push(
      <RowMenuItem key="cancel" onSelect={() => (busy ? undefined : onCancelRequest(user))}>
        {t("cancelRequest")}
      </RowMenuItem>,
    );
  }
  if (removable) {
    if (items.length > 0) items.push(<RowMenuSeparator key="sep" />);
    items.push(
      <RowMenuItem key="remove" danger onSelect={() => (busy ? undefined : onRemove(user))}>
        {t("connections.removeFollower")}
      </RowMenuItem>,
    );
  }

  return (
    <li className="group flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-ink-border py-3">
      <Link
        href={`/users/${encodeURIComponent(user.username)}`}
        className="flex min-w-0 flex-1 basis-48 items-center gap-3 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <UserAvatar avatarUrl={user.avatarUrl} username={user.username} name={name} size="sm" />
        <span className="flex min-w-0 flex-col">
          <span className="flex min-w-0 items-baseline gap-2">
            <span className="truncate font-display text-base text-paper transition-colors group-hover:text-amber">
              {name}
            </span>
            {badge ? (
              <span
                className={`shrink-0 rounded px-1.5 py-0.5 font-data text-[10px] leading-none tracking-wide ${
                  badge === "mutual" ? "bg-amber/15 text-amber" : "bg-ink-border/60 text-paper-muted"
                }`}
              >
                {t(`connections.badge.${badge}`)}
              </span>
            ) : null}
          </span>
          <span className="font-data text-xs text-paper-muted [overflow-wrap:anywhere]">
            {details.map((detail, index) => (
              <Fragment key={index}>
                {index > 0 ? " " : null}
                <span>
                  {index > 0 ? "· " : null}
                  {detail}
                </span>
              </Fragment>
            ))}
          </span>
        </span>
      </Link>
      {visible || items.length > 0 ? (
        // Si la fila no cabe (un teléfono con "Seguir de vuelta"), la acción baja a otra línea a la derecha.
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {visible}
          {items.length > 0 ? (
            <RowMenu
              label={t("connections.menuLabel", { name })}
              triggerClassName="size-8 [@media(pointer:coarse)]:size-11"
            >
              {items}
            </RowMenu>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
