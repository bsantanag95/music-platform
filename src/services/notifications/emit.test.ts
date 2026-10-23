import { describe, expect, it, vi } from "vitest";
import { comment, userBlock } from "@/db/schema";
import { emitNotifications, emitReplyNotifications, retractFollowRequestNotifications, type NotificationEvent, type NotificationTx } from "./emit";

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
type Disabled = { userId: string; kind: string };

/**
 * Transacción falsa: distingue la consulta de bloqueos, la de preferencias y la
 * de participantes del hilo por la tabla del `from`, y captura las filas
 * insertadas.
 */
function fakeTx(data: { blocks?: Block[]; disabled?: Disabled[]; participants?: Array<{ userId: string }> } = {}) {
  const inserted: Array<Record<string, unknown>> = [];
  const deleted = vi.fn().mockResolvedValue(undefined);
  const onConflictDoNothing = vi.fn().mockResolvedValue(undefined);

  const rowsFor = (table: unknown) => {
    if (table === userBlock) return data.blocks ?? [];
    if (table === comment) return data.participants ?? [];
    return data.disabled ?? [];
  };

  const tx = {
    select: vi.fn(() => ({
      from: (table: unknown) => ({
        where: vi.fn().mockResolvedValue(rowsFor(table)),
      }),
    })),
    insert: vi.fn(() => ({
      values: vi.fn((rows: Array<Record<string, unknown>>) => {
        inserted.push(...rows);
        return { onConflictDoNothing };
      }),
    })),
    delete: vi.fn(() => ({ where: deleted })),
  };

  return { tx: tx as unknown as NotificationTx & typeof tx, inserted, onConflictDoNothing, deleted };
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
      disabled: [{ userId: ANA, kind: "comment_reply" }],
    });

    await emitNotifications(tx, [commentReply(), commentReply({ kind: "thread_reply", recipientId: CARLA })]);

    expect(inserted.map((row) => row.recipientId)).toEqual([CARLA]);
  });

  it("ignora la preferencia de otro usuario o de un tipo fijo", async () => {
    const { tx, inserted } = fakeTx({
      disabled: [
        { userId: CARLA, kind: "comment_reply" },
        { userId: ANA, kind: "follow_request" },
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
        groupKey: `moderation:${ACTION}`,
      },
    ]);
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
