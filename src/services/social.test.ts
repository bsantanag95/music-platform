import { describe, expect, it, vi } from "vitest";
import { createComment, createReply, deleteComment, listComments, listReplies, updateComment, upsertRating } from "./social";

const mocks = vi.hoisted(() => ({ db: { insert: vi.fn(), select: vi.fn(), delete: vi.fn(), update: vi.fn() } }));
vi.mock("@/db", () => ({ db: mocks.db }));
const isBlockedBetween = vi.hoisted(() => vi.fn().mockResolvedValue(false));
vi.mock("@/services/social/relations", () => ({ isBlockedBetween }));

describe("servicio social", () => {
  const target = { type: "artist" as const, id: "00000000-0000-4000-8000-000000000001", column: "artistId" as const };

  it("rechaza estrellas fuera de rango o sin medio paso", async () => {
    await expect(upsertRating(target, "00000000-0000-4000-8000-000000000002", 4.25)).rejects.toMatchObject({ code: "INVALID_RATING", status: 400 });
  });

  it("rechaza detailed score fuera de la banda de estrellas", async () => {
    await expect(upsertRating(target, "00000000-0000-4000-8000-000000000002", 4, 31)).rejects.toMatchObject({ code: "INVALID_RATING" });
  });

  it("rechaza un cuerpo sin estrellas ni puntaje detallado", async () => {
    await expect(upsertRating(target, "00000000-0000-4000-8000-000000000002", undefined)).rejects.toMatchObject({ code: "VALIDATION_ERROR", status: 400 });
  });

  it("deriva las estrellas cuando solo llega el puntaje detallado", async () => {
    const values = vi.fn().mockReturnValue({
      onConflictDoUpdate: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{
          id: "00000000-0000-4000-8000-000000000003",
          userId: "00000000-0000-4000-8000-000000000002",
          artistId: target.id,
          releaseGroupId: null,
          recordingId: null,
          stars: "4.5",
          detailedScore: 86,
          createdAt: new Date(),
          updatedAt: new Date(),
        }]),
      }),
    });
    mocks.db.insert.mockReturnValue({ values });

    await upsertRating(target, "00000000-0000-4000-8000-000000000002", undefined, 86);

    expect(values).toHaveBeenCalledWith(expect.objectContaining({ stars: "4.5", detailedScore: 86 }));
  });

  it("deja el puntaje en nulo cuando solo llegan las estrellas", async () => {
    const values = vi.fn().mockReturnValue({
      onConflictDoUpdate: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{
          id: "00000000-0000-4000-8000-000000000003",
          userId: "00000000-0000-4000-8000-000000000002",
          artistId: target.id,
          releaseGroupId: null,
          recordingId: null,
          stars: "4",
          detailedScore: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }]),
      }),
    });
    mocks.db.insert.mockReturnValue({ values });

    await upsertRating(target, "00000000-0000-4000-8000-000000000002", 4);

    expect(values).toHaveBeenCalledWith(expect.objectContaining({ stars: "4", detailedScore: null }));
  });

  it("rechaza un puntaje incoherente con las estrellas indicadas", async () => {
    await expect(upsertRating(target, "00000000-0000-4000-8000-000000000002", 4, 86)).rejects.toMatchObject({ code: "INVALID_RATING", status: 400 });
  });

  it("no recibe user_id del cliente: la API de servicio exige userId separado", () => {
    expect(upsertRating.length).toBe(4);
  });

  it("hace el upsert en una única operación ON CONFLICT", async () => {
    const returning = vi.fn().mockResolvedValue([{
      id: "00000000-0000-4000-8000-000000000003",
      userId: "00000000-0000-4000-8000-000000000002",
      artistId: target.id,
      releaseGroupId: null,
      recordingId: null,
      stars: "4.0",
      detailedScore: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }]);
    const onConflictDoUpdate = vi.fn().mockReturnValue({ returning });
    mocks.db.insert.mockReturnValue({ values: vi.fn().mockReturnValue({ onConflictDoUpdate }) });

    await upsertRating(target, "00000000-0000-4000-8000-000000000002", 4);

    expect(onConflictDoUpdate).toHaveBeenCalledWith(expect.objectContaining({
      target: expect.any(Array),
      targetWhere: expect.anything(),
    }));
  });

  it("distingue un comentario inexistente de uno sin permiso", async () => {
    const limit = vi.fn().mockResolvedValue([]);
    mocks.db.select.mockReturnValue({ from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ limit }) }) });
    await expect(deleteComment("00000000-0000-4000-8000-000000000004", "00000000-0000-4000-8000-000000000002"))
      .rejects.toMatchObject({ code: "COMMENT_NOT_FOUND", status: 404 });

    limit.mockResolvedValue([{ id: "00000000-0000-4000-8000-000000000004", userId: "00000000-0000-4000-8000-000000000005" }]);
    await expect(deleteComment("00000000-0000-4000-8000-000000000004", "00000000-0000-4000-8000-000000000002"))
      .rejects.toMatchObject({ code: "PERMISSION_DENIED", status: 403 });
  });

  it("distingue un comentario inexistente de uno sin permiso al editar", async () => {
    const limit = vi.fn().mockResolvedValue([]);
    mocks.db.select.mockReturnValue({ from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ limit }) }) });
    await expect(updateComment("00000000-0000-4000-8000-000000000004", "00000000-0000-4000-8000-000000000002", "texto"))
      .rejects.toMatchObject({ code: "COMMENT_NOT_FOUND", status: 404 });

    limit.mockResolvedValue([{ id: "00000000-0000-4000-8000-000000000004", userId: "00000000-0000-4000-8000-000000000005" }]);
    await expect(updateComment("00000000-0000-4000-8000-000000000004", "00000000-0000-4000-8000-000000000002", "texto"))
      .rejects.toMatchObject({ code: "PERMISSION_DENIED", status: 403 });
  });

  describe("temas de los comentarios (add-artist-comment-topics)", () => {
    const userId = "00000000-0000-4000-8000-000000000002";
    const album = { type: "release-group" as const, id: "00000000-0000-4000-8000-000000000006", column: "releaseGroupId" as const };
    const createdRow = {
      id: "00000000-0000-4000-8000-000000000007",
      body: "Texto",
      topic: "general",
      createdAt: new Date(),
      user: { id: userId, username: "ana", displayName: null, deactivatedAt: null },
    };

    /** Prepara `insert` (devuelve la fila creada) y el `select` con el que `createComment` relee el comentario. */
    function mockInsert() {
      const values = vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: createdRow.id }]) });
      mocks.db.insert.mockReturnValue({ values });
      const limit = vi.fn().mockResolvedValue([createdRow]);
      mocks.db.select.mockReturnValue({ from: vi.fn().mockReturnValue({ innerJoin: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ limit }) }) }) });
      return values;
    }

    it("un comentario de artista sin tema se guarda como general", async () => {
      const values = mockInsert();
      await createComment(target, userId, "Texto");
      expect(values).toHaveBeenCalledWith(expect.objectContaining({ topic: "general" }));
    });

    it("un comentario de artista guarda el tema pedido", async () => {
      const values = mockInsert();
      await createComment(target, userId, "Texto", "start");
      expect(values).toHaveBeenCalledWith(expect.objectContaining({ topic: "start" }));
    });

    it("un comentario de álbum se guarda sin tema", async () => {
      const values = mockInsert();
      await createComment(album, userId, "Texto");
      expect(values).toHaveBeenCalledWith(expect.objectContaining({ topic: null }));
    });

    it.each([["fuera del catálogo", "foro"], ["vacío", ""]])("rechaza un tema %s en un artista sin crear la fila", async (_caso, topic) => {
      mocks.db.insert.mockClear();
      await expect(createComment(target, userId, "Texto", topic)).rejects.toMatchObject({ code: "INVALID_TOPIC", status: 400 });
      expect(mocks.db.insert).not.toHaveBeenCalled();
    });

    it("rechaza un tema en un álbum sin crear la fila", async () => {
      mocks.db.insert.mockClear();
      await expect(createComment(album, userId, "Texto", "start")).rejects.toMatchObject({ code: "INVALID_TOPIC", status: 400 });
      expect(mocks.db.insert).not.toHaveBeenCalled();
    });

    it("rechaza el filtro de tema en un álbum y en un tema fuera del catálogo", async () => {
      await expect(listComments(album, 1, 20, null, "start")).rejects.toMatchObject({ code: "INVALID_TOPIC" });
      await expect(listComments(target, 1, 20, null, "foro")).rejects.toMatchObject({ code: "INVALID_TOPIC" });
    });

    it("lista un artista filtrado por tema y devuelve el tema de cada comentario", async () => {
      const offset = vi.fn().mockResolvedValue([{ ...createdRow, topic: "start", likes: 0, likedByMe: false }]);
      const where = vi.fn().mockReturnValue({ orderBy: vi.fn().mockReturnValue({ limit: vi.fn().mockReturnValue({ offset }) }) });
      mocks.db.select.mockReturnValue({ from: vi.fn().mockReturnValue({ innerJoin: vi.fn().mockReturnValue({ where }) }) });

      const result = await listComments(target, 1, 20, null, "start");

      expect(where).toHaveBeenCalledTimes(1);
      expect(result.comments[0]).toMatchObject({ topic: "start" });
    });

    it("editar un comentario no toca el tema", async () => {
      const limit = vi.fn()
        .mockResolvedValueOnce([{ id: createdRow.id, userId }])
        .mockResolvedValueOnce([createdRow]);
      mocks.db.select.mockReturnValue({ from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ limit }), innerJoin: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ limit }) }) }) });
      const set = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });
      mocks.db.update.mockReturnValue({ set });

      await updateComment(createdRow.id, userId, "Otro texto");

      expect(set).toHaveBeenCalledWith({ body: "Otro texto" });
    });
  });

  describe("respuestas (add-comment-replies)", () => {
    const userId = "00000000-0000-4000-8000-000000000002";
    const authorId = "00000000-0000-4000-8000-000000000005";
    const rootId = "00000000-0000-4000-8000-000000000010";
    const replyId = "00000000-0000-4000-8000-000000000011";
    const artistId = "00000000-0000-4000-8000-000000000001";
    const root = { id: rootId, userId: authorId, artistId, parentId: null, moderationStatus: "visible" };
    const replyRow = { id: replyId, body: "Texto", topic: "start", parentId: rootId, replyCount: 0, createdAt: new Date(), user: { id: userId, username: "ana", displayName: null, deactivatedAt: null } };

    /** Una cola de resultados para `select().from().where().limit()` y para el releído con `innerJoin`. */
    function mockSelects(...results: unknown[][]) {
      const limit = vi.fn();
      for (const result of results) limit.mockResolvedValueOnce(result);
      mocks.db.select.mockReturnValue({ from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ limit }), innerJoin: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ limit }) }) }) });
    }
    function mockReplyInsert() {
      const values = vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: replyId }]) });
      mocks.db.insert.mockReturnValue({ values });
      return values;
    }

    it("responde a una raíz: copia el artista, cuelga de la raíz y no guarda tema", async () => {
      mockSelects([root], [replyRow]);
      const values = mockReplyInsert();

      const created = await createReply(rootId, userId, "  Texto  ");

      expect(values).toHaveBeenCalledWith({ userId, artistId, parentId: rootId, body: "Texto", topic: null });
      expect(created).toMatchObject({ parentId: rootId, topic: "start" });
    });

    it("responder a una respuesta la cuelga de la misma raíz", async () => {
      mockSelects([{ id: replyId, userId, artistId, parentId: rootId, moderationStatus: "visible" }], [root], [replyRow]);
      const values = mockReplyInsert();

      await createReply(replyId, userId, "Otra");

      expect(values).toHaveBeenCalledWith(expect.objectContaining({ parentId: rootId }));
    });

    it("rechaza un texto vacío o demasiado largo sin tocar la base", async () => {
      mocks.db.insert.mockClear();
      await expect(createReply(rootId, userId, "   ")).rejects.toMatchObject({ code: "INVALID_COMMENT", status: 400 });
      await expect(createReply(rootId, userId, "x".repeat(5001))).rejects.toMatchObject({ code: "INVALID_COMMENT" });
      expect(mocks.db.insert).not.toHaveBeenCalled();
    });

    it.each([
      ["no existe", []],
      ["está oculto por moderación", [{ ...root, moderationStatus: "hidden" }]],
    ])("rechaza responder a un comentario que %s", async (_caso, rows) => {
      mockSelects(rows);
      mocks.db.insert.mockClear();
      await expect(createReply(rootId, userId, "Texto")).rejects.toMatchObject({ code: "COMMENT_NOT_FOUND", status: 404 });
      expect(mocks.db.insert).not.toHaveBeenCalled();
    });

    it("una respuesta cuya raíz está oculta tampoco existe", async () => {
      mockSelects([{ id: replyId, userId, artistId, parentId: rootId, moderationStatus: "visible" }], [{ ...root, moderationStatus: "hidden" }]);
      await expect(createReply(replyId, userId, "Texto")).rejects.toMatchObject({ code: "COMMENT_NOT_FOUND" });
    });

    it("solo los comentarios de artista admiten respuestas", async () => {
      mockSelects([{ ...root, artistId: null }]);
      mocks.db.insert.mockClear();
      await expect(createReply(rootId, userId, "Texto")).rejects.toMatchObject({ code: "REPLIES_NOT_ALLOWED", status: 400 });
      expect(mocks.db.insert).not.toHaveBeenCalled();
    });

    it("rechaza responder con un bloqueo en cualquier dirección", async () => {
      mockSelects([root]);
      isBlockedBetween.mockResolvedValueOnce(true);
      mocks.db.insert.mockClear();
      await expect(createReply(rootId, userId, "Texto")).rejects.toMatchObject({ code: "BLOCKED", status: 403 });
      expect(mocks.db.insert).not.toHaveBeenCalled();
    });

    it("el hilo de una raíz devuelve las respuestas con parentId, de la más antigua a la más reciente", async () => {
      const offset = vi.fn().mockResolvedValue([{ ...replyRow, likes: 0, likedByMe: false }]);
      const orderBy = vi.fn().mockReturnValue({ limit: vi.fn().mockReturnValue({ offset }) });
      const limit = vi.fn().mockResolvedValue([root]);
      mocks.db.select.mockReturnValue({ from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ limit }), innerJoin: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ orderBy }) }) }) });

      const result = await listReplies(rootId, 1, 20, null);

      expect(result.comments).toHaveLength(1);
      expect(result.comments[0]).toMatchObject({ parentId: rootId, topic: "start" });
      expect(result.hasNext).toBe(false);
      // El orden ascendente (más antigua primero) se comprueba contra Postgres en el smoke test.
      expect(orderBy).toHaveBeenCalledTimes(1);
    });

    it("el hilo de una respuesta, de un inexistente o de una raíz oculta responde COMMENT_NOT_FOUND", async () => {
      mockSelects([{ ...root, parentId: rootId }]);
      await expect(listReplies(replyId)).rejects.toMatchObject({ code: "COMMENT_NOT_FOUND", status: 404 });
      mockSelects([]);
      await expect(listReplies(rootId)).rejects.toMatchObject({ code: "COMMENT_NOT_FOUND" });
      mockSelects([{ ...root, moderationStatus: "hidden" }]);
      await expect(listReplies(rootId)).rejects.toMatchObject({ code: "COMMENT_NOT_FOUND" });
    });
  });
});
