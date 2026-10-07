import { beforeEach, describe, expect, it, vi } from "vitest";
import { COMMENT_LIKE_DISPLAY_THRESHOLD, likeComment, thresholdedLikeCount, unlikeComment } from "./comment-likes";

const mocks = vi.hoisted(() => ({
  db: { select: vi.fn(), insert: vi.fn(), delete: vi.fn() },
  isBlockedBetween: vi.fn(),
}));
vi.mock("@/db", () => ({ db: mocks.db }));
vi.mock("./relations", () => ({ isBlockedBetween: mocks.isBlockedBetween }));

const COMMENT = "00000000-0000-4000-8000-000000000001";
const AUTHOR = "00000000-0000-4000-8000-0000000000a1";
const VIEWER = "00000000-0000-4000-8000-0000000000b2";

// `select` se llama primero para el comentario (con `.limit`) y después para el conteo (sin `.limit`).
function selects(...results: unknown[][]) {
  for (const rows of results) {
    mocks.db.select.mockReturnValueOnce({
      from: () => ({ where: () => Object.assign(Promise.resolve(rows), { limit: () => Promise.resolve(rows) }) }),
    });
  }
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
  const onConflictDoNothing = vi.fn().mockResolvedValue(undefined);
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isBlockedBetween.mockResolvedValue(false);
    mocks.db.insert.mockReturnValue({ values: () => ({ onConflictDoNothing }) });
  });

  it("inserta idempotentemente y devuelve la cifra umbralizada", async () => {
    selects(visible(), [{ count: 3 }]);
    await expect(likeComment(COMMENT, VIEWER)).resolves.toEqual({ liked: true, likeCount: 3 });
    expect(onConflictDoNothing).toHaveBeenCalledTimes(1);
  });

  it("no revela el conteo real bajo el umbral", async () => {
    selects(visible(), [{ count: 2 }]);
    await expect(likeComment(COMMENT, VIEWER)).resolves.toEqual({ liked: true, likeCount: null });
  });

  it("responde COMMENT_NOT_FOUND si el comentario no existe", async () => {
    selects([]);
    await expect(likeComment(COMMENT, VIEWER)).rejects.toMatchObject({ code: "COMMENT_NOT_FOUND", status: 404 });
    expect(mocks.db.insert).not.toHaveBeenCalled();
  });

  describe("respuestas (add-comment-replies)", () => {
    const ROOT = "00000000-0000-4000-8000-000000000002";
    const reply = [{ id: COMMENT, userId: AUTHOR, moderationStatus: "visible", parentId: ROOT }];

    it("una respuesta se puede likear con las mismas reglas que un comentario", async () => {
      selects(reply, [{ moderationStatus: "visible" }], [{ count: 4 }]);
      await expect(likeComment(COMMENT, VIEWER)).resolves.toEqual({ liked: true, likeCount: 4 });
      expect(onConflictDoNothing).toHaveBeenCalledTimes(1);
    });

    it("una respuesta de su propia autora no se puede likear", async () => {
      selects(reply, [{ moderationStatus: "visible" }]);
      await expect(likeComment(COMMENT, AUTHOR)).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
    });

    it("una respuesta cuya raíz está oculta responde COMMENT_NOT_FOUND", async () => {
      selects(reply, [{ moderationStatus: "hidden" }]);
      await expect(likeComment(COMMENT, VIEWER)).rejects.toMatchObject({ code: "COMMENT_NOT_FOUND", status: 404 });
      expect(mocks.db.insert).not.toHaveBeenCalled();
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
    expect(mocks.db.insert).not.toHaveBeenCalled();
  });

  it("rechaza con BLOCKED si hay bloqueo en cualquier dirección", async () => {
    selects(visible());
    mocks.isBlockedBetween.mockResolvedValue(true);
    await expect(likeComment(COMMENT, VIEWER)).rejects.toMatchObject({ code: "BLOCKED", status: 403 });
    expect(mocks.isBlockedBetween).toHaveBeenCalledWith(VIEWER, AUTHOR);
    expect(mocks.db.insert).not.toHaveBeenCalled();
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

  it("responde COMMENT_NOT_FOUND si el comentario no existe", async () => {
    selects([]);
    await expect(unlikeComment(COMMENT, VIEWER)).rejects.toMatchObject({ code: "COMMENT_NOT_FOUND" });
  });
});
