import type { ReactNode } from "react";
import { relationsFor } from "@/services/social/relations";
import { UserCard } from "@/components/social/UserCard";
import type { UserSummary } from "@/lib/api/schemas";

interface ConnectionsUserListProps {
  users: UserSummary[];
  viewerId: string | null;
  authenticated: boolean;
  emptyMessage: string;
}

// Listado de solo lectura para las vistas de conexiones (Seguidos/Seguidores/
// Seguidos en común de un perfil ajeno) — a diferencia de `UserList.tsx`
// (gestión de la propia cuenta: quitar seguidor, dejar de seguir, etc.),
// cada fila solo puede seguir/dejar de seguir a la persona listada, la misma
// acción que ya ofrece `UserCard` en la búsqueda de usuarios.
export async function ConnectionsUserList({ users, viewerId, authenticated, emptyMessage }: ConnectionsUserListProps) {
  if (users.length === 0) {
    return <p className="font-body text-sm text-paper-muted">{emptyMessage}</p>;
  }

  const relations = await relationsFor(viewerId, users.map((user) => user.id));

  return (
    <ul className="flex flex-col gap-2">
      {users.map((user) => (
        <UserCard key={user.id} user={{ ...user, relation: relations.get(user.id) }} authenticated={authenticated} />
      ))}
    </ul>
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
