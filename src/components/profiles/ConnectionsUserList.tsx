"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { apiFetch, ApiError } from "@/lib/api/client";
import { NoContentSchema, type FollowRelation, type UserSummary } from "@/lib/api/schemas";
import { UserCard } from "@/components/social/UserCard";
import { Button } from "@/components/ui/Button";

type ConnectionsUser = UserSummary & { relation?: FollowRelation };

interface ConnectionsUserListProps {
  users: ConnectionsUser[];
  authenticated: boolean;
  emptyMessage: string;
  /**
   * El visitante es el dueño de esta lista de seguidores: cada fila suma la
   * acción "Quitar seguidor" (además del `FollowButton` normal, que ya
   * refleja correctamente si el dueño sigue de vuelta a esa persona). No
   * aplica a "seguidos" — ahí dejar de seguir ya sale solo del `FollowButton`,
   * porque la relación del dueño hacia cada persona listada es "following".
   */
  ownRemovableFollowers?: boolean;
}

// Listado de solo lectura (+ gestión opcional del propio dueño) para las 3
// vistas de conexiones de un perfil (Seguidos/Seguidores/Seguidos en común) —
// reemplaza a `UserList.tsx` para "followers"/"following": aquella es
// exclusivamente de autogestión (siempre sobre la sesión activa), esta sirve
// tanto para ver la red de un tercero como, cuando el visitante es el dueño,
// para gestionar la propia (mismo menú de usuario, unificado — ver memoria
// profile-redesign).
export function ConnectionsUserList({
  users,
  authenticated,
  emptyMessage,
  ownRemovableFollowers = false,
}: ConnectionsUserListProps) {
  const t = useTranslations("users");
  const tErrors = useTranslations("errors");
  const [items, setItems] = useState(users);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  if (items.length === 0) {
    return <p className="font-body text-sm text-paper-muted">{emptyMessage}</p>;
  }

  async function removeFollower(user: ConnectionsUser) {
    setBusyId(user.id);
    setErrorCode(null);
    try {
      await apiFetch(`/api/me/followers/${user.id}`, NoContentSchema, { method: "DELETE" });
      setItems((current) => current.filter((item) => item.id !== user.id));
    } catch (error) {
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-2">
        {items.map((user) => (
          <UserCard
            key={user.id}
            user={user}
            authenticated={authenticated}
            extra={
              ownRemovableFollowers ? (
                <Button variant="secondary" disabled={busyId === user.id} onClick={() => void removeFollower(user)}>
                  {busyId === user.id ? t("searching") : t("removeFollower")}
                </Button>
              ) : undefined
            }
          />
        ))}
      </ul>
      {errorCode && (
        <p role="alert" className="font-data text-xs text-danger">
          {tErrors(`${errorCode}.description`)}
        </p>
      )}
    </div>
  );
}

export function ConnectionsSection({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-lg text-paper">{heading}</h2>
      {children}
    </section>
  );
}
