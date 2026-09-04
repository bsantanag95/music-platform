"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { FollowRelation, UserSummary } from "@/lib/api/schemas";
import { FollowButton } from "./FollowButton";

interface UserCardProps {
  user: UserSummary & { relation?: FollowRelation };
  authenticated: boolean;
  showFollow?: boolean;
  onRelationChange?: (username: string, relation: FollowRelation) => void;
}

// Fila de usuario reutilizable en búsqueda y listados sociales. El nombre es
// dato de usuario (no se traduce); las etiquetas de estado sí vienen de i18n.
export function UserCard({ user, authenticated, showFollow = true, onRelationChange }: UserCardProps) {
  const t = useTranslations("users");

  return (
    <li className="group flex min-h-20 items-center justify-between gap-4 rounded-lg border border-ink-border bg-ink-surface px-4 py-3.5 transition-colors hover:border-amber/70 sm:px-5">
      <Link
        href={`/users/${encodeURIComponent(user.username)}`}
        className="min-w-0 flex-1 font-body text-sm text-paper transition-colors hover:text-amber"
      >
        <span className="block truncate font-display text-base text-paper group-hover:text-amber">
          {user.displayName ?? user.username}
        </span>
        <span className="mt-1 block truncate font-data text-xs text-paper-muted">
          @{user.username}
        </span>
      </Link>
      {showFollow && user.relation && (
        <FollowButton
          username={user.username}
          relation={user.relation}
          authenticated={authenticated}
          requestId={user.id}
          onChange={(next) => onRelationChange?.(user.username, next)}
        />
      )}
      {showFollow && !user.relation && authenticated && (
        <span className="text-xs text-paper-muted">{t("following")}</span>
      )}
    </li>
  );
}
