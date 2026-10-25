import { beforeEach, describe, expect, it, vi } from "vitest";
import { COMMENT_LIKE_DISPLAY_THRESHOLD, likeComment, thresholdedLikeCount, unlikeComment } from "./comment-likes";

const mocks = vi.hoisted(() => ({
  db: { select: vi.fn(), delete: vi.fn(), transaction: vi.fn() },
  tx: { select: vi.fn(), insert: vi.fn() },
  isBlockedBetween: vi.fn(),
  emitMilestoneNotification: vi.fn(),
}));
vi.mock("@/db", () => ({ db: mocks.db }));
vi.mock("./relations", () => ({ isBlockedBetween: mocks.isBlockedBetween }));
vi.mock("@/services/notifications/emit", () => ({
  emitMilestoneNotification: mocks.emitMilestoneNotification,
}));

const COMMENT = "00000000-0000-4000-8000-000000000001";
const AUTHOR = "00000000-0000-4000-8000-0000000000a1";
const VIEWER = "00000000-0000-4000-8000-0000000000b2";

// `select` del `db` se llama para el comentario (con `.limit`) y, en `unlike`,
// para el conteo (sin `.limit`). El de la transacción cuenta los likes ya
// insertados.
function rowsChain(rows: unknown[]) {
  return {
    from: () => ({
      where: () => Object.assign(Promise.resolve(rows), { limit: () => Promise.resolve(rows) }),
    }),
  };
}

function selects(...results: unknown[][]) {
  for (const rows of results) {
    mocks.db.select.mockReturnValueOnce(rowsChain(rows));
  }
}

function txCount(count: number) {
  mocks.tx.select.mockReturnValue(rowsChain([{ count }]));
}

function insertLike(created = true) {
  const returning = vi.fn().mockResolvedValue(created ? [{ userId: VIEWER }] : []);
  const onConflictDoNothing = vi.fn(() => ({ returning }));
  const values = vi.fn(() => ({ onConflictDoNothing }));
  mocks.tx.insert.mockReturnValue({ values });
  return { values, onConflictDoNothing, returning };
}

const visible = (userId = AUTHOR) => [{ id: COMMENT, userId, moderationStatus: "visible" }];

describe("thresholdedLikeCount", () => {
  it("oculta la cifra bajo el umbral y la muestra desde él", () => {
    expect(COMMENT_LIKE_DISPLAY_THRESHOLD).toBe(3);
    expect(thresholdedLikeCount(0)).toBeNull();
    expect(thresholdedLikeCount(2)).toBeNull();
    expect(thresholdedLikeCount(3)).toBe(3);
    expect(thresholdedLikeCount(40)).toBe(40);
  });
});

describe("likeComment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.db.transaction.mockImplementation(
      async (callback: (tx: unknown) => Promise<unknown>) => callback(mocks.tx),
    );
    mocks.isBlockedBetween.mockResolvedValue(false);
  });

  it("inserta idempotentemente y devuelve la cifra umbralizada", async () => {
    selects(visible());
    insertLike();
    txCount(3);
    await expect(likeComment(COMMENT, VIEWER)).resolves.toEqual({ liked: true, likeCount: 3 });
    expect(mocks.tx.insert).toHaveBeenCalledTimes(1);
  });

  it("no revela el conteo real bajo el umbral", async () => {
    selects(visible());
    insertLike();
    txCount(2);
    await expect(likeComment(COMMENT, VIEWER)).resolves.toEqual({ liked: true, likeCount: null });
  });

  it("no avisa antes del primer hito", async () => {
    selects(visible());
    insertLike();
    txCount(9);
    await likeComment(COMMENT, VIEWER);
    expect(mocks.emitMilestoneNotification).not.toHaveBeenCalled();
  });

  it("el décimo like avisa el hito 10 al autor del comentario", async () => {
    selects(visible());
    insertLike();
    txCount(10);

    await likeComment(COMMENT, VIEWER);

    expect(mocks.emitMilestoneNotification).toHaveBeenCalledWith(mocks.tx, {
      kind: "comment_like_milestone",
      recipientId: AUTHOR,
      commentId: COMMENT,
      rootId: COMMENT,
      milestone: 10,
    });
  });

  it("el undécimo like sigue pidiendo el mismo hito: el emisor no lo repite", async () => {
    selects(visible());
    insertLike();
    txCount(11);

    await likeComment(COMMENT, VIEWER);

    expect(mocks.emitMilestoneNotification).toHaveBeenCalledWith(
      mocks.tx,
      expect.objectContaining({ milestone: 10 }),
    );
  });

  it("un salto a 30 avisa solo el hito más alto", async () => {
    selects(visible());
    insertLike();
    txCount(30);

    await likeComment(COMMENT, VIEWER);

    expect(mocks.emitMilestoneNotification).toHaveBeenCalledTimes(1);
    expect(mocks.emitMilestoneNotification).toHaveBeenCalledWith(
      mocks.tx,
      expect.objectContaining({ milestone: 25 }),
    );
  });

  it("un re-like no vuelve a contar ni emite", async () => {
    selects(visible());
    insertLike(false);
    txCount(11);

    await likeComment(COMMENT, VIEWER);

    expect(mocks.emitMilestoneNotification).not.toHaveBeenCalled();
  });

  it("responde COMMENT_NOT_FOUND si el comentario no existe", async () => {
    selects([]);
    await expect(likeComment(COMMENT, VIEWER)).rejects.toMatchObject({ code: "COMMENT_NOT_FOUND", status: 404 });
    expect(mocks.tx.insert).not.toHaveBeenCalled();
  });

  describe("respuestas (add-comment-replies)", () => {
    const ROOT = "00000000-0000-4000-8000-000000000002";
    const reply = [{ id: COMMENT, userId: AUTHOR, moderationStatus: "visible", parentId: ROOT }];

    it("una respuesta se puede likear con las mismas reglas que un comentario", async () => {
      selects(reply, [{ moderationStatus: "visible" }]);
      insertLike();
      txCount(4);
      await expect(likeComment(COMMENT, VIEWER)).resolves.toEqual({ liked: true, likeCount: 4 });
      expect(mocks.tx.insert).toHaveBeenCalledTimes(1);
    });

    it("el hito de una respuesta enlaza a la raíz del hilo", async () => {
      selects(reply, [{ moderationStatus: "visible" }]);
      insertLike();
      txCount(10);

      await likeComment(COMMENT, VIEWER);

      expect(mocks.emitMilestoneNotification).toHaveBeenCalledWith(
        mocks.tx,
        expect.objectContaining({ commentId: COMMENT, rootId: ROOT, milestone: 10 }),
      );
    });

    it("una respuesta de su propia autora no se puede likear", async () => {
      selects(reply, [{ moderationStatus: "visible" }]);
      await expect(likeComment(COMMENT, AUTHOR)).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
    });

    it("una respuesta cuya raíz está oculta responde COMMENT_NOT_FOUND", async () => {
      selects(reply, [{ moderationStatus: "hidden" }]);
      await expect(likeComment(COMMENT, VIEWER)).rejects.toMatchObject({ code: "COMMENT_NOT_FOUND", status: 404 });
      expect(mocks.tx.insert).not.toHaveBeenCalled();
    });

    it("una respuesta cuya raíz ya no existe responde COMMENT_NOT_FOUND", async () => {
      selects(reply, []);
      await expect(likeComment(COMMENT, VIEWER)).rejects.toMatchObject({ code: "COMMENT_NOT_FOUND" });
    });
  });

  it("responde COMMENT_NOT_FOUND si el comentario está oculto", async () => {
    selects([{ id: COMMENT, userId: AUTHOR, moderationStatus: "hidden" }]);
    await expect(likeComment(COMMENT, VIEWER)).rejects.toMatchObject({ code: "COMMENT_NOT_FOUND" });
  });

  it("rechaza el like al propio comentario", async () => {
    selects(visible(VIEWER));
    await expect(likeComment(COMMENT, VIEWER)).rejects.toMatchObject({ code: "PERMISSION_DENIED", status: 403 });
    expect(mocks.tx.insert).not.toHaveBeenCalled();
  });

  it("rechaza con BLOCKED si hay bloqueo en cualquier dirección", async () => {
    selects(visible());
    mocks.isBlockedBetween.mockResolvedValue(true);
    await expect(likeComment(COMMENT, VIEWER)).rejects.toMatchObject({ code: "BLOCKED", status: 403 });
    expect(mocks.isBlockedBetween).toHaveBeenCalledWith(VIEWER, AUTHOR);
    expect(mocks.tx.insert).not.toHaveBeenCalled();
  });
});

describe("unlikeComment", () => {
  const where = vi.fn().mockResolvedValue(undefined);
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.db.delete.mockReturnValue({ where });
  });

  it("quita el like sin consultar bloqueos ni exigir que sea ajeno", async () => {
    selects(visible(), [{ count: 1 }]);
    await expect(unlikeComment(COMMENT, VIEWER)).resolves.toEqual({ liked: false, likeCount: null });
    expect(where).toHaveBeenCalledTimes(1);
    expect(mocks.isBlockedBetween).not.toHaveBeenCalled();
  });

  it("un unlike no retira ni reemite el hito", async () => {
    selects(visible(), [{ count: 9 }]);
    await unlikeComment(COMMENT, VIEWER);
    expect(mocks.emitMilestoneNotification).not.toHaveBeenCalled();
  });

  it("responde COMMENT_NOT_FOUND si el comentario no existe", async () => {
    selects([]);
    await expect(unlikeComment(COMMENT, VIEWER)).rejects.toMatchObject({ code: "COMMENT_NOT_FOUND" });
  });
});
