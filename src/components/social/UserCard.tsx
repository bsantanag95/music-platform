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

// Identidad visual derivada (no un avatar real: el modelo no expone imágenes).
// El color se elige de forma determinista por username para que sea estable
// entre renders sin almacenar nada.
const MONOGRAM_STYLES = [
  "border-amber/40 bg-amber/10 text-amber",
  "border-petrol/40 bg-petrol/15 text-paper",
];

function monogramLetter(name: string): string {
  const [first] = Array.from(name.trim());
  return first ? first.toUpperCase() : "?";
}

// Tarjeta de usuario reutilizable en la búsqueda social. Separa identidad
// (monograma + nombre + username) de la acción social, y en móvil la acción
// pasa a una segunda línea para no recortar etiquetas largas. El nombre es dato
// de usuario (no se traduce); las etiquetas de estado sí vienen de i18n.
export function UserCard({ user, authenticated, showFollow = true, onRelationChange }: UserCardProps) {
  const t = useTranslations("users");
  const name = user.displayName ?? user.username;
  const styleIndex = Math.abs(user.username.charCodeAt(0)) % MONOGRAM_STYLES.length;
  const monogramClass = MONOGRAM_STYLES[styleIndex] ?? MONOGRAM_STYLES[0] ?? "";

  return (
    <li className="group flex flex-col gap-3 rounded-lg border border-ink-border bg-ink-surface px-4 py-3.5 transition-colors hover:border-amber/70 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5">
      <Link
        href={`/users/${encodeURIComponent(user.username)}`}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <span
          aria-hidden="true"
          className={`flex size-11 shrink-0 items-center justify-center rounded-full border font-display text-lg ${monogramClass}`}
        >
          {monogramLetter(name)}
        </span>
        <span className="min-w-0 flex flex-col font-body text-sm text-paper">
          <span className="truncate font-display text-base text-paper transition-colors group-hover:text-amber">
            {name}
          </span>
          <span className="mt-0.5 block truncate font-data text-xs text-paper-muted">
            @{user.username}
          </span>
        </span>
      </Link>
      {showFollow && (user.relation || authenticated) && (
        <div className="flex shrink-0 flex-wrap items-center justify-start gap-2 sm:justify-end">
          {user.relation ? (
            <FollowButton
              username={user.username}
              relation={user.relation}
              authenticated={authenticated}
              requestId={user.id}
              onChange={(next) => onRelationChange?.(user.username, next)}
            />
          ) : (
            <span className="font-data text-xs text-paper-muted">{t("following")}</span>
          )}
        </div>
      )}
    </li>
  );
}
