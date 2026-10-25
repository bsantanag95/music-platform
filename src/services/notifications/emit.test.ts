import { describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { comment, notification, userBlock } from "@/db/schema";
import {
  ARTIST_RELEASE_WINDOW_DAYS,
  emitArtistAwardNotifications,
  emitArtistReleaseNotifications,
  emitMilestoneNotification,
  emitNotifications,
  emitReplyNotifications,
  releaseNotificationBatches,
  retractFollowRequestNotifications,
  type NotificationEvent,
  type NotificationTx,
} from "./emit";

const mocks = vi.hoisted(() => ({ select: vi.fn() }));

vi.mock("@/db", () => ({ db: { select: mocks.select } }));

const ANA = "00000000-0000-4000-8000-00000000000a";
const BRUNO = "00000000-0000-4000-8000-00000000000b";
const CARLA = "00000000-0000-4000-8000-00000000000c";
const ROOT = "00000000-0000-4000-8000-0000000000f1";
const REPLY = "00000000-0000-4000-8000-0000000000f2";
const FOLLOW = "00000000-0000-4000-8000-0000000000f3";
const ACTION = "00000000-0000-4000-8000-0000000000f4";

type Block = { blockerId: string; blockedId: string };
type PreferenceRow = { userId: string; kind: string; enabled: boolean };

/**
 * Transacción falsa: distingue la consulta de bloqueos, la de preferencias, la
 * de participantes del hilo y la de hitos ya emitidos por la tabla del `from`,
 * captura las filas insertadas y los `INSERT … SELECT` de lanzamientos.
 */
function fakeTx(
  data: {
    blocks?: Block[];
    disabled?: PreferenceRow[];
    participants?: Array<{ userId: string }>;
    milestones?: Array<{ id: string }>;
  } = {},
) {
  const inserted: Array<Record<string, unknown>> = [];
  const deleted = vi.fn().mockResolvedValue(undefined);
  const onConflictDoNothing = vi.fn().mockResolvedValue(undefined);
  const executed: unknown[] = [];

  const rowsFor = (table: unknown) => {
    if (table === userBlock) return data.blocks ?? [];
    if (table === comment) return data.participants ?? [];
    if (table === notification) return data.milestones ?? [];
    return data.disabled ?? [];
  };

  const tx = {
    select: vi.fn(() => ({
      from: (table: unknown) => ({
        where: vi.fn(() =>
          Object.assign(Promise.resolve(rowsFor(table)), {
            limit: vi.fn().mockResolvedValue(rowsFor(table)),
          }),
        ),
      }),
    })),
    insert: vi.fn(() => ({
      values: vi.fn((rows: Array<Record<string, unknown>>) => {
        inserted.push(...rows);
        return { onConflictDoNothing };
      }),
    })),
    delete: vi.fn(() => ({ where: deleted })),
    execute: vi.fn((query: unknown) => {
      executed.push(query);
      return Promise.resolve(undefined);
    }),
  };

  return {
    tx: tx as unknown as NotificationTx & typeof tx,
    inserted,
    onConflictDoNothing,
    deleted,
    executed,
  };
}

function commentReply(overrides: Partial<NotificationEvent> = {}): NotificationEvent {
  return {
    kind: "comment_reply",
    recipientId: ANA,
    actorId: BRUNO,
    commentId: REPLY,
    rootId: ROOT,
    ...overrides,
  } as NotificationEvent;
}

describe("emitNotifications", () => {
  it("inserta el aviso con su objeto, actor y clave de agrupación del hilo", async () => {
    const { tx, inserted, onConflictDoNothing } = fakeTx();

    await emitNotifications(tx, [commentReply()]);

    expect(inserted).toEqual([
      {
        recipientId: ANA,
        kind: "comment_reply",
        actorId: BRUNO,
        commentId: REPLY,
        followId: null,
        moderationActionId: null,
        milestone: null,
        listId: null,
        releaseGroupId: null,
        groupKey: `thread:${ROOT}`,
      },
    ]);
    expect(onConflictDoNothing).toHaveBeenCalledTimes(1);
  });

  it("no notifica al propio actor", async () => {
    const { tx, inserted } = fakeTx();

    await emitNotifications(tx, [commentReply({ actorId: ANA, recipientId: ANA })]);

    expect(inserted).toEqual([]);
  });

  it("descarta el aviso si hay bloqueo en cualquier dirección", async () => {
    const bloqueadoPorElActor = fakeTx({ blocks: [{ blockerId: BRUNO, blockedId: ANA }] });
    await emitNotifications(bloqueadoPorElActor.tx, [commentReply()]);
    expect(bloqueadoPorElActor.inserted).toEqual([]);

    const bloqueoDelDestinatario = fakeTx({ blocks: [{ blockerId: ANA, blockedId: BRUNO }] });
    await emitNotifications(bloqueoDelDestinatario.tx, [commentReply()]);
    expect(bloqueoDelDestinatario.inserted).toEqual([]);
  });

  it("no consulta bloqueos ni preferencias cuando solo hay avisos de moderación", async () => {
    const { tx } = fakeTx();

    await emitNotifications(tx, [
      { kind: "moderation", recipientId: ANA, moderationActionId: ACTION },
    ]);

    expect(tx.select).not.toHaveBeenCalled();
  });

  it("respeta la preferencia desactivada de un tipo opcional", async () => {
    const { tx, inserted } = fakeTx({
      disabled: [{ userId: ANA, kind: "comment_reply", enabled: false }],
    });

    await emitNotifications(tx, [commentReply(), commentReply({ kind: "thread_reply", recipientId: CARLA })]);

    expect(inserted.map((row) => row.recipientId)).toEqual([CARLA]);
  });

  it("ignora la preferencia de otro usuario o de un tipo fijo", async () => {
    const { tx, inserted } = fakeTx({
      disabled: [
        { userId: CARLA, kind: "comment_reply", enabled: false },
        { userId: ANA, kind: "follow_request", enabled: false },
      ],
    });

    await emitNotifications(tx, [
      commentReply(),
      { kind: "follow_request", recipientId: ANA, actorId: BRUNO, followId: FOLLOW },
    ]);

    expect(inserted.map((row) => row.kind)).toEqual(["comment_reply", "follow_request"]);
  });

  it("no escribe nada si todos los avisos quedan filtrados", async () => {
    const { tx, inserted } = fakeTx();

    await emitNotifications(tx, [commentReply({ actorId: ANA, recipientId: ANA })]);

    expect(tx.insert).not.toHaveBeenCalled();
    expect(inserted).toEqual([]);
  });

  it("deduplica el mismo aviso dentro del lote", async () => {
    const { tx, inserted } = fakeTx();

    await emitNotifications(tx, [commentReply(), commentReply()]);

    expect(inserted).toHaveLength(1);
  });

  it("agrupa a los nuevos seguidores bajo 'followers' y las solicitudes por su id", async () => {
    const { tx, inserted } = fakeTx();

    await emitNotifications(tx, [
      { kind: "new_follower", recipientId: ANA, actorId: BRUNO, followId: FOLLOW },
      { kind: "follow_request", recipientId: CARLA, actorId: BRUNO, followId: FOLLOW },
      { kind: "follow_accepted", recipientId: ANA, actorId: CARLA, followId: FOLLOW },
    ]);

    expect(inserted.map((row) => row.groupKey)).toEqual([
      "followers",
      `follow:${FOLLOW}`,
      `follow:${FOLLOW}`,
    ]);
  });

  it("la moderación no expone actor y se agrupa por la acción", async () => {
    const { tx, inserted } = fakeTx();

    await emitNotifications(tx, [
      { kind: "moderation", recipientId: ANA, moderationActionId: ACTION },
    ]);

    expect(inserted).toEqual([
      {
        recipientId: ANA,
        kind: "moderation",
        actorId: null,
        commentId: null,
        followId: null,
        moderationActionId: ACTION,
        milestone: null,
        listId: null,
        releaseGroupId: null,
        groupKey: `moderation:${ACTION}`,
      },
    ]);
  });

  it("un hito guarda su cifra y se agrupa por el objeto", async () => {
    const { tx, inserted } = fakeTx({
      disabled: [{ userId: CARLA, kind: "list_save_milestone", enabled: true }],
    });

    await emitNotifications(tx, [
      {
        kind: "comment_like_milestone",
        recipientId: ANA,
        commentId: REPLY,
        rootId: ROOT,
        milestone: 25,
      },
      {
        kind: "list_save_milestone",
        recipientId: CARLA,
        listId: ACTION,
        milestone: 5,
      },
    ]);

    expect(inserted).toEqual([
      {
        recipientId: ANA,
        kind: "comment_like_milestone",
        actorId: null,
        commentId: REPLY,
        followId: null,
        moderationActionId: null,
        milestone: 25,
        listId: null,
        releaseGroupId: null,
        groupKey: `likes:${REPLY}`,
      },
      {
        recipientId: CARLA,
        kind: "list_save_milestone",
        actorId: null,
        commentId: null,
        followId: null,
        moderationActionId: null,
        milestone: 5,
        listId: ACTION,
        releaseGroupId: null,
        groupKey: `saves:${ACTION}`,
      },
    ]);
  });

  it("un lanzamiento activado por defecto avisa y uno apagado no", async () => {
    const { tx, inserted } = fakeTx();

    await emitNotifications(tx, [
      { kind: "artist_release", recipientId: ANA, releaseGroupId: REPLY },
      { kind: "artist_single", recipientId: CARLA, releaseGroupId: ROOT },
    ]);

    expect(inserted).toEqual([
      {
        recipientId: ANA,
        kind: "artist_release",
        actorId: null,
        commentId: null,
        followId: null,
        moderationActionId: null,
        milestone: null,
        listId: null,
        releaseGroupId: REPLY,
        groupKey: `release:${REPLY}`,
      },
    ]);
  });
});

describe("emitMilestoneNotification", () => {
  it("inserta el hito con su cifra y sin actor", async () => {
    const { tx, inserted } = fakeTx();

    await emitMilestoneNotification(tx, {
      kind: "comment_like_milestone",
      recipientId: ANA,
      commentId: REPLY,
      rootId: ROOT,
      milestone: 25,
    });

    expect(inserted).toEqual([
      {
        recipientId: ANA,
        kind: "comment_like_milestone",
        actorId: null,
        commentId: REPLY,
        followId: null,
        moderationActionId: null,
        milestone: 25,
        listId: null,
        releaseGroupId: null,
        groupKey: `likes:${REPLY}`,
      },
    ]);
  });

  it("no repite ni retrocede si ya hay un hito igual o mayor para el objeto", async () => {
    const { tx, inserted } = fakeTx({ milestones: [{ id: "n1" }] });

    await emitMilestoneNotification(tx, {
      kind: "comment_like_milestone",
      recipientId: ANA,
      commentId: REPLY,
      rootId: ROOT,
      milestone: 25,
    });

    expect(tx.insert).not.toHaveBeenCalled();
    expect(inserted).toEqual([]);
  });

  it("el hito de guardados se agrupa por la lista y respeta su preferencia", async () => {
    const { tx, inserted } = fakeTx({
      disabled: [{ userId: ANA, kind: "list_save_milestone", enabled: true }],
    });

    await emitMilestoneNotification(tx, {
      kind: "list_save_milestone",
      recipientId: ANA,
      listId: ACTION,
      milestone: 5,
    });

    expect(inserted).toEqual([
      {
        recipientId: ANA,
        kind: "list_save_milestone",
        actorId: null,
        commentId: null,
        followId: null,
        moderationActionId: null,
        milestone: 5,
        listId: ACTION,
        releaseGroupId: null,
        groupKey: `saves:${ACTION}`,
      },
    ]);
  });

  it("un hito apagado no se inserta", async () => {
    const { tx, inserted } = fakeTx({
      disabled: [{ userId: ANA, kind: "list_save_milestone", enabled: false }],
    });

    await emitMilestoneNotification(tx, {
      kind: "list_save_milestone",
      recipientId: ANA,
      listId: ACTION,
      milestone: 1,
    });

    expect(inserted).toEqual([]);
  });
});

describe("releaseNotificationBatches", () => {
  const today = "2026-10-23";

  it("clasifica álbum, EP y sencillo de los últimos 14 días", () => {
    expect(
      releaseNotificationBatches(
        [
          { releaseGroupId: "album", releaseDate: "2026-10-20", category: "album" },
          { releaseGroupId: "ep", releaseDate: "2026-10-10", category: "ep" },
          { releaseGroupId: "single", releaseDate: "2026-10-22", category: "single" },
        ],
        today,
      ),
    ).toEqual([
      { kind: "artist_release", releaseGroupIds: ["album", "ep"] },
      { kind: "artist_single", releaseGroupIds: ["single"] },
    ]);
  });

  it("incluye el borde de la ventana y descarta lo anterior", () => {
    const from = new Date(Date.parse(`${today}T00:00:00Z`) - ARTIST_RELEASE_WINDOW_DAYS * 86_400_000)
      .toISOString()
      .slice(0, 10);

    expect(
      releaseNotificationBatches(
        [
          { releaseGroupId: "borde", releaseDate: from, category: "album" },
          { releaseGroupId: "fuera", releaseDate: "2026-10-08", category: "album" },
        ],
        today,
      ),
    ).toEqual([{ kind: "artist_release", releaseGroupIds: ["borde"] }]);
  });

  it("un álbum o EP con fecha futura se anuncia, no se publica", () => {
    expect(
      releaseNotificationBatches(
        [
          { releaseGroupId: "futuro", releaseDate: "2026-10-24", category: "ep" },
          { releaseGroupId: "hoy", releaseDate: today, category: "album" },
        ],
        today,
      ),
    ).toEqual([
      { kind: "artist_release", releaseGroupIds: ["hoy"] },
      { kind: "artist_release_announced", releaseGroupIds: ["futuro"] },
    ]);
  });

  it("un sencillo por salir no se anuncia: avisa recién al salir, como sencillo", () => {
    expect(
      releaseNotificationBatches(
        [{ releaseGroupId: "sencillo-futuro", releaseDate: "2026-10-24", category: "single" }],
        today,
      ),
    ).toEqual([]);
  });

  it("deduplica el mismo disco y no devuelve lotes vacíos", () => {
    expect(
      releaseNotificationBatches(
        [
          { releaseGroupId: "album", releaseDate: "2026-10-20", category: "album" },
          { releaseGroupId: "album", releaseDate: "2026-10-20", category: "album" },
        ],
        today,
      ),
    ).toEqual([{ kind: "artist_release", releaseGroupIds: ["album"] }]);

    expect(releaseNotificationBatches([], today)).toEqual([]);
  });
});

describe("emitArtistReleaseNotifications", () => {
  const today = "2026-10-23";

  it("ejecuta un INSERT … SELECT por tipo con los discos ya clasificados", async () => {
    const { tx, executed } = fakeTx();

    await emitArtistReleaseNotifications(
      tx,
      [
        { releaseGroupId: "album", releaseDate: "2026-10-20", category: "album" },
        { releaseGroupId: "album", releaseDate: "2026-10-20", category: "album" },
        { releaseGroupId: "single", releaseDate: "2026-10-22", category: "single" },
      ],
      today,
    );

    expect(executed).toHaveLength(2);
  });

  it("no escribe nada si ningún disco cae en la ventana ni en el futuro", async () => {
    const { tx, executed } = fakeTx();

    await emitArtistReleaseNotifications(
      tx,
      [{ releaseGroupId: "viejo", releaseDate: "2026-01-01", category: "album" }],
      today,
    );

    expect(executed).toEqual([]);
  });
});

describe("emitArtistAwardNotifications", () => {
  const today = "2026-10-25";
  const ceremony = "5e0ce000-0000-4000-8000-00000000a9a1";
  const render = (query: unknown) =>
    new PgDialect().sqlToQuery(query as SQL).sql.replace(/\s+/g, " ");

  it("no escribe nada sin ceremonias", async () => {
    const { tx, executed } = fakeTx();

    await emitArtistAwardNotifications(tx, [], today);

    expect(executed).toEqual([]);
  });

  it("emite nominaciones y premios con un INSERT … SELECT por tipo", async () => {
    const { tx, executed } = fakeTx();

    await emitArtistAwardNotifications(tx, [ceremony], today);

    expect(executed).toHaveLength(2);
    const nomination = render(executed[0]);
    expect(nomination).toContain("'artist_award_nomination'");
    expect(nomination).toContain("a.kind = 'competition'");
    expect(nomination).toContain("held_on >= ");
    expect(nomination).toContain("'award:' || i.ceremony_id::text");
    expect(nomination).toContain("coalesce(p.enabled, ");

    const win = render(executed[1]);
    expect(win).toContain("'artist_award_win'");
    expect(win).toContain("BETWEEN ");
    expect(win).toContain("a.kind = 'hall_of_fame'");
    expect(win).toContain("EXTRACT(YEAR FROM ");
    expect(win).toContain("AND i.won");
  });

  it("filtra por artista principal del disco o la canción nominados", async () => {
    const { tx, executed } = fakeTx();

    await emitArtistAwardNotifications(tx, [ceremony], today);

    for (const query of executed) {
      const text = render(query);
      expect(text).toContain("c.role = 'primary'");
      expect(text).toContain("c.release_group_id = n.release_group_id");
      expect(text).toContain("c.recording_id = n.recording_id");
      expect(text).toContain("u.deactivated_at IS NULL");
    }
  });
});

describe("emitReplyNotifications", () => {
  const reply = { commentId: REPLY, rootId: ROOT, rootAuthorId: ANA, actorId: BRUNO };

  it("notifica a la raíz y a las demás personas del hilo, sin la raíz ni el actor", async () => {
    const { tx, inserted } = fakeTx({
      // La raíz y el actor también aparecen como participantes: no se duplican.
      participants: [{ userId: ANA }, { userId: BRUNO }, { userId: CARLA }],
    });

    await emitReplyNotifications(tx, reply);

    expect(inserted.map((row) => [row.kind, row.recipientId])).toEqual([
      ["comment_reply", ANA],
      ["thread_reply", CARLA],
    ]);
  });

  it("no notifica a la raíz por su propia respuesta", async () => {
    const { tx, inserted } = fakeTx({ participants: [{ userId: ANA }] });

    await emitReplyNotifications(tx, { ...reply, actorId: ANA });

    expect(inserted).toEqual([]);
  });

  it("la prioridad de la raíz deja un solo aviso aunque haya participado", async () => {
    const { tx, inserted } = fakeTx({ participants: [{ userId: ANA }, { userId: CARLA }, { userId: CARLA }] });

    await emitReplyNotifications(tx, reply);

    expect(inserted.filter((row) => row.recipientId === ANA)).toHaveLength(1);
    expect(inserted.find((row) => row.recipientId === ANA)).toMatchObject({ kind: "comment_reply" });
    expect(inserted.filter((row) => row.recipientId === CARLA)).toHaveLength(1);
  });
});

describe("retractFollowRequestNotifications", () => {
  it("borra la solicitud pendiente de los seguimientos indicados", async () => {
    const { tx, deleted } = fakeTx();

    await retractFollowRequestNotifications(tx, [FOLLOW, ACTION]);

    expect(tx.delete).toHaveBeenCalledTimes(1);
    expect(deleted).toHaveBeenCalledTimes(1);
  });

  it("no consulta la base si no hay seguimientos", async () => {
    const { tx } = fakeTx();

    await retractFollowRequestNotifications(tx, []);

    expect(tx.delete).not.toHaveBeenCalled();
  });
});
