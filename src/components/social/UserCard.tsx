"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { FollowRelation, UserSummary } from "@/lib/api/schemas";
import { FollowButton } from "./FollowButton";
import { UserAvatar } from "./UserAvatar";

interface UserCardProps {
  user: UserSummary & { relation?: FollowRelation };
  authenticated: boolean;
  showFollow?: boolean;
  onRelationChange?: (username: string, relation: FollowRelation) => void;
  /** Acción adicional junto al `FollowButton` (p. ej. "Quitar seguidor" en las vistas de conexiones del propio dueño). */
  extra?: ReactNode;
}

// Tarjeta de usuario reutilizable en la búsqueda social. Separa identidad
// (monograma + nombre + username) de la acción social, y en móvil la acción
// pasa a una segunda línea para no recortar etiquetas largas. El nombre es dato
// de usuario (no se traduce); las etiquetas de estado sí vienen de i18n.
export function UserCard({ user, authenticated, showFollow = true, onRelationChange, extra }: UserCardProps) {
  const t = useTranslations("users");
  const name = user.displayName ?? user.username;

  return (
    <li className="group flex flex-col gap-3 rounded-lg border border-ink-border bg-ink-surface px-4 py-3.5 transition-colors hover:border-amber/70 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5">
      <Link
        href={`/users/${encodeURIComponent(user.username)}`}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <UserAvatar
          avatarUrl={user.avatarUrl}
          username={user.username}
          name={name}
          size="sm"
        />
        <span className="min-w-0 flex flex-col font-body text-sm text-paper">
          <span className="truncate font-display text-base text-paper transition-colors group-hover:text-amber">
            {name}
          </span>
          <span className="mt-0.5 block truncate font-data text-xs text-paper-muted">
            @{user.username}
          </span>
        </span>
      </Link>
      {((showFollow && (user.relation || authenticated)) || extra) && (
        <div className="flex shrink-0 flex-wrap items-center justify-start gap-2 sm:justify-end">
          {showFollow &&
            (user.relation ? (
              <FollowButton
                username={user.username}
                relation={user.relation}
                authenticated={authenticated}
                requestId={user.id}
                onChange={(next) => onRelationChange?.(user.username, next)}
              />
            ) : authenticated ? (
              <span className="font-data text-xs text-paper-muted">{t("following")}</span>
            ) : null)}
          {extra}
        </div>
      )}
    </li>
  );
}
