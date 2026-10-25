import { describe, expect, it } from "vitest";
import { getTableConfig } from "drizzle-orm/pg-core";
import { notification } from "@/db/schema";

// Retracción por cascada (openspec: add-notifications-core, D2). La bandeja no
// tiene código de limpieza: cada referencia del aviso apunta a su objeto con
// ON DELETE CASCADE, así que borrar la respuesta, dejar de seguir, quitar un
// seguidor, rechazar / cancelar una solicitud, bloquear (que borra los
// `user_follow`) o eliminar una cuenta retira la fila sola.
//
// Se comprueba sobre el espejo de `src/db/schema.ts` (el que usa la app) y la
// contraparte se verifica contra Postgres real en el smoke test: allí los
// `ON DELETE` son los de `drizzle/0075_notifications.sql`.

function foreignKeyDeletes(table: Parameters<typeof getTableConfig>[0]) {
  const config = getTableConfig(table);
  return config.foreignKeys.map((fk) => ({
    name: fk.getName(),
    onDelete: (fk as unknown as { onDelete?: string }).onDelete,
  }));
}

describe("retracción por cascada de las notificaciones", () => {
  it("todas las referencias del aviso se borran con su objeto", () => {
    const deletes = foreignKeyDeletes(notification);

    expect(deletes.map((fk) => fk.name).sort()).toEqual([
      "notification_actor_id_app_user_id_fk",
      "notification_comment_id_comment_id_fk",
      "notification_follow_id_user_follow_id_fk",
      "notification_list_id_user_list_id_fk",
      "notification_moderation_action_id_moderation_action_id_fk",
      "notification_recipient_id_app_user_id_fk",
      "notification_release_group_id_release_group_id_fk",
    ]);
    expect(deletes.every((fk) => fk.onDelete === "cascade")).toBe(true);
  });

  // La otra mitad —que `moderation_action` conserva sus filas al borrarse el
  // contenido (SET NULL), y con ellas el aviso— no está declarada en el espejo
  // de TypeScript: se verifica contra Postgres real en el smoke test.
});
