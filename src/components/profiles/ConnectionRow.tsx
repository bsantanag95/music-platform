"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { FollowRelation, UserSummary } from "@/lib/api/schemas";
import { FollowButton } from "@/components/social/FollowButton";
import { UserAvatar } from "@/components/social/UserAvatar";
import { Button } from "@/components/ui/Button";
import { RowMenu, RowMenuItem, RowMenuSeparator } from "@/components/ui/RowMenu";

export type ConnectionUser = UserSummary & { relation?: FollowRelation };

interface ConnectionRowProps {
  user: ConnectionUser;
  authenticated: boolean;
  /** Seguidores propios: el menú suma "Eliminar seguidor…". */
  removable: boolean;
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
  busy,
  pendingUnfollow = false,
  onUndoPending,
  onRelationChange,
  onUnfollow,
  onCancelRequest,
  onRemove,
}: ConnectionRowProps) {
  const t = useTranslations("users");
  const name = user.displayName ?? user.username;
  const relation = authenticated ? (user.relation ?? "none") : null;

  let visible: ReactNode = null;
  if (pendingUnfollow) {
    visible = (
      <Button variant="primary" onClick={onUndoPending}>
        {user.profileVisibility === "private" ? t("requestFollow") : t("follow")}
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
        onChange={(next) => onRelationChange(user, next)}
      />
    );
  } else if (relation) {
    const status = {
      following: t("following"),
      requested: t("requested"),
      self: t("connections.you"),
      blocked: t("blocked"),
    }[relation];
    visible = <span className="font-data text-xs text-paper-muted">{status}</span>;
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
    <li className="group flex items-center gap-3 border-b border-ink-border py-3">
      <Link
        href={`/users/${encodeURIComponent(user.username)}`}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <UserAvatar avatarUrl={user.avatarUrl} username={user.username} name={name} size="sm" />
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-display text-base text-paper transition-colors group-hover:text-amber">
            {name}
          </span>
          <span className="truncate font-data text-xs text-paper-muted">@{user.username}</span>
        </span>
      </Link>
      {visible || items.length > 0 ? (
        <div className="flex shrink-0 items-center gap-2">
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
